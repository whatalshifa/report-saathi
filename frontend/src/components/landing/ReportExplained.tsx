"use client";

import { ArrowRight, MousePointerClick, ScanSearch } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";

import { FlagBadge } from "@/components/FlagBadge";
import { RangeBar } from "@/components/RangeBar";
import { AppLink, useShell } from "@/components/shell/ShellContext";
import type { TestResult } from "@/lib/api";
import { formatRange } from "@/lib/format";

import { EXPLANATIONS, JANUARY, JANUARY_ID, LAB_ROWS, SCAN, type ExplainLanguage, type LabRow } from "./sample";

const LANGUAGES: { code: ExplainLanguage; label: string; note: string }[] = [
  { code: "en", label: "English", note: "Written by AI from the report. It is not medical advice." },
  { code: "hi", label: "हिन्दी", note: "यह जानकारी AI ने रिपोर्ट से लिखी है। यह डॉक्टर की सलाह नहीं है।" },
  { code: "mr", label: "मराठी", note: "हे स्पष्टीकरण AI ने रिपोर्टवरून लिहिले आहे. हा वैद्यकीय सल्ला नाही." },
];

const FLAGGED = LAB_ROWS.filter((r) => r.explained !== null);
const START = FLAGGED.find((r) => r.key === "hba1c") ?? FLAGGED[0];
const LETTER = { low: "L", high: "H" } as Record<string, string>;

/** "12-01-2026", the way the lab printed it. */
const printedDate = JANUARY.report_date.split("-").reverse().join("-");

/**
 * The signature demo: Meera's January report as the lab printed it, and next to it ReportSaathi's
 * explanation of whichever flagged value is picked, in English, Hindi or Marathi, with the spot on the
 * original scan the value was read from. Every word and number is the sample data the demo opens with.
 */
