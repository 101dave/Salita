/** Route state shared by the shell and every view. */
export type View = "overview" | "translate" | "phrasebook" | "learn" | "collections" | "history" | "settings";

export const viewList: View[] = ["overview", "translate", "phrasebook", "learn", "collections", "history", "settings"];

export const viewTitles: Record<View, string> = {
  overview: "Overview",
  translate: "Translate",
  phrasebook: "My phrasebook",
  learn: "Learn languages",
  collections: "Collections",
  history: "Translation history",
  settings: "Settings",
};

export const route: { view: View; collection: string | null } = { view: "overview", collection: null };

let render: () => void = () => {};

export function setRenderer(fn: () => void): void { render = fn; }
export function rerender(): void { render(); }

export function viewFromHash(): View {
  const hash = window.location.hash.slice(1) as View;
  return viewList.includes(hash) ? hash : "overview";
}

export function navigate(view: View): void {
  route.view = view;
  window.history.pushState(null, "", `#${view}`);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function openPhrasebook(collection: string | null): void {
  route.collection = collection;
  navigate("phrasebook");
}
