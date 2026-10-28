/**
 * The workspace shell: sidebar, topbar, hash routing, and the global dialogs.
 * This is the entry point bundled into the static index.html.
 */
import type { IconNode } from "lucide";
import {
  ArrowUpRight, Bell, BookOpen, Check, ChevronDown, ChevronRight, ChevronsUpDown, CircleHelp,
  Flame, Folders, Globe2, GraduationCap, History, Languages, LayoutGrid, Menu, PanelLeft, Search,
  Settings2, Sparkles, X,
} from "lucide";
import { brand, getLanguage, getStreak, h, icon, iconButton, languages, nativeLanguages, openModal, replace, searchField, sectionIcon, store } from "./core";
import { PhraseEditor } from "./editors";
import { LearnPage, LessonDialog } from "./learn";
import { OverviewPage, TranslatePage } from "./views-overview";
import { CollectionsPage, PhrasebookPage, SettingsPage } from "./views-library";
import { navigate, openPhrasebook, route, setRenderer, viewFromHash, viewTitles, type View } from "./state";

interface NavItem { label: string; view: View; node: IconNode; badge?: boolean }

const nav: NavItem[] = [
  { label: "Overview", view: "overview", node: LayoutGrid },
  { label: "Translate", view: "translate", node: Languages },
  { label: "My phrasebook", view: "phrasebook", node: BookOpen, badge: true },
  { label: "Learn languages", view: "learn", node: GraduationCap },
];

const libraryNav: NavItem[] = [
  { label: "Collections", view: "collections", node: Folders },
  { label: "Translation history", view: "history", node: History },
];

interface PageResult { element: HTMLElement; refresh?: () => void }

let mobileOpen = false;
let profileOpen = false;
let currentRefresh: (() => void) | undefined;

/* ------------------------------------------------------------ pieces */

const navButtons = new Map<View, HTMLButtonElement>();
const badge = h("span", { class: "nav-badge" });
const breadcrumbTitle = h("span", null);
const viewHost = h("div", null);
const sidebar = h("aside", { class: "sidebar" });
const sidebarUser = h("button", { class: "sidebar-user", type: "button" });
const avatar = h("span", { class: "avatar" });
const profileControl = h("div", { class: "profile-control" });

function navItem(item: NavItem): HTMLButtonElement {
  const button = h("button", {
    class: "nav-item",
    type: "button",
    onClick: () => { if (item.view === "phrasebook") route.collection = null; go(item.view); },
  },
  icon(item.node, 19, { strokeWidth: 1.7 }),
  h("span", null, item.label),
  item.badge ? badge : false,
  h("span", { class: "nav-active-dot" })) as HTMLButtonElement;
  navButtons.set(item.view, button);
  return button;
}

