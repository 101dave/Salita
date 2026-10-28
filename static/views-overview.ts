/** The Overview dashboard and the full-screen Translate page. */
import {
  ArrowRight, ArrowUpRight, BookOpen, Bookmark, ChevronRight, Flame, Flower2, Globe2, Languages,
  Sparkles, Sun, TrendingUp, Volume2,
} from "lucide";
import type { Language } from "@/lib/types";
import { getLanguage, getStreak, h, icon, iconButton, languages, nativeLanguages, notify, replace, speak, store } from "./core";
import { LessonDialog, CourseCard } from "./learn";
import { Translator } from "./translator";
import { navigate, openPhrasebook } from "./state";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function statCard(stat: { label: string; value: number; unit?: string; icon: typeof Languages; color: string; note: string; trend?: boolean }): HTMLElement {
  return h("article", { class: "stat-card card" },
    h("div", { class: "stat-top" },
      h("span", null, stat.label),
      h("span", { class: `stat-icon ${stat.color}` }, icon(stat.icon, 17, { strokeWidth: 1.7 }))),
    h("div", { class: "stat-value" }, stat.value.toLocaleString(), stat.unit ? h("span", null, stat.unit) : false),
    h("div", { class: `stat-note ${stat.trend ? "positive" : ""}`.trim() }, stat.trend ? icon(TrendingUp, 12) : false, stat.note));
}

function stats(): { label: string; value: number; unit?: string; icon: typeof Languages; color: string; note: string; trend?: boolean }[] {
  const all = store.data.translations;
  const saved = all.filter((item) => item.saved);
  const streak = getStreak(store.data.activity);
  const explored = new Set(all.map((item) => item.targetLang)).size;
  const weekStart = Date.now() - 7 * 86400000;
  const recent = all.filter((item) => new Date(item.createdAt).getTime() > weekStart).length;
  return [
    { label: "Total translations", value: all.length, icon: Languages, color: "mint", note: `${recent} in the last 7 days`, trend: true },
    { label: "Saved phrases", value: saved.length, icon: Bookmark, color: "blue", note: "A few words, always with you" },
    { label: "Languages explored", value: explored, icon: Globe2, color: "purple", note: "A world waiting to connect" },
    {
      label: "Learning streak", value: streak, unit: streak === 1 ? "day" : "days", icon: Flame, color: "peach",
      note: streak > 0 ? "Look at you, showing up!" : "Today is a lovely day to start",
    },
  ];
}

function DailyWord(onChange: () => void): { element: HTMLElement; refresh: () => void } {
  const saveButton = h("button", { class: "daily-save" }) as HTMLButtonElement;

  function existing() {
    return store.data.translations.find((item) => item.translatedText === "Tahanan" && item.targetLang === "tl");
  }
  function paint() {
    const phrase = existing();
    const saved = Boolean(phrase?.saved);
    saveButton.className = `daily-save ${saved ? "saved" : ""}`.trim();
    saveButton.disabled = saved;
    replace(saveButton, 
      icon(saved ? Sparkles : Bookmark, 15),
      saved ? "In your phrasebook" : "Keep this word",
      saved ? false : h("span", { class: "plus-mark" }, "+"));
  }
  saveButton.addEventListener("click", () => {
    const phrase = existing();
    if (phrase) {
      store.toggleSaved(phrase.id);
      notify("Added to your phrasebook.");
    } else {
      store.addTranslation({ sourceText: "Home", translatedText: "Tahanan", sourceLang: "en", targetLang: "tl", saved: true });
      notify("A little piece of home, saved to your phrasebook.");
    }
    paint();
    onChange();
  });

  const element = h("aside", { class: "daily-word-card" },
    icon(Flower2, 82, { strokeWidth: 1, className: "daily-flower" }),
    h("div", { class: "daily-word-heading" },
      h("span", null, icon(Sparkles, 14), "Word of the day"),
      h("span", { class: "daily-word-date" }, "A little discovery")),
    h("span", { class: "word-language" }, "FILIPINO ", h("span", null, "·"), " NOUN"),
    h("div", { class: "daily-word-title" },
      h("h2", null, "Tahanan"),
      iconButton("Listen to Tahanan", icon(Volume2, 19), () => speak("Tahanan", "tl"))),
    h("span", { class: "daily-phonetic" }, "/ta-ha-nan/"),
    h("p", { class: "daily-definition" }, "More than a house.", h("br"), "A place that feels like ", h("strong", null, "home.")),
    h("div", { class: "daily-example" },
      h("span", null, "“Ang tahanan ay kung nasaan ang puso.”"),
      h("p", null, "Home is where the heart is.")),
    saveButton);

  paint();
  return { element, refresh: paint };
}

