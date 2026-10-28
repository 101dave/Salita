/**
 * The Quick translate card. It keeps its own state between views and updates
 * only its own DOM, so a translation never costs you the text you typed.
 */
import { ArrowDownUp, ArrowUpRight, Bookmark, Check, Copy, FileText, Languages, Mic, Sparkles, Type, Volume2, X } from "lucide";
import type { TranslationQuality } from "@/lib/types";
import { getLanguage, h, icon, iconButton, languageSelect, notify, replace, speak, spinner, store } from "./core";
import { BYTE_LIMIT, byteLength, translateText } from "./translate";
import { setAssistantContext } from "./assistant";

interface State {
  sourceLang: string;
  targetLang: string;
  text: string;
  output: string;
  translationId: string | null;
  provider: string;
  quality: TranslationQuality;
  note: string;
  documentName: string;
  loading: boolean;
  saving: boolean;
  error: string;
  recording: boolean;
}

const state: State = {
  sourceLang: "en",
  targetLang: "tl",
  text: "Hello! How are you?",
  output: "Kumusta! Kumusta ka?",
  translationId: null,
  provider: "Salita phrase library",
  quality: "curated",
  note: "",
  documentName: "",
  loading: false,
  saving: false,
  error: "",
  recording: false,
};

interface Recognition {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function recognitionCtor(): (new () => Recognition) | null {
  const scope = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return scope.SpeechRecognition || scope.webkitSpeechRecognition || null;
}

let requestVersion = 0;
let recognition: Recognition | null = null;

export function Translator(expanded = false): HTMLElement {
  /* ---------------------------------------------------------- heading */
  const textTab = h("button", { type: "button", onClick: () => setDocument("") }, icon(Type, 14), h("span", null, "Text"));
  const documentTab = h("button", { type: "button", onClick: () => fileInput.click() }, icon(FileText, 14), h("span", null, "Document"));

  const fileInput = h("input", {
    type: "file",
    accept: ".txt,.md,text/plain,text/markdown",
    class: "visually-hidden",
    "aria-label": "Import text document",
    onChange: async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      if (!/\.(txt|md)$/i.test(file.name)) { notify("Please choose a plain text (.txt) or Markdown (.md) file.", "error"); return; }
      const content = await file.text();
      if (byteLength(content) > BYTE_LIMIT) { notify("This file is too long. Import a text file of up to 500 bytes.", "error"); input.value = ""; return; }
      changeInput(content);
      setDocument(file.name);
      notify(`Imported ${file.name}`);
      input.value = "";
    },
  }) as HTMLInputElement;

  /* -------------------------------------------------------- languages */
  const sourceSelect = languageSelect("Translate from", state.sourceLang, (value) => { resetResult(); state.sourceLang = value; });
  const targetSelect = languageSelect("Translate to", state.targetLang, (value) => { resetResult(); state.targetLang = value; });
  const swapButton = iconButton("Swap languages", icon(ArrowDownUp, 16, { className: "swap-icon" }), swap);

  /* ----------------------------------------------------------- source */
  const documentName = h("span", { class: "document-name" }, icon(FileText, 12), state.documentName);

  const textarea = h("textarea", {
    "aria-label": "Text to translate",
    placeholder: "Type something. Start a connection.",
    spellcheck: "false",
    onInput: (event: Event) => changeInput((event.target as HTMLTextAreaElement).value, false),
    onKeyDown: (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void translate(); },
  }) as HTMLTextAreaElement;
  textarea.value = state.text;

  const clearButton = iconButton("Clear text", icon(X, 14), () => changeInput(""), "clear-text");
  const micButton = iconButton("Use microphone", icon(Mic, 17), record);
  const listenSourceButton = iconButton("Listen to original", icon(Volume2, 17), () => speak(state.text, state.sourceLang));
  const byteCount = h("span", null, String(byteLength(state.text)), h("span", null, ` / ${BYTE_LIMIT}`));

  const sourcePanel = h("div", { class: "translation-source" },
    state.documentName ? documentName : false,
    textarea,
    state.text ? clearButton : false,
    h("div", { class: "panel-tools" },
      h("div", null, micButton, listenSourceButton),
      byteCount));

  /* ----------------------------------------------------------- output */
  const outputBody = h("div", null);
  const outputLanguage = h("span", { class: "output-language" });
  const listenButton = iconButton("Listen to translation", icon(Volume2, 17), () => speak(state.output, state.targetLang));
  const copyButton = iconButton("Copy translation", icon(Copy, 16), async () => {
    try { await navigator.clipboard.writeText(state.output); notify("Translation copied."); }
    catch { notify("Clipboard access is unavailable. You can select and copy the text.", "error"); }
  });
  const saveButton = iconButton("Save to phrasebook", icon(Bookmark, 17), () => save());
  const outputPanel = h("div", { class: "translation-output", "aria-live": "polite" },
    outputBody,
    h("div", { class: "panel-tools" }, outputLanguage, h("div", null, listenButton, copyButton, saveButton)));

