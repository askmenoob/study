import type { ExamAnswer, ExamAttempt, ExamCatalogue, ExamMode } from "../../server/examContracts";
import { tokenStore } from "./api";

export class ExamApiError extends Error {
  constructor(public code: string, public status = 0) { super(code); this.name = "ExamApiError"; }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = tokenStore.get();
  if (!token) throw new ExamApiError("UNAUTHORIZED", 401);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api/exam${path}`, {
      method, signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    // A late response from another account or focus session must never enter this screen.
    if (token !== tokenStore.get()) throw new ExamApiError("AUTH_CHANGED", 401);
    if (!response.ok) throw new ExamApiError(result.error ?? `HTTP_${response.status}`, response.status);
    return result as T;
  } catch (error) {
    if (token !== tokenStore.get()) throw new ExamApiError("AUTH_CHANGED", 401);
    if (error instanceof DOMException && error.name === "AbortError") throw new ExamApiError("REQUEST_TIMEOUT");
    throw error;
  } finally { clearTimeout(timeout); }
}

export const examApi = {
  catalogue: (studentId: string) => request<ExamCatalogue>(`/papers?studentId=${encodeURIComponent(studentId)}`),
  get: (attemptId: string) => request<{ attempt: ExamAttempt }>(`/attempts/${encodeURIComponent(attemptId)}`),
  start: (input: { studentId: string; paperId: string; paperVersion: number; mode: ExamMode; clientAttemptId: string; retryOfAttemptId?: string }) =>
    request<{ attempt: ExamAttempt }>("/attempts", "POST", input),
  save: (attemptId: string, expectedRevision: number, answers: Record<string, ExamAnswer>) =>
    request<{ attempt: ExamAttempt }>(`/attempts/${encodeURIComponent(attemptId)}`, "PUT", { expectedRevision, answers }),
  check: (attemptId: string, expectedRevision: number, questionId: string, answer: ExamAnswer) =>
    request<{ attempt: ExamAttempt }>(`/attempts/${encodeURIComponent(attemptId)}/check`, "POST", { expectedRevision, questionId, answer }),
  submit: (attemptId: string, expectedRevision: number) =>
    request<{ attempt: ExamAttempt }>(`/attempts/${encodeURIComponent(attemptId)}/submit`, "POST", { expectedRevision }),
  selfMark: (attemptId: string, expectedRevision: number, marks: Record<string, Record<string, boolean>>) =>
    request<{ attempt: ExamAttempt }>(`/attempts/${encodeURIComponent(attemptId)}/self-mark`, "POST", { expectedRevision, marks }),
};

export function examErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    UNAUTHORIZED: "Sesi tidak lagi sah. Log masuk semula atau minta link belajar baharu.",
    AUTH_CHANGED: "Akaun atau sesi telah berubah. Buka semula latihan daripada profil yang aktif.",
    SESSION_ENDED: "Sesi belajar sudah tamat. Jawapan belum dihantar kekal sebagai draft pada device ini.",
    FOCUS_SESSION_NOT_FOUND: "Sesi belajar tidak lagi tersedia. Minta link belajar baharu.",
    PAPER_UNAVAILABLE: "Set ini belum tersedia untuk digunakan. Muat semula senarai set.",
    ATTEMPT_LIMIT_REACHED: "Terlalu banyak cubaan belum selesai. Sambung dan hantar cubaan sedia ada sebelum membuka set baharu.",
    RETRY_ALREADY_EXISTS: "Soalan alternatif untuk cubaan ini sudah dibuka. Sambung daripada Senarai set & cubaan.",
    REVISION_CONFLICT: "Rekod cloud telah berubah. Bandingkan jawapan sebelum memilih versi yang hendak digunakan.",
    ATTEMPT_SUBMITTED: "Cubaan ini sudah dihantar. Draft tempatan tidak boleh mengubah keputusan.",
    CHECKED_ANSWER_LOCKED: "Jawapan pertama yang sudah disemak tidak boleh diubah.",
    SIMULATION_NO_HINTS: "Jawapan dan nota hanya dibuka selepas simulation dihantar.",
    TIME_EXPIRED: "Masa simulation tamat. Hanya jawapan yang sudah disimpan di cloud boleh dikira.",
    REQUEST_KEY_CONFLICT: "Permintaan mula tidak sepadan. Muat semula senarai dan sambung cubaan yang tersedia.",
    REQUEST_TIMEOUT: "Server belum memberi jawapan. Draft dikekalkan; semak sambungan sebelum cuba semula.",
  };
  if (messages[code]) return messages[code];
  if (error instanceof ExamApiError && (error.status === 401 || error.status === 403)) return "Akses sesi ini tidak lagi dibenarkan. Log masuk semula atau minta link belajar baharu.";
  return "Belum dapat menghubungi server. Jawapan yang belum disync dikekalkan pada device ini jika simpanan tempatan tersedia.";
}
