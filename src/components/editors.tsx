"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Bookmark, Check, Eye, EyeOff, FolderOpen, LockKeyhole, Trash2 } from "lucide-react";
import type { Collection, Translation } from "@/lib/types";
import { mutate, request } from "@/lib/client";
import { useWorkspace } from "./workspace-provider";
import { Brand, LanguageSelect, Modal, Spinner } from "./ui";

export function PhraseEditor({ phrase, onClose }: { phrase?: Translation; onClose: () => void }) {
  const { data, setData, notify, activeCollection } = useWorkspace();
  const [sourceText, setSourceText] = useState(phrase?.sourceText || "");
  const [translatedText, setTranslatedText] = useState(phrase?.translatedText || "");
  const [sourceLang, setSourceLang] = useState(phrase?.sourceLang || "en");
  const [targetLang, setTargetLang] = useState(phrase?.targetLang || "tl");
  const [collectionId, setCollectionId] = useState(phrase?.collectionId || activeCollection || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await mutate<Translation>(phrase ? "PATCH" : "POST", "translations", { id: phrase?.id, sourceText, translatedText, sourceLang, targetLang, collectionId: collectionId || null, saved: true });
      setData((current) => ({ ...current, translations: phrase ? current.translations.map((item) => item.id === phrase.id ? result : item) : [result, ...current.translations] }));
      notify(phrase ? "Phrase updated." : "A new phrase, ready for the right moment."); onClose();
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t save this phrase."); }
    finally { setLoading(false); }
  }
  return <Modal title={phrase ? "Edit your phrase" : "A phrase worth keeping"} subtitle="Keep useful words close, wherever life takes you." onClose={onClose}><form className="editor-form" onSubmit={submit}><div className="form-language-row"><label>From<LanguageSelect label="Original language" value={sourceLang} onChange={setSourceLang} /></label><span>→</span><label>To<LanguageSelect label="Translation language" value={targetLang} onChange={setTargetLang} /></label></div><label>Original phrase<textarea aria-label="Original phrase" required maxLength={2000} value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="e.g. Good morning" rows={3} /></label><label>Translation<textarea aria-label="Translation" required maxLength={2000} value={translatedText} onChange={(event) => setTranslatedText(event.target.value)} placeholder="e.g. Magandang umaga" rows={3} /></label><label>Collection <span className="optional">optional</span><select aria-label="Collection" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">No collection</option>{data.collections.map((folder) => <option key={folder.id} value={folder.id}>{folder.title}</option>)}</select></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={loading}>Cancel</button><button className="button primary" type="submit" disabled={loading}>{loading ? <Spinner size={16} /> : <Bookmark size={16} />}{phrase ? "Save changes" : "Save phrase"}</button></div></form></Modal>;
}

const colors = [{ value: "green", label: "Sage green" }, { value: "blue", label: "Ocean blue" }, { value: "orange", label: "Warm peach" }, { value: "purple", label: "Lavender" }, { value: "pink", label: "Rose" }];

export function CollectionEditor({ collection, onClose }: { collection?: Collection; onClose: () => void }) {
  const { setData, notify } = useWorkspace();
  const [title, setTitle] = useState(collection?.title || "");
  const [description, setDescription] = useState(collection?.description || "");
  const [color, setColor] = useState(collection?.color || "green");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await mutate<Collection>(collection ? "PATCH" : "POST", "collections", { id: collection?.id, title, description, color });
      setData((current) => ({ ...current, collections: collection ? current.collections.map((item) => item.id === collection.id ? result : item) : [...current.collections, result] }));
      notify(collection ? "Collection updated." : "Your new collection is ready."); onClose();
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t save this collection."); }
    finally { setLoading(false); }
  }
  return <Modal title={collection ? "Edit collection" : "Make room for new words"} subtitle="A little organization for your next big connection." onClose={onClose}><form className="editor-form" onSubmit={submit}><div className={`collection-preview color-${color}`}><FolderOpen size={30} strokeWidth={1.5} /><span>{title || "Your new collection"}</span></div><label>Collection name<input required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. My next island adventure" /></label><label>Description <span className="optional">optional</span><textarea aria-label="Description" value={description} maxLength={300} onChange={(event) => setDescription(event.target.value)} placeholder="What words will you keep here?" rows={3} /></label><fieldset className="color-picker"><legend>Make it yours</legend>{colors.map((item) => <button key={item.value} type="button" className={`color-swatch color-${item.value} ${color === item.value ? "selected" : ""}`} title={item.label} aria-label={item.label} aria-pressed={color === item.value} onClick={() => setColor(item.value)}>{color === item.value && <Check size={17} />}</button>)}</fieldset>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button className="button secondary" type="button" onClick={onClose} disabled={loading}>Cancel</button><button className="button primary" type="submit" disabled={loading}>{loading ? <Spinner size={16} /> : <FolderOpen size={16} />}{collection ? "Save changes" : "Create collection"}</button></div></form></Modal>;
}

export function DeleteDialog({ title, description, onConfirm, onClose }: { title: string; description: string; onConfirm: () => Promise<unknown>; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  return <Modal title={title} onClose={onClose} className="modal-small"><div className="delete-dialog"><span className="delete-symbol"><Trash2 size={24} /></span><p>{description}</p><div className="modal-actions"><button className="button secondary" disabled={loading} onClick={onClose}>Keep it</button><button className="button danger" disabled={loading} onClick={async () => { setLoading(true); try { await onConfirm(); onClose(); } finally { setLoading(false); } }}>{loading ? <Spinner size={16} /> : <Trash2 size={16} />}Delete</button></div></div></Modal>;
}

export function AuthDialog({ onClose, initialMode = "sign-up" }: { onClose: () => void; initialMode?: "sign-up" | "sign-in" }) {
  const { refresh, notify, navigate } = useWorkspace();
  const [mode, setMode] = useState<"sign-up" | "sign-in">(initialMode);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try { await request(`/api/auth/${mode}`, "POST", { name, email, password }); await refresh(); notify(mode === "sign-up" ? "Welcome to Salita. Your personal journey starts here." : "Welcome back. Your words are right where you left them."); navigate("overview"); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); }
  }
  return <Modal title={mode === "sign-up" ? "Your world, a little more connected." : "Good to see you again."} subtitle={mode === "sign-up" ? "Create your free account and make this workspace yours." : "Sign in to pick up where you left off."} onClose={onClose} className="auth-modal"><div className="auth-brand"><Brand small /><span>Words bring us together.</span></div><form className="editor-form" onSubmit={submit}>{mode === "sign-up" && <label>Your name<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" /></label>}<label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<div className="password-field"><input type={showPassword ? "text" : "password"} required minLength={8} maxLength={128} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary auth-submit" disabled={loading}>{loading ? <Spinner size={17} /> : null}{mode === "sign-up" ? "Create your account" : "Sign in"}<ArrowRight size={17} /></button></form><p className="auth-switch">{mode === "sign-up" ? "Already part of the conversation?" : "New to Salita?"} <button onClick={() => { setMode(mode === "sign-up" ? "sign-in" : "sign-up"); setError(""); }}>{mode === "sign-up" ? "Sign in" : "Create an account"}</button></p><p className="auth-security"><LockKeyhole size={12} />Your personal workspace is private and securely stored.</p></Modal>;
}
