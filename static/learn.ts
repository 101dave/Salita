/** Language courses: the course card, the lesson dialog, and the Learn page. */
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, Flame, Globe2, GraduationCap, Languages, Sparkles, Volume2 } from "lucide";
import { lessonTitles } from "@/lib/languages";
import { getVocabulary } from "@/lib/lessons";
import type { Language } from "@/lib/types";
import { emptyState, getLanguage, getStreak, h, icon, languages, nativeLanguages, notify, openModal, replace, searchField, speak, store } from "./core";

/** A soft, palette-friendly tint so each course card has its own light. */
function tintFor(code: string): string {
  let hash = 0;
  for (const character of code) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  const hue = 80 + (hash % 90);
  return `radial-gradient(ellipse at 30% 40%, hsl(${hue} 34% 90%), hsl(${hue} 26% 95%))`;
}

function completedFor(code: string): number {
  return store.data.progress.find((item) => item.language === code)?.completed || 0;
}

export function CourseCard(language: Language, onOpen: () => void, compact = false): HTMLElement {
  const completed = completedFor(language.code);
  const percent = Math.round((completed / 12) * 100);
  return h("article", { class: `course-card card ${compact ? "course-compact" : ""}`.trim() },
    h("button", {
      class: "course-image world-course-image",
      style: { background: tintFor(language.code) },
      "aria-label": `Learn ${language.name}`,
      onClick: onOpen,
    },
    h("span", { class: "world-flag", role: "img", "aria-label": language.name }, language.flag),
    h("span", { class: "course-level" }, h("span", null), "Beginner friendly")),
    h("div", { class: "course-content" },
      h("div", { class: "course-title-row" },
        h("h3", null, language.name),
        completed === 12 ? icon(CheckCircle2, 17) : false),
      compact ? false : h("p", { class: "course-region" }, `${language.region} · ${language.native}`),
      h("div", { class: "course-progress-label" },
        h("span", null, completed ? `${completed} of 12 lessons` : "Your journey starts here"),
        completed > 0 ? h("span", null, `${percent}%`) : false),
      h("div", { class: "progress-track" }, h("span", { style: { width: `${percent}%` } })),
      h("button", { class: "course-continue", onClick: onOpen },
        completed === 12 ? "Review phrases" : completed ? "Continue learning" : "Start learning",
        icon(ArrowUpRight, 16))));
}

export function LessonDialog(code: string): void {
  const language = getLanguage(code);
  const vocabulary = getVocabulary(code);
  const completedAtOpen = completedFor(code);
  const lesson = Math.min(completedAtOpen, 11);
  let stage: "intro" | "quiz" | "complete" = "intro";
  let question = 0;
  let selected: string | null = null;
  let finished = completedAtOpen;

  const body = h("div", null);
  const close = openModal({
    title: `${language.flag} ${language.name}`,
    subtitle: `${completedAtOpen >= 12 ? "Review" : `Lesson ${lesson + 1} of 12`} · ${lessonTitles[lesson]}`,
    className: "lesson-modal",
    body: [body],
  });

  function phraseAt(index: number) { return vocabulary[(lesson * 2 + index) % vocabulary.length]; }

  function optionsFor(index: number): string[] {
    const correct = phraseAt(index).translated;
    const other = [...new Set(vocabulary.map((item) => item.translated))].filter((item) => item !== correct);
    const choices = other.slice(index, index + 3);
    for (const item of other) if (choices.length < 3 && !choices.includes(item)) choices.push(item);
    choices.splice((lesson + index) % 4, 0, correct);
    return choices;
  }

  function next() {
    const correct = selected === phraseAt(question).translated;
    if (!correct) { selected = null; paint(); return; }
    if (question < 2) { question += 1; selected = null; paint(); return; }
    if (finished >= 12) { stage = "complete"; paint(); return; }
    finished = store.completeLesson(language.code).completed;
    stage = "complete";
    notify("Lesson complete. That’s another connection waiting to happen.");
    paint();
  }

  function paint() {
    if (stage === "intro") {
      const phrase = phraseAt(question);
      body.className = "lesson-intro";
      replace(body, 
        h("span", { class: "eyebrow" }, "ONE SMALL PHRASE. A NEW CONNECTION."),
        h("div", { class: "lesson-word", dir: "auto" }, phrase.translated),
        h("p", { class: "lesson-meaning" }, phrase.source),
        h("button", { class: "button secondary", onClick: () => speak(phrase.translated, language.code) }, icon(Volume2, 17), "Hear how it sounds"),
        h("div", { class: "lesson-tip" }, icon(Sparkles, 18), h("p", null, "Say it out loud. A little practice helps new words feel like your own.")),
        h("button", { class: "button primary lesson-main-button", onClick: () => { stage = "quiz"; paint(); } }, "Let’s practice", icon(ArrowRight, 17)));
      return;
    }
    if (stage === "quiz") {
      const phrase = phraseAt(question);
      const correct = selected === phrase.translated;
      const options = optionsFor(question);
      body.className = "lesson-quiz";
      replace(body, 
        h("div", { class: "quiz-progress" }, [0, 1, 2].map((index) => h("span", { class: question >= index ? "active" : "" }))),
        h("span", { class: "eyebrow" }, `QUESTION ${question + 1} OF 3`),
        h("h3", null, `How do you say “${phrase.source}” in ${language.name}?`),
        h("div", { class: "quiz-choices" }, options.map((option, index) => h("button", {
          class: selected === option ? (correct ? "correct" : "incorrect") : "",
          disabled: selected !== null,
          onClick: () => { selected = option; paint(); },
        },
        h("span", null, String.fromCharCode(65 + index)),
        h("span", { dir: "auto" }, option),
        selected === option && correct ? icon(Check, 19) : false))),
        selected ? h("p", { class: `quiz-feedback ${correct ? "correct" : "incorrect"}`.trim() }, correct ? "Exactly right. You’ve got this!" : `Not quite. The phrase is “${phrase.translated}”. Give it another try.`) : false,
        h("button", { class: "button primary lesson-main-button", disabled: !selected, onClick: next },
          !selected ? "Choose your answer" : !correct ? "Try again" : question < 2 ? "Next phrase" : "Finish lesson",
          icon(ArrowRight, 16)));
      return;
    }
    body.className = "lesson-complete";
    replace(body, 
      h("span", { class: "completion-icon" }, icon(Check, 38, { strokeWidth: 1.8 })),
      h("span", { class: "eyebrow" }, "A LITTLE WIN WORTH CELEBRATING"),
      h("h3", null, "A little more connected."),
      h("p", null, completedAtOpen >= 12 ? "A familiar phrase, a little more confidence. Beautiful work." : `Lesson ${lesson + 1} complete. You’re building a world of possibility, one phrase at a time.`),
      h("div", { class: "lesson-complete-stat" }, icon(GraduationCap, 21), h("span", null, `${Math.min(finished + (completedAtOpen >= 12 ? 0 : 1), 12)} of 12 lessons complete`)),
      h("button", { class: "button primary lesson-main-button", onClick: close }, "Back to my languages", icon(ArrowRight, 17)));
  }

  paint();
}

