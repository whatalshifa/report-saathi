import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusPanel } from "@/components/StatusPanel";
import results from "@/data/accuracy.json";

export const metadata = { title: "How accurate is it? · ReportSaathi" };

type Block = Record<string, number | null>;
type Results = {
  run_at: string | null;
  model?: string;
  overall?: Block;
  by_source?: Record<string, Block>;
};

const METRICS: [string, string, string][] = [
  ["values_found_pct", "Values found", "Share of the values printed on the reports that ReportSaathi read at all."],
  ["values_invented_pct", "Values invented", "Values it reported that aren’t on the report. Lower is better."],
  ["value_correct_pct", "Number read right", "Of the values found, the share whose number or word matches the paper exactly."],
  ["unit_correct_pct", "Unit read right", "Of the values found, the share with the right unit."],
  ["flag_correct_pct", "Flag right", "Of the values found, the share marked low, high or normal the same way a careful person would."],
  ["date_correct_pct", "Report date right", "Share of reports where the date was read correctly."],
];

const pct = (value: number | null | undefined) => (value === null || value === undefined ? "–" : `${value}%`);

export default function AccuracyPage() {
  const data = results as Results;
  const sources = Object.entries(data.by_source ?? {});

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        eyebrow="Accuracy"
        title="How accurate is ReportSaathi?"
        description="We test it on real lab reports from Indian labs, a mix of PDFs and phone photos. A person writes down every value from the paper by hand, then ReportSaathi reads the same reports from scratch and the two are compared value by value."
      />

      {data.run_at && data.overall ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {METRICS.slice(0, 3).map(([key, label]) => (
              <StatCard key={key} label={label} value={pct(data.overall?.[key])} />
            ))}
          </section>
          <section className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-slate-50/80 text-left text-xs text-muted dark:bg-slate-800/40">
                <tr>
                  <th className="px-4 py-2 font-medium">Measure</th>
                  <th className="px-4 py-2 text-right font-medium">All</th>
                  {sources.map(([source]) => (
                    <th key={source} className="px-4 py-2 text-right font-medium">
                      {source === "pdf" ? "PDFs" : "Photos"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <td className="px-4 py-2.5">Reports tested</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{data.overall.reports}</td>
                  {sources.map(([source, block]) => (
                    <td key={source} className="px-4 py-2.5 text-right tabular-nums">
                      {block.reports}
                    </td>
                  ))}
                </tr>
                {METRICS.map(([key, label]) => (
                  <tr key={key}>
                    <td className="px-4 py-2.5">{label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{pct(data.overall?.[key])}</td>
                    {sources.map(([source, block]) => (
                      <td key={source} className="px-4 py-2.5 text-right tabular-nums">
                        {pct(block[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="text-sm text-muted">
            Last run {new Date(data.run_at).toLocaleDateString("en-IN", { dateStyle: "long" })} with {data.model}.
          </p>
        </>
      ) : (
        <StatusPanel tone="empty" title="Results coming soon">
          The first test run on real reports hasn’t been published yet. When it is, the numbers will appear here.
        </StatusPanel>
      )}

      <section>
        <h2 className="section-title mb-4">What each number means</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {METRICS.map(([key, label, meaning]) => (
            <div key={key} className="card p-4">
              <dt className="font-semibold">{label}</dt>
              <dd className="mt-1 text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-sm text-muted">
        No report or patient detail is published, only these totals. ReportSaathi can still misread a report, so always
        check important values against the original.{" "}
        <Link href="/" className="link">
          Back to ReportSaathi
        </Link>
      </p>
    </div>
  );
}
