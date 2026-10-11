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
import { IconArrowRight, IconLock, IconPlus, IconReport, IconSpeaker, IconStethoscope, IconTimeline } from "@/components/icons";

const TITLE = "ReportSaathi: your family's lab reports, explained";
const DESCRIPTION =
  "Add a photo or PDF of any lab report. ReportSaathi reads every value, flags what's out of range, explains it in English, Hindi or Marathi, and follows your family's results across labs.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  // A page's openGraph replaces the layout's whole object, so the shared fields are repeated here.
  openGraph: { type: "website", siteName: "ReportSaathi", locale: "en_IN", title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { title: TITLE, description: DESCRIPTION },
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
      {/* A floating pill, centred over the page, like the top bar of a phone app. */}
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto flex h-[60px] max-w-[1060px] items-center gap-2 rounded-full bg-tint/85 pr-2 pl-5 shadow-lift ring-1 ring-white/70 backdrop-blur-xl sm:h-16 dark:ring-white/[0.06]">
          <Link href="/" aria-label="ReportSaathi home" className="shrink-0 rounded-full">
            <Logo size="sm" className="sm:hidden" />
            <Logo className="max-sm:hidden" />
          </Link>
          <nav aria-label="On this page" className="mx-auto hidden lg:block">
            <ul className="flex gap-0.5 text-[15px] font-semibold text-muted">
              {NAV.map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="inline-flex h-10 items-center rounded-full px-3.5 transition-colors hover:bg-surface hover:text-foreground xl:px-4"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 lg:ml-0">
            <ThemeToggle className="max-sm:hidden" />
            {!signedIn && (
              <Link href="/login" className="btn btn-ghost hidden xl:inline-flex">
                Sign in
              </Link>
            )}
            <Link href="/dashboard" className="btn btn-primary max-sm:h-10 max-sm:px-4 max-sm:text-sm">
              <span className="sm:hidden">{signedIn ? "Open the app" : "Try the demo"}</span>
              <span className="hidden sm:inline">{cta}</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative overflow-x-clip">
          {/* Two soft blobs, plum behind the devices and coral low on the left. */}
          <svg aria-hidden viewBox="0 0 600 520" className="pointer-events-none absolute top-6 right-[-12%] hidden w-[64%] max-w-[920px] lg:block">
            <path
              d="M318 18c104-10 238 40 268 150s-30 236-140 290-268 66-356 10S-12 316 26 214 214 28 318 18Z"
              className="fill-brand-100 dark:fill-brand-950"
            />
          </svg>
          <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-coral-200/60 blur-3xl dark:bg-coral-800/25" />
          <div className="relative mx-auto grid max-w-[1240px] gap-10 px-4 pt-7 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-center lg:gap-6 lg:pt-14 lg:pb-20 xl:gap-10">
            <div className="max-w-xl">
              <p className="inline-flex -rotate-2 items-center gap-2 rounded-full bg-surface py-1.5 pr-4 pl-1.5 text-sm font-bold text-brand-800 shadow-soft dark:text-brand-200">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-coral-500 text-white [--duo:rgb(255_255_255/0.3)] dark:text-brand-950">
                  <IconSpeaker aria-hidden className="h-4 w-4" />
                </span>
                English, <span lang="hi">हिन्दी</span> and <span lang="mr">मराठी</span>
              </p>
              <h1
                id="hero-title"
                className="mt-5 text-[44px] leading-[0.98] font-black tracking-[-0.045em] text-balance sm:mt-6 sm:text-[62px] xl:text-[74px]"
              >
                Your family&apos;s lab reports, <span className="scribble text-brand-700 dark:text-brand-300">explained.</span>
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-pretty text-muted sm:mt-7 sm:text-[19px]">
                Add a photo or PDF from any lab. ReportSaathi reads every value, flags what&apos;s outside the
                lab&apos;s own range, explains it in plain words, and follows each result over time, for everyone in
                the family.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
                <Link href="/dashboard" className="btn btn-primary btn-lg h-14 px-7 text-[17px]">
                  {cta}
                  <IconArrowRight aria-hidden className="h-5 w-5" />
                </Link>
                {!signedIn && (
                  <Link href="/signup" className="btn btn-secondary btn-lg h-14 px-7 text-[17px]">
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
          className="mx-3 scroll-mt-24 rounded-[36px] bg-surface py-14 shadow-soft sm:mx-5 sm:rounded-[48px] sm:py-24"
        >
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] lg:gap-14">
              <div>
                <p className="landing-sticker">
                  <IconReport aria-hidden />
                  From the report to plain words
                </p>
                <h2 id="how-title" className="landing-h2 mt-5">
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
        <section id="trends" aria-labelledby="trends-title" className="scroll-mt-24 py-16 sm:py-28">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="landing-sticker">
                <IconTimeline aria-hidden />
                Across labs, over time
              </p>
              <h2 id="trends-title" className="landing-h2 mt-5">
                <span className="capitalize">{word(firstOut)}</span> values out of range in {monthOf(firstReport.report_date)}.{" "}
                <span className="text-coral-600 dark:text-coral-300">
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
          className="mx-3 scroll-mt-24 overflow-x-clip rounded-[36px] bg-tint py-16 sm:mx-5 sm:rounded-[48px] sm:py-24"
        >
          <div className="mx-auto grid max-w-[1240px] gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16">
            <div className="order-2 lg:order-1">
              <BriefPreview />
            </div>
            <div className="order-1 lg:order-2">
              <p className="landing-sticker">
                <IconStethoscope aria-hidden />
                For the doctor&apos;s visit
              </p>
              <h2 id="brief-title" className="landing-h2 mt-5">
                Walk in with one page, not a folder of reports.
              </h2>
              <p className="landing-lead mt-5">
                The doctor brief turns every report into a single summary a doctor can read in a minute.
              </p>
              <ul className="mt-8 space-y-2 text-[15px] sm:text-base">
                <li className="rounded-2xl bg-surface px-5 py-3.5 shadow-soft">
                  <span className="font-semibold">An overview and key findings,</span>{" "}
                  <span className="text-muted">each test with its values over time.</span>
                </li>
                <li className="rounded-2xl bg-surface px-5 py-3.5 shadow-soft">
                  <span className="font-semibold">Latest and previous values,</span>{" "}
                  <span className="text-muted">with the normal range and the LOINC code for each test.</span>
                </li>
                <li className="rounded-2xl bg-surface px-5 py-3.5 shadow-soft">
                  <span className="font-semibold">Your questions, written down,</span>{" "}
                  <span className="text-muted">so none are forgotten in the room.</span>
                </li>
                <li className="rounded-2xl bg-surface px-5 py-3.5 shadow-soft">
                  <span className="font-semibold">Print it, save it as a PDF,</span>{" "}
                  <span className="text-muted">or send a private link that expires.</span>
                </li>
              </ul>
              <AppLink
                href={`/briefs?profile=${MEERA.id}`}
                className="btn btn-primary btn-lg mt-8"
              >
                See {MEERA.name.split(" ")[0]}&apos;s brief in the demo
                <IconArrowRight aria-hidden className="h-5 w-5" />
              </AppLink>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section
          id="privacy"
          aria-labelledby="privacy-title"
          className="mx-3 mt-16 scroll-mt-24 rounded-[36px] bg-brand-800 py-16 text-white sm:mx-5 sm:mt-24 sm:rounded-[48px] sm:py-24 dark:bg-brand-950"
        >
          <div className="mx-auto grid max-w-[1240px] gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <div>
              <p className="inline-flex -rotate-2 items-center gap-2 rounded-full bg-white/10 py-1.5 pr-4 pl-2 text-sm font-bold text-coral-200">
                <IconLock aria-hidden className="h-7 w-7 rounded-full bg-coral-500/25 p-1 text-coral-200 [--duo:rgb(255_179_154/0.3)]" />
                Private by design
              </p>
              <h2 id="privacy-title" className="landing-h2 mt-5 text-white">
                Health reports are personal. They stay yours.
              </h2>
              <p className="mt-5 max-w-md text-[17px] leading-relaxed text-brand-100">
                ReportSaathi explains; it never diagnoses. And it keeps your family&apos;s reports locked away from
                everyone but you.
              </p>
              <Link
                href="/privacy"
                className="mt-8 inline-flex items-center gap-1.5 font-medium text-white underline decoration-coral-300 decoration-2 underline-offset-4 hover:decoration-white"
              >
                Read how we look after your reports
                <IconArrowRight aria-hidden className="h-5 w-5" />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PROMISES.map(([title, text]) => (
                <li key={title} className="rounded-[28px] bg-white/[0.08] p-6 sm:p-7">
                  <p className="text-xl leading-snug font-extrabold tracking-[-0.02em]">{title}</p>
                  <p className="mt-2 text-base text-brand-100">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 py-16 sm:py-28">
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
            <div className="space-y-2.5">
              {FAQ.map(([q, a], i) => (
                <details key={q} className="group rounded-[26px] bg-surface shadow-soft open:bg-tint open:shadow-none" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-[26px] py-4 pr-4 pl-6 text-[17px] font-bold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint-coral text-coral-700 [--duo:var(--duo-coral)] dark:text-coral-300">
                      <IconPlus aria-hidden className="h-5 w-5 transition-transform group-open:rotate-45" />
                    </span>
                  </summary>
                  <p className="-mt-1 max-w-2xl px-6 pb-6 text-base leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="end-title" className="overflow-x-clip px-3 pb-6 sm:px-5 sm:pb-8">
          <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,var(--color-brand-100),#ffe2d5)] px-6 py-12 sm:rounded-[48px] sm:px-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] dark:bg-[linear-gradient(135deg,#2c122a,#3a1a17)]">
            <div className="relative">
              <h2 id="end-title" className="landing-h2">
                {MEERA.name.split(" ")[0]}&apos;s {word(MEERA.report_count)} reports are already in.
              </h2>
              <p className="landing-lead mt-4 text-foreground/75">
                Open the sample family to see the dashboard, every explanation, the trends and the doctor brief, then
                add your own family when you&apos;re ready.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard" className="btn btn-primary btn-lg h-14 px-7 text-[17px]">
                  {cta}
                  <IconArrowRight aria-hidden className="h-5 w-5" />
                </Link>
                {!signedIn && (
                  <Link href="/signup" className="btn btn-secondary btn-lg h-14 px-7 text-[17px]">
                    Create a free account
                  </Link>
                )}
              </div>
            </div>
            <ReportStack />
          </div>
        </section>
      </main>

      {/* A warm block to end on: the wordmark big, one line of links and a goodbye. */}
      <footer className="px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[36px] bg-coral-100 px-6 pt-12 pb-8 sm:rounded-[48px] sm:px-12 sm:pt-16 dark:bg-[#2b1820]">
          <Logo size="xl" />
          <p className="mt-6 max-w-xl text-lg font-semibold text-pretty text-coral-800 sm:text-xl dark:text-coral-200">
            Made for the family member who keeps everyone&apos;s reports. Look after yourself too.
          </p>
          <nav aria-label="ReportSaathi" className="mt-10">
            <ul className="flex flex-wrap gap-x-2 gap-y-2 text-[15px] font-semibold">
              {(
                [
                  ["/dashboard", "Open the app"],
                  ["/accuracy", "Accuracy"],
                  ["/privacy", "Privacy"],
                  ...(signedIn ? [] : [["/login", "Sign in"]]),
                ] as [string, string][]
              ).map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex h-10 items-center rounded-full bg-surface/70 px-4 hover:bg-surface">
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://github.com/whatalshifa/report-saathi"
                  className="inline-flex h-10 items-center rounded-full bg-surface/70 px-4 hover:bg-surface"
                >
                  Source code
                </a>
              </li>
            </ul>
          </nav>
          <p className="mt-8 text-sm text-coral-800/90 dark:text-coral-200/85">
            ReportSaathi explains lab reports. It is not medical advice; always check with your doctor.
          </p>
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
