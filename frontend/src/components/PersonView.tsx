"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { FlagBadge } from "@/components/FlagBadge";
import { TrendChart } from "@/components/TrendChart";
import { getTrends, isOutOfRange, requestBrief, type TrendSeries } from "@/lib/api";
import { formatDate, formatNumber, formatRange } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

export function PersonView({ personKey }: { personKey: string }) {
  const router = useRouter();
  const load = useCallback(() => getTrends(personKey), [personKey]);
  const { data: trends, error } = usePoll(load, () => false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function startBrief() {
    setStarting(true);
    setBriefError(null);
    try {
      const brief = await requestBrief(personKey);
      router.push(`/briefs/${brief.id}`);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : "Could not start the brief");
      setStarting(false);
    }
  }

  if (error) return <p className="text-rose-700 dark:text-rose-300">{error}</p>;
  if (!trends) return <p className="text-slate-500">Loading…</p>;

  const { person, series } = trends;
  const charted = series.filter((s) => s.points.length > 1);
  const single = series.filter((s) => s.points.length === 1);
  const flagged = series.filter((s) => isOutOfRange(s.latest_flag)).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-medium text-teal-700 dark:text-teal-400">
            ← All reports
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{person.name}</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {[person.age, person.sex].filter(Boolean).join(", ")}
            {person.age || person.sex ? " · " : ""}
            {person.report_count} report{person.report_count === 1 ? "" : "s"} from {person.labs.length || 1} lab
            {person.labs.length === 1 ? "" : "s"}, {formatDate(person.first_date)} to {formatDate(person.last_date)}
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={startBrief}
            disabled={starting}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {starting ? "Starting…" : "Prepare doctor brief"}
          </button>
          {briefError && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{briefError}</p>}
        </div>
      </header>

      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <strong className="text-slate-900 dark:text-slate-100">{series.length} tests</strong> tracked across all
        reports. {flagged > 0 ? `${flagged} were outside the normal range at the latest reading.` : "All were in range at the latest reading."}{" "}
        Values from different labs are converted to one unit so they can be compared.
      </p>

      {charted.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {charted.map((s) => (
            <TrendCard key={s.key} series={s} />
          ))}
        </section>
      )}

      {single.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Measured once so far</h2>
          <p className="mb-3 text-sm text-slate-500">A trend appears once a test shows up in a second report.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2 font-medium">Test</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {single.map((s) => (
                  <tr key={s.key}>
                    <td className="px-4 py-2.5">{s.name}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatNumber(s.points[0].value)} <span className="text-slate-500">{s.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{formatDate(s.points[0].date)}</td>
                    <td className="px-4 py-2.5">
                      <FlagBadge flag={s.latest_flag} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {series.length === 0 && (
        <p className="text-slate-500">None of the tests on these reports are ones we can track over time yet.</p>
      )}
    </div>
  );
}

function TrendCard({ series }: { series: TrendSeries }) {
  const latest = series.points[series.points.length - 1];
  const previous = series.points[series.points.length - 2];

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{series.name}</h3>
        <FlagBadge flag={series.latest_flag} />
      </div>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold tabular-nums">{formatNumber(latest.value)}</span>
        <span className="text-sm text-slate-500">{series.unit}</span>
        {series.change !== null && series.change_pct !== null && (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {series.change > 0 ? "▲" : series.change < 0 ? "▼" : "■"} {Math.abs(series.change_pct)}% since{" "}
            {formatDate(previous.date)}
          </span>
        )}
      </p>
      <p className="mb-3 text-sm text-slate-500">
        Normal: {formatRange(series.ref_low, series.ref_high, null)} {series.unit}
      </p>
      <TrendChart series={series} />
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          Show as table
        </summary>
        <table className="mt-2 w-full">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Lab printed</th>
              <th className="py-1 font-medium">In {series.unit}</th>
              <th className="py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {series.points.map((p) => (
              <tr key={p.report_id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5">
                  <Link href={`/reports/${p.report_id}`} className="text-teal-700 hover:underline dark:text-teal-400">
                    {formatDate(p.date)}
                  </Link>
                </td>
                <td className="py-1.5">{p.printed}</td>
                <td className="py-1.5 tabular-nums">{formatNumber(p.value)}</td>
                <td className="py-1.5">
                  <FlagBadge flag={p.flag} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </article>
  );
}
