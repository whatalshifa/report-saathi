import { ArrowRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BriefPreview } from "@/components/landing/BriefPreview";
import { HeroDevices } from "@/components/landing/HeroDevices";
import { LandingFrame } from "@/components/landing/LandingFrame";
import { ReportExplained } from "@/components/landing/ReportExplained";
import { GLANCES, MEERA, REPORTS } from "@/components/landing/sample";
import { TrendStory } from "@/components/landing/TrendStory";
import { Logo } from "@/components/Logo";
import { AppLink } from "@/components/shell/ShellContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: { absolute: "ReportSaathi: your family's lab reports, explained" },
  description:
    "Add a photo or PDF of any lab report. ReportSaathi reads every value, flags what's out of range, explains it in English, Hindi or Marathi, and follows your family's results across labs.",
};

const NAV = [
  ["#how", "How it reads a report"],
  ["#trends", "Trends"],
  ["#brief", "Doctor brief"],
  ["#privacy", "Privacy"],
];

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n: number) => WORDS[n] ?? String(n);
const monthOf = (date: string | null) => (date ? new Date(date).toLocaleDateString("en-IN", { month: "long" }) : "");

const [firstReport, , lastReport] = [...REPORTS].reverse();
const firstOut = GLANCES[firstReport.id].out_of_range;
const lastOut = GLANCES[lastReport.id].out_of_range;

const PROMISES = [
  ["Only your account can open your reports.", "One sign-in cookie, no advertising, no tracking, and your data is never sold."],
  [
    "Every file is encrypted before it is stored.",
    "Each report gets its own key (AES-256-GCM), so one file never unlocks another.",
  ],
  [
    "Take everything with you, or delete it all.",
    "Download your reports and data at any time, or delete your account and everything in it.",
  ],
  ["Links for the doctor are private.", "They expire on their own, and you can turn one off whenever you like."],
];

const FAQ: [string, React.ReactNode][] = [
  [
    "Is this medical advice?",
    "No. ReportSaathi helps you understand what a report says and get ready for a conversation with your doctor. It never diagnoses or suggests treatment.",
  ],
  [
    "Who is Meera?",
    "A made-up person with three made-up reports from two labs, so you can try everything without uploading anything. Opening one of her reports, trends or briefs starts a private demo account that is deleted after 24 hours.",
  ],
  [
    "Does the demo read new reports?",
    "On the public demo the AI is switched off, so reading new uploads is paused and no report is sent anywhere. Meera's reports, explanations and brief were prepared in advance. Create a free account to add your own family's reports.",
  ],
  [
    "Which labs and languages does it handle?",
    "Any lab and any layout: a PDF or a phone photo of a printed report. Explanations are in English, Hindi or Marathi, and can be read aloud where your phone has a voice for the language.",
  ],
  [
    "How accurate is the reading?",
    <>
      Values are read by AI and every flag is checked by code against the range the lab printed. You can trace each
      value back to the spot on the report it came from, and fix it if it was misread. The{" "}
      <Link href="/accuracy" className="link">
        accuracy page
      </Link>{" "}
      explains how reading is measured.
    </>,
  ],
];

