import type { TutorResponse, QuestionHistoryEntry } from "../types";
import { AiSpeechError } from "./speechAvailability";

const TOKEN_KEY = "imai-study-token-v1";
const browserSessionStorage = () => typeof sessionStorage === "undefined" ? null : sessionStorage;
const browserLocalStorage = () => typeof localStorage === "undefined" ? null : localStorage;

export type AccountRole = "parent" | "teacher" | "super_admin";
export type AccountUser = { id: string; email?: string; displayName?: string; display_name?: string; plan: string; role: AccountRole | "student"; roles?: AccountRole[]; studentId?: string; focusSessionId?: string };
export type CloudStudent = { id: string; name: string; level_id: string; created_at?: string };
export type CloudAttempt = {
  id: string; level_id: string; subject_id: string; topic_id: string;
  score: number; total: number; answers: unknown[]; created_at: string;
};

export const tokenStore = {
  get: () => browserSessionStorage()?.getItem(TOKEN_KEY) ?? browserLocalStorage()?.getItem(TOKEN_KEY) ?? null,
  getFocusSessionId: () => browserSessionStorage()?.getItem("imai-study-focus-session-id") ?? null,
  setFocusSessionId: (id: string) => browserSessionStorage()?.setItem("imai-study-focus-session-id", id),
  set: (token: string, persistent = false) => {
    const session = browserSessionStorage();
    const local = browserLocalStorage();
    session?.removeItem(TOKEN_KEY);
    local?.removeItem(TOKEN_KEY);
    session?.removeItem("imai-study-focus-session-id");
    (persistent ? local : session)?.setItem(TOKEN_KEY, token);
  },
  clear: () => {
    browserSessionStorage()?.removeItem(TOKEN_KEY);
    browserLocalStorage()?.removeItem(TOKEN_KEY);
    browserSessionStorage()?.removeItem("imai-study-focus-session-id");
  },
};

