import { BadgeCheck, FileText, Languages, LineChart, Lock, Users, type LucideIcon } from "lucide-react";
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

const FEATURES: { title: string; text: string; Icon: LucideIcon }[] = [
  {
    title: "Flags you can trust",
    text: "The AI only transcribes. Whether a value is high or low is decided by tested code, using the lab's own printed range.",
    Icon: BadgeCheck,
  },
  {
    title: "English, हिन्दी and मराठी",
    text: "Explanations written for a person, not a doctor: what each test measures, what the result means and what to ask.",
    Icon: Languages,
  },
  {
    title: "One timeline across labs",
    text: "Units are converted, so a value from one lab lines up with the next. See whether things are getting better.",
    Icon: LineChart,
  },
  {
    title: "A brief for the doctor",
    text: "One printable page with what changed, what's out of range, and the questions worth asking at the next visit.",
    Icon: FileText,
  },
  {
    title: "The whole family",
    text: "Keep reports for parents, children and yourself apart, and get a warning if a report lands in the wrong person's file.",
    Icon: Users,
  },
  {
    title: "Private by design",
    text: "Each file is encrypted with its own key, passwords are hashed with Argon2, and nobody else can open your reports.",
    Icon: Lock,
  },
];

const STACK = [
  { area: "Web app", items: "Next.js 16, React 19, TypeScript, Tailwind CSS" },
  { area: "API", items: "FastAPI, SQLAlchemy, PostgreSQL, background jobs" },
  { area: "Reading", items: "Claude vision, checked by tested range code" },
  { area: "Security", items: "Envelope encryption, Argon2, rate limits" },
  { area: "Delivery", items: "Docker, GitHub Actions, Playwright" },
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

export function Landing() {
  return (
    <div className="space-y-20 sm:space-y-28">
      <WakeServer />

      {/* Hero */}
      <section className="grid items-center gap-12 pt-4 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pt-12">
        <div>
          <p className="eyebrow">For families in India · English, हिन्दी, मराठी</p>
          <h1 className="mt-3 text-[34px] leading-[1.12] font-semibold tracking-[-0.025em] text-balance sm:text-[44px] lg:text-[48px]">
            Understand every lab report your family gets.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-pretty text-muted">
            Upload a photo or PDF. ReportSaathi reads every value, flags what&apos;s out of range, explains it in
            English, Hindi or Marathi, and tracks results across labs over time.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-start">
            <DemoButton full className="btn btn-primary btn-lg w-full sm:w-auto" label="Try the demo, no sign-up" />
            <Link href="/signup" className="btn btn-secondary btn-lg">
              Create a free account
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">The demo opens a private sample account. Nothing to fill in.</p>
        </div>
        <Preview />
      </section>

      {/* How it works */}
      <section aria-labelledby="how">
        <SectionHeading id="how" eyebrow="How it works" title="From a crumpled printout to a clear answer" />
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t border-line pt-5">
              <span className="text-sm font-medium text-brand-700 tabular-nums dark:text-brand-300">Step {i + 1}</span>
              <h3 className="mt-2 text-[17px]">{step.title}</h3>
              <p className="mt-2 text-[15px] text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section aria-labelledby="features">
        <SectionHeading
          id="features"
          eyebrow="What you get"
          title="Built for families who look after each other’s health"
        />
        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, text, Icon }) => (
            <div key={title}>
              <Icon aria-hidden className="h-5 w-5 text-brand-700 dark:text-brand-300" strokeWidth={1.75} />
              <h3 className="mt-3 text-[17px]">{title}</h3>
              <p className="mt-1.5 text-[15px] text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Under the hood */}
      <section aria-labelledby="stack" className="grid gap-10 border-t border-line pt-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeading id="stack" eyebrow="Under the hood" title="Production engineering, not a weekend demo" />
          <p className="mt-4 max-w-xl text-[15px] text-muted">
            A FastAPI service and a Next.js app, with background jobs, envelope-encrypted file storage, rate limits,
            database migrations, error tracking, and over 360 automated tests running on every change.
          </p>
          <a
            href="https://github.com/whatalshifa/report-saathi"
            className="btn btn-secondary mt-6"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.2-3.1-.1-.4-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
            </svg>
            Read the source on GitHub
          </a>
        </div>
        <dl className="divide-y divide-line border-y border-line text-[15px] lg:mt-8">
          {STACK.map((row) => (
            <div key={row.area} className="grid grid-cols-[7rem_1fr] gap-4 py-3">
              <dt className="font-medium">{row.area}</dt>
              <dd className="text-muted">{row.items}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <SectionHeading id="faq" eyebrow="Questions" title="Good to know" />
        <dl className="divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="font-medium">{item.q}</dt>
              <dd className="mt-1.5 text-[15px] text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Closing call to action */}
      <section className="flex flex-col gap-6 rounded-card bg-brand-800 px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10 dark:bg-brand-900">
        <div>
          <h2 className="text-2xl text-balance">See it with a real-looking report</h2>
          <p className="mt-2 max-w-xl text-[15px] text-brand-100">
            The demo has three reports from two labs, explanations in three languages and a doctor brief.
          </p>
        </div>
        <DemoButton className="btn btn-lg shrink-0 bg-white text-brand-900 hover:bg-brand-50" />
      </section>
    </div>
  );
}

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-[26px] leading-tight tracking-[-0.02em] text-balance sm:text-[28px]">
        {title}
      </h2>
    </div>
  );
}

/**
 * A still picture of what ReportSaathi does: a lab report sheet with the values it read, flagged where
 * they're out of range, and the plain-words summary underneath. Built from the same badge the app uses.
 */
function Preview() {
  return (
    <div
      className="overflow-hidden rounded-card border border-line bg-surface shadow-[0_1px_2px_rgb(42_29_40/0.04),0_12px_32px_-12px_rgb(42_29_40/0.14)]"
      aria-label="Preview of a read report"
      role="img"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="font-semibold">Sample Pathology Lab, Pune</p>
          <p className="text-[13px] text-muted">Meera Joshi · 12 Jan 2026</p>
        </div>
        <span className="text-[13px] whitespace-nowrap text-muted">
          <span className="font-semibold text-rose-700 dark:text-rose-300">10</span> outside range
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-5 pt-3 pb-2 font-medium">Test</th>
            <th className="px-2 pt-3 pb-2 text-right font-medium">Result</th>
            <th className="hidden px-2 pt-3 pb-2 font-medium sm:table-cell">Normal</th>
            <th className="px-5 pt-3 pb-2 text-right font-medium">
              <span className="sr-only">Status</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {PREVIEW.map((row) => (
            <tr key={row.name}>
              <td className="px-5 py-2.5 font-medium">{row.name}</td>
              <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                <span className="font-semibold">{row.value}</span> <span className="text-muted">{row.unit}</span>
              </td>
              <td className="hidden px-2 py-2.5 whitespace-nowrap text-muted tabular-nums sm:table-cell">
                {row.range}
              </td>
              <td className="px-5 py-2.5 text-right">
                <FlagBadge flag={row.flag} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-line bg-brand-50/70 px-5 py-4 dark:bg-brand-950/40">
        <p className="text-[13px] font-medium text-brand-800 dark:text-brand-200">In plain words</p>
        <p className="mt-1 text-sm text-foreground">
          A few values are outside their normal ranges, mostly linked to low iron and blood sugar on the higher side.
          None is at a dangerous level, but together they are worth a calm talk with your doctor.
        </p>
      </div>
    </div>
  );
}
