"use client";

import { useCallback, useId, useState } from "react";

import { SkeletonLines } from "@/components/Skeleton";
import {
  getExplanation,
  isPending,
  requestExplanation,
  type Job,
  type Language,
  type ReportExplanation,
} from "@/lib/api";
import { serverTime } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";
import { useSpeech } from "@/lib/useSpeech";

const LANGUAGES = [
  {
    code: "en",
    label: "English",
    voice: "en-IN",
    listen: "Listen",
    stop: "Stop",
    button: "Explain in simple words",
    waiting: "Writing the explanation…",
    questions: "Questions to ask your doctor",
    note: "Written by AI from your report. It is not medical advice.",
    outdated: "This was written before you corrected a value, so it may still mention the old reading.",
    rewrite: "Write it again",
  },
  {
    code: "hi",
    label: "हिन्दी",
    voice: "hi-IN",
    listen: "सुनिए",
    stop: "रोकिए",
    button: "आसान शब्दों में समझाइए",
    waiting: "आसान भाषा में लिखा जा रहा है…",
    questions: "डॉक्टर से पूछने के सवाल",
    note: "यह जानकारी AI ने आपकी रिपोर्ट से लिखी है। यह डॉक्टर की सलाह नहीं है।",
    outdated: "यह आपके एक मान को ठीक करने से पहले लिखा गया था, इसलिए इसमें पुरानी रीडिंग हो सकती है।",
    rewrite: "फिर से लिखिए",
  },
  {
    code: "mr",
    label: "मराठी",
    voice: "mr-IN",
    listen: "ऐका",
    stop: "थांबा",
    button: "सोप्या शब्दांत समजावून सांगा",
    waiting: "सोप्या भाषेत लिहिले जात आहे…",
    questions: "डॉक्टरांना विचारायचे प्रश्न",
    note: "हे स्पष्टीकरण AI ने तुमच्या रिपोर्टवरून लिहिले आहे. हा वैद्यकीय सल्ला नाही.",
    outdated: "हे तुम्ही एखादे मूल्य दुरुस्त करण्यापूर्वी लिहिले होते, त्यामुळे यात जुनी नोंद असू शकते.",
    rewrite: "पुन्हा लिहा",
  },
] as const satisfies readonly { code: Language; [text: string]: string }[];

type Text = (typeof LANGUAGES)[number];

type MaybeJob = Job<ReportExplanation> | null;

/** `correctedAt` is when a value on this report was last fixed by hand, if ever. */
export function ExplanationPanel({ reportId, correctedAt = null }: { reportId: string; correctedAt?: string | null }) {
  const [language, setLanguage] = useState<Language>("en");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const load = useCallback(() => getExplanation(reportId, language), [reportId, language]);
  const { data: job, error, reload } = usePoll<MaybeJob>(load, (j) => j !== null && isPending(j.status));
  const text = LANGUAGES.find((l) => l.code === language)!;
  const headingId = useId();

  async function start() {
    setStarting(true);
    setStartError(null);
    try {
      await requestExplanation(reportId, language);
      reload();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Could not start");
    } finally {
      setStarting(false);
    }
  }

  const content = job?.status === "done" ? job.content : null;
  // An explanation isn't rewritten when a value is fixed, so say when it predates the fix.
  const outdated = !!content && !!job && !!correctedAt && serverTime(job.created_at) < serverTime(correctedAt);

  return (
    <section
      aria-labelledby={headingId}
      lang={language}
      className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 sm:p-6 dark:border-teal-900 dark:bg-teal-950/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="section-title">
          What does this mean?
        </h2>
        <div role="tablist" aria-label="Language" className="flex rounded-lg border border-line bg-surface p-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              role="tab"
              aria-selected={language === l.code}
              onClick={() => setLanguage(l.code)}
              className={`min-h-8 rounded-md px-3 py-1 text-sm transition-colors ${
                language === l.code
                  ? "bg-teal-700 font-semibold text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {error && <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
        {!error && job === undefined && <SkeletonLines />}
        {(job === null || job?.status === "failed") && (
          <div>
            {job?.error && <p className="mb-3 text-sm text-rose-700 dark:text-rose-300">{job.error}</p>}
            <button onClick={start} disabled={starting} className="btn btn-primary">
              {job?.status === "failed" ? "Try again" : text.button}
            </button>
            {startError && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{startError}</p>}
          </div>
        )}
        {job && isPending(job.status) && (
          <p className="flex items-center gap-3 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />
            {text.waiting}
          </p>
        )}
        {outdated && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <p>{text.outdated}</p>
            {/* The server writes it again from the corrected values. */}
            <button onClick={start} disabled={starting} className="btn btn-secondary btn-sm mt-2">
              {text.rewrite}
            </button>
            {startError && <p className="mt-2 text-rose-700 dark:text-rose-300">{startError}</p>}
          </div>
        )}
        {content && <ExplanationBody content={content} text={text} />}
      </div>
    </section>
  );
}

function ExplanationBody({ content, text }: { content: ReportExplanation; text: Text }) {
  return (
    <div className="space-y-5 leading-relaxed">
      {content.see_doctor_soon && (
        <p
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100"
        >
          <strong>⚠ </strong>
          {content.see_doctor_reason}
        </p>
      )}
      <ListenButton content={content} text={text} />
      <p className="max-w-3xl text-[1.0625rem] text-pretty">{content.summary}</p>
      {/* Two columns on wide screens, so a long explanation is quick to scan. */}
      <div className="grid gap-3 lg:grid-cols-2">
        {content.flagged.map((item) => (
          <div key={item.test_name} className="flex flex-col rounded-xl border border-line bg-surface p-4 sm:p-5">
            <h3 className="font-semibold">{item.test_name}</h3>
            <p className="mt-1 text-sm text-muted">{item.what_it_measures}</p>
            <p className="mt-3">{item.what_your_result_means}</p>
            {item.common_reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-slate-700 marker:text-slate-400 dark:text-slate-300">
                {item.common_reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <p className="mt-auto pt-3">
              <span className="block rounded-lg border-l-2 border-teal-600 bg-teal-50/70 px-3 py-2 text-teal-950 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-50">
                {item.what_you_can_do}
              </span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-slate-700 dark:text-slate-300">{content.normal_summary}</p>
      {content.questions_for_doctor.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          <h3 className="font-semibold">{text.questions}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-teal-600">
            {content.questions_for_doctor.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted">{text.note}</p>
    </div>
  );
}

/**
 * What "Listen" reads, in order: the warning if any, the summary, each flagged test, the questions, and
 * last the note that the AI wrote it and it is not medical advice, for listeners who never see the small print.
 */
function spokenParts(content: ReportExplanation, text: Text): string[] {
  return [
    content.see_doctor_soon ? (content.see_doctor_reason ?? "") : "",
    content.summary,
    ...content.flagged.flatMap((item) => [
      item.test_name,
      item.what_it_measures,
      item.what_your_result_means,
      item.what_you_can_do,
    ]),
    content.questions_for_doctor.length > 0 ? text.questions : "",
    ...content.questions_for_doctor,
    text.note,
  ].filter(Boolean);
}

/** Reads the explanation aloud, for family members who would rather listen. Hidden without a voice for the language. */
function ListenButton({ content, text }: { content: ReportExplanation; text: Text }) {
  const { available, speaking, speak, stop } = useSpeech(text.voice);
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(spokenParts(content, text)))}
      className="btn btn-secondary btn-sm"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
        {speaking ? (
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7m2.5-10a8.5 8.5 0 0 1 0 13"
          />
        )}
      </svg>
      {speaking ? text.stop : text.listen}
    </button>
  );
}
