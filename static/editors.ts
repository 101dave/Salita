/** Create/edit dialogs shared by the phrasebook, collections, and search. */
import { Bookmark, Check, FolderOpen, Trash2 } from "lucide";
import type { Collection, Phrase } from "./core";
import { h, icon, languageSelect, notify, openModal, replace, spinner, store } from "./core";
import { route } from "./state";

const colors = [
  { value: "green", label: "Sage green" },
  { value: "blue", label: "Ocean blue" },
  { value: "orange", label: "Warm peach" },
  { value: "purple", label: "Lavender" },
  { value: "pink", label: "Rose" },
];

export function PhraseEditor(phrase?: Phrase): void {
  const draft = {
    sourceText: phrase?.sourceText || "",
    translatedText: phrase?.translatedText || "",
    sourceLang: phrase?.sourceLang || "en",
    targetLang: phrase?.targetLang || "tl",
    collectionId: phrase?.collectionId || route.collection || "",
  };
  const error = h("p", { class: "form-error", role: "alert", hidden: true });
  const submitButton = h("button", { class: "button primary", type: "submit" }) as HTMLButtonElement;

  const sourceField = h("textarea", { "aria-label": "Original phrase", required: true, maxLength: 2000, rows: 3, placeholder: "e.g. Good morning", onInput: (event: Event) => { draft.sourceText = (event.target as HTMLTextAreaElement).value; } }) as HTMLTextAreaElement;
  sourceField.value = draft.sourceText;
  const targetField = h("textarea", { "aria-label": "Translation", required: true, maxLength: 2000, rows: 3, placeholder: "e.g. Magandang umaga", onInput: (event: Event) => { draft.translatedText = (event.target as HTMLTextAreaElement).value; } }) as HTMLTextAreaElement;
  targetField.value = draft.translatedText;

  const collectionField = h("select", { "aria-label": "Collection", onChange: (event: Event) => { draft.collectionId = (event.target as HTMLSelectElement).value; } }) as HTMLSelectElement;
  collectionField.appendChild(h("option", { value: "" }, "No collection"));
  for (const folder of store.data.collections) {
    const option = h("option", { value: folder.id }, folder.title) as HTMLOptionElement;
    option.selected = folder.id === draft.collectionId;
    collectionField.appendChild(option);
  }

  function paintSubmit(busy: boolean) {
    submitButton.disabled = busy;
    replace(submitButton, busy ? spinner(16) : icon(Bookmark, 16), phrase ? "Save changes" : "Save phrase");
  }

  const form = h("form", {
    class: "editor-form",
    onSubmit: (event: Event) => {
      event.preventDefault();
      if (!draft.sourceText.trim() || !draft.translatedText.trim()) {
        error.textContent = "Both the original phrase and its translation need a few words.";
        error.hidden = false;
        return;
      }
      paintSubmit(true);
      const payload = {
        sourceText: draft.sourceText.trim(),
        translatedText: draft.translatedText.trim(),
        sourceLang: draft.sourceLang,
        targetLang: draft.targetLang,
        collectionId: draft.collectionId || null,
        saved: true,
      };
      if (phrase) store.updateTranslation(phrase.id, payload);
      else store.addTranslation(payload);
      notify(phrase ? "Phrase updated." : "A new phrase, ready for the right moment.");
      close();
    },
  },
  h("div", { class: "form-language-row" },
    h("label", null, "From", languageSelect("Original language", draft.sourceLang, (value) => { draft.sourceLang = value; })),
    h("span", null, "→"),
    h("label", null, "To", languageSelect("Translation language", draft.targetLang, (value) => { draft.targetLang = value; }))),
  h("label", null, "Original phrase", sourceField),
  h("label", null, "Translation", targetField),
  h("label", null, "Collection ", h("span", { class: "optional" }, "optional"), collectionField),
  error,
  h("div", { class: "modal-actions" },
    h("button", { type: "button", class: "button secondary", onClick: () => close() }, "Cancel"),
    submitButton));

  paintSubmit(false);
  const close = openModal({
    title: phrase ? "Edit your phrase" : "A phrase worth keeping",
    subtitle: "Keep useful words close, wherever life takes you.",
    body: [form],
  });
}

