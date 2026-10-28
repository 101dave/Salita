/**
 * Shared building blocks for the static Salita build: a tiny DOM helper,
 * Lucide icon rendering, the browser-local workspace store, toasts, and modals.
 * Everything here runs in the browser with no server and no database.
 */
import type { IconNode } from "lucide";
import { ArrowRight, Check, CircleAlert, LoaderCircle, Search, X } from "lucide";
import { getStreak } from "@/lib/client";
import { getLanguage, languages, nativeLanguages, phrases as curatedPhraseList } from "@/lib/languages";

export type Child = Node | string | number | null | undefined | false | Child[];
export type Props = Record<string, unknown>;

export { getLanguage, getStreak, languages, nativeLanguages };

/* ------------------------------------------------------------------ DOM */

export function h(tag: string, props?: Props | null, ...children: Child[]): HTMLElement {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class" || key === "className") element.className = String(value);
    else if (key === "text") element.textContent = String(value);
    else if (key === "style" && typeof value === "object") Object.assign(element.style, value as Record<string, string>);
    else if (key === "dataset") Object.assign(element.dataset, value as Record<string, string>);
    else if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === "value" || key === "disabled" || key === "checked" || key === "readOnly" || key === "selected") {
      (element as unknown as Record<string, unknown>)[key] = value;
    } else if (key === "htmlFor") element.setAttribute("for", String(value));
    else if (typeof value === "boolean") { if (value) element.setAttribute(key, ""); }
    else element.setAttribute(key, String(value));
  }
  append(element, children);
  return element;
}

export function svgElement(tag: string, attrs: Record<string, string | number | undefined>): Element {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) if (value !== undefined) node.setAttribute(key, String(value));
  return node;
}

/** Swap a node's children, tolerating `false`, arrays, strings, and nodes. */
export function replace(parent: Element, ...children: Child[]): void {
  parent.textContent = "";
  append(parent, children);
}

function append(parent: Element, children: Child[]) {
  for (const child of children) {
    if (child === null || child === undefined || typeof child === "boolean") continue;
    if (Array.isArray(child)) append(parent, child);
    else if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
}

/** Render a Lucide icon node the same way lucide-react would. */
export function icon(node: IconNode, size = 18, options: { strokeWidth?: number; fill?: string; className?: string } = {}): SVGSVGElement {
  const svg = svgElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: options.fill || "none",
    stroke: "currentColor",
    "stroke-width": options.strokeWidth ?? 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    class: options.className,
  }) as SVGSVGElement;
  for (const [tag, attrs] of node) svg.appendChild(svgElement(tag, attrs));
  return svg;
}

export function iconButton(label: string, children: Node | Node[], onClick: () => void, className = "", extra: Props = {}): HTMLButtonElement {
  const button = h("button", { type: "button", class: `icon-button ${className}`.trim(), title: label, "aria-label": label, onClick, ...extra }) as HTMLButtonElement;
  append(button, Array.isArray(children) ? children : [children]);
  return button;
}

