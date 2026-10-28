"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, Flame, Globe2, GraduationCap, Languages, Sparkles, Volume2 } from "lucide-react";
import type { Language, Progress } from "@/lib/types";
import { getLanguage, languages, lessonTitles, nativeLanguages } from "@/lib/languages";
import { getVocabulary } from "@/lib/lessons";
import { getStreak, mutate } from "@/lib/client";
import { useWorkspace } from "./workspace-provider";
import { EmptyState, Modal, SearchField, Spinner } from "./ui";
import { speak } from "./translator";

export function CourseCard({ language, compact = false, onOpen }: { language: Language; compact?: boolean; onOpen: () => void }) {
  const { data } = useWorkspace();
  const completed = data.progress.find((item) => item.language === language.code)?.completed || 0;
  return <article className={`course-card card ${compact ? "course-compact" : ""}`}><button className={`course-image ${!language.image ? "world-course-image" : ""}`} onClick={onOpen} aria-label={`Learn ${language.name}`}>{language.image ? <Image fill sizes="(max-width: 580px) 50vw, (max-width: 900px) 30vw, 350px" src={language.image} alt={language.code === "tl" ? "Misty green rice terraces in the Philippines" : language.code === "ceb" ? "Turquoise waters and island boats in the Philippines" : "Lush green Philippine mountain terraces"} /> : <span className="world-flag">{language.flag}</span>}<span className="course-level"><span />Beginner friendly</span>{language.image && <span className="course-flag">{language.flag}</span>}</button><div className="course-content"><div className="course-title-row"><h3>{language.name}</h3>{completed === 12 && <CheckCircle2 size={17} />}</div>{!compact && <p className="course-region">{language.region} · {language.native}</p>}<div className="course-progress-label"><span>{completed ? `${completed} of 12 lessons` : "Your journey starts here"}</span>{completed > 0 && <span>{Math.round(completed / 12 * 100)}%</span>}</div><div className="progress-track"><span style={{ width: `${completed / 12 * 100}%` }} /></div><button className="course-continue" onClick={onOpen}>{completed === 12 ? "Review phrases" : completed ? "Continue learning" : "Start learning"}<ArrowUpRight size={16} /></button></div></article>;
}

export function LessonDialog({ language: code, onClose }: { language: string; onClose: () => void }) {
  const { data, setData, notify } = useWorkspace();
  const language = getLanguage(code);
  const [completed] = useState(data.progress.find((item) => item.language === code)?.completed || 0);
  const lesson = Math.min(completed, 11);
  const vocabulary = useMemo(() => getVocabulary(code), [code]);
  const [stage, setStage] = useState<"intro" | "quiz" | "complete">("intro");
  const [question, setQuestion] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const phrase = vocabulary[(lesson * 2 + question) % vocabulary.length];
  const options = useMemo(() => {
    const correct = vocabulary[(lesson * 2 + question) % vocabulary.length].translated;
    const other = [...new Set(vocabulary.map((item) => item.translated))].filter((item) => item !== correct);
    const choices = other.slice(question, question + 3);
    for (const item of other) if (choices.length < 3 && !choices.includes(item)) choices.push(item);
    choices.splice((lesson + question) % 4, 0, correct);
    return choices;
  }, [vocabulary, lesson, question]);
  const correct = selected === phrase.translated;
  async function next() {
    if (!correct) { setSelected(null); return; }
    if (question < 2) { setQuestion(question + 1); setSelected(null); return; }
    if (completed >= 12) { setStage("complete"); return; }
    setLoading(true);
    try {
      const progress = await mutate<Progress>("POST", "lesson", { language: code, lesson });
      setData((current) => ({ ...current, progress: [...current.progress.filter((item) => item.language !== code), progress], activity: [{ language: code, completedAt: new Date().toISOString() }, ...current.activity] }));
      setStage("complete"); notify("Lesson complete. That’s another connection waiting to happen.");
    } catch (error) { notify(error instanceof Error ? error.message : "Couldn’t save your progress.", "error"); }
    finally { setLoading(false); }
  }
  return <Modal title={`${language.flag} ${language.name}`} subtitle={`${completed >= 12 ? "Review" : `Lesson ${lesson + 1} of 12`} · ${lessonTitles[lesson]}`} onClose={onClose} className="lesson-modal">{stage === "intro" ? <div className="lesson-intro"><span className="eyebrow">ONE SMALL PHRASE. A NEW CONNECTION.</span><div className="lesson-word" dir="auto">{phrase.translated}</div><p className="lesson-meaning">{phrase.source}</p><button className="button secondary" onClick={() => speak(phrase.translated, code, notify)}><Volume2 size={17} />Hear how it sounds</button><div className="lesson-tip"><Sparkles size={18} /><p>Say it out loud. A little practice helps new words feel like your own.</p></div><button className="button primary lesson-main-button" onClick={() => setStage("quiz")}>Let’s practice<ArrowRight size={17} /></button></div> : stage === "quiz" ? <div className="lesson-quiz"><div className="quiz-progress">{[0, 1, 2].map((index) => <span key={index} className={question >= index ? "active" : ""} />)}</div><span className="eyebrow">QUESTION {question + 1} OF 3</span><h3>How do you say “{phrase.source}” in {language.name}?</h3><div className="quiz-choices">{options.map((option, index) => <button key={option} className={`${selected === option ? correct ? "correct" : "incorrect" : ""}`} disabled={selected !== null} onClick={() => setSelected(option)}><span>{String.fromCharCode(65 + index)}</span><span dir="auto">{option}</span>{selected === option && correct && <Check size={19} />}</button>)}</div>{selected && <p className={`quiz-feedback ${correct ? "correct" : "incorrect"}`}>{correct ? "Exactly right. You’ve got this!" : `Not quite. The phrase is “${phrase.translated}”. Give it another try.`}</p>}<button className="button primary lesson-main-button" disabled={!selected || loading} onClick={next}>{loading ? <Spinner size={16} /> : null}{!selected ? "Choose your answer" : !correct ? "Try again" : question < 2 ? "Next phrase" : "Finish lesson"}<ArrowRight size={16} /></button></div> : <div className="lesson-complete"><span className="completion-icon"><Check size={38} strokeWidth={1.8} /></span><span className="eyebrow">A LITTLE WIN WORTH CELEBRATING</span><h3>A little more connected.</h3><p>{completed >= 12 ? "A familiar phrase, a little more confidence. Beautiful work." : `Lesson ${lesson + 1} complete. You’re building a world of possibility, one phrase at a time.`}</p><div className="lesson-complete-stat"><GraduationCap size={21} /><span>{Math.min(completed + 1, 12)} of 12 lessons complete</span></div><button className="button primary lesson-main-button" onClick={onClose}>Back to my languages<ArrowRight size={17} /></button></div>}</Modal>;
}

