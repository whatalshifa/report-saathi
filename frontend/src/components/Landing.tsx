import Link from "next/link";

import { DemoButton, WakeServer } from "@/components/DemoButton";
import { FlagBadge } from "@/components/FlagBadge";
import type { Flag } from "@/lib/api";

// The preview shows the made-up sample person, Meera, exactly as the app shows her first report.
const PREVIEW: { name: string; value: string; unit: string; range: string; flag: Flag }[] = [
  { name: "Haemoglobin", value: "10.6", unit: "g/dL", range: "12.0 – 15.5", flag: "low" },
  { name: "Serum Ferritin", value: "9", unit: "ng/mL", range: "15 – 150", flag: "low" },
  { name: "HbA1c", value: "6.1", unit: "%", range: "4.0 – 5.6", flag: "high" },
  { name: "LDL Cholesterol", value: "142", unit: "mg/dL", range: "< 100", flag: "high" },
  { name: "Serum Creatinine", value: "0.8", unit: "mg/dL", range: "0.6 – 1.1", flag: "normal" },
];

const STEPS = [
  {
    title: "Upload a photo or PDF",
    text: "Any lab, any layout. A phone photo of a printed report works.",
  },
  {
    title: "Every value is read and checked",
    text: "AI reads the report; plain code compares each value with the range the lab printed, so flags are never guessed.",
  },
  {
    title: "Understand it, and see the trend",
    text: "A plain-language explanation in your language, a timeline across labs, and a one-page brief for your doctor.",
  },
];

