"use client";

import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowRight, LoaderCircle, Search, X, type LucideIcon } from "lucide-react";
import { languages } from "@/lib/languages";

export function Brand({ small = false }: { small?: boolean }) {
  return <div className={`brand ${small ? "brand-small" : ""}`}><span className="brand-mark"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 5.5h20a3.5 3.5 0 0 1 3.5 3.5v13a3.5 3.5 0 0 1-3.5 3.5h-9l-7.5 5v-5H6A3.5 3.5 0 0 1 2.5 22V9A3.5 3.5 0 0 1 6 5.5Z" fill="currentColor"/><path d="m9 13 5 5 9-9M18.5 18.5l4.5 4.5" stroke="#143B2C" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>salita<span className="brand-dot">.</span></span></div>;
}

export function IconButton({ children, label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" className={`icon-button ${className}`} title={label} aria-label={label} {...props}>{children}</button>;
}

export function Spinner({ size = 18 }: { size?: number }) { return <LoaderCircle size={size} className="spinner" aria-label="Loading" />; }

export function Modal({ title, subtitle, children, onClose, className = "" }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; className?: string }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = ref.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') || []);
    const input = panel?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, [autofocus]');
    (input || focusable()[0] || panel)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={ref}><div className="modal-header"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton label="Close dialog" onClick={onClose}><X size={20} /></IconButton></div>{children}</div></div>;
}

export function LanguageSelect({ value, onChange, label, nativeOnly = false }: { value: string; onChange: (value: string) => void; label: string; nativeOnly?: boolean }) {
  return <select className="language-select" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{(nativeOnly ? languages.filter((language) => language.philippine) : languages).map((language) => <option key={language.code} value={language.code}>{language.flag} {language.name}</option>)}</select>;
}

export function EmptyState({ icon: Icon, title, description, action, onAction }: { icon: LucideIcon; title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={29} strokeWidth={1.5} /></span><h3>{title}</h3><p>{description}</p>{action && <button className="button primary" onClick={onAction}>{action}<ArrowRight size={16} /></button>}</div>;
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="search-field"><Search size={17} /><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />{value && <button aria-label="Clear search" onClick={() => onChange("")}><X size={15} /></button>}</div>;
}