export function OverviewPage(): { element: HTMLElement; refresh: () => void } {
  const statsGrid = h("section", { class: "stats-grid", "aria-label": "Your workspace at a glance" });
  const courses = h("div", { class: "dashboard-courses" });
  const recentCard = h("div", { class: "recent-phrases-card card" });
  const goalText = h("strong", null);
  const heading = h("h1", null);
  const daily = DailyWord(() => paintRecent());

  function paintHeading() {
    replace(heading, `${greeting()}, ${store.data.profile.name.split(" ")[0]}`, h("span", { class: "green-period" }, "."));
    replace(goalText, `${store.data.profile.dailyGoal} min daily goal`, icon(ChevronRight, 13));
  }
  function paintStats() {
    replace(statsGrid, ...stats().map(statCard));
  }
  function paintCourses() {
    replace(courses, ...nativeLanguages.slice(0, 3).map((language: Language) => CourseCard(language, () => LessonDialog(language.code), true)));
  }
  function paintRecent() {
    const saved = store.savedPhrases();
    const rows = saved.slice(0, 3).map((phrase) => h("div", { class: "recent-phrase" },
      h("span", { class: "recent-flag" }, getLanguage(phrase.targetLang).flag),
      h("button", { class: "recent-phrase-text", onClick: () => openPhrasebook(phrase.collectionId) },
        h("span", null, phrase.sourceText),
        h("strong", { dir: "auto" }, phrase.translatedText)),
      iconButton(`Listen to ${phrase.translatedText}`, icon(Volume2, 15), () => speak(phrase.translatedText, phrase.targetLang))));
    const body = saved.length
      ? rows
      : [h("div", { class: "recent-empty" },
        icon(Bookmark, 25),
        h("p", null, "Your favorite words will feel at home here."),
        h("button", { class: "text-button", onClick: () => navigate("translate") }, "Translate your first phrase", icon(ArrowUpRight, 14)))];
    replace(recentCard, ...body,
      h("button", { class: "phrasebook-card-footer", onClick: () => openPhrasebook(null) },
        h("span", null, icon(BookOpen, 14), `${saved.length} phrases. Countless possibilities.`),
        icon(ArrowRight, 15)));
  }

  const element = h("div", null,
    h("div", { class: "page-heading overview-heading" },
      h("div", null,
        h("div", { class: "greeting-line" }, heading, icon(Sun, 28, { strokeWidth: 1.5 })),
        h("p", null, "A few new words. A little more confidence. A world of possibilities.")),
      h("button", { class: "daily-goal", onClick: () => navigate("settings") },
        h("span", { class: "goal-ring" }, h("span", null)),
        h("span", null, "One small step, every day", goalText))),
    statsGrid,
    h("div", { class: "dashboard-feature-grid" }, Translator(false), daily.element),
    h("div", { class: "dashboard-bottom-grid" },
      h("section", { class: "dashboard-learning" },
        h("div", { class: "section-heading" },
          h("div", null, h("h2", null, "A little learning, every day"), h("p", null, "Your next connection is a few words away.")),
          h("button", { class: "text-button", onClick: () => navigate("learn") }, "Explore all", icon(ArrowUpRight, 15))),
        courses),
      h("section", { class: "recent-phrases" },
        h("div", { class: "section-heading" },
          h("div", null, h("h2", null, "Your pocket phrasebook"), h("p", null, "A few favorites, close at hand.")),
          h("button", { class: "text-button icon-text-button", "aria-label": "View your phrasebook", onClick: () => openPhrasebook(null) }, icon(ArrowUpRight, 18))),
        recentCard)),
    h("div", { class: "discovery-strip" },
      h("span", { class: "discovery-globe" }, icon(Globe2, 23, { strokeWidth: 1.4 })),
      h("div", null,
        h("strong", null, "Different languages. Shared humanity."),
        h("p", null, "Discover the beautiful diversity of the Philippines, one word at a time.")),
      h("button", { class: "text-button", onClick: () => navigate("learn") }, "Find your next connection", icon(ArrowUpRight, 15))));

  paintHeading();
  paintStats();
  paintCourses();
  paintRecent();

  return { element, refresh: () => { paintHeading(); paintStats(); paintCourses(); paintRecent(); daily.refresh(); } };
}

export function TranslatePage(): { element: HTMLElement; refresh?: () => void } {
  const element = h("div", null,
    h("div", { class: "page-heading" },
      h("div", null,
        h("span", { class: "eyebrow" }, "WORDS WITHOUT BORDERS"),
        h("h1", null, "Every word opens a door", h("span", { class: "green-period" }, ".")),
        h("p", null, "From a simple hello to a meaningful conversation.")),
      h("span", { class: "soft-badge" }, h("span", { class: "tiny-dot" }), `${languages.length} languages, one workspace`)),
    Translator(true),
    h("div", { class: "translation-notes" },
      h("div", { class: "card" },
        h("span", { class: "section-icon mint" }, icon(Languages, 21)),
        h("h3", null, "Local words. Real connections."),
        h("p", null, "Explore Filipino, Cebuano, Ilocano, Hiligaynon, Waray, Kapampangan, Pangasinan, and Bikol. Regional language coverage varies; everyday phrases are built in."),
        h("button", { class: "text-button", onClick: () => navigate("learn") }, "Meet the languages ", icon(ArrowUpRight, 15))),
      h("div", { class: "card" },
        h("span", { class: "section-icon peach" }, icon(Bookmark, 21)),
        h("h3", null, "Keep the words that matter."),
        h("p", null, "Tap the bookmark on any translation to add it to your phrasebook. Organize your favorites into collections for your next trip or conversation."),
        h("button", { class: "text-button", onClick: () => openPhrasebook(null) }, "Open your phrasebook ", icon(ArrowUpRight, 15)))));
  return { element };
}
