import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { ProjectSelector } from "./project-selector";
import { SessionNav } from "./session-nav";
import { ThemeToggle } from "./theme-toggle";
import "./globals.css";

/** Arabic-first family with full Latin coverage; self-hosted by next/font. */
const plexArabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AIVS Studio",
  description: "Riwaq Al Ilm Enterprise AI Video Production Studio",
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/status", label: "Environment Status" },
  { href: "/projects", label: "Projects" },
  { href: "/assets", label: "Assets" },
  { href: "/members", label: "Members" },
  { href: "/consents", label: "Consents" },
  { href: "/scripts", label: "Scripts" },
  { href: "/publications", label: "Publishing" },
];

/** Runs before paint: honor stored choice, else system preference. */
const themeInit = `(function(){try{var s=localStorage.getItem("aivs-theme");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.dataset.theme="dark";}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={plexArabic.variable}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <nav className="app-nav" aria-label="Primary">
          <span className="app-nav-brand">AIVS Studio</span>
          {navItems.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
          <span className="app-nav-session">
            <ProjectSelector />
            <ThemeToggle />
            <SessionNav />
          </span>
        </nav>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
