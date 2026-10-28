"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Bell, BookOpen, Check, ChevronDown, ChevronRight, ChevronsUpDown, CircleHelp, Flame, Folders, Globe2, GraduationCap, History, Languages, LayoutGrid, LogOut, Menu, PanelLeft, Search, Settings2, Sparkles, X, type LucideIcon } from "lucide-react";
import type { Translation, View, WorkspaceData } from "@/lib/types";
import { getLanguage, languages } from "@/lib/languages";
import { getStreak, request } from "@/lib/client";
import { WorkspaceProvider, useWorkspace } from "./workspace-provider";
import { Brand, IconButton, Modal, SearchField, Spinner } from "./ui";
import { AuthDialog, PhraseEditor } from "./editors";
import { OverviewPage } from "./overview";
import { TranslatePage } from "./translator";
import { LearnPage, LessonDialog } from "./learning";
import { CollectionsPage, PhrasebookPage, SettingsPage } from "./library";

const nav: { label: string; view: View; icon: LucideIcon; badge?: boolean }[] = [
  { label: "Overview", view: "overview", icon: LayoutGrid },
  { label: "Translate", view: "translate", icon: Languages },
  { label: "My phrasebook", view: "phrasebook", icon: BookOpen, badge: true },
  { label: "Learn languages", view: "learn", icon: GraduationCap },
];
const library: { label: string; view: View; icon: LucideIcon }[] = [
  { label: "Collections", view: "collections", icon: Folders },
  { label: "Translation history", view: "history", icon: History },
];
const titles: Record<View, string> = { overview: "Overview", translate: "Translate", phrasebook: "My phrasebook", learn: "Learn languages", collections: "Collections", history: "Translation history", settings: "Settings" };

export function SalitaApp({ initialData }: { initialData: WorkspaceData }) { return <WorkspaceProvider initialData={initialData}><AppShell /></WorkspaceProvider>; }

