// Each person keeps one colour wherever they appear, picked from their name. Text is at least 7:1 on its tile.
const TONES = [
  "bg-brand-200 text-brand-900 dark:bg-brand-800 dark:text-brand-50",
  "bg-coral-200 text-coral-800 dark:bg-coral-800 dark:text-coral-100",
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
  md: "h-8 w-8 text-xs",
  chip: "h-9 w-9 text-[13px]",
  lg: "h-14 w-14 text-lg",
};

/** A round initials chip. `ring` circles it in coral, for the person who is picked. */
export function PersonAvatar({
  name,
  size = "md",
  ring = false,
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZES;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-extrabold tracking-tight ${SIZES[size]} ${tone(name)} ${ring ? "ring-2 ring-coral-400 ring-offset-2 ring-offset-sidebar-active" : ""} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
