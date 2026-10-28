"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, ArrowUpRight, Bookmark, Check, Copy, FileText, Languages, Mic, Sparkles, Type, Volume2, X } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { IconButton, LanguageSelect, Spinner } from "./ui";
import { AssistantPanel } from "./assistant";
import { mutate, request } from "@/lib/client";
import { getLanguage, nativeLanguages } from "@/lib/languages";
import type { Translation, TranslationMetadata, TranslationQuality } from "@/lib/types";

export function speak(text: string, language: string, onError: (message: string, type?: "success" | "error") => void) {
  if (!("speechSynthesis" in window)) { onError("Your browser doesn’t support audio pronunciation. Try Chrome or Edge.", "error"); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const locale = language === "tl" ? "fil-PH" : language === "ceb" ? "ceb-PH" : language;
  utterance.lang = locale;
  utterance.rate = 0.85;
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith(locale.split("-")[0]));
  if (voice) utterance.voice = voice;
  utterance.onerror = (event) => { if (event.error !== "interrupted" && event.error !== "canceled") onError("Audio isn’t available for this language on your device.", "error"); };
  window.speechSynthesis.speak(utterance);
}

interface Recognition {
  lang: string; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
}

export interface TranslatorContext {
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  note?: string;
}

export function Translator({ expanded = false, onContext }: { expanded?: boolean; onContext?: (context: TranslatorContext) => void }) {
  const { data, setData, notify, toggleSaved } = useWorkspace();
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("tl");
  const [text, setText] = useState("Hello! How are you?");
  const [output, setOutput] = useState("Kumusta! Kumusta ka?");
  const [translationId, setTranslationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("Salita phrase library");
  const [quality, setQuality] = useState<TranslationQuality>("curated");
  const [note, setNote] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const translationRequest = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = data.translations.find((item) => item.id === translationId);

  // An inline callback would change identity on every parent render and re-fire
  // the reporting effect forever, so it is kept in a ref that an effect refreshes
  // rather than being listed as a dependency.
  const contextSink = useRef(onContext);
  useEffect(() => { contextSink.current = onContext; });

  // Keep the assistant pointed at whatever the card is currently showing.
  useEffect(() => {
    contextSink.current?.({
      sourceText: output ? text.trim() : "",
      translatedText: output,
      sourceLang,
      targetLang,
      ...(output && note ? { note } : {}),
    });
  }, [output, sourceLang, targetLang, note, text]);
  const bytes = new TextEncoder().encode(text).length;

  async function translate() {
    if (loading) return;
    if (!text.trim()) { setError("Enter something you’d like to translate."); return; }
    if (bytes > 500) { setError("Please keep your text under 500 UTF-8 bytes."); return; }
    const version = ++translationRequest.current;
    const sourceText = text.trim();
    const from = sourceLang;
    const to = targetLang;
    setLoading(true); setError("");
    try {
      const result = await request<{ translation: Translation } & TranslationMetadata>("/api/translate", "POST", { text: sourceText, sourceLang: from, targetLang: to });
      if (version !== translationRequest.current) return;
      setOutput(result.translation.translatedText); setTranslationId(result.translation.id); setProvider(result.provider); setQuality(result.quality); setNote(result.note || "");
      setData((previous) => ({ ...previous, translations: [result.translation, ...previous.translations] }));
    } catch (error) { if (version === translationRequest.current) setError(error instanceof Error ? error.message : "Please try again."); }
    finally { if (version === translationRequest.current) setLoading(false); }
  }

  async function save() {
    if (!output || saving) return;
    if (current) { await toggleSaved(current); return; }
    setSaving(true);
    try {
      const created = await mutate<Translation>("POST", "translations", { sourceText: text, translatedText: output, sourceLang, targetLang });
      setTranslationId(created.id); setData((previous) => ({ ...previous, translations: [created, ...previous.translations] })); notify("Added to your phrasebook.");
    } catch (error) { notify(error instanceof Error ? error.message : "Couldn’t save this phrase.", "error"); }
    finally { setSaving(false); }
  }

  function resetResult() {
    translationRequest.current += 1;
    setLoading(false); setTranslationId(null); setOutput(""); setProvider("Salita phrase library"); setQuality("curated"); setNote(""); setError("");
  }
  function changeInput(value: string) { resetResult(); setText(value); }
  function swap() { const nextText = output; resetResult(); setSourceLang(targetLang); setTargetLang(sourceLang); setText(nextText); }
  function record() {
    if (recording) { recognitionRef.current?.stop(); return; }
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) { notify("Voice input is supported in Chrome and Edge. You can type or import a text file here.", "error"); return; }
    const recognition = new SpeechRecognition(); recognitionRef.current = recognition;
    recognition.lang = sourceLang === "tl" ? "fil-PH" : sourceLang; recognition.interimResults = false;
    recognition.onresult = (event) => { changeInput(event.results[0][0].transcript); setRecording(false); };
    recognition.onerror = () => { setRecording(false); notify("Couldn’t access your microphone. Check your browser permissions.", "error"); };
    recognition.onend = () => setRecording(false);
    try { recognition.start(); setRecording(true); } catch { setRecording(false); notify("Couldn’t start voice input. Please try again.", "error"); }
  }

  return <section className={`translator-card card ${expanded ? "translator-expanded" : ""}`}>
    <div className="translator-heading"><h2><Languages size={19} />Quick translate</h2><div className="translator-tabs"><button className={!documentName ? "active" : ""} onClick={() => setDocumentName("")}><Type size={14} /><span>Text</span></button><button className={documentName ? "active" : ""} onClick={() => fileRef.current?.click()}><FileText size={14} /><span>Document</span></button></div></div>
    <input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="visually-hidden" aria-label="Import text document" onChange={async (event) => {
      const file = event.target.files?.[0]; if (!file) return;
      if (!/\.(txt|md)$/i.test(file.name)) { notify("Please choose a plain text (.txt) or Markdown (.md) file.", "error"); return; }
      const content = await file.text();
      if (new TextEncoder().encode(content).length > 500) { notify("This file is too long. Import a text file of up to 500 bytes.", "error"); event.target.value = ""; return; }
      changeInput(content); setDocumentName(file.name); notify(`Imported ${file.name}`); event.target.value = "";
    }} />
    <div className="translator-languages"><LanguageSelect label="Translate from" value={sourceLang} onChange={(value) => { resetResult(); setSourceLang(value); }} /><IconButton label="Swap languages" onClick={swap}><ArrowDownUp size={16} className="swap-icon" /></IconButton><LanguageSelect label="Translate to" value={targetLang} onChange={(value) => { resetResult(); setTargetLang(value); }} /></div>
    <div className="translation-panels"><div className="translation-source">{documentName && <span className="document-name"><FileText size={12} />{documentName}</span>}<textarea aria-label="Text to translate" value={text} placeholder="Type something. Start a connection." onChange={(event) => changeInput(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") translate(); }} spellCheck={false} />{text && <IconButton label="Clear text" className="clear-text" onClick={() => changeInput("")}><X size={14} /></IconButton>}<div className="panel-tools"><div><IconButton label={recording ? "Stop recording" : "Use microphone"} className={recording ? "recording" : ""} onClick={record}><Mic size={17} /></IconButton><IconButton label="Listen to original" disabled={!text} onClick={() => speak(text, sourceLang, notify)}><Volume2 size={17} /></IconButton></div><span className={bytes > 500 ? "text-error" : ""}>{bytes}<span> / 500</span></span></div></div>
    <div className={`translation-output ${loading ? "is-translating" : ""}`} aria-live="polite">{loading ? <div className="translation-loading"><div className="skeleton" /><div className="skeleton" /><span>Finding the right words…</span></div> : <><div className={`translated-text ${!output ? "placeholder" : ""}`}>{output || "Your translation will appear here"}</div>{output === "Kumusta! Kumusta ka?" && targetLang === "tl" && <p className="pronunciation">koo-moos-TAH · koo-moos-TAH kah</p>}{note && output && <p className="translation-note">{note}</p>}</>}<div className="panel-tools"><span className="output-language">{output && !loading && <><span className="tiny-dot" />{getLanguage(targetLang).name}</>}</span><div><IconButton label="Listen to translation" disabled={!output || loading} onClick={() => speak(output, targetLang, notify)}><Volume2 size={17} /></IconButton><IconButton label="Copy translation" disabled={!output || loading} onClick={async () => { try { await navigator.clipboard.writeText(output); notify("Translation copied."); } catch { notify("Clipboard access is unavailable. You can select and copy the text.", "error"); } }}><Copy size={16} /></IconButton><IconButton label={current?.saved ? "Unsave phrase" : "Save to phrasebook"} className={current?.saved ? "is-saved" : ""} disabled={!output || loading || saving} onClick={save}>{saving ? <Spinner size={16} /> : current?.saved ? <Bookmark size={17} fill="currentColor" /> : <Bookmark size={17} />}</IconButton></div></div></div></div>
    {error && <div className="translation-error" role="alert">{error}</div>}
    <div className="translator-footer"><span><Sparkles size={13} />{quality === "ai" ? `${provider} · AI translation, worth a quick check` : quality === "machine" ? `${provider} · machine translation` : provider === "Your phrasebook" ? "Your saved wording · reused here" : provider === "Original text" ? "Same language · no translation needed" : "Curated everyday phrases · no guesswork"}</span><button className="button primary translate-button" onClick={translate} disabled={loading || !text.trim()}>{loading ? <Spinner size={16} /> : null}{loading ? "Translating" : "Translate"}{!loading && <ArrowUpRight size={16} />}</button></div>
    {expanded && <div className="translation-privacy"><Check size={13} />Translations are stored in your history. Only text needing live translation is sent to LibreTranslate or MyMemory.</div>}
  </section>;
}

export function TranslatePage() {
  const { navigate } = useWorkspace();
  const [context, setContext] = useState<TranslatorContext>({ sourceText: "", translatedText: "", sourceLang: "en", targetLang: "tl" });
  return <><div className="page-heading"><div><span className="eyebrow">PHILIPPINE LANGUAGES, ONE WORKSPACE</span><h1>Every word opens a door<span className="green-period">.</span></h1><p>From a simple hello to a meaningful conversation.</p></div><span className="soft-badge"><span className="tiny-dot" />{nativeLanguages.length} Philippine languages, one workspace</span></div>
  <div className="translate-layout"><Translator expanded onContext={setContext} /><AssistantPanel context={context} /></div>
  <div className="translation-notes"><div className="card"><span className="section-icon mint"><Languages size={21} /></span><h3>Local words. Real connections.</h3><p>Explore Filipino, Cebuano, Ilocano, Hiligaynon, Waray, Kapampangan, Pangasinan, and Bikol. Every phrase is checked against a published dictionary or phrasebook, and anything we cannot source is left out rather than guessed.</p><button className="text-button" onClick={() => navigate("learn")}>Meet the languages <ArrowUpRight size={15} /></button></div><div className="card"><span className="section-icon purple"><Sparkles size={21} /></span><h3>Salita AI, when you need more than a word.</h3><p>Text the curated phrasebook doesn’t cover is translated by a language model that understands Philippine regional languages. The assistant beside it explains nuance, gives examples, and practises with you.</p><button className="text-button" onClick={() => navigate("settings")}>AI preferences <ArrowUpRight size={15} /></button></div><div className="card"><span className="section-icon peach"><Bookmark size={21} /></span><h3>Keep the words that matter.</h3><p>Tap the bookmark on any translation to add it to your phrasebook. Organize your favorites into collections for your next trip or conversation.</p><button className="text-button" onClick={() => navigate("phrasebook")}>Open your phrasebook <ArrowUpRight size={15} /></button></div></div></>;
}
