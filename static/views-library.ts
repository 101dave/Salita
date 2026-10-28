/** Phrasebook, translation history, collections, and settings. */
import {
  ArrowDownToLine, ArrowLeft, ArrowUpRight, BookOpen, Bookmark, ChevronDown, Download, FolderOpen,
  History, Languages, Pencil, Plus, RefreshCcw, Server, Settings2, ShieldCheck, Trash2, Upload, Volume2, Check,
} from "lucide";
import type { Collection, Phrase } from "./core";
import { emptyState, formatDate, getLanguage, h, icon, iconButton, languages, notify, replace, searchField, sectionIcon, speak, spinner, store } from "./core";
import { CollectionEditor, DeleteDialog, PhraseEditor } from "./editors";
import { navigate, openPhrasebook, route } from "./state";

interface PageResult { element: HTMLElement; refresh?: () => void }

/* ------------------------------------------------------- phrasebook */

export function PhrasebookPage(history = false): PageResult {
  let query = "";
  let languageFilter = "all";
  let sortNewest = true;

  const backLink = h("button", { class: "back-link", onClick: () => { route.collection = null; navigate("collections"); } }, icon(ArrowLeft, 15), "Back to collections");
  const title = h("h1", null);
  const subtitle = h("p", null);
  const summary = h("div", { class: "library-summary" });
  const languageSelect = h("select", { "aria-label": "Filter by language", onChange: (event: Event) => { languageFilter = (event.target as HTMLSelectElement).value; paintResults(); } }) as HTMLSelectElement;
  const collectionSelect = h("select", { "aria-label": "Filter by collection", onChange: (event: Event) => { route.collection = (event.target as HTMLSelectElement).value || null; paintResults(); paintHeading(); } }) as HTMLSelectElement;
  const sortButton = h("button", { class: "button secondary sort-button", onClick: () => { sortNewest = !sortNewest; paintSort(); paintResults(); } });
  const results = h("div", null);

  function collection(): Collection | undefined {
    return history ? undefined : store.data.collections.find((item) => item.id === route.collection);
  }
  function base(): Phrase[] {
    return store.data.translations.filter((item) => history || item.saved);
  }
  function filtered(): Phrase[] {
    const folder = collection();
    const list = base().filter((item) => (history || !folder || item.collectionId === folder.id)
      && (languageFilter === "all" || item.targetLang === languageFilter)
      && `${item.sourceText} ${item.translatedText} ${getLanguage(item.targetLang).name}`.toLowerCase().includes(query.toLowerCase()));
    return sortNewest ? list : [...list].reverse();
  }

  function paintHeading() {
    const folder = collection();
    replace(title, history ? "Your words, along the way" : folder ? folder.title : "Words worth keeping", h("span", { class: "green-period" }, "."));
    subtitle.textContent = history ? "A little history of the connections you’ve made." : folder ? folder.description : "Your pocket phrasebook. Ready for the right moment.";
    if (folder && !backLink.isConnected) element.insertBefore(backLink, element.firstChild);
    if (!folder && backLink.isConnected) backLink.remove();
  }

  function paintSummary() {
    const items = base();
    const used = languages.filter((item) => items.some((translation) => translation.targetLang === item.code));
    replace(summary, 
      h("span", null, icon(Bookmark, 16), `${items.length} ${history ? "translations" : "saved phrases"}`),
      h("span", null, icon(Languages, 16), `${used.length} languages`),
      history ? false : h("span", null, icon(FolderOpen, 16), `${store.data.collections.length} collections`));

    const keep = languageFilter !== "all" && used.some((item) => item.code === languageFilter) ? languageFilter : "all";
    languageFilter = keep;
    replace(languageSelect, 
      h("option", { value: "all" }, "All languages"),
      ...used.map((item) => h("option", { value: item.code }, `${item.flag} ${item.name}`)));
    languageSelect.value = keep;

    if (!history) {
      replace(collectionSelect, 
        h("option", { value: "" }, "All collections"),
        ...store.data.collections.map((item) => h("option", { value: item.id }, item.title)));
      collectionSelect.value = route.collection || "";
    }
  }

  function paintSort() {
    replace(sortButton, sortNewest ? "Newest first" : "Oldest first", icon(ChevronDown, 14));
  }

  function paintResults() {
    const list = filtered();
    if (!list.length) {
      const filtering = Boolean(query) || languageFilter !== "all";
      replace(results, emptyState(history ? History : BookOpen,
        filtering ? "Those words aren’t here yet" : "Make room for meaningful words",
        filtering ? "Try another search or a different language filter." : "Save a translation or add your first phrase. Your next connection starts here.",
        filtering
          ? { label: "Clear filters", onClick: () => { query = ""; languageFilter = "all"; paintSummary(); paintResults(); } }
          : { label: "Add your first phrase", onClick: () => PhraseEditor() }));
      return;
    }
    const rows = list.map((phrase) => h("tr", null,
      h("td", null,
        h("span", { class: "table-source" }, phrase.sourceText),
        h("span", { class: "table-date" }, `${formatDate(phrase.createdAt)} · ${getLanguage(phrase.sourceLang).name}`)),
      h("td", null,
        h("span", { class: "table-translation", dir: "auto" }, phrase.translatedText),
        h("button", { class: "inline-listen", "aria-label": `Listen to ${phrase.translatedText}`, onClick: () => speak(phrase.translatedText, phrase.targetLang) }, icon(Volume2, 13))),
      h("td", null,
        h("span", { class: "language-badge" }, getLanguage(phrase.targetLang).flag, h("span", null, getLanguage(phrase.targetLang).name))),
      h("td", { class: "collection-column" },
        h("span", { class: "table-collection" }, store.data.collections.find((item) => item.id === phrase.collectionId)?.title || "—")),
      h("td", null,
        h("div", { class: "row-actions" },
          iconButton(phrase.saved ? "Unsave phrase" : "Save to phrasebook", icon(Bookmark, 15, { fill: phrase.saved ? "currentColor" : "none" }), () => {
            store.toggleSaved(phrase.id);
            notify(phrase.saved ? "Removed from your phrasebook." : "Added to your phrasebook.");
          }, phrase.saved ? "is-saved" : ""),
          iconButton("Edit phrase", icon(Pencil, 15), () => PhraseEditor(phrase)),
          iconButton("Delete phrase", icon(Trash2, 15), () => DeleteDialog({
            title: "Let this phrase go?",
            description: `“${phrase.sourceText}” will be permanently removed from your phrasebook and translation history.`,
            onConfirm: () => { store.removeTranslation(phrase.id); notify("Phrase deleted."); },
          }), "delete-action")))));

    replace(results, 
      h("div", { class: "phrase-table-wrap" },
        h("table", { class: "phrase-table" },
          h("thead", null, h("tr", null,
            h("th", null, "ORIGINAL PHRASE"),
            h("th", null, "TRANSLATION"),
            h("th", null, "LANGUAGE"),
            h("th", { class: "collection-column" }, "COLLECTION"),
            h("th", { class: "actions-column" }, h("span", { class: "visually-hidden" }, "Actions")))),
          h("tbody", null, ...rows))),
      h("div", { class: "table-footer" },
        h("span", null, `${list.length} ${list.length === 1 ? "phrase" : "phrases"}${query ? ` matching “${query}”` : " · A little more prepared for your next conversation."}`),
        icon(BookOpen, 16)));
  }

  const element = h("div", null,
    h("div", { class: "page-heading" },
      h("div", null, title, subtitle),
      h("button", { class: "button primary", onClick: () => PhraseEditor() }, icon(Plus, 17), "Add phrase")),
    summary,
    h("section", { class: "card phrasebook-card" },
      h("div", { class: "resource-toolbar" },
        searchField("", (value) => { query = value; paintResults(); }, history ? "Search your translation history…" : "Find the words you need…"),
        h("div", { class: "resource-filters" }, languageSelect, history ? false : collectionSelect, sortButton)),
      results));

  paintHeading();
  paintSummary();
  paintSort();
  paintResults();
  return { element, refresh: () => { paintHeading(); paintSummary(); paintResults(); } };
}