function AppShell() {
  const { data, view, navigate, refresh, notify, authOpen, setAuthOpen, setActiveCollection } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-up" | "sign-in">("sign-up");
  const [openLanguage, setOpenLanguage] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<Translation | null>(null);
  const initials = data.user.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  const savedCount = data.translations.filter((item) => item.saved).length;
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === "k") { event.preventDefault(); setSearchOpen((current) => !current); } if (event.key === "Escape") { setMobileOpen(false); setProfileOpen(false); } };
    window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown);
  }, []);
  useEffect(() => {
    if (!profileOpen) return;
    const close = (event: MouseEvent) => { if (event.target instanceof Element && !event.target.closest(".profile-control")) setProfileOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [profileOpen]);
  function go(next: View) { if (next === "phrasebook") setActiveCollection(null); navigate(next); setMobileOpen(false); setProfileOpen(false); }
  async function signOut() {
    setSigningOut(true);
    try { await request("/api/auth/sign-out", "POST"); await refresh(); go("overview"); notify("You’re signed out. See you again soon."); }
    catch (error) { notify(error instanceof Error ? error.message : "Please try again.", "error"); }
    finally { setSigningOut(false); }
  }
  return <div className="app-shell">{mobileOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}<aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}><div className="sidebar-brand"><button className="brand-button" onClick={() => go("overview")} aria-label="Salita home"><Brand /></button><span className="brand-tagline">A world of understanding.</span><IconButton label="Close navigation" className="mobile-close" onClick={() => setMobileOpen(false)}><X size={21} /></IconButton></div><nav aria-label="Main navigation"><div className="nav-group-label">YOUR WORKSPACE</div><div className="nav-group">{nav.map((item) => <button className={`nav-item ${view === item.view ? "active" : ""}`} key={item.view} onClick={() => go(item.view)} aria-current={view === item.view ? "page" : undefined}><item.icon size={19} strokeWidth={1.7} /><span>{item.label}</span>{item.badge && <span className="nav-badge">{savedCount}</span>}{view === item.view && <span className="nav-active-dot" />}</button>)}</div><div className="nav-group-label library-label">YOUR LIBRARY</div><div className="nav-group">{library.map((item) => <button className={`nav-item ${view === item.view ? "active" : ""}`} key={item.view} onClick={() => go(item.view)} aria-current={view === item.view ? "page" : undefined}><item.icon size={19} strokeWidth={1.7} /><span>{item.label}</span>{view === item.view && <span className="nav-active-dot" />}</button>)}</div></nav><div className="sidebar-bottom"><div className="sidebar-inspiration"><span className="inspiration-icon"><Sparkles size={19} strokeWidth={1.6} /></span><span className="inspiration-decor" aria-hidden="true">✳</span><h3>Small words.<br />Big possibilities.</h3><p>Your next connection<br />starts with a hello.</p><button onClick={() => go("learn")}>Explore languages<ArrowUpRight size={15} /></button></div><div className="sidebar-utilities"><button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => go("settings")}><Settings2 size={19} strokeWidth={1.7} /><span>Settings</span></button><button className="nav-item" onClick={() => { setHelpOpen(true); setMobileOpen(false); }}><CircleHelp size={19} strokeWidth={1.7} /><span>Help & tips</span><ArrowUpRight size={13} /></button></div><button className="sidebar-user" onClick={() => data.isDemo ? setAuthOpen(true) : go("settings")}><span className="avatar">{initials}</span><span className="sidebar-user-text"><strong>{data.user.name}</strong><span><span className="tiny-dot" />{data.isDemo ? "Demo workspace" : "Personal workspace"}</span></span><ChevronsUpDown size={15} /></button></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><IconButton label="Open navigation" className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></IconButton><PanelLeft size={18} className="breadcrumb-icon" /><button onClick={() => go("overview")}>Workspace</button><ChevronRight size={13} /><span>{titles[view]}</span></div><div className="topbar-actions"><button className="global-search-trigger" onClick={() => setSearchOpen(true)}><Search size={15} /><span>Search anything...</span><kbd>⌘ K</kbd></button>{data.isDemo && <button className="sign-in-link" onClick={() => { setAuthMode("sign-in"); setAuthOpen(true); }}>Sign in<ArrowUpRight size={12} /></button>}<IconButton label="Your activity and reminders" className="notification-trigger" onClick={() => setNotificationsOpen(true)}><Bell size={19} /><span className="notification-dot" /></IconButton><span className="topbar-divider" /><div className="profile-control"><button className="profile-trigger" aria-label="Account menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}><span className="avatar top-avatar">{initials}</span><ChevronDown size={13} /></button>{profileOpen && <><button className="profile-menu-backdrop" aria-label="Close account menu" onClick={() => setProfileOpen(false)} /><div className="profile-menu"><strong>{data.user.name}</strong><span>{data.isDemo ? "You’re exploring a shared demo" : data.user.email}</span><hr /><button onClick={() => go("settings")}><Settings2 size={16} />Workspace settings</button>{data.isDemo ? <button onClick={() => { setProfileOpen(false); setAuthOpen(true); }}><ArrowUpRight size={16} />Create account / Sign in</button> : <button disabled={signingOut} onClick={signOut}>{signingOut ? <Spinner size={16} /> : <LogOut size={16} />}Sign out</button>}</div></>}</div></div></header><main className="main-content" id="main-content">{view === "overview" && <OverviewPage />}{view === "translate" && <TranslatePage />}{view === "phrasebook" && <PhrasebookPage key="phrasebook" />}{view === "history" && <PhrasebookPage key="history" history />}{view === "learn" && <LearnPage />}{view === "collections" && <CollectionsPage />}{view === "settings" && <SettingsPage key={data.user.id} />}<footer className="workspace-footer"><span>Made for meaningful connections.</span><span><span className="tiny-dot" />A little <em>malasakit</em>, in every word<span className="footer-flag">🇵🇭</span></span></footer></main></div>
    {authOpen && <AuthDialog initialMode={authMode} onClose={() => { setAuthOpen(false); setAuthMode("sign-up"); }} />}{searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} onOpenLanguage={(language) => { setSearchOpen(false); setOpenLanguage(language); }} onOpenPhrase={(phrase) => { setSearchOpen(false); setEditingPhrase(phrase); }} />}{openLanguage && <LessonDialog language={openLanguage} onClose={() => setOpenLanguage(null)} />}{editingPhrase && <PhraseEditor phrase={editingPhrase} onClose={() => setEditingPhrase(null)} />}{helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}{notificationsOpen && <ActivityDialog onClose={() => setNotificationsOpen(false)} />}</div>;
}

