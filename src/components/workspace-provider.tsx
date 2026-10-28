"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Collection, Translation, View, WorkspaceData } from "@/lib/types";
import { mutate, request } from "@/lib/client";
import { Check, CircleAlert, X } from "lucide-react";

interface WorkspaceContext {
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  view: View;
  navigate: (view: View) => void;
  refresh: () => Promise<void>;
  notify: (message: string, type?: "success" | "error") => void;
  toggleSaved: (translation: Translation) => Promise<void>;
  removeTranslation: (id: string) => Promise<boolean>;
  removeCollection: (id: string) => Promise<boolean>;
  activeCollection: string | null;
  setActiveCollection: Dispatch<SetStateAction<string | null>>;
  authOpen: boolean;
  setAuthOpen: Dispatch<SetStateAction<boolean>>;
}

const Context = createContext<WorkspaceContext | null>(null);
const views: View[] = ["overview", "translate", "phrasebook", "learn", "collections", "history", "settings"];

export function WorkspaceProvider({ initialData, children }: { initialData: WorkspaceData; children: ReactNode }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("overview");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(new Set<string>());
  useEffect(() => {
    const change = () => { const hash = window.location.hash.slice(1) as View; if (views.includes(hash)) setView(hash); };
    change(); window.addEventListener("hashchange", change);
    return () => { window.removeEventListener("hashchange", change); if (timer.current) clearTimeout(timer.current); };
  }, []);
  const navigate = useCallback((next: View) => { setView(next); window.history.pushState(null, "", `#${next}`); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  const refresh = useCallback(async () => { setData(await request<WorkspaceData>("/api/workspace")); }, []);
  const toggleSaved = useCallback(async (translation: Translation) => {
    if (pending.current.has(translation.id)) return;
    pending.current.add(translation.id);
    const saved = !translation.saved;
    setData((current) => ({ ...current, translations: current.translations.map((item) => item.id === translation.id ? { ...item, saved } : item) }));
    try {
      await mutate<Translation>("PATCH", "translations", { id: translation.id, saved });
      notify(saved ? "Added to your phrasebook." : "Removed from your phrasebook.");
    } catch (error) {
      setData((current) => ({ ...current, translations: current.translations.map((item) => item.id === translation.id ? { ...item, saved: translation.saved } : item) }));
      notify(error instanceof Error ? error.message : "Couldn’t save this phrase.", "error");
    } finally { pending.current.delete(translation.id); }
  }, [notify]);
  const removeTranslation = async (id: string) => {
    const previous = data.translations;
    setData((current) => ({ ...current, translations: current.translations.filter((item) => item.id !== id) }));
    try { await mutate("DELETE", "translations", { id }); notify("Phrase deleted."); return true; }
    catch (error) { setData((current) => ({ ...current, translations: previous })); notify(error instanceof Error ? error.message : "Couldn’t delete this phrase.", "error"); return false; }
  };
  const removeCollection = async (id: string) => {
    const previousCollections = data.collections;
    const previousTranslations = data.translations;
    setData((current) => ({ ...current, collections: current.collections.filter((item) => item.id !== id), translations: current.translations.map((item) => item.collectionId === id ? { ...item, collectionId: null } : item) }));
    try { await mutate<Collection>("DELETE", "collections", { id }); if (activeCollection === id) setActiveCollection(null); notify("Collection deleted. Your phrases are still in your phrasebook."); return true; }
    catch (error) { setData((current) => ({ ...current, collections: previousCollections, translations: previousTranslations })); notify(error instanceof Error ? error.message : "Couldn’t delete this collection.", "error"); return false; }
  };
  return <Context.Provider value={{ data, setData, view, navigate, refresh, notify, toggleSaved, removeTranslation, removeCollection, activeCollection, setActiveCollection, authOpen, setAuthOpen }}>
    {children}
    {toast && <div className={`toast toast-${toast.type}`} role="status"><span className="toast-symbol">{toast.type === "success" ? <Check size={16} /> : <CircleAlert size={16} />}</span><span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button></div>}
  </Context.Provider>;
}

export function useWorkspace() { const context = useContext(Context); if (!context) throw new Error("Workspace provider is missing"); return context; }
