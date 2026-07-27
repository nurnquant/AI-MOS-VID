"use client";

/** Light/dark switch — persists to localStorage, defaults to system. */
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  if (dark === null) return null;

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.dataset.theme = "dark";
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem("aivs-theme", next ? "dark" : "light");
    } catch {
      /* private mode — non-fatal */
    }
  };

  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
