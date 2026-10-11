"use client";

import { useEffect, useState } from "react";

import { IconMoon, IconSun } from "@/components/icons";

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

const KNOB: Record<Theme, string> = {
  light: "left-1",
  system: "left-[calc(50%-14px)]",
  dark: "left-[calc(100%-32px)]",
};

/**
 * A little sun-and-moon pill. The round knob sits on the sun (light), on the moon (dark), or between the
 * two, half and half, when it follows the device. Each tap moves it along: device, light, dark.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
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
      className={`relative inline-flex h-9 w-[68px] shrink-0 items-center justify-between rounded-full bg-tint-strong px-2 text-muted transition-colors hover:text-foreground ${className}`}
    >
      <IconSun aria-hidden className="h-[18px] w-[18px] [--duo:var(--duo-coral)]" />
      <IconMoon aria-hidden className="h-[17px] w-[17px] [--duo:var(--duo-plum)]" />
      <span
        aria-hidden
        className={`absolute top-1 grid h-7 w-7 place-items-center rounded-full bg-surface shadow-[0_3px_8px_-2px_rgb(107_55_104/0.45)] transition-[left] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] dark:bg-brand-200 dark:shadow-[0_3px_10px_-2px_rgb(0_0_0/0.7)] ${KNOB[current]}`}
      >
        {current === "light" && <IconSun className="h-[18px] w-[18px] text-coral-600 [--duo:var(--color-coral-200)]" />}
        {current === "dark" && <IconMoon className="h-4 w-4 text-brand-800 [--duo:var(--color-brand-300)]" />}
        {current === "system" && (
          <svg viewBox="0 0 16 16" className="h-4 w-4">
            <path d="M8 2a6 6 0 0 0 0 12Z" className="fill-coral-400" />
            <path d="M8 2a6 6 0 0 1 0 12Z" className="fill-brand-600" />
          </svg>
        )}
      </span>
    </button>
  );
}
