/**
 * The ReportSaathi wordmark: "report" set light and "saathi" set heavy in plum, with a coral heart for the
 * dot of the last i and a hand-drawn coral stroke under "saathi" (saathi: a companion who walks with you).
 * There is no mark beside it; the round app icon (app/icon.svg) is only for the browser tab and home screen.
 */
const SIZES = {
  sm: "text-[19px]",
  md: "text-[23px]",
  xl: "text-[64px] sm:text-[104px] lg:text-[132px]",
} as const;

export function Logo({
  size = "md",
  inverse = false,
  className = "",
}: {
  size?: keyof typeof SIZES;
  /** On a plum panel: light letters. */
  inverse?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex leading-none ${SIZES[size]} ${className}`}>
      <span className="sr-only">ReportSaathi</span>
      <span aria-hidden className="inline-flex items-baseline tracking-[-0.045em] select-none">
        <span className={`font-medium ${inverse ? "text-white/85" : "text-foreground/80"}`}>report</span>
        <span className={`relative font-black ${inverse ? "text-brand-200" : "text-brand-700 dark:text-brand-300"}`}>
          saath
          <span className="relative">
            {/* A dotless i, so the heart can be its dot. */}
            {"ı"}
            <Heart />
          </span>
          <Swoosh />
        </span>
      </span>
    </span>
  );
}

function Heart() {
  return (
    <svg
      viewBox="0 0 20 18"
      className="absolute top-[0.04em] left-1/2 h-[0.3em] w-[0.34em] -translate-x-[42%] -rotate-12"
      aria-hidden
    >
      <path
        d="M10 17S1.5 11.6 1.5 6A4.4 4.4 0 0 1 10 3.7 4.4 4.4 0 0 1 18.5 6C18.5 11.6 10 17 10 17Z"
        className="fill-coral-500"
      />
    </svg>
  );
}

function Swoosh() {
  return (
    <svg
      viewBox="0 0 120 14"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -bottom-[0.2em] left-[0.02em] h-[0.2em] w-[96%]"
      aria-hidden
    >
      <path
        d="M3 9.5C28 4.5 70 2.8 117 5.2"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        className="stroke-coral-500"
      />
    </svg>
  );
}