export default async function Landing({ searchParams }: PageProps<"/">) {
  // Old links to a person's dashboard pointed here.
  const { profile } = await searchParams;
  if (typeof profile === "string") redirect(`/dashboard?profile=${encodeURIComponent(profile)}`);
  const signedIn = (await cookies()).has("rs_session");
  const cta = signedIn ? "Open your dashboard" : "Try the sample family";

  return (
    <LandingFrame signedIn={signedIn}>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="ReportSaathi home" className="rounded-ctl">
            <Logo />
          </Link>
          <nav aria-label="On this page" className="hidden lg:block">
            <ul className="flex gap-7 text-sm text-muted">
              {NAV.map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="hover:text-foreground">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {!signedIn && (
              <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
                Sign in
              </Link>
            )}
            <Link href="/dashboard" className="btn btn-primary max-sm:h-9 max-sm:px-3 max-sm:text-[13px]">
              <span className="sm:hidden">{signedIn ? "Open the app" : "Try the demo"}</span>
              <span className="hidden sm:inline">{cta}</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative overflow-x-clip">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_78%_38%,rgb(231_207_228/0.75),transparent_70%),radial-gradient(40%_40%_at_8%_100%,rgb(255_179_154/0.35),transparent_70%)] dark:bg-[radial-gradient(60%_55%_at_78%_38%,rgb(87_45_85/0.55),transparent_70%),radial-gradient(40%_40%_at_8%_100%,rgb(107_47_34/0.35),transparent_70%)]"
          />
          <div className="relative mx-auto grid max-w-[1240px] gap-10 px-4 pt-7 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-center lg:gap-6 lg:pt-14 lg:pb-20 xl:gap-10">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface/70 px-3 py-1 text-[13px] font-medium text-brand-800 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-coral-500" />
                English, <span lang="hi">हिन्दी</span> and <span lang="mr">मराठी</span>
              </p>
              <h1
                id="hero-title"
                className="mt-4 text-[40px] leading-[1.02] sm:mt-5 font-semibold tracking-[-0.035em] text-balance sm:text-[56px] xl:text-[64px]"
              >
                Your family&apos;s lab reports,{" "}
                <span className="relative whitespace-nowrap">
                  <span
                    aria-hidden
                    className="absolute inset-x-[-0.08em] bottom-[0.06em] h-[0.36em] -skew-x-6 rounded-[0.12em] bg-coral-300/80 dark:bg-coral-500/45"
                  />
                  <span className="relative">explained.</span>
                </span>
              </h1>
              <p className="mt-5 max-w-[34rem] text-[17px] sm:mt-6 leading-relaxed text-pretty text-muted sm:text-lg">
                Add a photo or PDF from any lab. ReportSaathi reads every value, flags what&apos;s outside the
                lab&apos;s own range, explains it in plain words, and follows each result over time, for everyone in
                the family.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
                <Link href="/dashboard" className="btn btn-primary btn-lg h-12 px-6 text-base">
                  {cta}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                {!signedIn && (
                  <Link href="/signup" className="btn btn-secondary btn-lg h-12 px-6 text-base">
                    Create a free account
                  </Link>
                )}
              </div>
              <p className="mt-4 hidden text-sm text-muted sm:block">
                {signedIn
                  ? "Your family's reports are waiting on your dashboard."
                  : `No sign-up to look around: ${MEERA.name}, a made-up sample person, already has ${word(
                      MEERA.report_count,
                    )} reports in.`}
              </p>
            </div>
            <HeroDevices />
          </div>
        </section>

        {/* Signature: report to plain language */}
        <section
          id="how"
          aria-labelledby="how-title"
          className="scroll-mt-16 border-y border-line bg-surface py-16 sm:py-24 dark:bg-[#18131a]"
        >
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] lg:gap-14">
              <div>
                <p className="landing-eyebrow">From the report to plain words</p>
                <h2 id="how-title" className="landing-h2 mt-3">
                  The lab prints numbers. You get what they mean.
                </h2>
              </div>
              <p className="landing-lead lg:self-end">
                This is {MEERA.name}&apos;s report from {formatDate(firstReport.report_date)}, as the sample lab printed
                it. Pick a value marked L or H to read ReportSaathi&apos;s explanation, then switch it to Hindi or
                Marathi.
              </p>
            </div>
            <div className="mt-10 sm:mt-14">
              <ReportExplained />
            </div>
          </div>
        </section>

        {/* Trends across labs */}
        <section id="trends" aria-labelledby="trends-title" className="scroll-mt-16 py-16 sm:py-24">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="landing-eyebrow">Across labs, over time</p>
              <h2 id="trends-title" className="landing-h2 mt-3">
                <span className="capitalize">{word(firstOut)}</span> values out of range in {monthOf(firstReport.report_date)}.{" "}
                <span className="text-brand-700 dark:text-brand-300">
                  <span className="capitalize">{word(lastOut)}</span> in {monthOf(lastReport.report_date)}.
                </span>
              </h2>
              <p className="landing-lead mt-5">
                {MEERA.name}&apos;s reports come from two labs that print the same tests differently: haemoglobin in
                &ldquo;gm/dl&rdquo; at one and &ldquo;g/dL&rdquo; at the other. ReportSaathi converts the units and puts
                every result on one line, so you can see what got better and what still needs a word with the doctor.
              </p>
            </div>
            <div className="mt-10 sm:mt-12">
              <TrendStory />
            </div>
          </div>
        </section>

        {/* Doctor brief */}
        <section
          id="brief"
          aria-labelledby="brief-title"
          className="scroll-mt-16 overflow-x-clip border-t border-line bg-[linear-gradient(180deg,var(--sidebar),var(--background))] py-16 sm:py-24"
        >
          <div className="mx-auto grid max-w-[1240px] gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16">
            <div className="order-2 lg:order-1">
              <BriefPreview />
            </div>
            <div className="order-1 lg:order-2">
              <p className="landing-eyebrow">For the doctor&apos;s visit</p>
              <h2 id="brief-title" className="landing-h2 mt-3">
                Walk in with one page, not a folder of reports.
              </h2>
              <p className="landing-lead mt-5">
                The doctor brief turns every report into a single summary a doctor can read in a minute.
              </p>
              <ul className="mt-8 divide-y divide-line border-y border-line text-[15px] sm:text-base">
                <li className="py-3.5">
                  <span className="font-semibold">An overview and key findings,</span>{" "}
                  <span className="text-muted">each test with its values over time.</span>
                </li>
                <li className="py-3.5">
                  <span className="font-semibold">Latest and previous values,</span>{" "}
                  <span className="text-muted">with the normal range and the LOINC code for each test.</span>
                </li>
                <li className="py-3.5">
                  <span className="font-semibold">Your questions, written down,</span>{" "}
                  <span className="text-muted">so none are forgotten in the room.</span>
                </li>
                <li className="py-3.5">
                  <span className="font-semibold">Print it, save it as a PDF,</span>{" "}
                  <span className="text-muted">or send a private link that expires.</span>
                </li>
              </ul>
              <AppLink
                href={`/briefs?profile=${MEERA.id}`}
                className="btn btn-secondary btn-lg mt-8"
              >
                See {MEERA.name.split(" ")[0]}&apos;s brief in the demo
                <ArrowRight aria-hidden className="h-4 w-4" />
              </AppLink>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section
          id="privacy"
          aria-labelledby="privacy-title"
          className="scroll-mt-16 bg-brand-800 py-16 text-white sm:py-24 dark:bg-brand-950"
        >
          <div className="mx-auto grid max-w-[1240px] gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <div>
              <p className="text-[13px] font-semibold tracking-[0.08em] text-coral-300 uppercase">Private by design</p>
              <h2 id="privacy-title" className="landing-h2 mt-3 text-white">
                Health reports are personal. They stay yours.
              </h2>
              <p className="mt-5 max-w-md text-[17px] leading-relaxed text-brand-100">
                ReportSaathi explains; it never diagnoses. And it keeps your family&apos;s reports locked away from
                everyone but you.
              </p>
              <Link
                href="/privacy"
                className="mt-8 inline-flex items-center gap-1.5 font-medium text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                Read how we look after your reports
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
            <ul className="divide-y divide-white/15 border-y border-white/15">
              {PROMISES.map(([title, text]) => (
                <li key={title} className="py-6 sm:py-7">
                  <p className="text-xl leading-snug font-semibold tracking-[-0.015em] sm:text-2xl">{title}</p>
                  <p className="mt-2 text-base text-brand-100">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 py-16 sm:py-24">
          <div className="mx-auto grid max-w-[1240px] gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-20">
            <div>
              <h2 id="faq-title" className="landing-h2">
                Good to know
              </h2>
              <p className="landing-lead mt-4">
                Still wondering about something?{" "}
                <a href="https://github.com/whatalshifa/report-saathi" className="link" rel="noopener noreferrer">
                  The source code is open
                </a>
                .
              </p>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map(([q, a], i) => (
                <details key={q} className="group" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <Plus
                      aria-hidden
                      className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-45"
                    />
                  </summary>
                  <p className="-mt-1 max-w-2xl pb-6 text-base leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="end-title" className="overflow-x-clip px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,var(--color-brand-100),#ffe9df)] px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] dark:bg-[linear-gradient(135deg,#2c122a,#3a1a17)]">
            <div className="relative">
              <h2 id="end-title" className="landing-h2">
                {MEERA.name.split(" ")[0]}&apos;s {word(MEERA.report_count)} reports are already in.
              </h2>
              <p className="landing-lead mt-4 text-foreground/75">
                Open the sample family to see the dashboard, every explanation, the trends and the doctor brief, then
                add your own family when you&apos;re ready.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard" className="btn btn-primary btn-lg h-12 px-6 text-base">
                  {cta}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                {!signedIn && (
                  <Link href="/signup" className="btn btn-secondary btn-lg h-12 px-6 text-base">
                    Create a free account
                  </Link>
                )}
              </div>
            </div>
            <ReportStack />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-10 text-sm text-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Logo size="sm" />
            <p className="max-w-md">
              ReportSaathi explains lab reports. It is not medical advice; always check with your doctor.
            </p>
          </div>
          <nav aria-label="ReportSaathi">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li>
                <Link href="/dashboard" className="hover:text-foreground">
                  Open the app
                </Link>
              </li>
              <li>
                <Link href="/accuracy" className="hover:text-foreground">
                  Accuracy
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>
              {!signedIn && (
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Sign in
                  </Link>
                </li>
              )}
              <li>
                <a href="https://github.com/whatalshifa/report-saathi" className="hover:text-foreground">
                  Source code
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </LandingFrame>
  );
}

/** The three sample reports as they were printed, fanned out like papers on a table. */
function ReportStack() {
  const scans = [...REPORTS].reverse();
  const tilt = ["-rotate-6 translate-y-4", "rotate-0 -translate-y-1", "rotate-6 translate-y-5"];
  return (
    <div aria-hidden className="relative mx-auto flex w-full max-w-md items-center justify-center pb-4 sm:py-6">
      {scans.map((r, i) => (
        <div
          key={r.id}
          className={`relative -mx-8 w-[44%] shrink-0 overflow-hidden rounded-md bg-white shadow-[0_20px_40px_-18px_rgb(44_18_42/0.5)] ring-1 ring-black/5 sm:-mx-10 ${tilt[i]}`}
          style={{ zIndex: i === 1 ? 2 : 1 }}
        >
          <Image src={`/landing/${r.filename}`} alt="" width={1240} height={1754} className="h-auto w-full dark:brightness-[0.88]" />
        </div>
      ))}
    </div>
  );
}
