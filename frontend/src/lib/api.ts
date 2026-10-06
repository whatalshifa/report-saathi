// Talks to the FastAPI backend. Types mirror backend/app/schemas.py.
// Requests go to /api/* on this website, and next.config.ts forwards them to FastAPI,
// so the browser sends the sign-in cookie automatically.

import { serverStatus } from "@/lib/serverStatus";

export type Flag = "low" | "high" | "normal" | "abnormal" | "unknown";
export type ReportStatus = "queued" | "processing" | "done" | "failed";

/** Where a value is printed in the original file: a page (from 1), and edges as fractions 0-1 of it. */
export interface SourceBox {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TestResult {
  id: number;
  section: string | null;
  name: string;
  value_text: string;
  value: number | null;
  unit: string | null;
  reference_text: string | null;
  ref_low: number | null;
  ref_high: number | null;
  lab_flag: string | null;
  flag: Flag;
  /** True when the person fixed a value the AI misread. */
  corrected: boolean;
  corrected_at: string | null;
  /** What the AI first read, kept after a fix so the page can show it. */
  original_value_text: string | null;
  original_unit: string | null;
  /** Where the value is printed in the original; null when not known (older reports, or the AI couldn't say). */
  box: SourceBox | null;
}

export interface ReportSummary {
  id: string;
  filename: string;
  status: ReportStatus;
  error: string | null;
  lab_name: string | null;
  patient_name: string | null;
  report_date: string | null;
  profile_id: string;
  created_at: string;
}

export interface ReportDetail extends ReportSummary {
  /** The original file's type: a PDF or an image (older sample reports: text/plain, no file to show). */
  content_type: string;
  patient_age: string | null;
  patient_sex: string | null;
  profile: { id: string; name: string };
  /** False when the name printed on the report looks like someone else's; null when there is no name. */
  name_matches_profile: boolean | null;
  results: TestResult[];
  out_of_range: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// While the free server wakes up, the website's forwarder may give up and answer 502/504,
// or the connection may drop. Reads are safe to try again, so they are, for about a minute.
const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000, 30000];
const WAKING_STATUSES = new Set([502, 504]);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithWake(path: string, init?: RequestInit): Promise<Response> {
  const retry = (init?.method ?? "GET") === "GET";
  const done = serverStatus.track();
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(path, { cache: "no-store", credentials: "same-origin", ...init });
        if (!retry || !WAKING_STATUSES.has(response.status) || attempt >= RETRY_DELAYS_MS.length) return response;
      } catch {
        if (!retry || attempt >= RETRY_DELAYS_MS.length) {
          throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
        }
      }
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  } finally {
    done();
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithWake(path, init);
  if (response.status === 401 && !path.startsWith("/api/auth/") && typeof window !== "undefined") {
    // Signed out (or the session expired): go to sign-in, then come back here.
    // A full page load on purpose, so no signed-in state survives in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : friendlyStatus(response.status);
    throw new ApiError(detail, response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

function friendlyStatus(status: number): string {
  if (status === 429) return "Too many tries. Please wait a few minutes.";
  if (status >= 500) return "The server had a problem. Please try again in a moment.";
  return `Request failed (${status})`;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ---------- Accounts ----------

export interface User {
  id: string;
  name: string;
  email: string;
  /** A one-click demo account, deleted after a day. */
  is_guest: boolean;
}

export const signup = (name: string, email: string, password: string) =>
  request<User>("/api/auth/signup", json("POST", { name, email, password }));
export const login = (email: string, password: string) =>
  request<User>("/api/auth/login", json("POST", { email, password }));
/** Answers once the API (and its database) is up; used to wake the free server early. */
export const checkHealth = () => request<{ status: string }>("/api/health");

/** Signs in to a fresh demo account that already holds the sample reports. */
export const startDemo = () => request<User>("/api/auth/demo", { method: "POST" });
export const logout = () => request<void>("/api/auth/logout", { method: "POST" });
export const deleteAccount = () => request<void>("/api/auth/me", { method: "DELETE" });

/** The signed-in user, or null when nobody is signed in. */
export async function getMe(): Promise<User | null> {
  try {
    return await request<User>("/api/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

// ---------- Family profiles ----------

export type Relation = "self" | "spouse" | "parent" | "child" | "sibling" | "grandparent" | "other";
export type Sex = "female" | "male" | "other";

export interface ProfileInput {
  name: string;
  relation: Relation;
  birth_year: number | null;
  sex: Sex | null;
}

export interface Profile extends ProfileInput {
  id: string;
  /** The ready-made example person from demo mode. */
  is_sample: boolean;
  report_count: number;
  last_report_date: string | null;
}

export const listProfiles = () => request<Profile[]>("/api/profiles");
export const createProfile = (input: ProfileInput) => request<Profile>("/api/profiles", json("POST", input));
export const updateProfile = (id: string, input: ProfileInput) =>
  request<Profile>(`/api/profiles/${id}`, json("PUT", input));
export const deleteProfile = (id: string) => request<void>(`/api/profiles/${id}`, { method: "DELETE" });

// ---------- Demo mode ----------

export interface Features {
  /** False when the server has no Anthropic key: only the sample reports work. */
  reading: boolean;
}

export const getFeatures = () => request<Features>("/api/features");
/** Adds the example person with three pre-read reports (or returns them if already added). */
export const addSamples = () => request<Profile>("/api/samples", { method: "POST" });

// ---------- Reports ----------

export function uploadReport(file: File, profileId: string): Promise<ReportDetail> {
  const form = new FormData();
  form.append("file", file);
  form.append("profile_id", profileId);
  return request("/api/reports", { method: "POST", body: form });
}

export const listReports = (profileId?: string) =>
  request<ReportSummary[]>(profileId ? `/api/reports?profile_id=${profileId}` : "/api/reports");
export const moveReport = (id: string, profileId: string) =>
  request<ReportDetail>(`/api/reports/${id}`, json("PATCH", { profile_id: profileId }));
export const getReport = (id: string) => request<ReportDetail>(`/api/reports/${id}`);
export const deleteReport = (id: string) => request<void>(`/api/reports/${id}`, { method: "DELETE" });
/** The original uploaded file, for an <img> or a new tab; the browser sends the sign-in cookie itself. */
export const reportFileUrl = (id: string) => `/api/reports/${id}/file`;
/** Whether there is an original file to show; the oldest sample reports have only a text placeholder. */
export const hasOriginal = (report: ReportDetail) =>
  report.content_type === "application/pdf" || report.content_type.startsWith("image/");
/** Fixes a misread value. The server re-flags it; an empty unit clears the unit. */
export const correctResult = (reportId: string, resultId: number, valueText: string, unit: string) =>
  request<TestResult>(
    `/api/reports/${reportId}/results/${resultId}`,
    json("PATCH", { value_text: valueText, unit }),
  );

export const isOutOfRange = (flag: Flag) => flag === "low" || flag === "high" || flag === "abnormal";

// ---------- Phase 2: trends, explanations, doctor briefs ----------

export interface TimelineSummary {
  profile_id: string;
  name: string;
  relation: Relation;
  age: string | null;
  sex: string | null;
  report_count: number;
  first_date: string;
  last_date: string;
  labs: string[];
}

export interface TrendPoint {
  date: string;
  value: number;
  flag: Flag;
  report_id: string;
  lab_name: string | null;
  printed: string;
}

export interface TrendSeries {
  key: string;
  name: string;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  points: TrendPoint[];
  latest_flag: Flag;
  change: number | null;
  change_pct: number | null;
}

export interface Trends {
  profile: TimelineSummary;
  series: TrendSeries[];
}

export type Language = "en" | "hi" | "mr";

export interface Job<T> {
  id: string;
  status: ReportStatus;
  error: string | null;
  content: T | null;
  created_at: string;
}

export interface ExplainedTest {
  test_name: string;
  what_it_measures: string;
  what_your_result_means: string;
  common_reasons: string[];
  what_you_can_do: string;
}

export interface ReportExplanation {
  summary: string;
  see_doctor_soon: boolean;
  see_doctor_reason: string | null;
  flagged: ExplainedTest[];
  normal_summary: string;
  questions_for_doctor: string[];
}

export interface DoctorBrief {
  overview: string;
  key_findings: { test: string; finding: string }[];
  questions_for_doctor: string[];
}

export interface BriefContent {
  brief: DoctorBrief;
  snapshot: Trends;
}

export const getTrends = (profileId: string) => request<Trends>(`/api/profiles/${profileId}/trends`);

export const requestBrief = (profileId: string) =>
  request<Job<BriefContent>>(`/api/profiles/${profileId}/briefs`, { method: "POST" });
export const getBrief = (id: string) => request<Job<BriefContent>>(`/api/briefs/${id}`);

export const requestExplanation = (reportId: string, language: Language) =>
  request<Job<ReportExplanation>>(`/api/reports/${reportId}/explanations`, json("POST", { language }));

/** Returns null when no explanation has been asked for in this language yet. */
export async function getExplanation(reportId: string, language: Language) {
  try {
    return await request<Job<ReportExplanation>>(`/api/reports/${reportId}/explanations/${language}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export const isPending = (status: ReportStatus) => status === "queued" || status === "processing";
