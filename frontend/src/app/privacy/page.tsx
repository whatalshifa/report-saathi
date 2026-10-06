import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What ReportSaathi keeps, why, where, for how long, and your rights under India's DPDP Act 2023.",
};

const ISSUES = "https://github.com/whatalshifa/report-saathi/issues";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl space-y-8">
      <header>
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">How we look after your reports</h1>
        <p className="mt-2 text-muted">
          Lab reports are some of the most private papers a family has. This page says, in plain words, what
          ReportSaathi keeps, why, where, for how long, and what you can do about it. Last updated 6 October 2026.
        </p>
      </header>

      <Section title="What we keep">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name, email and password. The password is kept only as a scrambled hash, never as text.</li>
          <li>The family members you add: name, relation, and, if you give them, birth year and sex.</li>
          <li>
            The report files you upload, and what is read from them: the lab, the date, the name printed on it, and
            every test value.
          </li>
          <li>The explanations and doctor briefs written for you, any values you correct, and the doctor links you make.</li>
          <li>One cookie that keeps you signed in. No advertising, no tracking, and we never sell your data.</li>
        </ul>
      </Section>

      <Section title="Why we keep it">
        <p>
          Only to do what you ask: read your reports, explain them, show how results change over time, and make a
          summary for your doctor. Before your first upload we ask you to agree to this, and we note which version
          of this notice you agreed to and when.
        </p>
        <p>
          When you add a family member, please make sure they are happy for their reports to be kept here. For a
          child, that is you as their parent.
        </p>
      </Section>

      <Section title="Where it is stored">
        <p>
          The database and the report files are kept with Neon, in Singapore. Every file is encrypted before it is
          stored, each with its own key, so the files are unreadable without our server. Only your account can see
          your family&apos;s reports.
        </p>
      </Section>

      <Section title="Who else handles it">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Anthropic</strong>, when reading is switched on: each report is sent to Claude, Anthropic&apos;s
            AI, to be read and explained. Anthropic does not use it to train its models. On the public demo the AI is
            switched off, so no report is sent anywhere.
          </li>
          <li>
            <strong>Render</strong> runs our server and <strong>Vercel</strong> runs the website. Your data passes
            through them on its way to and from the database.
          </li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        <ul className="list-disc space-y-1 pl-5">
          <li>Demo accounts, and everything in them, are deleted after 24 hours.</li>
          <li>
            Your own account is kept until you delete it. Deleting a report, a family member or the whole account
            removes it, and its files, straight away.
          </li>
        </ul>
      </Section>

      <Section title="Your rights, and how to use them">
        <p>
          India&apos;s Digital Personal Data Protection Act, 2023 gives you these rights. Most of them are a button
          in the app.
        </p>
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold text-foreground">See your data</dt>
            <dd>
              Everything is on your reports and timeline pages. To take a copy, use <strong>Download all my data</strong>{" "}
              on the <Link href="/account" className="link">Account page</Link>: one ZIP with the original files, a
              spreadsheet of every value, and the rest.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Correct it</dt>
            <dd>
              If a value was read wrongly, tap the pencil beside it on the report and type the right one. You can
              edit a family member&apos;s details on the Family page, and move a report to the right person.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Erase it, or take back your consent</dt>
            <dd>
              Delete any report or family member, or delete your whole account on the Account page. Everything,
              including the files, is removed.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Complain or ask a question</dt>
            <dd>
              Open an issue on our{" "}
              <a href={ISSUES} className="link">
                GitHub repository
              </a>
              . Please don&apos;t put any health details in it, since issues are public. If you are not happy with
              our answer, you can go to the Data Protection Board of India.
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Contact">
        <p>
          For anything about your data, open an issue on the{" "}
          <a href={ISSUES} className="link">
            ReportSaathi GitHub repository
          </a>
          .
        </p>
        <p className="text-sm text-muted">
          ReportSaathi explains lab reports. It is not medical advice; always ask your doctor.
        </p>
      </Section>
    </article>
  );
}
