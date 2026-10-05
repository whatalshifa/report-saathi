// Talks to the FastAPI backend. Types mirror backend/app/schemas.py.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Flag = "low" | "high" | "normal" | "abnormal" | "unknown";
export type ReportStatus = "queued" | "processing" | "done" | "failed";

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
}

export interface ReportSummary {
  id: string;
  filename: string;
  status: ReportStatus;
  error: string | null;
  lab_name: string | null;
  patient_name: string | null;
  report_date: string | null;
  person_key: string | null;
  created_at: string;
}

export interface ReportDetail extends ReportSummary {
  patient_age: string | null;
  patient_sex: string | null;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : `Request failed (${response.status})`;
    throw new ApiError(detail, response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export function uploadReport(file: File): Promise<ReportDetail> {
  const form = new FormData();
  form.append("file", file);
  return request("/api/reports", { method: "POST", body: form });
}

export const listReports = () => request<ReportSummary[]>("/api/reports");
export const getReport = (id: string) => request<ReportDetail>(`/api/reports/${id}`);
export const deleteReport = (id: string) => request<void>(`/api/reports/${id}`, { method: "DELETE" });

export const isOutOfRange = (flag: Flag) => flag === "low" || flag === "high" || flag === "abnormal";

// ---------- Phase 2: trends, explanations, doctor briefs ----------

export interface PersonSummary {
  key: string;
  name: string;
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
  person: PersonSummary;
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

const personPath = (key: string) => `/api/people/${encodeURIComponent(key)}`;

export const listPeople = () => request<PersonSummary[]>("/api/people");
export const getTrends = (key: string) => request<Trends>(`${personPath(key)}/trends`);

export const requestBrief = (key: string) =>
  request<Job<BriefContent>>(`${personPath(key)}/briefs`, { method: "POST" });
export const getBrief = (id: string) => request<Job<BriefContent>>(`/api/briefs/${id}`);

export const requestExplanation = (reportId: string, language: Language) =>
  request<Job<ReportExplanation>>(`/api/reports/${reportId}/explanations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });

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
