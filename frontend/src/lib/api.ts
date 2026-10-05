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
  created_at: string;
}

export interface ReportDetail extends ReportSummary {
  patient_age: string | null;
  patient_sex: string | null;
  results: TestResult[];
  out_of_range: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed (${response.status})`);
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