function GlobalSearch({ onClose, onOpenPhrase, onOpenLanguage }: { onClose: () => void; onOpenPhrase: (phrase: Translation) => void; onOpenLanguage: (language: string) => void }) {
  const { data, navigate, setActiveCollection } = useWorkspace();
  const [query, setQuery] = useState("");
  const value = query.trim().toLowerCase();
  const phrases = value ? data.translations.filter((item) => `${item.sourceText} ${item.translatedText}`.toLowerCase().includes(value)).slice(0, 5) : [];
  const folders = value ? data.collections.filter((item) => item.title.toLowerCase().includes(value)).slice(0, 3) : [];
  const foundLanguages = value ? languages.filter((item) => `${item.name} ${item.native}`.toLowerCase().includes(value)).slice(0, 3) : [];
  return <Modal title="A word, a phrase, a possibility…" subtitle="Find something in your workspace." onClose={onClose} className="search-modal"><div className="global-search-body"><SearchField value={query} onChange={setQuery} placeholder="What are you looking for?" />{!value ? <div className="search-quick-links"><span className="eyebrow">A GOOD PLACE TO START</span>{nav.map((item) => <button key={item.view} onClick={() => { navigate(item.view); onClose(); }}><item.icon size={18} /><span>{item.label}</span><ArrowUpRight size={15} /></button>)}</div> : <div className="search-results">{phrases.length > 0 && <><span className="eyebrow">YOUR WORDS</span>{phrases.map((item) => <button key={item.id} onClick={() => onOpenPhrase(item)}><span className="search-result-icon">{getLanguage(item.targetLang).flag}</span><span><strong>{item.sourceText}</strong><small>{item.translatedText}</small></span><ArrowUpRight size={15} /></button>)}</>}{folders.length > 0 && <><span className="eyebrow">COLLECTIONS</span>{folders.map((item) => <button key={item.id} onClick={() => { setActiveCollection(item.id); navigate("phrasebook"); onClose(); }}><Folders size={20} /><span><strong>{item.title}</strong><small>{item.description}</small></span><ArrowUpRight size={15} /></button>)}</>}{foundLanguages.length > 0 && <><span className="eyebrow">LANGUAGES TO EXPLORE</span>{foundLanguages.map((item) => <button key={item.code} onClick={() => onOpenLanguage(item.code)}><span className="search-result-icon">{item.flag}</span><span><strong>{item.name}</strong><small>{item.region}</small></span><ArrowUpRight size={15} /></button>)}</>}{!phrases.length && !folders.length && !foundLanguages.length && <div className="search-empty"><Search size={27} /><h3>Not quite the right words.</h3><p>Try a phrase, language, or collection name.</p></div>}</div>}<div className="search-shortcut"><kbd>esc</kbd> to return to your workspace</div></div></Modal>;
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const { navigate, data, setAuthOpen } = useWorkspace();
  return <Modal title="A little help goes a long way." subtitle="Make the most of your Salita workspace." onClose={onClose}><div className="help-content"><div className="help-intro"><span className="section-icon mint"><CircleHelp size={23} /></span><p>Salita means <strong>“word”</strong> in Filipino. We’re here to make new words feel a little more familiar.</p></div><details open><summary>How does translation work?<ChevronDown size={15} /></summary><p>Choose your source and target languages, enter your text, and press Translate. Curated phrases and your saved wording are checked first. Other text uses LibreTranslate when configured, or MyMemory, with a 500-byte request limit and provider usage limits. Machine results are labelled so you can review nuance.</p></details><details><summary>Which Philippine languages can I explore?<ChevronDown size={15} /></summary><p>Filipino, Cebuano, Ilocano, Hiligaynon, Waray, Kapampangan, Pangasinan, and Bikol. Live translation coverage varies for regional languages, but everyday phrases and beginner lessons are always available.</p></details><details><summary>How do I keep a useful phrase?<ChevronDown size={15} /></summary><p>Click the bookmark on a translation. You can edit it, add your own phrases, and organize everything into collections in My phrasebook.</p></details><details><summary>Will my learning progress be saved?<ChevronDown size={15} /></summary><p>Yes. Complete the three practice questions in a lesson and your progress is saved in the database. Your activity also builds your learning streak.</p></details><details><summary>Is my workspace private?<ChevronDown size={15} /></summary><p>The demo is shared, so please don’t enter sensitive information there. Create an account for an isolated personal workspace. Passwords are securely hashed, and your session uses an HTTP-only cookie. Text sent for live translation is processed by the configured LibreTranslate service or MyMemory; curated and saved phrases do not need a live provider.</p></details><button className="button primary help-action" onClick={() => { onClose(); if (data.isDemo) setAuthOpen(true); else navigate("learn"); }}>{data.isDemo ? "Make this workspace yours" : "Find your next lesson"}<ArrowUpRight size={16} /></button></div></Modal>;
}

function ActivityDialog({ onClose }: { onClose: () => void }) {
  const { data, navigate } = useWorkspace();
  const streak = getStreak(data.activity);
  const lessons = data.progress.reduce((total, item) => total + item.completed, 0);
  return <Modal title="A little encouragement." subtitle="Small steps are still steps forward." onClose={onClose} className="activity-modal"><div className="activity-list"><div><span className="section-icon peach"><Flame size={21} /></span><span><strong>{streak ? `A ${streak}-day streak. Look at you!` : "Today is a lovely day to begin."}</strong><p>{streak ? "Keep the connection going with a short lesson today." : "Your first lesson is the start of something good."}</p></span></div><div><span className="section-icon mint"><GraduationCap size={21} /></span><span><strong>{lessons} little milestones</strong><p>You’ve completed {lessons} lessons. Every word makes a difference.</p></span></div><div><span className="section-icon blue"><Globe2 size={21} /></span><span><strong>A world of new possibilities</strong><p>Eight Philippine languages and nineteen world languages are ready to explore.</p></span></div><button className="button primary" onClick={() => { navigate("learn"); onClose(); }}>Make time for a little learning<ArrowRight size={16} /></button><p className="activity-bottom"><Check size={13} />You’re right where you need to be.</p></div></Modal>;
}