const FEATURES = [
  {
    title: "Flags you can trust",
    text: "The AI only transcribes. Whether a value is high or low is decided by tested code, using the lab's own printed range.",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  {
    title: "English, हिन्दी and मराठी",
    text: "Explanations written for a person, not a doctor: what each test measures, what the result means and what to ask.",
    icon: "M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802",
  },
  {
    title: "One timeline across labs",
    text: "Units are converted, so a value from one lab lines up with the next. See whether things are getting better.",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  },
  {
    title: "A brief for the doctor",
    text: "One printable page with what changed, what's out of range, and the questions worth asking at the next visit.",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
  {
    title: "The whole family",
    text: "Keep reports for parents, children and yourself apart, and get a warning if a report lands in the wrong person's file.",
    icon: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  },
  {
    title: "Private by design",
    text: "Each file is encrypted with its own key, passwords are hashed with Argon2, and nobody else can open your reports.",
    icon: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
  },
];

const STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS",
  "FastAPI",
  "SQLAlchemy",
  "PostgreSQL",
  "Claude vision",
  "Envelope encryption",
  "Docker",
  "GitHub Actions",
  "Playwright",
];

const FAQ = [
  {
    q: "Is this medical advice?",
    a: "No. ReportSaathi helps you understand what a report says and prepare for a conversation with your doctor. It never diagnoses or suggests treatment.",
  },
  {
    q: "How accurate is the reading?",
    a: "Values are transcribed by AI and checked against the report's own ranges by code. The accuracy page explains how it is measured.",
  },
  {
    q: "What does the demo include?",
    a: "A private, temporary account with Meera, a made-up person with three reports from two labs. It's deleted after 24 hours.",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export function Landing() {
  return (
    <div className="space-y-24 pb-8 sm:space-y-32">
      <WakeServer />

      {/* Hero */}
      <section className="grid items-center gap-12 pt-4 lg:grid-cols-[1.05fr_1fr] lg:pt-10">
        <div>
          <p className="eyebrow">Lab reports, made clear</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Understand every lab report your family gets.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-pretty text-muted">
            Upload a photo or PDF. ReportSaathi reads every value, flags what&apos;s out of range, explains it in
            English, Hindi or Marathi, and tracks results across labs over time.
          </p>
          <div className="mt-8 flex flex-wrap items-start gap-3">
            <DemoButton className="btn btn-primary px-5 py-3 text-base" label="Try the demo, no sign-up" />
            <Link href="/signup" className="btn btn-secondary px-5 py-3 text-base">
              Create a free account
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">The demo opens a private sample account. Nothing to fill in.</p>
        </div>
        <Preview />
      </section>

      {/* How it works */}
      <section aria-labelledby="how">
        <p className="eyebrow">How it works</p>
        <h2 id="how" className="mt-3 text-3xl font-bold tracking-tight">
          From a crumpled printout to a clear answer
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-50 text-sm font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section aria-labelledby="features">
        <p className="eyebrow">What you get</p>
        <h2 id="features" className="mt-3 max-w-2xl text-3xl font-bold tracking-tight">
          Built for families who look after each other&apos;s health
        </h2>
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-white dark:bg-teal-600">
                <Icon d={f.icon} />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Under the hood */}
      <section aria-labelledby="stack" className="card overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Under the hood</p>
            <h2 id="stack" className="mt-3 text-2xl font-bold tracking-tight">
              Production engineering, not a weekend demo
            </h2>
            <p className="mt-3 text-muted">
              A FastAPI service and a Next.js app, with background jobs, envelope-encrypted file storage, rate limits,
              database migrations, error tracking, and 180+ automated tests running on every change.
            </p>
            <a
              href="https://github.com/whatalshifa/report-saathi"
              className="btn btn-secondary mt-6"
              rel="noopener"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.2-3.1-.1-.4-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
              </svg>
              Read the source on GitHub
            </a>
          </div>
          <ul className="flex flex-wrap content-start gap-2">
            {STACK.map((item) => (
              <li
                key={item}
                className="rounded-full border border-line bg-background px-3 py-1.5 text-sm text-muted"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="eyebrow">Questions</p>
          <h2 id="faq" className="mt-3 text-3xl font-bold tracking-tight">
            Good to know
          </h2>
        </div>
        <dl className="divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-2 text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Closing call to action */}
      <section className="rounded-3xl bg-teal-800 px-6 py-12 text-center text-white sm:px-12 dark:bg-teal-900">
        <h2 className="text-3xl font-bold tracking-tight text-balance">See it with a real-looking report</h2>
        <p className="mx-auto mt-3 max-w-xl text-teal-100">
          The demo has three reports from two labs, explanations in three languages and a doctor brief.
        </p>
        <div className="mt-8 flex justify-center">
          <DemoButton className="btn bg-white px-5 py-3 text-base text-teal-900 hover:bg-teal-50" />
        </div>
      </section>
    </div>
  );
}

/** A still picture of the results screen, built from the same badge the app uses. */
function Preview() {
  return (
    <div className="relative" aria-label="Preview of a read report" role="img">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-teal-200/60 via-sky-100/40 to-transparent blur-2xl dark:from-teal-900/40 dark:via-slate-900/20"
      />
      <div className="card p-5 shadow-xl shadow-teal-900/5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Sample Pathology Lab, Pune</p>
            <p className="text-sm text-muted">Meera Joshi · 12 Jan 2026</p>
          </div>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-200">
            10 outside range
          </span>
        </div>
        <ul className="mt-5 divide-y divide-line">
          {PREVIEW.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{row.name}</span>
                <span className="text-xs text-muted">Normal {row.range}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="tabular-nums">
                  <span className="font-semibold">{row.value}</span> <span className="text-muted">{row.unit}</span>
                </span>
                <FlagBadge flag={row.flag} />
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl bg-teal-50 p-4 text-sm dark:bg-teal-950/60">
          <p className="font-semibold text-teal-900 dark:text-teal-100">In plain words</p>
          <p className="mt-1 text-teal-900/80 dark:text-teal-100/80">
            A few values are outside their normal ranges, mostly linked to low iron, blood sugar on the higher side,
            cholesterol, thyroid and vitamin D. None is at a dangerous level, but together they are worth a calm talk
            with your doctor.
          </p>
        </div>
      </div>
    </div>
  );
}