/* ------------------------------------------------------ collections */

export function CollectionsPage(): PageResult {
  let query = "";
  const toolbarCount = h("span", null);
  const grid = h("div", { class: "collections-grid" });
  const empty = h("div", null);
  const results = h("div", null, grid);

  function open(id: string) { openPhrasebook(id); }

  function card(collection: Collection): HTMLElement {
    const items = store.data.translations.filter((item) => item.collectionId === collection.id && item.saved);
    return h("article", { class: "collection-card card" },
      h("div", { class: `collection-card-top color-${collection.color}` },
        h("span", { class: "collection-folder" }, icon(FolderOpen, 31, { strokeWidth: 1.5 })),
        h("div", { class: "collection-actions" },
          iconButton(`Edit ${collection.title}`, icon(Pencil, 16), () => CollectionEditor(collection)),
          iconButton(`Delete ${collection.title}`, icon(Trash2, 16), () => DeleteDialog({
            title: "Delete this collection?",
            description: `“${collection.title}” will be removed. Don’t worry — the phrases inside will stay in your phrasebook.`,
            onConfirm: () => {
              store.removeCollection(collection.id);
              if (route.collection === collection.id) route.collection = null;
              notify("Collection deleted. Your phrases are still in your phrasebook.");
            },
          }))),
        h("span", { class: "collection-count" }, `${items.length} ${items.length === 1 ? "phrase" : "phrases"}`)),
      h("div", { class: "collection-card-content" },
        h("button", { class: "collection-title", onClick: () => open(collection.id) }, collection.title, icon(ArrowUpRight, 19)),
        h("p", null, collection.description || "A fresh page for words worth keeping."),
        h("div", { class: "collection-preview-list" },
          items.length
            ? items.slice(0, 3).map((item) => h("span", null, getLanguage(item.targetLang).flag, h("span", null, item.translatedText)))
            : h("span", { class: "collection-empty" }, "Your first phrase is waiting to be added.")),
        h("button", { class: "text-button", onClick: () => open(collection.id) }, "Open collection", icon(ArrowUpRight, 15))));
  }

  function paint() {
    const filtered = store.data.collections.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
    toolbarCount.textContent = `${store.data.collections.length} collections · ${store.data.translations.filter((item) => item.saved && item.collectionId).length} organized phrases`;
    if (filtered.length) {
      replace(grid, ...filtered.map(card),
        h("button", { class: "new-collection-card", onClick: () => CollectionEditor() },
          h("span", null, icon(Plus, 25, { strokeWidth: 1.5 })),
          h("h3", null, "A new possibility"),
          h("p", null, "Make a home for your next set of words.")));
      replace(results, grid);
      return;
    }
    replace(empty, emptyState(FolderOpen,
      query ? "No collections found" : "Good words deserve a home",
      query ? "Try another name or start a new collection." : "Group your favorite phrases for travel, everyday life, or something entirely your own.",
      { label: "Create collection", onClick: () => CollectionEditor() }));
    replace(results, empty);
  }

  const element = h("div", null,
    h("div", { class: "page-heading" },
      h("div", null,
        h("h1", null, "A place for every possibility", h("span", { class: "green-period" }, ".")),
        h("p", null, "Thoughtful little collections for wherever you’re headed.")),
      h("button", { class: "button primary", onClick: () => CollectionEditor() }, icon(Plus, 17), "New collection")),
    h("div", { class: "collection-toolbar" },
      toolbarCount,
      searchField("", (value) => { query = value; paint(); }, "Find a collection…")),
    results);

  paint();
  return { element, refresh: paint };
}