export function LearnPage(): { element: HTMLElement; refresh: () => void } {
  let tab: "philippine" | "world" | "started" = "philippine";
  let query = "";

  const grid = h("div", { class: "learning-grid" });
  const empty = h("div", null);
  const results = h("div", null, grid);
  const streakPill = h("span", { class: "streak-pill" }, icon(Flame, 17));
  const tabs = h("div", { class: "resource-tabs" });

  function available(): Language[] {
    if (tab === "philippine") return nativeLanguages;
    if (tab === "world") return languages.filter((item) => !item.philippine && item.code !== "en");
    return languages.filter((item) => store.data.progress.some((progress) => progress.language === item.code && progress.completed > 0));
  }

  function paintTabs() {
    const items: { id: typeof tab; label: string; count?: number }[] = [
      { id: "philippine", label: "Philippine languages", count: nativeLanguages.length },
      { id: "world", label: "World languages" },
      { id: "started", label: "My learning" },
    ];
    replace(tabs, ...items.map((item) => h("button", {
      class: tab === item.id ? "active" : "",
      onClick: () => { tab = item.id; paintTabs(); paintResults(); },
    }, item.label, item.count ? h("span", null, String(item.count)) : false)));
  }

  function paintResults() {
    const filtered = available().filter((item) => `${item.name} ${item.native} ${item.region}`.toLowerCase().includes(query.toLowerCase()));
    if (filtered.length) {
      replace(grid, ...filtered.map((language) => CourseCard(language, () => LessonDialog(language.code))));
      replace(results, grid);
      return;
    }
    replace(empty, emptyState(Languages,
      query ? "No languages found" : "Your next chapter starts here",
      query ? "Try another name or region." : "Explore a language and finish your first lesson. Your progress will be waiting here.",
      query ? undefined : { label: "Explore Philippine languages", onClick: () => { tab = "philippine"; query = ""; paintTabs(); paintResults(); } }));
    replace(results, empty);
  }

  function paintStreak() {
    replace(streakPill, icon(Flame, 17), `${getStreak(store.data.activity)} day streak`);
  }

  const element = h("div", null,
    h("div", { class: "page-heading" },
      h("div", null,
        h("h1", null, "Find your next connection", h("span", { class: "green-period" }, ".")),
        h("p", null, "A few words can make a whole new place feel like home.")),
      streakPill),
    h("section", { class: "learning-hero" },
      h("div", null,
        h("span", { class: "eyebrow" }, "PHILIPPINE ROOTS. GLOBAL POSSIBILITIES."),
        h("h2", null, "A little practice.", h("br"), "A world of possibility."),
        h("p", null, "Bite-sized lessons. Real-life phrases. A little more confidence for your next conversation."),
        h("span", { class: "hero-feature" }, icon(CheckCircle2, 15), "Free to explore. Made for everyone.")),
      h("div", { class: "learning-illustration", "aria-hidden": "true" },
        h("div", { class: "hello-bubble bubble-one" }, "Kumusta!", h("span", null, "Filipino")),
        h("div", { class: "hello-bubble bubble-two" }, "Hello!", h("span", null, "A new connection")),
        h("div", { class: "hello-bubble bubble-three" }, "Maayong buntag!", h("span", null, "Cebuano")),
        icon(Sparkles, 32, { className: "bubble-sparkle" }),
        icon(Globe2, 50, { strokeWidth: 1, className: "bubble-globe" }))),
    h("div", { class: "resource-toolbar learning-toolbar" },
      tabs,
      searchField(query, (value) => { query = value; paintResults(); }, "Find a language…")),
    results,
    h("div", { class: "language-note" }, icon(Globe2, 18), h("p", null, "The Philippines is home to more than 180 living languages. We’re starting with eight, and a whole lot of curiosity.")));

  paintTabs();
  paintResults();
  paintStreak();

  return { element, refresh: () => { paintResults(); paintStreak(); } };
}
