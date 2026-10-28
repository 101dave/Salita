/**
 * Smoke test for the static GitHub Pages build: it boots the real
 * `index.html` in a DOM, drives the UI, and checks the flows that matter.
 * Network access is stubbed out, so live-provider failures are asserted too.
 *
 * Usage: npm run test:static
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const page = resolve(root, "index.html");
if (!existsSync(page)) throw new Error("index.html is missing — run `npm run build:static` first.");

const consoleErrors: string[] = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error: Error) => {
  if (!/Could not parse CSS|Not implemented/.test(error.message)) consoleErrors.push(error.message);
});
virtualConsole.on("error", (message: string) => {
  if (!/Could not parse CSS|Not implemented/.test(message)) consoleErrors.push(String(message));
});

const dom = new JSDOM(readFileSync(page, "utf8"), {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "https://101dave.github.io/Salita/",
  virtualConsole,
  beforeParse(window) {
    const scope = window as unknown as Record<string, unknown> & typeof window;
    scope.TextEncoder = TextEncoder;
    scope.TextDecoder = TextDecoder;
    scope.AbortController = AbortController;
    // The sandbox is offline: every live provider attempt must fail cleanly.
    scope.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    scope.scrollTo = () => {};
    scope.URL.createObjectURL = () => "blob:mock";
    scope.URL.revokeObjectURL = () => {};
    Object.defineProperty(scope.navigator, "clipboard", { value: { writeText: async () => {} }, configurable: true });
    Object.defineProperty(scope, "speechSynthesis", {
      value: { cancel: () => {}, speak: () => {}, getVoices: () => [] },
      configurable: true,
    });
    scope.SpeechSynthesisUtterance = class { text: string; constructor(text: string) { this.text = text; } };
    window.HTMLElement.prototype.scrollIntoView = () => {};
  },
});

const window = dom.window;
const doc = window.document;
const tick = (ms = 25) => new Promise((done) => setTimeout(done, ms));
const $ = (selector: string) => doc.querySelector<HTMLElement>(selector);
const $$ = (selector: string) => Array.from(doc.querySelectorAll<HTMLElement>(selector));
const click = (element: Element | null | undefined) => {
  assert.ok(element, "element to click is missing");
  element.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
};
const type = (element: HTMLElement | null, value: string) => {
  assert.ok(element, "element to type into is missing");
  (element as HTMLInputElement).value = value;
  element.dispatchEvent(new window.Event("input", { bubbles: true }));
};
const byText = (selector: string, text: string) => $$(selector).find((element) => (element.textContent || "").includes(text));
const navTo = async (label: string) => { click(byText(".sidebar .nav-item", label)); await tick(); };

async function waitFor(check: () => boolean, label: string, timeout = 2000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error(`Timed out waiting for ${label}`);
    await tick(10);
  }
}

async function main() {
  await waitFor(() => Boolean($(".app-shell")), "the app shell");

  /* ------------------------------------------------------- the shell */
  assert.equal($$(".nav-group .nav-item").length, 6, "workspace and library navigation");
  assert.ok($(".sidebar .brand")?.textContent?.includes("salita"), "brand renders");
  assert.equal($(".nav-item.active")?.textContent?.trim().startsWith("Overview"), true, "overview is the first view");
  assert.equal($(".breadcrumbs > span")?.textContent, "Overview", "breadcrumb follows the view");

  /* ------------------------------------------------------ overview */
  const values = $$(".stat-value").map((card) => (card.childNodes[0].textContent || "").trim());
  assert.equal(values.length, 4, "four stat cards");
  assert.deepEqual(values, ["32", "24", "8", "7"], `starter stats, saw ${values.join(", ")}`);
  assert.ok($$(".stat-value")[3].textContent?.includes("days"), "the streak shows its unit");
  assert.equal($(".nav-badge")?.textContent, "24", "phrasebook badge counts saved phrases");
  assert.equal($(".translated-text")?.textContent, "Kumusta! Kumusta ka?", "the translator starts with a friendly example");
  assert.ok($(".pronunciation"), "pronunciation hint shows for the example");
  assert.equal($(".daily-word-title h2")?.textContent, "Tahanan", "word of the day");
  assert.equal($$(".recent-phrase").length, 3, "recent phrases preview");
  assert.equal($$(".dashboard-courses .course-card").length, 3, "compact course cards");

  click($(".daily-save"));
  await tick();
  assert.ok($(".daily-save")?.textContent?.includes("In your phrasebook"), "word of the day can be saved");
  assert.equal($(".nav-badge")?.textContent, "25", "badge updates after saving");
  assert.ok($(".toast")?.textContent?.includes("phrasebook"), "toast confirms the save");

  /* ----------------------------------------------------- translate */
  await navTo("Translate");
  assert.ok($(".translator-expanded"), "expanded translator on the translate page");
  assert.ok($(".page-heading h1")?.textContent?.includes("Every word opens a door"), "translate heading");

  const textarea = $(".translation-source textarea");
  type(textarea, "Good evening");
  click(byText(".translate-button", "Translate"));
  await waitFor(() => $(".translated-text")?.textContent === "Magandang gabi", "the curated translation");
  assert.ok($(".translator-footer")?.textContent?.includes("Curated everyday phrases"), "provider label for curated results");
  assert.equal($$(".stat-value").length, 0, "the overview is not mounted any more");

  // "Good morning" is already saved in the starter workspace, so your own wording wins.
  type(textarea, "Good morning");
  click(byText(".translate-button", "Translate"));
  await waitFor(() => $(".translated-text")?.textContent === "Magandang umaga", "the remembered translation");
  assert.ok($(".translator-footer")?.textContent?.includes("Your saved wording"), "saved wording takes precedence");
  assert.ok($(".translation-note")?.textContent?.includes("Using your saved wording"), "the note explains the reuse");

  // Waray "I love you" carries the -hi- infix; this is the corrected wording.
  const targetSelect = $('.translator-languages select[aria-label="Translate to"]') as HTMLSelectElement;
  assert.equal(Array.from(targetSelect.options).length, 9, "nine languages offered");
  assert.equal(Array.from(targetSelect.options).some((option) => option.value === "ja"), false, "Japanese is gone");
  assert.equal(Array.from(targetSelect.options).some((option) => option.value === "es"), false, "Spanish is gone");
  targetSelect.value = "war";
  targetSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  await tick();
  type($(".translation-source textarea")!, "I love you");
  click(byText(".translate-button", "Translate"));
  await waitFor(() => $(".translated-text")?.textContent === "Hinihigugma ko ikaw", "the dictionary-verified Waray wording");

  /* ------------------------------------------------------- assistant */
  assert.ok($(".assistant-card"), "the AI assistant sits beside the translator");
  assert.equal($$(".assistant-starter").length, 4, "four suggested starters");
  click($(".assistant-starter"));
  await waitFor(() => Boolean($(".assistant-error")), "the assistant reports its offline failure");
  assert.equal($$(".assistant-message.user").length, 1, "the question is recorded");
  assert.match($(".assistant-error")?.textContent || "", /offline|couldn’t/i, "a friendly failure, not a crash");
  assert.ok($$(".assistant-chip").length >= 4, "follow-up chips appear after a question");

  const saveButton = $('.translation-output [aria-label="Save to phrasebook"]');
  click(saveButton);
  await tick();
  assert.ok($('.translation-output [aria-label="Unsave phrase"]'), "bookmark toggles to saved");
  assert.equal($(".toast")?.textContent?.includes("Added to your phrasebook"), true, "save toast");

  /* ------------------------------------------ offline live provider */
  type($(".translation-source textarea")!, "The harbour lights are unusually bright tonight");
  click(byText(".translate-button", "Translate"));
  await waitFor(() => Boolean($(".translation-error")), "the offline error message");
  assert.match($(".translation-error")?.textContent || "", /unavailable|couldn’t/i, "a friendly failure, not a crash");

  /* ---------------------------------------------------- phrasebook */
  await navTo("My phrasebook");
  const rows = $$(".phrase-table tbody tr").length;
  assert.equal(rows, 26, `saved phrases listed, saw ${rows}`);
  assert.ok($(".library-summary")?.textContent?.includes("26 saved phrases"), "summary counts saved phrases");

  type($('.resource-toolbar .search-field input')!, "salamat");
  await tick();
  const filtered = $$(".phrase-table tbody tr").length;
  assert.ok(filtered > 0 && filtered < rows, `search narrows the table (${filtered} rows)`);
  type($('.resource-toolbar .search-field input')!, "");
  await tick();
  assert.equal($$(".phrase-table tbody tr").length, rows, "clearing the search restores the list");

  click($('.row-actions [aria-label="Edit phrase"]'));
  await waitFor(() => Boolean($(".editor-form")), "the phrase editor");
  assert.ok($('.modal-header h2')?.textContent?.includes("Edit your phrase"), "editor title");
  click(byText(".modal-actions .button", "Cancel"));
  await tick();
  assert.equal($(".modal-backdrop"), null, "the editor closes");

  /* --------------------------------------------------- collections */
  await navTo("Collections");
  assert.equal($$(".collection-card").length, 3, "starter collections");
  click(byText(".page-heading .button", "New collection"));
  await waitFor(() => Boolean($(".color-picker")), "the collection editor");
  type($('.editor-form input[placeholder="e.g. My next island adventure"]')!, "Market mornings");
  click(byText(".color-swatch", "") || $(".color-swatch"));
  click(byText(".modal-actions .button.primary", "Create collection"));
  await waitFor(() => $$(".collection-card").length === 4, "the new collection");
  assert.ok(byText(".collection-title", "Market mornings"), "collection appears in the grid");

  /* --------------------------------------------------------- learn */
  await navTo("Learn languages");
  assert.equal($$(".learning-grid .course-card").length, 8, "eight Philippine languages");
  assert.ok($(".streak-pill")?.textContent?.includes("7 day streak"), "streak pill");
  click(byText(".course-continue", "Continue learning") || byText(".course-continue", "Start learning"));
  await waitFor(() => Boolean($(".lesson-modal")), "the lesson dialog");
  click(byText(".lesson-main-button", "Let’s practice"));
  await tick();
  assert.ok($(".quiz-choices"), "the quiz starts");

  for (let question = 0; question < 3; question += 1) {
    const answered = await answerQuestion();
    assert.ok(answered, `question ${question + 1} answered`);
    click(byText(".lesson-main-button", question < 2 ? "Next phrase" : "Finish lesson"));
    await tick();
  }
  assert.ok($(".lesson-complete"), "lesson completion screen");
  click(byText(".lesson-main-button", "Back to my languages"));
  await tick();
  assert.equal($(".modal-backdrop"), null, "lesson dialog closes");
  assert.ok(byText(".course-progress-label", "4 of 12 lessons"), "Filipino progress advanced to 4");

  assert.equal($$(".resource-tabs > button").length, 2, "only Philippine languages and My learning");
  assert.equal(byText(".resource-tabs > button", "World languages"), undefined, "the world languages tab is gone");
  click(byText(".resource-tabs > button", "My learning"));
  await tick();
  assert.ok($$(".learning-grid .course-card").length >= 2, "languages in progress are listed");

  /* ------------------------------------------------- global search */
  click($(".global-search-trigger"));
  await waitFor(() => Boolean($(".search-modal")), "global search");
  assert.equal($$(".search-quick-links > button").length, 4, "quick links before typing");
  type($('.global-search-body .search-field input')!, "cebuano");
  await tick();
  assert.ok(byText(".search-results strong", "Cebuano"), "language result");
  type($('.global-search-body .search-field input')!, "magandang");
  await tick();
  assert.ok(byText(".search-results strong", "Good morning"), "phrase result");
  doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await tick();
  assert.equal($(".search-modal"), null, "escape closes search");

  /* ------------------------------------------------------ settings */
  await navTo("Settings");
  assert.equal(($('.editor-form input[minlength="2"]') as HTMLInputElement | null)?.value, "Alex Morgan", "profile name");
  type($('.editor-form input[minlength="2"]')!, "Maria Santos");
  const form = $(".settings-card form");
  form?.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await tick();
  assert.ok($(".sidebar-user")?.textContent?.includes("Maria Santos"), "the sidebar follows the new name");
  assert.ok($('.settings-side')?.textContent?.includes("LibreTranslate"), "live translation settings are explained");
  assert.ok($('.settings-side')?.textContent?.includes("Salita AI"), "the AI preference is explained");
  const aiToggle = $('.settings-side input[type="checkbox"]') as HTMLInputElement | null;
  assert.ok(aiToggle, "the AI toggle exists");
  assert.equal(aiToggle?.checked, true, "AI starts enabled");
  aiToggle!.checked = false;
  click(byText(".settings-side .button", "Save AI preference"));
  await tick();
  assert.ok($(".toast")?.textContent?.includes("AI is off"), "the toggle confirms");
  aiToggle!.checked = true;
  click(byText(".settings-side .button", "Save AI preference"));
  await tick();
  assert.ok($(".toast")?.textContent?.includes("AI is on"), "AI can be switched back on");

  click(byText(".settings-side .button", "Reset workspace"));
  await waitFor(() => Boolean($(".delete-dialog")), "the reset confirmation");
  click(byText(".modal-actions .button.danger", "Delete"));
  await tick();
  assert.equal($(".nav-badge")?.textContent, "24", "reset restores the starter workspace");

  /* ------------------------------------------------------- history */
  await navTo("Translation history");
  assert.ok(($$(".phrase-table tbody tr").length) >= 8, "history keeps unsaved translations");
  assert.ok($(".page-heading h1")?.textContent?.includes("Your words, along the way"), "history heading");

  /* --------------------------------------------------------- a11y */
  assert.equal($$(".icon-button:not([aria-label])").length, 0, "every icon button is labelled");
  assert.equal($$("svg:not([aria-hidden])").length, 0, "decorative icons are hidden from assistive tech");
  assert.deepEqual(consoleErrors, [], `no unexpected console errors: ${consoleErrors.join(" | ")}`);

  console.log("✓ Static build boots, translates offline, saves, teaches, searches, and resets.");
  dom.window.close();
}

/** Brute-force the quiz: pick an option, retry with the next one if it is wrong. */
async function answerQuestion(): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const choices = $$(".quiz-choices > button").filter((button) => !(button as HTMLButtonElement).disabled);
    const option = choices[attempt];
    if (!option) return false;
    click(option);
    await tick();
    if ($(".quiz-feedback.correct")) return true;
    click(byText(".lesson-main-button", "Try again"));
    await tick();
  }
  return false;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof Error) console.error((error.stack || "").split("\n").filter((line) => line.includes("static-smoke-test")).slice(0, 4).join("\n"));
  if (consoleErrors.length) console.error("Console errors:", consoleErrors);
  process.exit(1);
});