export function ReportExplained() {
  const [picked, setPicked] = useState<LabRow>(START);
  const [language, setLanguage] = useState<ExplainLanguage>("en");
  const windowRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  // On phones the report sits in a short window: bring the picked line into view inside it.
  useEffect(() => {
    const box = windowRef.current;
    const row = rowRefs.current.get(picked.name);
    if (!box || !row || box.scrollHeight <= box.clientHeight + 1) return;
    const top = row.offsetTop - box.clientHeight / 2 + row.offsetHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [picked]);

  const item = EXPLANATIONS[language].flagged[picked.explained!];
  const note = LANGUAGES.find((l) => l.code === language)!.note;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] lg:gap-10 xl:gap-14">
      {/* Phones pick from chips; the report itself is a short window below them. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:hidden">
        <ul className="flex w-max gap-2 pb-1" aria-label="Flagged values on this report">
          {FLAGGED.map((row) => (
            <li key={row.name}>
              <button
                type="button"
                onClick={() => setPicked(row)}
                aria-pressed={row === picked}
                className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors ${
                  row === picked
                    ? "border-brand-700 bg-brand-700 text-white dark:border-brand-300 dark:bg-brand-300 dark:text-brand-950"
                    : "border-line bg-surface"
                }`}
              >
                <span className="font-medium">{shortName(row.name)}</span>
                <span className="tabular-nums opacity-80">{row.value_text}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* The report, as printed */}
      <div className="min-w-0">
        <div className="relative rounded-[6px] bg-[#fffdf9] text-stone-900 shadow-[0_1px_2px_rgb(42_29_40/0.08),0_24px_48px_-24px_rgb(42_29_40/0.35)] ring-1 ring-stone-900/[0.06] dark:bg-[#1c171d] dark:text-stone-100 dark:ring-white/[0.08]">
          <div className="h-1.5 rounded-t-[6px] bg-stone-700 dark:bg-stone-500" />
          <div className="px-4 pt-4 sm:px-7 sm:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[17px] leading-tight font-bold tracking-[-0.01em] sm:text-xl">{JANUARY.lab_name}</p>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Laboratory report</p>
              </div>
              <span className="shrink-0 rounded-sm border-2 border-rose-700 px-2 py-0.5 text-xs font-bold tracking-[0.12em] text-rose-700 dark:border-rose-300 dark:text-rose-300">
                SAMPLE
              </span>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-1 border-y sm:grid-cols-2 border-stone-300 py-3 text-[13px] dark:border-stone-700">
              <div className="flex gap-2">
                <dt className="whitespace-nowrap text-stone-500 dark:text-stone-400">Patient</dt>
                <dd className="font-semibold">{JANUARY.patient_name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="whitespace-nowrap text-stone-500 dark:text-stone-400">Collected</dt>
                <dd className="font-semibold tabular-nums">{printedDate}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="whitespace-nowrap text-stone-500 dark:text-stone-400">Age / Sex</dt>
                <dd className="font-semibold">
                  {JANUARY.patient_age} / {JANUARY.patient_sex}
                </dd>
              </div>
            </dl>
          </div>

          <div
            ref={windowRef}
            className="relative max-h-[330px] overflow-y-auto overscroll-contain px-2 pb-4 sm:max-h-[420px] sm:px-5 lg:max-h-none lg:overflow-visible lg:pb-6"
          >
            <table className="w-full border-separate border-spacing-0 text-[13.5px] sm:text-sm">
              <caption className="sr-only">
                {JANUARY.lab_name}, {JANUARY.report_date}: every value on the sample report. Pick a flagged value to
                see it explained.
              </caption>
              <thead className="text-left text-[11px] font-semibold tracking-[0.08em] text-stone-600 uppercase dark:text-stone-300">
                <tr>
                  <th scope="col" className="sticky top-0 z-[1] bg-[#f3efe9] py-2 pl-2 font-semibold dark:bg-[#262027]">
                    Test
                  </th>
                  <th scope="col" className="sticky top-0 z-[1] bg-[#f3efe9] py-2 font-semibold dark:bg-[#262027]">
                    Result
                  </th>
                  <th scope="col" className="sticky top-0 z-[1] hidden bg-[#f3efe9] py-2 font-semibold sm:table-cell dark:bg-[#262027]">
                    Unit
                  </th>
                  <th scope="col" className="sticky top-0 z-[1] hidden bg-[#f3efe9] py-2 font-semibold sm:table-cell dark:bg-[#262027]">
                    Ref. range
                  </th>
                  <th scope="col" className="sticky top-0 z-[1] bg-[#f3efe9] py-2 pr-2 text-right font-semibold dark:bg-[#262027]">
                    Flag
                  </th>
                </tr>
              </thead>
              <tbody>
                {LAB_ROWS.map((row, i) => {
                  const newSection = i === 0 || row.section !== LAB_ROWS[i - 1].section;
                  const flagged = row.explained !== null;
                  const active = row === picked;
                  return (
                    <Fragment key={row.name}>
                      {newSection && (
                        <tr>
                          <th
                            scope="colgroup"
                            colSpan={5}
                            className="border-b border-stone-200 pt-4 pb-1 pl-2 text-left text-[11.5px] font-bold tracking-[0.06em] text-stone-600 uppercase dark:border-stone-700 dark:text-stone-300"
                          >
                            {row.section}
                          </th>
                        </tr>
                      )}
                      <tr
                        ref={(el) => {
                          if (el) rowRefs.current.set(row.name, el);
                        }}
                        onClick={flagged ? () => setPicked(row) : undefined}
                        className={`transition-colors ${flagged ? "cursor-pointer" : ""} ${
                          active ? "bg-highlight/70" : flagged ? "hover:bg-stone-900/[0.035] dark:hover:bg-white/[0.04]" : ""
                        }`}
                      >
                        <td className={`py-[7px] pr-3 pl-2 ${active ? "rounded-l-md shadow-[inset_3px_0_0_var(--color-coral-500)]" : ""}`}>
                          {flagged ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPicked(row);
                              }}
                              aria-pressed={active}
                              className="text-left underline decoration-stone-400/60 decoration-dotted underline-offset-4 hover:decoration-current"
                            >
                              {row.name}
                            </button>
                          ) : (
                            row.name
                          )}
                          <span className="block text-xs text-stone-600 sm:hidden dark:text-stone-300">
                            {formatRange(row.ref_low, row.ref_high, row.reference_text)} {row.unit}
                          </span>
                        </td>
                        <td className={`py-[7px] pr-3 tabular-nums ${flagged ? "font-bold" : ""}`}>
                          <span className={active ? "rounded-[3px] bg-coral-300/70 px-1 py-0.5 -mx-1 dark:bg-coral-500/40" : ""}>
                            {row.value_text}
                          </span>
                          <span className="ml-1 text-xs font-normal text-stone-600 sm:hidden dark:text-stone-300">{row.unit}</span>
                        </td>
                        <td className="hidden py-[7px] pr-3 sm:table-cell">{row.unit}</td>
                        <td className="hidden py-[7px] text-[13px] text-stone-600 tabular-nums sm:table-cell dark:text-stone-300">
                          {row.reference_text}
                        </td>
                        <td className={`py-[7px] pr-2 text-right font-bold ${active ? "rounded-r-md" : ""}`}>
                          {LETTER[row.flag] ?? ""}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-[6px] bg-gradient-to-t from-[#fffdf9] to-transparent lg:hidden dark:from-[#1c171d]" />
        </div>
        <p className="mt-3 hidden items-center gap-2 text-[13px] text-muted lg:flex">
          <MousePointerClick aria-hidden className="h-4 w-4" />
          Pick any value marked L or H.
        </p>
      </div>

      {/* ReportSaathi's side */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <article className="card overflow-hidden shadow-[0_24px_48px_-28px_rgb(72_38_70/0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
            <p className="text-[13px] font-medium text-muted">What does this mean?</p>
            <div role="group" aria-label="Language" className="flex rounded-ctl bg-stone-100 p-0.5 dark:bg-stone-800">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  aria-pressed={language === l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`h-8 rounded-lg px-3 text-sm transition-colors ${
                    language === l.code
                      ? "bg-surface font-medium text-foreground shadow-[0_1px_2px_rgb(42_29_40/0.12)] dark:bg-stone-950"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pt-5 pb-6 sm:px-6" lang={language}>
            <h3 className="text-xl leading-snug tracking-[-0.015em]">{item.test_name}</h3>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1" lang="en">
              <p className="text-[32px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
                {picked.value_text}
                <span className="ml-1.5 text-base font-normal tracking-normal text-muted">{picked.unit}</span>
              </p>
              <FlagBadge flag={picked.flag} />
              <p className="text-[13px] text-muted">
                Lab&apos;s range {formatRange(picked.ref_low, picked.ref_high, picked.reference_text)}
              </p>
            </div>
            <div className="mt-3 max-w-sm">
              <RangeBar
                result={
                  {
                    value: picked.value,
                    ref_low: picked.ref_low,
                    ref_high: picked.ref_high,
                    flag: picked.flag,
                    range_source: "lab",
                    reference_text: picked.reference_text,
                  } as TestResult
                }
              />
            </div>

            <p className="mt-5 text-[15px] text-muted">{item.what_it_measures}</p>
            <p className="mt-2 text-[17px] leading-relaxed text-pretty">{item.what_your_result_means}</p>
            {item.common_reasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-0.5 pl-5 text-[15px] text-stone-700 marker:text-stone-400 dark:text-stone-300">
                {item.common_reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <p className="mt-4 rounded-r-md border-l-2 border-brand-600 bg-brand-50/70 px-3 py-2 text-[15px] text-brand-950 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-50">
              {item.what_you_can_do}
            </p>
            <p className="mt-3 text-xs text-muted">{note}</p>
          </div>

          <SourceLoupe row={picked} />
        </article>
        <OpenReport />
      </div>
    </div>
  );
}

/** The line on the original scan this value was read from, boxed, the way the app shows it. */
function SourceLoupe({ row }: { row: LabRow }) {
  const { width: W, height: H } = SCAN;
  const cy = ((row.box.y0 + row.box.y1) / 2) * H;
  const viewH = 128;
  const left = 0.055 * W;
  const viewW = 0.89 * W;
  const pad = 6;
  return (
    <div className="border-t border-line bg-sidebar/60 px-5 py-4 sm:px-6">
      <p className="flex items-center gap-2 text-[13px] font-medium">
        <ScanSearch aria-hidden className="h-4 w-4 text-brand-700 dark:text-brand-300" />
        Read from the original report
      </p>
      <svg
        viewBox={`${left} ${cy - viewH / 2} ${viewW} ${viewH}`}
        role="img"
        aria-label={`The line on the scanned report where ${row.name} reads ${row.value_text} ${row.unit}, outlined.`}
        className="mt-2.5 block w-full overflow-hidden rounded-md bg-white ring-1 ring-line"
      >
        <image href={SCAN.src} width={W} height={H} />
        <rect
          x={row.box.x0 * W - pad}
          y={row.box.y0 * H - pad}
          width={(row.box.x1 - row.box.x0) * W + pad * 2}
          height={(row.box.y1 - row.box.y0) * H + pad * 2}
          rx={6}
          fill="rgb(240 106 72 / 0.14)"
          stroke="#f06a48"
          strokeWidth={4}
        />
      </svg>
      <p className="mt-2 text-[13px] text-muted">
        Every value links back to the spot it came from. The flag is the lab&apos;s own range, checked by code, not
        guessed by the AI.
      </p>
    </div>
  );
}

function OpenReport() {
  const { mode } = useShell();
  const className = "dash-link mt-4 text-sm";
  if (mode === "live")
    return (
      <Link href="/dashboard" className={className}>
        Open your dashboard
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </Link>
    );
  return (
    <AppLink href={`/reports/${JANUARY_ID}`} className={className}>
      Open this report in the demo
      <ArrowRight aria-hidden className="h-3.5 w-3.5" />
    </AppLink>
  );
}

/** "Haemoglobin" from "Haemoglobin (Hb)", for the small chips. */
function shortName(name: string): string {
  const plain = name.replace(/\s*\(.*\)$/, "");
  return plain.length > 18 ? name.match(/\(([^)]+)\)/)?.[1] ?? plain : plain;
}
