import { IconAlert } from "@/components/icons";

/** Grey placeholder shapes shown while a page loads, in the shape of what is coming. */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="w-2/3 space-y-2">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-3 w-1/3" />
          </div>
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="space-y-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="card space-y-4 p-5">
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-8 w-1/4" />
            <div className="skeleton h-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A page heading over a list, for the reports, briefs, family and account pages. */
export function SkeletonListPage({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="space-y-3">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <SkeletonList rows={rows} />
    </div>
  );
}

/** The dashboard's shape: the person, two summary cards, the key markers and the side column. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="flex items-center gap-3.5">
        <div className="skeleton h-11 w-11 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-6 w-48" />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-[134px] rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
    >
      <IconAlert aria-hidden className="mt-px h-[18px] w-[18px] shrink-0" />
      <span>{message}</span>
    </p>
  );
}
