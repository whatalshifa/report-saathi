import Link from "next/link";

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
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">How accurate is ReportSaathi?</h1>
        <p className="mt-2 text-muted">
          We test it on real lab reports from Indian labs, a mix of PDFs and phone photos. A person writes down every value
          from the paper by hand, then ReportSaathi reads the same reports from scratch and the two are compared value
          by value.
        </p>
      </header>

      {data.run_at && data.overall ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {METRICS.slice(0, 3).map(([key, label]) => (
              <div key={key} className="card p-4">
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{pct(data.overall?.[key])}</p>
              </div>
            ))}
          </section>
          <section className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-muted dark:bg-slate-800/60">
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
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-slate-600 dark:text-slate-400">
          The first test run on real reports hasn’t been published yet.
        </p>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">What each number means</h2>
        <dl className="space-y-2 text-sm">
          {METRICS.map(([key, label, meaning]) => (
            <div key={key}>
              <dt className="font-medium">{label}</dt>
              <dd className="text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-sm text-muted">
        No report or patient detail is published, only these totals. ReportSaathi can still misread a report, so always
        check important values against the original. <Link href="/" className="underline">Back to ReportSaathi</Link>
      </p>
    </div>
  );
}
