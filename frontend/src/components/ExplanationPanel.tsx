"use client";

import { AlertTriangle, Square, Volume2 } from "lucide-react";
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
      className="card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="section-title">
          What does this mean?
        </h2>
        <div role="tablist" aria-label="Language" className="flex rounded-ctl bg-stone-100 p-0.5 dark:bg-stone-800">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              role="tab"
              aria-selected={language === l.code}
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
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
            {text.waiting}
          </p>
        )}
        {outdated && (
          <div className="mb-4 rounded-ctl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
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
    <div className="space-y-5">
      {content.see_doctor_soon && (
        <p
          role="alert"
          className="flex gap-2.5 rounded-ctl border border-rose-200 bg-rose-50 p-3 text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-100"
        >
          <AlertTriangle aria-hidden className="mt-1 h-4 w-4 shrink-0" />
          <span>{content.see_doctor_reason}</span>
        </p>
      )}
      <ListenButton content={content} text={text} />
      <p className="max-w-3xl text-pretty">{content.summary}</p>
      {/* Two columns on wide screens, so a long explanation is quick to scan. */}
      <div className="grid gap-x-10 lg:grid-cols-2">
        {content.flagged.map((item) => (
          <div key={item.test_name} className="flex flex-col border-t border-line py-5">
            <h3 className="text-base">{item.test_name}</h3>
            <p className="mt-1 text-sm text-muted">{item.what_it_measures}</p>
            <p className="mt-2 text-[15px]">{item.what_your_result_means}</p>
            {item.common_reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[15px] text-stone-700 marker:text-stone-400 dark:text-stone-300">
                {item.common_reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <p className="mt-auto pt-3">
              <span className="block rounded-r-md border-l-2 border-brand-600 bg-brand-50/70 px-3 py-2 text-[15px] text-brand-950 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-50">
                {item.what_you_can_do}
              </span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-stone-700 dark:text-stone-300">{content.normal_summary}</p>
      {content.questions_for_doctor.length > 0 && (
        <div className="border-t border-line pt-5">
          <h3 className="text-base">{text.questions}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-brand-600">
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
      {speaking ? (
        <Square aria-hidden className="h-3.5 w-3.5" />
      ) : (
        <Volume2 aria-hidden className="h-4 w-4" />
      )}
      {speaking ? text.stop : text.listen}
    </button>
  );
}