  /* ---------------------------------------------- error, footer, note */
  const errorBar = h("div", { class: "translation-error", role: "alert" });
  const providerNote = h("span", null, icon(Sparkles, 13));
  const translateButton = h("button", { class: "button primary translate-button", onClick: () => void translate() }) as HTMLButtonElement;
  const footer = h("div", { class: "translator-footer" }, providerNote, translateButton);

  const section = h("section", { class: `translator-card card ${expanded ? "translator-expanded" : ""}`.trim() },
    h("div", { class: "translator-heading" },
      h("h2", null, icon(Languages, 19), "Quick translate"),
      h("div", { class: "translator-tabs" }, textTab, documentTab)),
    fileInput,
    h("div", { class: "translator-languages" }, sourceSelect, swapButton, targetSelect),
    h("div", { class: "translation-panels" }, sourcePanel, outputPanel),
    state.error ? errorBar : false,
    footer,
    expanded ? h("div", { class: "translation-privacy" }, icon(Check, 13), "Everything is stored in this browser. Only text that needs live translation is sent to a translation provider.") : false);

  /* --------------------------------------------------------- painting */
  function renderTabs() {
    textTab.className = state.documentName ? "" : "active";
    documentTab.className = state.documentName ? "active" : "";
  }

  function renderSource() {
    const bytes = byteLength(state.text);
    replace(byteCount, String(bytes), h("span", null, ` / ${BYTE_LIMIT}`));
    byteCount.className = bytes > BYTE_LIMIT ? "text-error" : "";
    listenSourceButton.disabled = !state.text;
    if (state.text && !clearButton.isConnected) sourcePanel.insertBefore(clearButton, sourcePanel.querySelector(".panel-tools"));
    if (!state.text && clearButton.isConnected) clearButton.remove();
    if (state.documentName && !documentName.isConnected) sourcePanel.insertBefore(documentName, textarea);
    if (!state.documentName && documentName.isConnected) documentName.remove();
    replace(documentName, icon(FileText, 12), state.documentName);
    micButton.className = `icon-button ${state.recording ? "recording" : ""}`.trim();
    micButton.setAttribute("aria-label", state.recording ? "Stop recording" : "Use microphone");
    micButton.title = micButton.getAttribute("aria-label") || "";
    renderTabs();
  }

  function renderOutput() {
    outputPanel.className = `translation-output ${state.loading ? "is-translating" : ""}`.trim();
    if (state.loading) {
      replace(outputBody, h("div", { class: "translation-loading" },
        h("div", { class: "skeleton" }), h("div", { class: "skeleton" }), h("span", null, "Finding the right words…")));
    } else {
      const children: Node[] = [h("div", { class: `translated-text ${state.output ? "" : "placeholder"}`.trim(), dir: "auto" }, state.output || "Your translation will appear here")];
      if (state.output === "Kumusta! Kumusta ka?" && state.targetLang === "tl") children.push(h("p", { class: "pronunciation" }, "koo-moos-TAH · koo-moos-TAH kah"));
      if (state.note && state.output) children.push(h("p", { class: "translation-note" }, state.note));
      replace(outputBody, ...children);
    }
    replace(outputLanguage, ...(state.output && !state.loading ? [h("span", { class: "tiny-dot" }), document.createTextNode(getLanguage(state.targetLang).name)] : []));
    const busy = !state.output || state.loading;
    listenButton.disabled = busy;
    copyButton.disabled = busy;
    saveButton.disabled = busy || state.saving;
    const current = store.data.translations.find((item) => item.id === state.translationId);
    replace(saveButton, state.saving ? spinner(16) : icon(Bookmark, 17, { fill: current?.saved ? "currentColor" : "none" }));
    saveButton.className = `icon-button ${current?.saved ? "is-saved" : ""}`.trim();
    const label = current?.saved ? "Unsave phrase" : "Save to phrasebook";
    saveButton.setAttribute("aria-label", label);
    saveButton.title = label;
  }

  function renderFooter() {
    replace(providerNote, icon(Sparkles, 13), state.quality === "ai"
      ? `${state.provider} · AI translation, worth a quick check`
      : state.quality === "machine"
        ? `${state.provider} · machine translation`
        : state.provider === "Your phrasebook" ? "Your saved wording · reused here"
          : state.provider === "Original text" ? "Same language · no translation needed"
            : "Curated everyday phrases · no guesswork");
    translateButton.disabled = state.loading || !state.text.trim();
    replace(translateButton, 
      state.loading ? spinner(16) : false,
      state.loading ? "Translating" : "Translate",
      state.loading ? false : icon(ArrowUpRight, 16));
  }

