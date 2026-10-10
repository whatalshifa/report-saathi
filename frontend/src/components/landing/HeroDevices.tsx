"use client";

import { Activity, FileText, House, LayoutDashboard, Stethoscope, Users, BadgeCheck, type LucideIcon } from "lucide-react";

import { AttentionPanel, ImprovedPanel, MarkerTile } from "@/components/DashboardView";
import { Logo, LogoMark } from "@/components/Logo";
import { PersonAvatar } from "@/components/shell/PersonAvatar";
import { isOutOfRange } from "@/lib/api";
import { formatAge, formatDate, formatSex } from "@/lib/format";
import { direction, keyMarkers } from "@/lib/trends";

import { MEERA, TRENDS } from "./sample";

const attention = TRENDS.series.filter((s) => isOutOfRange(s.latest_flag));
const improved = TRENDS.series.filter((s) => direction(s) === "back");
const markers = keyMarkers(TRENDS.series, 6);
const facts = [
  formatAge(TRENDS.profile.age),
  formatSex(TRENDS.profile.sex),
  `${MEERA.report_count} reports from ${TRENDS.profile.labs.length} labs`,
  `last tested ${formatDate(MEERA.last_report_date)}`,
].join(" · ");
const HREF = "/dashboard";

/**
 * The hero's product shot: the real dashboard components, drawn with the sample family's data, in a
 * laptop and a phone. They are a picture here (inert, so nothing in them can be tabbed to or clicked);
 * the figure caption says in words what they show.
 */
export function HeroDevices() {
  return (
    <figure className="relative mx-auto w-full max-w-[340px] sm:max-w-[400px] lg:max-w-none">
      <figcaption className="sr-only">
        The ReportSaathi dashboard for the sample person, {MEERA.name}, on a laptop and a phone:{" "}
        {attention.map((s) => s.name).join(", ")} needs attention, {improved.length} tests are back in range, and
        small trend lines show each key marker.
      </figcaption>
      <div aria-hidden inert className="relative lg:h-[500px] xl:h-[560px]">
        <Laptop />
        <Phone />
      </div>
    </figure>
  );
}

