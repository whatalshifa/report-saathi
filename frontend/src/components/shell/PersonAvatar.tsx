// Each person keeps one colour wherever they appear, picked from their name. Text is at least 7:1 on its tile.
const TONES = [
  "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100",
  "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-100",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

function tone(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-7 w-7 text-[11px]",
  lg: "h-11 w-11 text-[15px]",
};

export function PersonAvatar({ name, size = "md", className = "" }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold tracking-tight ${SIZES[size]} ${tone(name)} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