  function renderError() {
    if (state.error) {
      errorBar.textContent = state.error;
      if (!errorBar.isConnected) section.insertBefore(errorBar, footer);
    } else errorBar.remove();
  }

  /* -------------------------------------------------------- behaviour */
  function resetResult() {
    requestVersion += 1;
    state.loading = false;
    state.translationId = null;
    state.output = "";
    state.provider = "Salita phrase library";
    state.quality = "curated";
    state.note = "";
    state.error = "";
    // Keep the assistant pointed at the languages in play even before a result.
    setAssistantContext({ sourceText: "", translatedText: "", note: undefined, sourceLang: state.sourceLang, targetLang: state.targetLang });
    renderOutput();
    renderFooter();
    renderError();
  }

  function changeInput(value: string, syncField = true) {
    resetResult();
    state.text = value;
    if (syncField) textarea.value = value;
    renderSource();
    renderFooter();
  }

  function setDocument(name: string) {
    state.documentName = name;
    renderSource();
  }

  function swap() {
    const nextText = state.output;
    resetResult();
    const source = state.sourceLang;
    state.sourceLang = state.targetLang;
    state.targetLang = source;
    sourceSelect.value = state.sourceLang;
    targetSelect.value = state.targetLang;
    state.text = nextText;
    textarea.value = nextText;
    setAssistantContext({ sourceLang: state.sourceLang, targetLang: state.targetLang });
    renderSource();
    renderFooter();
  }

  async function translate() {
    if (state.loading) return;
    if (!state.text.trim()) { state.error = "Enter something you’d like to translate."; renderError(); return; }
    if (byteLength(state.text) > BYTE_LIMIT) { state.error = `Please keep your text under ${BYTE_LIMIT} UTF-8 bytes.`; renderError(); return; }
    const version = ++requestVersion;
    const sourceText = state.text.trim();
    const from = state.sourceLang;
    const to = state.targetLang;
    state.loading = true;
    state.error = "";
    renderError();
    renderOutput();
    renderFooter();
    try {
      const result = await translateText(sourceText, from, to);
      if (version !== requestVersion) return;
      state.output = result.translatedText;
      state.provider = result.provider;
      state.quality = result.quality;
      state.note = result.note || "";
      setAssistantContext({
        sourceText: result.sourceText,
        translatedText: result.translatedText,
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        ...(result.note ? { note: result.note } : { note: undefined }),
      });
      state.translationId = store.addTranslation({
        sourceText: result.sourceText,
        translatedText: result.translatedText,
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
      }).id;
    } catch (error) {
      if (version !== requestVersion) return;
      state.output = "";
      state.translationId = null;
      state.note = "";
      state.error = error instanceof Error ? error.message : "Please try again.";
    } finally {
      if (version === requestVersion) {
        state.loading = false;
        renderOutput();
        renderFooter();
        renderError();
      }
    }
  }

  function save() {
    if (!state.output || state.saving) return;
    const current = store.data.translations.find((item) => item.id === state.translationId);
    if (current) {
      const updated = store.toggleSaved(current.id);
      notify(updated?.saved ? "Added to your phrasebook." : "Removed from your phrasebook.");
      renderOutput();
      return;
    }
    state.saving = true;
    renderOutput();
    const created = store.addTranslation({
      sourceText: state.text,
      translatedText: state.output,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      saved: true,
    });
    state.translationId = created.id;
    state.saving = false;
    notify("Added to your phrasebook.");
    renderOutput();
  }

  function record() {
    if (state.recording) { recognition?.stop(); return; }
    const Recognition = recognitionCtor();
    if (!Recognition) { notify("Voice input is supported in Chrome and Edge. You can type or import a text file here.", "error"); return; }
    const session = new Recognition();
    recognition = session;
    session.lang = state.sourceLang === "tl" ? "fil-PH" : state.sourceLang;
    session.interimResults = false;
    session.onresult = (event) => { changeInput(event.results[0][0].transcript); state.recording = false; renderSource(); };
    session.onerror = () => { state.recording = false; renderSource(); notify("Couldn’t access your microphone. Check your browser permissions.", "error"); };
    session.onend = () => { state.recording = false; renderSource(); };
    try { session.start(); state.recording = true; renderSource(); }
    catch { state.recording = false; renderSource(); notify("Couldn’t start voice input. Please try again.", "error"); }
  }

  renderSource();
  renderOutput();
  renderFooter();
  renderError();
  return section;
}