function Laptop() {
  return (
    <div className="absolute top-6 left-[10%] hidden w-[600px] lg:block xl:left-[9%] xl:w-[700px]">
      <div className="rounded-[20px] bg-stone-900 p-[9px] shadow-[0_40px_80px_-30px_rgb(44_18_42/0.45),0_0_0_1px_rgb(255_255_255/0.06)_inset] dark:bg-stone-800">
        <div className="overflow-hidden rounded-[12px] bg-background ring-1 ring-black/5">
          <div className="w-[1160px] [zoom:0.502] xl:[zoom:0.588]">
            <BrowserBar />
            <div className="flex h-[740px]">
              <FakeSidebar />
              <div className="min-w-0 flex-1 space-y-6 px-9 pt-7">
                <header className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <PersonAvatar name={MEERA.name} size="lg" />
                    <div>
                      <p className="text-[13px] font-medium text-muted">Sample person</p>
                      <p className="text-2xl leading-tight font-semibold tracking-[-0.015em]">{MEERA.name}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{facts}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="btn btn-secondary btn-sm">
                      <Activity aria-hidden className="h-3.5 w-3.5" />
                      Timeline
                    </span>
                    <span className="btn btn-primary btn-sm">
                      <Stethoscope aria-hidden className="h-3.5 w-3.5" />
                      Doctor brief
                    </span>
                  </div>
                </header>
                <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                  <AttentionPanel person={MEERA} attention={attention} rechecks={[]} loading={false} />
                  <ImprovedPanel person={MEERA} improved={improved} loading={false} />
                </div>
                <div>
                  <p className="mb-3 text-[15px] font-semibold tracking-[-0.01em]">Key markers</p>
                  <ul className="grid grid-cols-3 gap-2.5">
                    {markers.map((s) => (
                      <li key={s.key} className="min-w-0">
                        <MarkerTile series={s} href={HREF} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* The laptop's base */}
      <div className="relative mx-auto h-3 w-[108%] -translate-x-[3.7%] rounded-b-[14px] bg-gradient-to-b from-stone-300 to-stone-400 dark:from-stone-700 dark:to-stone-800">
        <div className="mx-auto h-1.5 w-24 rounded-b-md bg-stone-400/80 dark:bg-stone-900/70" />
      </div>
    </div>
  );
}

function BrowserBar() {
  return (
    <div className="flex h-10 items-center gap-2 border-b border-line bg-sidebar px-4">
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      <span className="mx-auto flex h-6 w-80 items-center justify-center rounded-md bg-background text-xs text-muted">
        report-saathi · Dashboard
      </span>
    </div>
  );
}

const NAV: [string, LucideIcon][] = [
  ["Dashboard", LayoutDashboard],
  ["Reports", FileText],
  ["Timeline", Activity],
  ["Doctor briefs", Stethoscope],
  ["Family", Users],
  ["Accuracy", BadgeCheck],
];

function FakeSidebar() {
  return (
    <div className="w-56 shrink-0 border-r border-line bg-sidebar px-2.5">
      <div className="flex h-14 items-center px-1.5">
        <Logo size="sm" />
      </div>
      <ul className="space-y-px">
        {NAV.map(([label, Icon], i) => (
          <li
            key={label}
            className={`flex h-8 items-center gap-2.5 rounded-lg px-2 text-[13.5px] ${
              i === 0
                ? "bg-sidebar-active font-medium text-foreground shadow-[0_0_0_1px_var(--border)]"
                : "text-muted"
            }`}
          >
            <Icon aria-hidden className={`h-4 w-4 ${i === 0 ? "text-brand-700 dark:text-brand-300" : ""}`} strokeWidth={1.85} />
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-6 px-2 pb-1.5 text-xs font-medium text-muted">Sample family</p>
      <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-active px-2 py-1.5 shadow-[0_0_0_1px_var(--border)]">
        <PersonAvatar name={MEERA.name} />
        <span className="leading-tight">
          <span className="block text-[13px] font-medium">{MEERA.name}</span>
          <span className="block text-xs text-muted">Sample · {MEERA.report_count} reports</span>
        </span>
      </div>
    </div>
  );
}

const TABS: [string, LucideIcon][] = [
  ["Home", House],
  ["Reports", FileText],
  ["Timeline", Activity],
  ["Briefs", Stethoscope],
  ["Family", Users],
];

function Phone() {
  return (
    <div className="relative mx-auto w-full lg:absolute lg:bottom-0 lg:left-0 lg:w-[248px] xl:w-[262px]">
      <div className="rounded-[44px] bg-stone-900 p-[9px] shadow-[0_40px_70px_-25px_rgb(44_18_42/0.55),0_0_0_1px_rgb(255_255_255/0.08)_inset] dark:bg-stone-800">
        <div className="relative overflow-hidden rounded-[36px] bg-background">
          <span className="absolute top-2.5 left-1/2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-stone-900 dark:bg-stone-800" />
          <PhoneScreen />
        </div>
      </div>
    </div>
  );
}

/** The phone dashboard at its real width, scaled to the frame. */
function PhoneScreen() {
  return (
    <div className="relative w-[375px] [zoom:0.86] sm:[zoom:1] lg:[zoom:0.613] xl:[zoom:0.65]">
      <div className="h-11" />
      <div className="flex h-12 items-center justify-between border-b border-line px-4">
        <span className="flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">ReportSaathi</span>
        </span>
        <PersonAvatar name="Demo account" />
      </div>
      <div className="h-[620px] space-y-4 overflow-hidden px-4 pt-4">
        <div className="flex gap-2">
          <span className="flex h-10 items-center gap-2 rounded-full border border-brand-600 bg-surface py-1 pr-3.5 pl-1.5 text-[13px] ring-1 ring-brand-600 ring-inset dark:border-brand-400 dark:ring-brand-400">
            <PersonAvatar name={MEERA.name} />
            <span className="font-medium">{MEERA.name}</span>
            <span className="text-muted">Sample</span>
          </span>
        </div>
        <div>
          <p className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">{MEERA.name}</p>
          <p className="mt-0.5 text-[13px] text-muted">{facts.split(" · last")[0]}</p>
        </div>
        <AttentionPanel person={MEERA} attention={attention} rechecks={[]} loading={false} />
        <ul className="grid grid-cols-2 gap-2.5">
          {markers.slice(0, 4).map((s) => (
            <li key={s.key} className="min-w-0">
              <MarkerTile series={s} href={HREF} />
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-surface/95 pb-5">
        <ul className="grid h-16 grid-cols-5">
          {TABS.map(([label, Icon], i) => (
            <li
              key={label}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] leading-none font-medium ${
                i === 0 ? "text-brand-700 dark:text-brand-300" : "text-muted"
              }`}
            >
              <span className={`grid h-7 w-12 place-items-center rounded-full ${i === 0 ? "bg-brand-100 dark:bg-brand-900/70" : ""}`}>
                <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={i === 0 ? 2.1 : 1.8} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
