import type { ChallengeLeaderboard, ChallengeOverview, ChallengeParentReport, ChallengeSession } from "../../server/challengeContracts";
import { tokenStore } from "./api";

export class ChallengeApiError extends Error {
  constructor(public code: string, public status: number) { super(code); this.name = "ChallengeApiError"; }
}

export function challengeErrorMessage(error: unknown): string {
  if (error instanceof ChallengeApiError) {
    if (error.status === 401) return "Sesi log masuk telah berubah atau tamat. Kembali dan log masuk semula.";
    if (error.status === 403) return "Cabaran atau laporan ini tidak tersedia untuk profil ini.";
    if (error.status === 409) return "Kemajuan berubah di tempat lain. Kami akan semak kemajuan terkini.";
    if (error.status === 404) return "Cabaran ini tidak ditemui. Kembali dan buka semula subjek.";
    if (error.status === 429) return "Terlalu banyak permintaan. Tunggu sebentar sebelum cuba lagi.";
    if (error.status === 503 || error.code === "CHALLENGE_UNAVAILABLE" || error.code === "INSUFFICIENT_QUESTIONS") return "Set cabaran belum tersedia. Cuba lagi atau buka latihan topik.";
  }
  return "Sambungan terganggu. Simpanan belum dapat disahkan. Cuba lagi untuk semak dengan pelayan.";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  if (!token) throw new ChallengeApiError("UNAUTHORIZED", 401);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, init.method === "POST" ? 45000 : 15000);
  try {
    const response = await fetch(`/api/challenges${path}`, {
      ...init, signal: controller.signal,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}` },
    });
    if (tokenStore.get() !== token) throw new ChallengeApiError("AUTH_CHANGED", 401);
    const body = await response.json().catch(() => ({})) as T & { error?: string };
    if (tokenStore.get() !== token) throw new ChallengeApiError("AUTH_CHANGED", 401);
    if (!response.ok) throw new ChallengeApiError(body.error ?? `HTTP_${response.status}`, response.status);
    return body;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", abort);
  }
}

export interface ChallengeMutation { expectedRevision: number; index: number; requestId: string }
export const challengeApi = {
  overview: (studentId: string, signal?: AbortSignal) => request<ChallengeOverview>(`?${new URLSearchParams({ studentId })}`, { signal }),
  start: (input: { studentId: string; subjectId: string; requestId: string }, signal?: AbortSignal) => request<{ session: ChallengeSession }>("", { method: "POST", body: JSON.stringify(input), signal }),
  get: (id: string, signal?: AbortSignal) => request<{ session: ChallengeSession }>(`/${encodeURIComponent(id)}`, { signal }),
  answer: (id: string, input: ChallengeMutation & { selected: number }, signal?: AbortSignal) => request<{ session: ChallengeSession }>(`/${encodeURIComponent(id)}/answer`, { method: "POST", body: JSON.stringify(input), signal }),
  hint: (id: string, input: ChallengeMutation, signal?: AbortSignal) => request<{ session: ChallengeSession }>(`/${encodeURIComponent(id)}/hint`, { method: "POST", body: JSON.stringify(input), signal }),
  ranking: (studentId: string, subjectId: string, signal?: AbortSignal) => request<ChallengeLeaderboard>(`/ranking?${new URLSearchParams({ studentId, subjectId })}`, { signal }),
  report: (studentId: string, signal?: AbortSignal) => request<ChallengeParentReport>(`/report?${new URLSearchParams({ studentId })}`, { signal }),
};
