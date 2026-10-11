import type { ReportGlance } from "@/components/DashboardView";
import explained from "@/data/sample-explained.json";
import sample from "@/data/sample-family.json";
import type { BriefContent, Flag, Language, Profile, ReportSummary, Trends } from "@/lib/api";

/**
 * Everything the landing page shows comes from the sample family, the same data the demo account opens
 * with: the saved dashboard copy (sample-family.json) and the January report as the AI read and explained
 * it (sample-explained.json, copied from backend/app/samples/meera.json). Nothing here is invented.
 */
// Read here, not from the client shell module, so server components get the values themselves.
export const MEERA = sample.profiles[0] as Profile;
export const TRENDS = sample.trends as Trends;
export const REPORTS = sample.reports as ReportSummary[];
export const GLANCES = sample.details as Record<string, ReportGlance>;

/** The January report: the one with the most to explain, and explanations in all three languages. */
export const JANUARY_ID = "sample-2026-01-12";
export const JANUARY = explained.report;
export const SCAN = explained.image;

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ExplainedItem {
  test_name: string;
  what_it_measures: string;
  what_your_result_means: string;
  common_reasons: string[];
  what_you_can_do: string;
}

export interface LabRow {
  section: string;
  name: string;
  key: string;
  value_text: string;
  value: number;
  unit: string;
  reference_text: string | null;
  ref_low: number | null;
  ref_high: number | null;
  /** The flag the app gave it: the lab's own range, checked by code. */
  flag: Flag;
  box: Box;
  /** Position of this value's explanation in each language's list, when it was flagged. */
  explained: number | null;
}

const januaryFlags = new Map(GLANCES[JANUARY_ID].flagged.map((f) => [f.name, f.flag]));

let flaggedSoFar = 0;
export const LAB_ROWS: LabRow[] = explained.tests.map((t) => {
  const flag = januaryFlags.get(t.name) ?? "normal";
  const out = flag !== "normal";
  return {
    section: t.section,
    name: t.name,
    key: t.catalog_key,
    value_text: t.value_text,
    value: t.numeric_value,
    unit: t.unit,
    reference_text: t.reference_text,
    ref_low: t.ref_low,
    ref_high: t.ref_high,
    flag,
    box: t.box,
    // The explanation lists flagged values in report order, in every language.
    explained: out ? flaggedSoFar++ : null,
  };
});

export type ExplainLanguage = Extract<Language, "en" | "hi" | "mr">;

export const EXPLANATIONS = explained.explanations as Record<
  ExplainLanguage,
  { summary: string; flagged: ExplainedItem[]; questions_for_doctor: string[] }
>;

export const BRIEF: BriefContent = {
  brief: explained.brief,
  snapshot: { profile: TRENDS.profile, series: TRENDS.series },
};

/** When the saved sample was made, which is when its brief was written. */
export const SAMPLE_SAVED_AT = REPORTS[0].created_at;
