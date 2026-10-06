"use client";

import { useCallback, useState } from "react";

import { SkeletonLines } from "@/components/Skeleton";
import {
  getExplanation,
  isPending,
  requestExplanation,
  type Job,
  type Language,
  type ReportExplanation,
} from "@/lib/api";
import { usePoll } from "@/lib/usePoll";

const LANGUAGES = [
  {
    code: "en",
    label: "English",
    button: "Explain in simple words",
    waiting: "Writing the explanation…",
    questions: "Questions to ask your doctor",
    note: "Written by AI from your report. It is not medical advice.",
  },
  {
    code: "hi",
    label: "हिन्दी",
    button: "आसान शब्दों में समझाइए",
    waiting: "आसान भाषा में लिखा जा रहा है…",
    questions: "डॉक्टर से पूछने के सवाल",
    note: "यह जानकारी AI ने आपकी रिपोर्ट से लिखी है। यह डॉक्टर की सलाह नहीं है।",
  },
  {
    code: "mr",
    label: "मराठी",
    button: "सोप्या शब्दांत समजावून सांगा",
    waiting: "सोप्या भाषेत लिहिले जात आहे…",
    questions: "डॉक्टरांना विचारायचे प्रश्न",
    note: "हे स्पष्टीकरण AI ने तुमच्या रिपोर्टवरून लिहिले आहे. हा वैद्यकीय सल्ला नाही.",
  },
] as const satisfies readonly { code: Language; [text: string]: string }[];

type Text = (typeof LANGUAGES)[number];

type MaybeJob = Job<ReportExplanation> | null;

export function ExplanationPanel({ reportId }: { reportId: string }) {
  const [language, setLanguage] = useState<Language>("en");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const load = useCallback(() => getExplanation(reportId, language), [reportId, language]);
  const { data: job, error, reload } = usePoll<MaybeJob>(load, (j) => j !== null && isPending(j.status));
  const text = LANGUAGES.find((l) => l.code === language)!;

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

  return (
    <section
      lang={language}
      className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 dark:border-teal-900 dark:bg-teal-950/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">What does this mean?</h2>
        <div role="tablist" aria-label="Language" className="flex rounded-lg bg-surface p-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              role="tab"
              aria-selected={language === l.code}
              onClick={() => setLanguage(l.code)}
              className={`rounded-md px-3 py-1 text-sm ${
                language === l.code
                  ? "bg-teal-700 font-semibold text-white dark:bg-teal-600"
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
      <p>{content.summary}</p>
      {content.flagged.map((item) => (
        <div key={item.test_name} className="rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold">{item.test_name}</h3>
          <p className="mt-1 text-slate-700 dark:text-slate-300">{item.what_it_measures}</p>
          <p className="mt-2">{item.what_your_result_means}</p>
          {item.common_reasons.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-slate-700 dark:text-slate-300">
              {item.common_reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 font-medium">{item.what_you_can_do}</p>
        </div>
      ))}
      <p className="text-slate-700 dark:text-slate-300">{content.normal_summary}</p>
      {content.questions_for_doctor.length > 0 && (
        <div>
          <h3 className="font-semibold">{text.questions}</h3>
          <ul className="mt-1 list-disc pl-5">
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