export function LearnPage() {
  const { data } = useWorkspace();
  const [tab, setTab] = useState<"philippine" | "started">("philippine");
  const [query, setQuery] = useState("");
  const [lessonLanguage, setLessonLanguage] = useState<string | null>(null);
  const available = tab === "philippine" ? nativeLanguages : languages.filter((item) => data.progress.some((progress) => progress.language === item.code && progress.completed > 0));
  const filtered = available.filter((item) => `${item.name} ${item.native} ${item.region}`.toLowerCase().includes(query.toLowerCase()));
  return <><div className="page-heading"><div><h1>Find your next connection<span className="green-period">.</span></h1><p>A few words can make a whole new place feel like home.</p></div><span className="streak-pill"><Flame size={17} />{getStreak(data.activity)} day streak</span></div><section className="learning-hero"><div><span className="eyebrow">PHILIPPINE ROOTS. GLOBAL POSSIBILITIES.</span><h2>A little practice.<br />A world of possibility.</h2><p>Bite-sized lessons. Real-life phrases. A little more confidence for your next conversation.</p><span className="hero-feature"><CheckCircle2 size={15} />Free to explore. Made for everyone.</span></div><div className="learning-illustration" aria-hidden="true"><div className="hello-bubble bubble-one">Kumusta!<span>Filipino</span></div><div className="hello-bubble bubble-two">Hello!<span>A new connection</span></div><div className="hello-bubble bubble-three">Maayong buntag!<span>Cebuano</span></div><Sparkles className="bubble-sparkle" size={32} /><Globe2 className="bubble-globe" size={50} strokeWidth={1} /></div></section><div className="resource-toolbar learning-toolbar"><div className="resource-tabs"><button className={tab === "philippine" ? "active" : ""} onClick={() => setTab("philippine")}>Philippine languages<span>8</span></button><button className={tab === "started" ? "active" : ""} onClick={() => setTab("started")}>My learning</button></div><SearchField value={query} onChange={setQuery} placeholder="Find a language…" /></div>{filtered.length ? <div className="learning-grid">{filtered.map((language) => <CourseCard key={language.code} language={language} onOpen={() => setLessonLanguage(language.code)} />)}</div> : <EmptyState icon={Languages} title={query ? "No languages found" : "Your next chapter starts here"} description={query ? "Try another name or region." : "Explore a language and finish your first lesson. Your progress will be waiting here."} action="Explore Philippine languages" onAction={() => { setTab("philippine"); setQuery(""); }} />}<div className="language-note"><Globe2 size={18} /><p>The Philippines is home to more than 180 living languages. We’re starting with eight, and a whole lot of curiosity.</p></div>{lessonLanguage && <LessonDialog language={lessonLanguage} onClose={() => setLessonLanguage(null)} />}</>;
}
