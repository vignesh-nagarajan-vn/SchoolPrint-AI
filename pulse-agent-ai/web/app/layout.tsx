import type { Metadata, Viewport } from "next";
import Link from "next/link";

import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "SchoolPulse AI",
  description:
    "Voice-driven school operations intelligence: food, water, energy, and event forecasting.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Bricolage Grotesque (display) + IBM Plex Sans/Mono. Loaded at runtime
            so the build needs no network access. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Navbar />

        {/* Big bold SchoolPulse AI title, centered under the navbar; doubles as
            the home link. */}
        <header>
          <div className="container py-9 text-center sm:py-12">
            <Link href="/" className="inline-block">
              <h1 className="font-display text-[3.6rem] font-extrabold leading-none tracking-tight sm:text-[5.4rem]">
                SchoolPulse AI
              </h1>
            </Link>
          </div>
        </header>

        <main className="container pb-20 pt-6">{children}</main>

        <footer className="border-t border-border bg-background py-6 text-center font-mono text-xs text-muted-foreground">
          © Copyright SchoolPulse AI
        </footer>
      </body>
    </html>
  );
}
