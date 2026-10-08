"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const KEY = "rs-theme";
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "Theme: same as device", light: "Theme: light", dark: "Theme: dark" };

/** Runs in <head> before the page paints, so a dark-mode visitor never sees a white flash. */
// It also switches to light while printing, so a printed brief is never white text on white paper.
export const THEME_SCRIPT = `(()=>{var h=document.documentElement,w;try{var t=localStorage.getItem("${KEY}");h.classList.toggle("dark",t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))}catch(e){}addEventListener("beforeprint",function(){w=h.classList.contains("dark");h.classList.remove("dark")});addEventListener("afterprint",function(){if(w)h.classList.add("dark")})})()`;

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Read after mounting: the server can't know what the browser saved.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readTheme());
    const media = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => readTheme() === "system" && apply("system");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  function cycle() {
    const next = NEXT[theme ?? "system"];
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {}
    apply(next);
    setTheme(next);
  }

  const current = theme ?? "system";
  return (
    <button
      type="button"
      onClick={cycle}
      title={LABEL[current]}
      aria-label={`${LABEL[current]}. Click to change.`}
      className="icon-btn"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        {current === "light" && (
          <>
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
        {current === "dark" && <path strokeLinejoin="round" d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />}
        {current === "system" && (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path strokeLinecap="round" d="M8 20h8m-4-4v4" />
          </>
        )}
      </svg>
    </button>
  );
}
