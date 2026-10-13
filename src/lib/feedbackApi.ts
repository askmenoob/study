import { tokenStore } from "./api";

export type FeedbackCategory = "suggestion" | "problem" | "other";

export type FeedbackReceipt = {
  id: string;
  referenceId: string;
};

export type AdminFeedbackTriage = {
  id: string; referenceId: string; message: string; createdAt: string;
  status: "open" | "in_review" | "resolved"; version: number;
  note: string | null; reviewedAt: string | null;
};
export type AdminFeedback = FeedbackReceipt & {
  category: FeedbackCategory;
  message: string;
  pagePath?: string | null;
  allowReply: boolean;
  parentEmail: string;
  parentDisplayName: string;
  createdAt: string;
};

export type AdminUserSummary = {
  email: string;
  role: "parent" | "teacher" | "super_admin";
  createdAt: string;
};

export type AdminUserPage = {
  users: AdminUserSummary[];
  total: number;
  nextCursor: string | null;
};

export type SubmitFeedbackInput = {
  clientRequestId: string;
  category: FeedbackCategory;
  message: string;
  pagePath?: string;
  allowReply: boolean;
};

export class FeedbackApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = "FeedbackApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const token = tokenStore.get();
  if (!token) throw new FeedbackApiError("UNAUTHORIZED", 401);

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) abortFromCaller();
    else signal.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), 15000);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  try {
    const response = await fetch(`/api${path}`, { ...init, headers, signal: controller.signal });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (tokenStore.get() !== token) throw new FeedbackApiError("AUTH_CHANGED", 401);
    if (!response.ok) throw new FeedbackApiError(body.error ?? `HTTP_${response.status}`, response.status);
    return body as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export const feedbackApi = {
  submit(input: SubmitFeedbackInput) {
    return request<{ feedback: FeedbackReceipt }>("/feedback", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  listFeedbackTriage(status?: AdminFeedbackTriage["status"], signal?: AbortSignal) {
    const suffix = status ? `?status=${status}` : "";
    return request<{ feedback: AdminFeedbackTriage[] }>(`/admin/feedback-triage${suffix}`,{},signal);
  },
  reviewProblem(id: string, status: AdminFeedbackTriage["status"], expectedVersion: number, note?: string) {
    return request<{ feedback: AdminFeedbackTriage }>(`/admin/feedback-triage/${encodeURIComponent(id)}`,{
      method:"PATCH",body:JSON.stringify({ status, expectedVersion, ...(note ? { note } : {}) }),
    });
  },
  listAdmin(signal?: AbortSignal) {
    return request<{ feedback: AdminFeedback[] }>("/admin/feedback", {}, signal);
  },
  listAdminUsers(limit = 25, cursor?: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    return request<AdminUserPage>(`/admin/users?${query}`, {}, signal);
  },
};