async function api<T>(path: string, init: RequestInit = {}, options: { anonymous?: boolean; timeoutMs?: number } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  const token = options.anonymous ? null : tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const controller = options.timeoutMs ? new AbortController() : null;
  const abortFromCaller = () => controller?.abort(init.signal?.reason);
  if (controller && init.signal) {
    if (init.signal.aborted) abortFromCaller();
    else init.signal.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timeout = controller ? setTimeout(() => controller.abort(), options.timeoutMs) : null;
  try {
    const res = await fetch(`/api${path}`, { ...init, headers, ...(controller ? { signal: controller.signal } : {}) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(res.status === 401 && (path === "/focus-session" || path === "/focus-session/exit-request" || path === "/me") ? "UNAUTHORIZED" : body.error ?? `HTTP_${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return await res.json() as T;
  } finally {
    if (timeout !== null) clearTimeout(timeout);
    if (controller) init.signal?.removeEventListener("abort", abortFromCaller);
  }
}
export async function registerAccount(email: string, password: string, displayName: string) {
  const result = await api<{ token: string; user: AccountUser }>("/auth/register", {
    method: "POST", body: JSON.stringify({ email, password, displayName }),
  });
  tokenStore.set(result.token); return result.user;
}

export async function loginAccount(email: string, password: string, rememberMe = false) {
  const result = await api<{ token: string; user: AccountUser }>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  tokenStore.set(result.token, rememberMe); return result.user;
}

export async function switchAccountRole(role: "parent" | "teacher") {
  const result = await api<{ token: string; user: AccountUser }>("/auth/switch-role", {
    method: "POST", body: JSON.stringify({ role }),
  });
  tokenStore.set(result.token, Boolean(browserLocalStorage()?.getItem(TOKEN_KEY)));
  return result.user;
}

export async function getMe() {
  return api<{ user: AccountUser }>("/me", {}, { timeoutMs: 15000 });
}
export async function getStudents() {
  return api<{ students: CloudStudent[] }>("/students", {}, { timeoutMs: 15000 });
}
export async function createStudent(name: string, levelId: string) {
  return api<{ student: CloudStudent }>("/students", {
    method: "POST", body: JSON.stringify({ name, levelId }),
  });
}
export async function updateStudent(id: string, name: string, levelId: string) {
  return api<{ student: CloudStudent }>(`/students/${id}`, {
    method: "PATCH", body: JSON.stringify({ name, levelId }),
  });
}
export async function getAttempts(studentId: string) {
  return api<{ attempts: CloudAttempt[]; questionHistory?: QuestionHistoryEntry[] }>(`/students/${studentId}/attempts`, {}, { timeoutMs: 15000 });
}

export type AttemptPayload = {
  clientAttemptId: string;
  completedAt?: string;
  studentId: string; levelId: string; subjectId: string; topicId: string;
  score: number; total: number;
  answers: { questionId: string; selected: number; correct: boolean }[];
};
export async function saveAttemptCloud(input: AttemptPayload) {
  return api<{ attempt: unknown }>("/attempts", { method: "POST", body: JSON.stringify(input) }, { timeoutMs: 15000 });
}

export async function askTutorCloud(input: {
  studentId: string; levelId: string; subjectId?: string; topicId?: string;
  conversationId: string; resourceId?: string; message: string;
}, signal?: AbortSignal) {
  return api<TutorResponse>("/tutor", {
    method: "POST", body: JSON.stringify(input), signal,
  }, { timeoutMs: 45000 });
}

export async function getCloudProgress(studentId: string) {
  return api<{ summary: { sessions: number; correct: number; total: number }; topics: unknown[] }>(
    `/students/${studentId}/progress`,
  );
}

export async function deleteAccount() { return api<void>("/me", { method: "DELETE" }); }

export async function getAiSpeech(input: { text: string; language: "ms"|"en"; style?: "lesson"|"reading" }, signal?: AbortSignal) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch("/api/tts", {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const retry = Number(res.headers.get("Retry-After") ?? body.retryAfterSeconds);
    throw new AiSpeechError(body.error ?? `HTTP_${res.status}`, res.status, Number.isFinite(retry) && retry > 0 ? retry : undefined);
  }
  return {
    blob: await res.blob(),
    model: res.headers.get("X-IMAI-AI-Model") ?? "AI TTS",
    voice: res.headers.get("X-IMAI-AI-Voice") ?? "AI voice",
    cache: res.headers.get("X-IMAI-AI-Cache") ?? "unknown",
  };
}

export async function startStudentSession(studentId: string) {
  const result = await api<{ token: string; user: AccountUser }>("/auth/student-session", {
    method: "POST", body: JSON.stringify({ studentId }),
  });
  tokenStore.set(result.token);
  return result.user;
}

export async function deleteStudent(id: string) {
  return api<void>(`/students/${id}`, { method: "DELETE" });
}

// Parent links carry no parent credentials. The code appears only at creation.
export type StudyLink = { id: string; expiresAt: string; createdAt?: string; redeemedAt?: string | null; revokedAt?: string | null };
export type FocusSession = { id: string; status: "active" | "exit_requested" | "approved" | "revoked" | "expired"; endsAt: string; createdAt?: string; exitRequestedAt?: string | null };
export type RedeemedStudyLink = { token: string; user: AccountUser; session: FocusSession };
const sessionRequest = { timeoutMs: 12000 };
export function createStudyLink(studentId: string, durationMinutes: number) {
  return api<{ link: StudyLink; code: string }>(`/students/${studentId}/study-links`, { method: "POST", body: JSON.stringify({ durationMinutes }) }, sessionRequest);
}
export function getStudyLinks(studentId: string) {
  return api<{ links: StudyLink[] }>(`/students/${studentId}/study-links`, {}, sessionRequest);
}
export function revokeStudyLink(studentId: string, linkId: string) {
  return api<void>(`/students/${studentId}/study-links/${linkId}`, { method: "DELETE" }, sessionRequest);
}
export function redeemStudyLink(code: string) {
  return api<RedeemedStudyLink>("/auth/redeem-study-link", { method: "POST", body: JSON.stringify({ code }) }, { ...sessionRequest, anonymous: true });
}
export function getFocusSession() {
  return api<{ session: FocusSession }>("/focus-session", {}, sessionRequest);
}
export function requestFocusExit() {
  return api<{ session: FocusSession }>("/focus-session/exit-request", { method: "POST" }, sessionRequest);
}
export function getStudentFocusSessions(studentId: string) {
  return api<{ sessions: FocusSession[] }>(`/students/${studentId}/focus-sessions`, {}, sessionRequest);
}
export function approveFocusExit(studentId: string, sessionId: string) {
  return api<{ session: FocusSession }>(`/students/${studentId}/focus-sessions/${sessionId}/approve-exit`, { method: "POST" }, sessionRequest);
}