export function spinner(size = 18): SVGSVGElement {
  return icon(LoaderCircle, size, { className: "spinner" });
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function uid(): string {
  const random = globalThis.crypto as Crypto | undefined;
  if (random?.randomUUID) return random.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* --------------------------------------------------------------- toasts */

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function notify(message: string, type: "success" | "error" = "success"): void {
  document.querySelector(".toast")?.remove();
  if (toastTimer) clearTimeout(toastTimer);
  const toast = h("div", { class: `toast toast-${type}`, role: "status" },
    h("span", { class: "toast-symbol" }, icon(type === "success" ? Check : CircleAlert, 16)),
    h("span", null, message),
    h("button", { "aria-label": "Dismiss notification", onClick: () => toast.remove() }, icon(X, 16)));
  document.body.appendChild(toast);
  toastTimer = setTimeout(() => toast.remove(), 5000);
}

/* ---------------------------------------------------------------- audio */

export function speak(text: string, language: string, onError: (message: string, type?: "success" | "error") => void = notify): void {
  if (!("speechSynthesis" in window)) { onError("Your browser doesn’t support audio pronunciation. Try Chrome or Edge.", "error"); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "tl" ? "fil-PH" : language === "ceb" ? "ceb-PH" : language;
  utterance.rate = 0.85;
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith(utterance.lang.split("-")[0]));
  if (voice) utterance.voice = voice;
  utterance.onerror = (event) => { if (event.error !== "interrupted" && event.error !== "canceled") onError("Audio isn’t available for this language on your device.", "error"); };
  window.speechSynthesis.speak(utterance);
}

/* --------------------------------------------------------------- modals */

export interface ModalOptions {
  title: string;
  subtitle?: string;
  className?: string;
  body: Child[];
  onClose?: () => void;
}

export function openModal(options: ModalOptions): () => void {
  const id = `modal-${uid()}`;
  const previous = document.activeElement as HTMLElement | null;
  const oldOverflow = document.body.style.overflow;
  let closed = false;

  const panel = h("div", {
    class: `modal ${options.className || ""}`.trim(),
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": id,
    tabIndex: -1,
  },
  h("div", { class: "modal-header" },
    h("div", null, h("h2", { id }, options.title), options.subtitle ? h("p", null, options.subtitle) : false),
    iconButton("Close dialog", icon(X, 20), () => close())),
  ...options.body);

  const backdrop = h("div", { class: "modal-backdrop" }, panel);
  backdrop.addEventListener("mousedown", (event) => { if (event.target === backdrop) close(); });

  function focusable(): HTMLElement[] {
    return Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'));
  }
  function keydown(event: KeyboardEvent) {
    if (event.key === "Escape") { event.stopPropagation(); close(); }
    if (event.key !== "Tab") return;
    const elements = focusable();
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", keydown, true);
    backdrop.remove();
    if (!document.querySelector(".modal-backdrop")) document.body.style.overflow = oldOverflow;
    previous?.focus();
    options.onClose?.();
  }

  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", keydown, true);
  document.body.appendChild(backdrop);
  const autofocus = panel.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, [autofocus]');
  (autofocus || focusable()[0] || panel).focus();
  return close;
}

/* ---------------------------------------------------------------- store */

export interface Phrase {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  saved: boolean;
  collectionId: string | null;
  createdAt: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface Progress { language: string; completed: number; updatedAt: string }
export interface Activity { language: string; completedAt: string }
export interface Profile { name: string; dailyGoal: number }

export interface Workspace {
  profile: Profile;
  translations: Phrase[];
  collections: Collection[];
  progress: Progress[];
  activity: Activity[];
}

/** Optional self-hosted provider, kept out of the workspace export. */
export interface Prefs { libreUrl: string; libreKey: string }

const WORKSPACE_KEY = "salita.workspace.v1";
const PREFS_KEY = "salita.prefs.v1";
const memory: Record<string, string> = {};

function read(key: string): string | null {
  try { return window.localStorage.getItem(key) ?? memory[key] ?? null; }
  catch { return memory[key] ?? null; }
}

function write(key: string, value: string): boolean {
  memory[key] = value;
  try { window.localStorage.setItem(key, value); return true; }
  catch { return false; }
}

/** Mirrors the seeded demo workspace so the static build feels lived-in. */
function seedWorkspace(): Workspace {
  const now = Date.now();
  const collections: Collection[] = [
    { id: uid(), title: "Everyday essentials", description: "Little phrases that open big conversations.", color: "green", createdAt: new Date(now - 90000).toISOString() },
    { id: uid(), title: "Island adventures", description: "Your pocket companion for the next adventure.", color: "blue", createdAt: new Date(now - 80000).toISOString() },
    { id: uid(), title: "Food & good company", description: "From a local karinderya to the family table.", color: "orange", createdAt: new Date(now - 70000).toISOString() },
  ];
  const translations: Phrase[] = [];
  const selections = [
    { code: "tl", indices: [1, 2, 7, 8, 0, 3, 4, 5] },
    { code: "ceb", indices: [1, 2, 7, 8, 0, 3, 6, 9] },
    { code: "ilo", indices: [0, 1, 2, 8] },
    { code: "hil", indices: [1, 2] },
    { code: "war", indices: [1] },
    { code: "pam", indices: [2] },
  ];
  const phraseBook = curatedPhraseList;
  for (const selection of selections) {
    for (const index of selection.indices) {
      const phrase = phraseBook[index];
      const group = index === 7 ? 1 : index === 8 ? 2 : 0;
      translations.push({
        id: uid(),
        sourceText: phrase.en,
        translatedText: phrase[selection.code as keyof typeof phrase] as string,
        sourceLang: "en",
        targetLang: selection.code,
        saved: true,
        collectionId: collections[group].id,
        createdAt: new Date(now - translations.length * 47 * 60000).toISOString(),
      });
    }
  }
  const history: [string, string, string][] = [
    ["A beautiful day", "Isang magandang araw", "tl"], ["See you soon", "Hasta pronto", "es"],
    ["Thank you very much", "どうもありがとうございます", "ja"], ["Good night", "Maayong gabii", "ceb"],
    ["Where is the beach?", "Saan ang dalampasigan?", "tl"], ["Let's go", "Tara na", "tl"],
    ["Welcome home", "Bienvenue à la maison", "fr"], ["One coffee, please", "Isang kape, pakiusap", "tl"],
  ];
  history.forEach(([sourceText, translatedText, targetLang], index) => translations.push({
    id: uid(), sourceText, translatedText, sourceLang: "en", targetLang, saved: false, collectionId: null,
    createdAt: new Date(now - (24 + index) * 47 * 60000).toISOString(),
  }));
  return {
    profile: { name: "Alex Morgan", dailyGoal: 10 },
    translations,
    collections,
    progress: [
      { language: "tl", completed: 3, updatedAt: new Date(now - 86400000).toISOString() },
      { language: "ceb", completed: 1, updatedAt: new Date(now - 2 * 86400000).toISOString() },
      { language: "ilo", completed: 0, updatedAt: new Date(now - 3 * 86400000).toISOString() },
    ],
    activity: Array.from({ length: 7 }, (_, index) => ({ language: index % 2 ? "ceb" : "tl", completedAt: new Date(now - index * 86400000).toISOString() })),
  };
}

function loadWorkspace(): Workspace {
  const raw = read(WORKSPACE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Workspace>;
      if (Array.isArray(parsed.translations) && Array.isArray(parsed.collections)) {
        return {
          profile: { name: parsed.profile?.name || "Alex Morgan", dailyGoal: Number(parsed.profile?.dailyGoal) || 10 },
          translations: parsed.translations,
          collections: parsed.collections,
          progress: parsed.progress || [],
          activity: parsed.activity || [],
        };
      }
    } catch { /* a corrupted copy simply falls back to the seeded workspace */ }
  }
  const seeded = seedWorkspace();
  write(WORKSPACE_KEY, JSON.stringify(seeded));
  return seeded;
}

function loadPrefs(): Prefs {
  try {
    const parsed = JSON.parse(read(PREFS_KEY) || "{}") as Partial<Prefs>;
    return { libreUrl: parsed.libreUrl || "", libreKey: parsed.libreKey || "" };
  } catch { return { libreUrl: "", libreKey: "" }; }
}

const listeners = new Set<() => void>();

export const store = {
  data: loadWorkspace(),
  prefs: loadPrefs(),
  /** True while the browser is persisting the workspace (not private mode / full quota). */
  get persistent(): boolean {
    try { return window.localStorage.getItem(WORKSPACE_KEY) !== null; }
    catch { return false; }
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  save(): void {
    if (!write(WORKSPACE_KEY, JSON.stringify(store.data))) notify("This browser blocked local storage, so changes will be lost on reload.", "error");
    for (const listener of listeners) listener();
  },

  savePrefs(): void { write(PREFS_KEY, JSON.stringify(store.prefs)); },

  savedPhrases(): Phrase[] { return store.data.translations.filter((item) => item.saved); },

  addTranslation(input: { sourceText: string; translatedText: string; sourceLang: string; targetLang: string; saved?: boolean; collectionId?: string | null }): Phrase {
    const phrase: Phrase = {
      id: uid(),
      sourceText: input.sourceText,
      translatedText: input.translatedText,
      sourceLang: input.sourceLang,
      targetLang: input.targetLang,
      saved: input.saved ?? false,
      collectionId: input.collectionId ?? null,
      createdAt: new Date().toISOString(),
    };
    store.data.translations = [phrase, ...store.data.translations];
    store.save();
    return phrase;
  },

  updateTranslation(id: string, patch: Partial<Phrase>): Phrase | null {
    const index = store.data.translations.findIndex((item) => item.id === id);
    if (index < 0) return null;
    store.data.translations[index] = { ...store.data.translations[index], ...patch };
    store.save();
    return store.data.translations[index];
  },

  toggleSaved(id: string): Phrase | null {
    const phrase = store.data.translations.find((item) => item.id === id);
    if (!phrase) return null;
    return store.updateTranslation(id, { saved: !phrase.saved });
  },

  removeTranslation(id: string): void {
    store.data.translations = store.data.translations.filter((item) => item.id !== id);
    store.save();
  },

  addCollection(input: { title: string; description: string; color: string }): Collection {
    const collection: Collection = { id: uid(), title: input.title, description: input.description, color: input.color, createdAt: new Date().toISOString() };
    store.data.collections = [...store.data.collections, collection];
    store.save();
    return collection;
  },

  updateCollection(id: string, patch: Partial<Collection>): void {
    store.data.collections = store.data.collections.map((item) => (item.id === id ? { ...item, ...patch } : item));
    store.save();
  },

  removeCollection(id: string): void {
    store.data.collections = store.data.collections.filter((item) => item.id !== id);
    for (const phrase of store.data.translations) if (phrase.collectionId === id) phrase.collectionId = null;
    store.save();
  },

  completeLesson(language: string): Progress {
    const existing = store.data.progress.find((item) => item.language === language);
    const completed = Math.min((existing?.completed || 0) + 1, 12);
    const progress: Progress = { language, completed, updatedAt: new Date().toISOString() };
    store.data.progress = [...store.data.progress.filter((item) => item.language !== language), progress];
    store.data.activity = [{ language, completedAt: progress.updatedAt }, ...store.data.activity];
    store.save();
    return progress;
  },

  setProfile(patch: Partial<Profile>): void {
    store.data.profile = { ...store.data.profile, ...patch };
    store.save();
  },

  reset(): void {
    store.data = seedWorkspace();
    store.save();
  },

  replace(next: Workspace): void {
    store.data = next;
    store.save();
  },
};



/* ------------------------------------------------------------- widgets */

const brandPaths: [string, Record<string, string | number>][] = [
  ["path", { d: "M6 5.5h20a3.5 3.5 0 0 1 3.5 3.5v13a3.5 3.5 0 0 1-3.5 3.5h-9l-7.5 5v-5H6A3.5 3.5 0 0 1 2.5 22V9A3.5 3.5 0 0 1 6 5.5Z", fill: "currentColor" }],
  ["path", { d: "m9 13 5 5 9-9M18.5 18.5l4.5 4.5", stroke: "#143B2C", "stroke-width": 2.8, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }],
];

export function brand(small = false): HTMLElement {
  const mark = svgElement("svg", { viewBox: "0 0 32 32", fill: "none", "aria-hidden": "true" });
  for (const [tag, attrs] of brandPaths) mark.appendChild(svgElement(tag, attrs));
  return h("div", { class: `brand ${small ? "brand-small" : ""}`.trim() },
    h("span", { class: "brand-mark" }, mark),
    h("span", null, "salita", h("span", { class: "brand-dot" }, ".")));
}

export function languageSelect(label: string, value: string, onChange: (value: string) => void, nativeOnly = false): HTMLSelectElement {
  const select = h("select", {
    class: "language-select",
    "aria-label": label,
    onChange: (event: Event) => onChange((event.target as HTMLSelectElement).value),
  }) as HTMLSelectElement;
  for (const language of (nativeOnly ? nativeLanguages : languages)) {
    const option = h("option", { value: language.code }, `${language.flag} ${language.name}`) as HTMLOptionElement;
    option.selected = language.code === value;
    select.appendChild(option);
  }
  select.value = value;
  return select;
}

/** A search field that reports changes without re-rendering itself (keeps focus). */
export function searchField(initial: string, onChange: (value: string) => void, placeholder: string): HTMLElement {
  const input = h("input", { "aria-label": placeholder, placeholder, value: initial }) as HTMLInputElement;
  const clear = h("button", { "aria-label": "Clear search", type: "button", onClick: () => { input.value = ""; onChange(""); input.focus(); } }, icon(X, 15));
  const field = h("div", { class: "search-field" }, icon(Search, 17), input, initial ? clear : false);
  const sync = () => {
    clear.remove();
    if (input.value) field.appendChild(clear);
    onChange(input.value);
  };
  input.addEventListener("input", sync);
  return field;
}

export function emptyState(iconNode: IconNode, title: string, description: string, action?: { label: string; onClick: () => void }): HTMLElement {
  return h("div", { class: "empty-state" },
    h("span", { class: "empty-icon" }, icon(iconNode, 29, { strokeWidth: 1.5 })),
    h("h3", null, title),
    h("p", null, description),
    action ? h("button", { class: "button primary", onClick: action.onClick }, action.label, icon(ArrowRight, 16)) : false);
}

export function sectionIcon(node: IconNode, tone: "mint" | "blue" | "purple" | "peach", size = 21): HTMLElement {
  return h("span", { class: `section-icon ${tone}` }, icon(node, size));
}
