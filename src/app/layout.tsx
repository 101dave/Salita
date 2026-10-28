import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salita — A world of understanding",
  description: "Translate, save, and learn. Your personal workspace for Filipino, Philippine regional languages, and meaningful connections around the world.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#f7f9f8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