export function CollectionEditor(collection?: Collection): void {
  const draft = { title: collection?.title || "", description: collection?.description || "", color: collection?.color || "green" };
  const error = h("p", { class: "form-error", role: "alert", hidden: true });
  const submitButton = h("button", { class: "button primary", type: "submit" }) as HTMLButtonElement;
  const preview = h("div", { class: `collection-preview color-${draft.color}` }, icon(FolderOpen, 30, { strokeWidth: 1.5 }), h("span", null, draft.title || "Your new collection"));

  const titleField = h("input", { required: true, maxLength: 80, placeholder: "e.g. My next island adventure", onInput: (event: Event) => { draft.title = (event.target as HTMLInputElement).value; preview.lastElementChild!.textContent = draft.title || "Your new collection"; } }) as HTMLInputElement;
  titleField.value = draft.title;
  const descriptionField = h("textarea", { "aria-label": "Description", maxLength: 300, rows: 3, placeholder: "What words will you keep here?", onInput: (event: Event) => { draft.description = (event.target as HTMLTextAreaElement).value; } }) as HTMLTextAreaElement;
  descriptionField.value = draft.description;

  const swatches = colors.map((item) => {
    const swatch = h("button", {
      type: "button",
      class: `color-swatch color-${item.value} ${draft.color === item.value ? "selected" : ""}`.trim(),
      title: item.label,
      "aria-label": item.label,
      "aria-pressed": draft.color === item.value,
      onClick: () => {
        draft.color = item.value;
        preview.className = `collection-preview color-${item.value}`;
        for (const other of swatches) {
          other.className = `color-swatch color-${other.dataset.color} ${other.dataset.color === item.value ? "selected" : ""}`.trim();
          other.setAttribute("aria-pressed", String(other.dataset.color === item.value));
          replace(other, other.dataset.color === item.value ? icon(Check, 17) : false);
        }
      },
    }, draft.color === item.value ? icon(Check, 17) : false) as HTMLButtonElement;
    swatch.dataset.color = item.value;
    return swatch;
  });

  function paintSubmit(busy: boolean) {
    submitButton.disabled = busy;
    replace(submitButton, busy ? spinner(16) : icon(FolderOpen, 16), collection ? "Save changes" : "Create collection");
  }

  const form = h("form", {
    class: "editor-form",
    onSubmit: (event: Event) => {
      event.preventDefault();
      if (!draft.title.trim()) {
        error.textContent = "Your collection needs a name.";
        error.hidden = false;
        return;
      }
      paintSubmit(true);
      const payload = { title: draft.title.trim(), description: draft.description.trim(), color: draft.color };
      if (collection) store.updateCollection(collection.id, payload);
      else store.addCollection(payload);
      notify(collection ? "Collection updated." : "Your new collection is ready.");
      close();
    },
  },
  preview,
  h("label", null, "Collection name", titleField),
  h("label", null, "Description ", h("span", { class: "optional" }, "optional"), descriptionField),
  h("fieldset", { class: "color-picker" }, h("legend", null, "Make it yours"), ...swatches),
  error,
  h("div", { class: "modal-actions" },
    h("button", { class: "button secondary", type: "button", onClick: () => close() }, "Cancel"),
    submitButton));

  paintSubmit(false);
  const close = openModal({
    title: collection ? "Edit collection" : "Make room for new words",
    subtitle: "A little organization for your next big connection.",
    body: [form],
  });
}

export function DeleteDialog(options: { title: string; description: string; onConfirm: () => void }): void {
  const confirmButton = h("button", { class: "button danger" }) as HTMLButtonElement;
  replace(confirmButton, icon(Trash2, 16), "Delete");
  const body = h("div", { class: "delete-dialog" },
    h("span", { class: "delete-symbol" }, icon(Trash2, 24)),
    h("p", null, options.description),
    h("div", { class: "modal-actions" },
      h("button", { class: "button secondary", onClick: () => close() }, "Keep it"),
      confirmButton));
  confirmButton.addEventListener("click", () => {
    confirmButton.disabled = true;
    replace(confirmButton, spinner(16), "Delete");
    options.onConfirm();
    close();
  });
  const close = openModal({ title: options.title, className: "modal-small", body: [body] });
}
