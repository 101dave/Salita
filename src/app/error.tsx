"use client";

import { ArrowRight, RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><section className="card" style={{ padding: "42px 35px", maxWidth: 450, textAlign: "center" }}><span className="section-icon mint" style={{ margin: "0 auto 22px" }}><RefreshCw size={23} /></span><h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.8px", lineHeight: 1.4 }}>Let’s find our words again.</h1><p style={{ fontSize: 12, lineHeight: 1.9, color: "#8b9b84", margin: "15px 0 24px" }}>Your workspace couldn’t load just now. Your saved words are still safe. A quick refresh usually gets the conversation going.</p><button className="button primary" onClick={reset}>Try again<ArrowRight size={16} /></button></section></main>;
}
