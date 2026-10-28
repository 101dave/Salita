"use client";

import { useState } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, BookOpen, Check, ChevronRight, Flame, Flower2, Globe2, Languages, Sparkles, Sun, TrendingUp, Volume2 } from "lucide-react";
import { getLanguage, nativeLanguages } from "@/lib/languages";
import { getStreak, mutate } from "@/lib/client";
import type { Translation } from "@/lib/types";
import { useWorkspace } from "./workspace-provider";
import { IconButton, Spinner } from "./ui";
import { Translator, speak } from "./translator";
import { CourseCard, LessonDialog } from "./learning";

function DailyWord() {
  const { data, setData, notify, toggleSaved } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const existing = data.translations.find((item) => item.translatedText === "Tahanan" && item.targetLang === "tl");
  async function saveWord() {
    if (existing?.saved || saving) return;
    if (existing) { await toggleSaved(existing); return; }
    setSaving(true);
    try { const phrase = await mutate<Translation>("POST", "translations", { sourceText: "Home", translatedText: "Tahanan", sourceLang: "en", targetLang: "tl" }); setData((current) => ({ ...current, translations: [phrase, ...current.translations] })); notify("A little piece of home, saved to your phrasebook."); }
    catch (error) { notify(error instanceof Error ? error.message : "Couldn’t save this word.", "error"); }
    finally { setSaving(false); }
  }
  return <aside className="daily-word-card"><Flower2 className="daily-flower" size={82} strokeWidth={1} aria-hidden="true" /><div className="daily-word-heading"><span><Sparkles size={14} />Word of the day</span><span className="daily-word-date">A little discovery</span></div><span className="word-language">FILIPINO <span>·</span> NOUN</span><div className="daily-word-title"><h2>Tahanan</h2><IconButton label="Listen to Tahanan" onClick={() => speak("Tahanan", "tl", notify)}><Volume2 size={19} /></IconButton></div><span className="daily-phonetic">/ta-ha-nan/</span><p className="daily-definition">More than a house.<br />A place that feels like <strong>home.</strong></p><div className="daily-example"><span>“Ang tahanan ay kung nasaan ang puso.”</span><p>Home is where the heart is.</p></div><button className={`daily-save ${existing?.saved ? "saved" : ""}`} disabled={saving || existing?.saved} onClick={saveWord}>{saving ? <Spinner size={15} /> : existing?.saved ? <Check size={15} /> : <Bookmark size={15} />}{existing?.saved ? "In your phrasebook" : "Keep this word"}{!existing?.saved && <PlusMark />}</button></aside>;
}
function PlusMark() { return <span className="plus-mark">+</span>; }

export function OverviewPage() {
  const { data, navigate, notify, setActiveCollection } = useWorkspace();
  const [lessonLanguage, setLessonLanguage] = useState<string | null>(null);
  const saved = data.translations.filter((item) => item.saved);
  const streak = getStreak(data.activity);
  const languagesExplored = new Set(data.translations.map((item) => item.targetLang)).size;
  const [weekStart] = useState(() => Date.now() - 7 * 86400000);
  const recent = data.translations.filter((item) => new Date(item.createdAt).getTime() > weekStart).length;
  const stats = [
    { label: "Total translations", value: data.translations.length, icon: Languages, color: "mint", note: `${recent} in the last 7 days`, trend: true },
    { label: "Saved phrases", value: saved.length, icon: Bookmark, color: "blue", note: "A few words, always with you" },
    { label: "Languages explored", value: languagesExplored, icon: Globe2, color: "purple", note: "A world waiting to connect" },
    { label: "Learning streak", value: streak, unit: streak === 1 ? "day" : "days", icon: Flame, color: "peach", note: streak > 0 ? "Look at you, showing up!" : "Today is a lovely day to start" },
  ];
  return <><div className="page-heading overview-heading"><div><div className="greeting-line"><h1>Good morning, {data.user.name.split(" ")[0]}<span className="green-period">.</span></h1><Sun size={28} strokeWidth={1.5} /></div><p>A few new words. A little more confidence. A world of possibilities.</p></div><button className="daily-goal" onClick={() => navigate("settings")}><span className="goal-ring"><span /></span><span>One small step, every day<strong>{data.user.dailyGoal} min daily goal<ChevronRight size={13} /></strong></span></button></div>
    <section className="stats-grid" aria-label="Your workspace at a glance">{stats.map((stat) => <article className="stat-card card" key={stat.label}><div className="stat-top"><span>{stat.label}</span><span className={`stat-icon ${stat.color}`}><stat.icon size={17} strokeWidth={1.7} /></span></div><div className="stat-value">{stat.value.toLocaleString()}{stat.unit && <span>{stat.unit}</span>}</div><div className={`stat-note ${stat.trend ? "positive" : ""}`}>{stat.trend && <TrendingUp size={12} />}{stat.note}</div></article>)}</section>
    <div className="dashboard-feature-grid"><Translator /><DailyWord /></div>
    <div className="dashboard-bottom-grid"><section className="dashboard-learning"><div className="section-heading"><div><h2>A little learning, every day</h2><p>Your next connection is a few words away.</p></div><button className="text-button" onClick={() => navigate("learn")}>Explore all<ArrowUpRight size={15} /></button></div><div className="dashboard-courses">{nativeLanguages.slice(0, 3).map((language) => <CourseCard key={language.code} compact language={language} onOpen={() => setLessonLanguage(language.code)} />)}</div></section><section className="recent-phrases"><div className="section-heading"><div><h2>Your pocket phrasebook</h2><p>A few favorites, close at hand.</p></div><button className="text-button icon-text-button" aria-label="View your phrasebook" onClick={() => { setActiveCollection(null); navigate("phrasebook"); }}><ArrowUpRight size={18} /></button></div><div className="recent-phrases-card card">{saved.length ? saved.slice(0, 3).map((phrase) => <div className="recent-phrase" key={phrase.id}><span className="recent-flag">{getLanguage(phrase.targetLang).flag}</span><button className="recent-phrase-text" onClick={() => { setActiveCollection(phrase.collectionId); navigate("phrasebook"); }}><span>{phrase.sourceText}</span><strong dir="auto">{phrase.translatedText}</strong></button><IconButton label={`Listen to ${phrase.translatedText}`} onClick={() => speak(phrase.translatedText, phrase.targetLang, notify)}><Volume2 size={15} /></IconButton></div>) : <div className="recent-empty"><Bookmark size={25} /><p>Your favorite words will feel at home here.</p><button className="text-button" onClick={() => navigate("translate")}>Translate your first phrase<ArrowUpRight size={14} /></button></div>}<button className="phrasebook-card-footer" onClick={() => { setActiveCollection(null); navigate("phrasebook"); }}><span><BookOpen size={14} />{saved.length} phrases. Countless possibilities.</span><ArrowRight size={15} /></button></div></section></div>
    <div className="discovery-strip"><span className="discovery-globe"><Globe2 size={23} strokeWidth={1.4} /></span><div><strong>Different languages. Shared humanity.</strong><p>Discover the beautiful diversity of the Philippines, one word at a time.</p></div><button className="text-button" onClick={() => navigate("learn")}>Find your next connection<ArrowUpRight size={15} /></button></div>{lessonLanguage && <LessonDialog language={lessonLanguage} onClose={() => setLessonLanguage(null)} />}</>;
}
