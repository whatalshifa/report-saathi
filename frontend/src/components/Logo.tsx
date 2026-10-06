/** The ReportSaathi mark: a report sheet with a pulse line through it. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" className="fill-teal-700 dark:fill-teal-600" />
      <path d="M10 7.5h8.5L23 12v12.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" fill="white" />
      <path d="M18.5 7.5V12H23" fill="none" stroke="#99f6e4" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M11 18.5h2.6l1.5-3.5 2.2 6 1.5-2.5H21"
        fill="none"
        stroke="#0f766e"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** `compact` hides the name on phones, where a signed-in header needs the room for its links. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`text-lg font-bold tracking-tight ${compact ? "hidden sm:inline" : ""}`}>
        Report<span className="text-teal-700 dark:text-teal-400">Saathi</span>
      </span>
    </span>
  );
}
