"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * A small "More" menu for actions that shouldn't sit beside the main ones (such as Delete). The button
 * says whether it is open; Escape or a click outside closes it, and focus goes back to the button.
 */
export function MoreMenu({ label = "More actions", children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className="icon-btn h-8 w-8 border border-line bg-surface"
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          role="menu"
          aria-label={label}
          onClick={() => setOpen(false)}
          className="absolute right-0 z-30 mt-1.5 min-w-44 rounded-ctl border border-line bg-surface p-1 shadow-[0_8px_24px_-8px_rgb(42_29_40/0.2)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** One action inside a `MoreMenu`. `danger` turns it red, since by then the person has chosen to look. */
export function MoreMenuItem({
  onSelect,
  danger = false,
  icon,
  children,
}: {
  onSelect: () => void;
  danger?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm focus-visible:-outline-offset-2 ${
        danger
          ? "text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
          : "hover:bg-stone-100 dark:hover:bg-stone-800"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
