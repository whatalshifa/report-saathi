import { BadgeCheck, FileText, Languages, LineChart, Lock, Users, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "About",
  description:
    "What ReportSaathi does, how it reads a lab report, and how it keeps your family's reports private.",
};

const STEPS = [
  ["Add a photo or PDF", "Any lab, any layout. A phone photo of a printed report works."],
  [
    "Every value is read and checked",
    "AI reads the report; plain, tested code compares each value with the range the lab printed, so flags are never guessed.",
  ],
  [
    "Understand it and follow the trend",
    "A plain-language explanation in your language, trend lines across labs, and a one-page brief for the doctor.",
  ],
];

const FEATURES: { title: string; text: string; Icon: LucideIcon }[] = [
  {
    title: "Flags you can check",
    text: "Every value links back to the exact spot on the report it was read from.",
    Icon: BadgeCheck,
  },
  { title: "English, हिन्दी and मराठी", text: "Explanations written for a person, and read aloud on request.", Icon: Languages },
  { title: "One timeline across labs", text: "Units are converted, so results from different labs line up.", Icon: LineChart },
  { title: "A brief for the doctor", text: "One printable page, or a private link that expires.", Icon: FileText },
  { title: "The whole family", text: "Parents, children and yourself, each with their own reports.", Icon: Users },
  { title: "Private by design", text: "Each file is encrypted with its own key. Download or delete everything any time.", Icon: Lock },
];

const FAQ = [
  [
    "Is this medical advice?",
    "No. ReportSaathi helps you understand what a report says and prepare for a conversation with your doctor. It never diagnoses or suggests treatment.",
  ],
  [
    "What is the sample family?",
    "Meera, a made-up person with three reports from two labs. Opening anything in it starts a private demo account, deleted after 24 hours.",
  ],
  [
    "How accurate is the reading?",
    "Values are transcribed by AI and checked against the report's own ranges by code. The accuracy page shows how it is measured.",
  ],
];

export default function AboutPage() {
  return (
    <article className="max-w-3xl space-y-12">
      <PageHeader
        eyebrow="About ReportSaathi"
        title="Understand every lab report your family gets."
        description="Upload a photo or PDF of a lab report. ReportSaathi reads every value, flags what's out of range, explains it in English, Hindi or Marathi, and tracks each person's results across labs over time."
      />
      <div className="-mt-6 flex flex-wrap gap-2">
        <Link href="/signup" className="btn btn-primary">
          Create a free account
        </Link>
        <Link href="/" className="btn btn-secondary">
          See the sample family
        </Link>
      </div>

      <section aria-labelledby="how">
        <h2 id="how" className="section-title">
          How it works
        </h2>
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="grid grid-cols-[2rem_1fr] gap-2 py-4">
              <span className="text-sm font-semibold text-brand-700 tabular-nums dark:text-brand-300">{i + 1}</span>
              <div>
                <h3 className="text-[15px]">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="what">
        <h2 id="what" className="section-title">
          What you get
        </h2>
        <ul className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {FEATURES.map(({ title, text, Icon }) => (
            <li key={title} className="flex gap-3">
              <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" strokeWidth={1.9} />
              <div>
                <h3 className="text-[15px]">{title}</h3>
                <p className="mt-0.5 text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="privacy" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="privacy" className="section-title">
          Our privacy promises
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>Only your account can open your reports.</li>
          <li>Files are encrypted before they are stored, each with its own key (AES-256-GCM).</li>
          <li>You can download all your data, or delete your account and everything in it, at any time.</li>
          <li>Doctor links are private, expire on their own and can be turned off.</li>
        </ul>
        <p className="mt-3 text-sm">
          <Link href="/privacy" className="link">
            Read the full privacy page
          </Link>
        </p>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className="section-title">
          Good to know
        </h2>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <div key={q} className="py-4">
              <dt className="text-[15px] font-medium">{q}</dt>
              <dd className="mt-1 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">
          Built with Next.js, FastAPI and Claude, with over 360 automated tests.{" "}
          <a href="https://github.com/whatalshifa/report-saathi" className="link" rel="noopener noreferrer">
            Read the source on GitHub
          </a>
        </p>
      </section>
    </article>
  );
}