function paintNav() {
  for (const [view, button] of navButtons) {
    const active = route.view === view;
    button.className = `nav-item ${active ? "active" : ""}`.trim();
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  badge.textContent = String(store.savedPhrases().length);
  breadcrumbTitle.textContent = viewTitles[route.view];
}

function paintUser() {
  const name = store.data.profile.name;
  const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  avatar.textContent = initials;
  replace(sidebarUser, 
    avatar,
    h("span", { class: "sidebar-user-text" },
      h("strong", null, name),
      h("span", null, h("span", { class: "tiny-dot" }), "Local workspace")),
    icon(ChevronsUpDown, 15));
}

function go(view: View) {
  navigate(view);
  setMobile(false);
  setProfile(false);
}

function setMobile(open: boolean) {
  mobileOpen = open;
  sidebar.className = `sidebar ${open ? "mobile-open" : ""}`.trim();
  const existing = document.querySelector(".sidebar-overlay");
  if (open && !existing) {
    document.querySelector(".app-shell")?.prepend(h("button", {
      class: "sidebar-overlay",
      "aria-label": "Close navigation",
      onClick: () => setMobile(false),
    }));
  } else if (!open) existing?.remove();
}

function setProfile(open: boolean) {
  profileOpen = open;
  replace(profileControl, 
    h("button", { class: "profile-trigger", type: "button", "aria-label": "Account menu", "aria-expanded": String(open), onClick: () => setProfile(!open) },
      h("span", { class: "avatar top-avatar" }, store.data.profile.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()),
      icon(ChevronDown, 13)),
    open ? h("button", { class: "profile-menu-backdrop", "aria-label": "Close account menu", onClick: () => setProfile(false) }) : false,
    open ? h("div", { class: "profile-menu" },
      h("strong", null, store.data.profile.name),
      h("span", null, "Everything stays in this browser"),
      h("hr"),
      h("button", { type: "button", onClick: () => go("settings") }, icon(Settings2, 16), "Workspace settings"),
      h("button", { type: "button", onClick: () => { setProfile(false); GlobalSearch(); } }, icon(Search, 16), "Search your workspace"),
      h("button", { type: "button", onClick: () => { setProfile(false); HelpDialog(); } }, icon(CircleHelp, 16), "Help & tips")) : false);
}

/* ------------------------------------------------------------- views */

function viewFor(view: View): PageResult {
  switch (view) {
    case "translate": return TranslatePage();
    case "phrasebook": return PhrasebookPage(false);
    case "history": return PhrasebookPage(true);
    case "learn": return LearnPage();
    case "collections": return CollectionsPage();
    case "settings": return SettingsPage();
    default: return OverviewPage();
  }
}

function renderView() {
  const page = route.view === "learn" ? LearnPage() : viewFor(route.view);
  currentRefresh = page.refresh;
  replace(viewHost, page.element);
  paintNav();
  setMobile(false);
}

/* ----------------------------------------------------------- dialogs */

export function GlobalSearch(): void {
  let query = "";
  const results = h("div", null);

  function paint() {
    const value = query.trim().toLowerCase();
    if (!value) {
      results.className = "search-quick-links";
      replace(results, 
        h("span", { class: "eyebrow" }, "A GOOD PLACE TO START"),
        ...nav.map((item) => h("button", { type: "button", onClick: () => { close(); go(item.view); } },
          icon(item.node, 18), h("span", null, item.label), icon(ArrowUpRight, 15))));
      return;
    }
    results.className = "search-results";
    const phrases = store.data.translations.filter((item) => `${item.sourceText} ${item.translatedText}`.toLowerCase().includes(value)).slice(0, 5);
    const folders = store.data.collections.filter((item) => item.title.toLowerCase().includes(value)).slice(0, 3);
    const found = languages.filter((item) => `${item.name} ${item.native}`.toLowerCase().includes(value)).slice(0, 3);
    const children: Node[] = [];
    if (phrases.length) {
      children.push(h("span", { class: "eyebrow" }, "YOUR WORDS"),
        ...phrases.map((item) => h("button", { type: "button", onClick: () => { close(); PhraseEditor(item); } },
          h("span", { class: "search-result-icon" }, getLanguage(item.targetLang).flag),
          h("span", null, h("strong", null, item.sourceText), h("small", null, item.translatedText)),
          icon(ArrowUpRight, 15))));
    }
    if (folders.length) {
      children.push(h("span", { class: "eyebrow" }, "COLLECTIONS"),
        ...folders.map((item) => h("button", { type: "button", onClick: () => { close(); openPhrasebook(item.id); } },
          icon(Folders, 20),
          h("span", null, h("strong", null, item.title), h("small", null, item.description)),
          icon(ArrowUpRight, 15))));
    }
    if (found.length) {
      children.push(h("span", { class: "eyebrow" }, "LANGUAGES TO EXPLORE"),
        ...found.map((item) => h("button", { type: "button", onClick: () => { close(); LessonDialog(item.code); } },
          h("span", { class: "search-result-icon" }, item.flag),
          h("span", null, h("strong", null, item.name), h("small", null, item.region)),
          icon(ArrowUpRight, 15))));
    }
    if (!children.length) {
      children.push(h("div", { class: "search-empty" },
        icon(Search, 27),
        h("h3", null, "Not quite the right words."),
        h("p", null, "Try a phrase, language, or collection name.")));
    }
    replace(results, ...children);
  }

  const body = h("div", { class: "global-search-body" },
    searchField("", (value) => { query = value; paint(); }, "What are you looking for?"),
    results,
    h("div", { class: "search-shortcut" }, h("kbd", null, "esc"), " to return to your workspace"));

  const close = openModal({ title: "A word, a phrase, a possibility…", subtitle: "Find something in your workspace.", className: "search-modal", body: [body] });
  paint();
}

function HelpDialog(): void {
  const close = openModal({
    title: "A little help goes a long way.",
    subtitle: "Make the most of your Salita workspace.",
    body: [h("div", { class: "help-content" },
      h("div", { class: "help-intro" },
        sectionIcon(CircleHelp, "mint", 23),
        h("p", null, "Salita means ", h("strong", null, "“word”"), " in Filipino. We’re here to make new words feel a little more familiar.")),
      details("How does translation work?", true,
        "Choose your source and target languages, enter your text, and press Translate. Your saved wording and the curated phrase library are checked first, so everyday phrases never need the internet. Anything else is sent to a live provider — your own LibreTranslate instance if you configured one in Settings, otherwise MyMemory and then Google’s public endpoint — with a 500-byte request limit. Machine results are labelled so you can review nuance."),
      details("Which Philippine languages can I explore?", false,
        "Filipino, Cebuano, Ilocano, Hiligaynon, Waray, Kapampangan, Pangasinan, and Bikol. Live translation coverage varies for regional languages, but everyday phrases and beginner lessons are always available."),
      details("How do I keep a useful phrase?", false,
        "Click the bookmark on a translation. You can edit it, add your own phrases, and organize everything into collections in My phrasebook."),
      details("Will my learning progress be saved?", false,
        "Yes. Complete the three practice questions in a lesson and your progress is saved in this browser. Your activity also builds your learning streak."),
      details("Where is my data?", false,
        "This is the static build of Salita, published for GitHub Pages. There is no account and no server: phrases, collections, and progress live in your browser’s local storage on this device. Export a copy from Settings, or reset to the starter workspace at any time."),
      details("What about the full application?", false,
        "This repository also contains the complete Salita app — a Next.js workspace with PostgreSQL, accounts, and server-side translation. Run it locally with npm install, npm run dev, and the DATABASE_URL from .env.example."),
      h("button", { class: "button primary help-action", type: "button", onClick: () => { close(); navigate("learn"); } }, "Find your next lesson", icon(ArrowUpRight, 16)))],
  });
}

function details(summary: string, open: boolean, text: string): HTMLElement {
  return h("details", { ...(open ? { open: true } : {}) },
    h("summary", null, summary, icon(ChevronDown, 15)),
    h("p", null, text));
}

function ActivityDialog(): void {
  const streak = getStreak(store.data.activity);
  const lessons = store.data.progress.reduce((total, item) => total + item.completed, 0);
  const close = openModal({
    title: "A little encouragement.",
    subtitle: "Small steps are still steps forward.",
    className: "activity-modal",
    body: [h("div", { class: "activity-list" },
      h("div", null,
        sectionIcon(Flame, "peach"),
        h("span", null,
          h("strong", null, streak ? `A ${streak}-day streak. Look at you!` : "Today is a lovely day to begin."),
          h("p", null, streak ? "Keep the connection going with a short lesson today." : "Your first lesson is the start of something good."))),
      h("div", null,
        sectionIcon(GraduationCap, "mint"),
        h("span", null,
          h("strong", null, `${lessons} little milestones`),
          h("p", null, `You’ve completed ${lessons} lessons. Every word makes a difference.`))),
      h("div", null,
        sectionIcon(Globe2, "blue"),
        h("span", null,
          h("strong", null, "A world of new possibilities"),
          h("p", null, `${nativeLanguages.length} Philippine languages — from Filipino to Bikol — are ready to explore.`))),
      h("button", { class: "button primary", type: "button", onClick: () => { close(); navigate("learn"); } }, "Make time for a little learning", icon(ArrowUpRight, 16)),
      h("p", { class: "activity-bottom" }, icon(Check, 13), "You’re right where you need to be."))],
  });
}

/* ------------------------------------------------------------- shell */

function buildShell(): HTMLElement {
  replace(sidebar, 
    h("div", { class: "sidebar-brand" },
      h("button", { class: "brand-button", type: "button", "aria-label": "Salita home", onClick: () => go("overview") }, brand()),
      h("span", { class: "brand-tagline" }, "A world of understanding."),
      iconButton("Close navigation", icon(X, 21), () => setMobile(false), "mobile-close")),
    h("nav", { "aria-label": "Main navigation" },
      h("div", { class: "nav-group-label" }, "YOUR WORKSPACE"),
      h("div", { class: "nav-group" }, ...nav.map(navItem)),
      h("div", { class: "nav-group-label library-label" }, "YOUR LIBRARY"),
      h("div", { class: "nav-group" }, ...libraryNav.map(navItem))),
    h("div", { class: "sidebar-bottom" },
      h("div", { class: "sidebar-inspiration" },
        h("span", { class: "inspiration-icon" }, icon(Sparkles, 19, { strokeWidth: 1.6 })),
        h("span", { class: "inspiration-decor", "aria-hidden": "true" }, "✳"),
        h("h3", null, "Small words.", h("br"), "Big possibilities."),
        h("p", null, "Your next connection", h("br"), "starts with a hello."),
        h("button", { type: "button", onClick: () => go("learn") }, "Explore languages", icon(ArrowUpRight, 15))),
      h("div", { class: "sidebar-utilities" },
        h("button", { class: "nav-item", type: "button", onClick: () => go("settings") }, icon(Settings2, 19, { strokeWidth: 1.7 }), h("span", null, "Settings")),
        h("button", { class: "nav-item", type: "button", onClick: () => { setMobile(false); HelpDialog(); } }, icon(CircleHelp, 19, { strokeWidth: 1.7 }), h("span", null, "Help & tips"), icon(ArrowUpRight, 13))),
      sidebarUser));

  sidebarUser.addEventListener("click", () => go("settings"));

  const topbar = h("header", { class: "topbar" },
    h("div", { class: "breadcrumbs" },
      iconButton("Open navigation", icon(Menu, 21), () => setMobile(true), "mobile-menu"),
      icon(PanelLeft, 18, { className: "breadcrumb-icon" }),
      h("button", { type: "button", onClick: () => go("overview") }, "Workspace"),
      icon(ChevronRight, 13),
      breadcrumbTitle),
    h("div", { class: "topbar-actions" },
      h("button", { class: "global-search-trigger", type: "button", onClick: () => GlobalSearch() }, icon(Search, 15), h("span", null, "Search anything..."), h("kbd", null, "⌘ K")),
      h("button", { class: "sign-in-link", type: "button", onClick: () => HelpDialog() }, "How this works", icon(ArrowUpRight, 12)),
      iconButton("Your activity and reminders", [icon(Bell, 19), h("span", { class: "notification-dot" })], () => ActivityDialog(), "notification-trigger"),
      h("span", { class: "topbar-divider" }),
      profileControl));

  const main = h("div", { class: "main-shell" },
    topbar,
    h("main", { class: "main-content", id: "main-content" },
      viewHost,
      h("footer", { class: "workspace-footer" },
        h("span", null, "Made for meaningful connections."),
        h("span", null, h("span", { class: "tiny-dot" }), "A little ", h("em", null, "malasakit"), ", in every word", h("span", { class: "footer-flag" }, "🇵🇭")))));

  return h("div", { class: "app-shell" }, sidebar, main);
}

/** Point the canonical link at wherever this file is actually hosted. */
function paintCanonical() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]') || document.createElement("link");
  link.rel = "canonical";
  link.href = window.location.href.split("#")[0];
  document.head.appendChild(link);
}

function boot() {
  paintCanonical();
  route.view = viewFromHash();
  const shell = buildShell();
  replace(document.body, shell);
  paintUser();
  setProfile(false);
  setRenderer(renderView);
  renderView();

  store.subscribe(() => {
    paintNav();
    paintUser();
    setProfile(profileOpen);
    currentRefresh?.();
  });

  window.addEventListener("popstate", () => { route.view = viewFromHash(); renderView(); });
  window.addEventListener("keydown", (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); GlobalSearch(); return; }
    if (event.key === "Escape") { setMobile(false); setProfile(false); }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