/* --------------------------------------------------------- settings */

export function SettingsPage(): PageResult {
  const nameField = h("input", { required: true, minLength: 2, maxLength: 80 }) as HTMLInputElement;
  nameField.value = store.data.profile.name;
  const goalField = h("select", { "aria-label": "A little learning, every day" },
    ...[5, 10, 15, 20, 30, 60].map((value) => h("option", { value: String(value) }, `${value} minutes a day${value === 10 ? " · A lovely place to start" : ""}`))) as HTMLSelectElement;
  goalField.value = String(store.data.profile.dailyGoal);
  const avatar = h("div", { class: "profile-settings-avatar" });
  const saveButton = h("button", { type: "submit", class: "button primary" }, icon(Check, 16), "Save changes");

  const libreUrl = h("input", { type: "url", placeholder: "https://translate.example.com", "aria-label": "LibreTranslate URL" }) as HTMLInputElement;
  libreUrl.value = store.prefs.libreUrl;
  const libreKey = h("input", { type: "password", placeholder: "Optional API key", "aria-label": "LibreTranslate API key", autoComplete: "off" }) as HTMLInputElement;
  libreKey.value = store.prefs.libreKey;

  const importInput = h("input", {
    type: "file",
    accept: "application/json,.json",
    class: "visually-hidden",
    "aria-label": "Import a workspace file",
    onChange: async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as { translations?: Phrase[]; collections?: Collection[] };
        if (!Array.isArray(parsed.translations) || !Array.isArray(parsed.collections)) throw new Error("shape");
        store.replace({
          profile: store.data.profile,
          translations: parsed.translations,
          collections: parsed.collections,
          progress: Array.isArray((parsed as { progress?: unknown[] }).progress) ? (parsed as { progress: typeof store.data.progress }).progress : [],
          activity: Array.isArray((parsed as { activity?: unknown[] }).activity) ? (parsed as { activity: typeof store.data.activity }).activity : [],
        });
        notify("Your workspace file is loaded.");
      } catch {
        notify("That file doesn’t look like a Salita workspace export.", "error");
      }
      input.value = "";
    },
  });

  function paintAvatar() {
    replace(avatar, 
      document.createTextNode(store.data.profile.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()),
      h("span", null, icon(Check, 13)));
  }

  const element = h("div", null,
    h("div", { class: "page-heading" },
      h("div", null,
        h("h1", null, "Make yourself at home", h("span", { class: "green-period" }, ".")),
        h("p", null, "Your account, your learning rhythm, your little corner of the world."))),
    h("div", { class: "settings-layout" },
      h("section", { class: "card settings-card" },
        h("div", { class: "settings-section-heading" },
          sectionIcon(Settings2, "mint"),
          h("div", null, h("h2", null, "Personal details"), h("p", null, "A familiar face behind every new connection."))),
        h("form", {
          class: "editor-form",
          onSubmit: (event: Event) => {
            event.preventDefault();
            const name = nameField.value.trim();
            if (name.length < 2) { notify("Please tell us what to call you.", "error"); return; }
            replace(saveButton, spinner(16), "Save changes");
            store.setProfile({ name, dailyGoal: Number(goalField.value) || 10 });
            replace(saveButton, icon(Check, 16), "Save changes");
            paintAvatar();
            notify("Your workspace, a little more you. Settings saved.");
          },
        },
        avatar,
        h("label", null, "Your name", nameField),
        h("label", null, "Where your words live",
          h("input", { value: "This browser · local storage", readOnly: true, class: "read-only", "aria-label": "Where your words live" }),
          h("span", { class: "field-help" }, "This is the static Salita build. Nothing is uploaded — phrases, collections, and lesson progress stay on this device.")),
        h("label", null, "A little learning, every day", goalField),
        h("div", { class: "settings-save" }, saveButton))),
      h("div", { class: "settings-side" },
        h("section", { class: "card settings-card" },
          sectionIcon(ShieldCheck, "blue"),
          h("h2", null, "Your words belong to you"),
          h("p", null, "Curated phrases and everything you save work offline in this browser. Export a copy any time, or start again with a fresh workspace."),
          h("button", {
            class: "button secondary",
            onClick: () => DeleteDialog({
              title: "Start with a fresh workspace?",
              description: "Your phrases, collections, and lesson progress in this browser will be replaced with the starter workspace. Export a copy first if you’d like to keep them.",
              onConfirm: () => { store.reset(); notify("A fresh workspace, ready for new words."); },
            }),
          }, icon(RefreshCcw, 16), "Reset workspace")),
        h("section", { class: "card settings-card" },
          sectionIcon(ArrowDownToLine, "peach"),
          h("h2", null, "Take your words with you"),
          h("p", null, "Download your phrasebook, collections, and learning progress as a JSON file — or load one you saved earlier."),
          h("button", {
            class: "button secondary",
            onClick: () => {
              const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const anchor = h("a", { href: url, download: "salita-workspace.json" }) as HTMLAnchorElement;
              anchor.click();
              URL.revokeObjectURL(url);
              notify("Your workspace export is ready.");
            },
          }, icon(Download, 16), "Export workspace"),
          h("button", { class: "button secondary", onClick: () => importInput.click(), style: { marginTop: "9px" } }, icon(Upload, 16), "Import workspace"),
          importInput),
        h("section", { class: "card settings-card" },
          sectionIcon(Server, "mint"),
          h("h2", null, "Live translation"),
          h("p", null, "Optional. Point Salita at your own LibreTranslate instance for private machine translation. Without one, uncatalogued text falls back to MyMemory and then Google’s public endpoint — and curated phrases keep working offline."),
          h("form", {
            class: "editor-form",
            style: { padding: "0", gap: "13px", marginTop: "17px" },
            onSubmit: (event: Event) => {
              event.preventDefault();
              store.prefs = { libreUrl: libreUrl.value.trim(), libreKey: libreKey.value.trim() };
              store.savePrefs();
              notify(store.prefs.libreUrl ? "Live translation will try your LibreTranslate instance first." : "Using the public translation fallbacks.");
            },
          },
          h("label", null, "LibreTranslate URL", libreUrl),
          h("label", null, "API key ", h("span", { class: "optional" }, "optional"), libreKey),
          h("button", { class: "button primary", type: "submit" }, icon(Check, 16), "Save provider"))))));

  paintAvatar();
  return { element, refresh: paintAvatar };
}
