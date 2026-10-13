import { tokenStore } from "./api";

export type TeacherLevelId = "d1" | "d2" | "d3" | "d4" | "d5" | "d6";
export type TeacherMaterialStatus = "pending" | "published" | "rejected" | "withdrawn";
export type TeacherMaterialReviewFilter = TeacherMaterialStatus | "unreviewed";
export type TeacherMaterial = {
  id: string;
  classId?: string;
  className?: string;
  schoolName?: string;
  clientRequestId?: string;
  teacherId?: string;
  teacherName?: string;
  teacherEmail?: string;
  levelId: TeacherLevelId;
  subjectId: string;
  kind: "note" | "reading";
  title: string;
  summary: string;
  body: string;
  rightsAttested?: true;
  privacyAttested?: true;
  status?: TeacherMaterialStatus;
  publicationSource?: "admin_review" | "verified_teacher_auto";
  reviewNote?: string;
  createdAt?: string;
  reviewedAt?: string;
  publishedAt?: string;
};
export type TeacherSummary = { id: string; email: string; displayName: string; levelIds: TeacherLevelId[] };
export type SubmitTeacherMaterial = {
  clientRequestId: string;
  classId: string;
  levelId: TeacherLevelId;
  subjectId: string;
  kind: "note" | "reading";
  title: string;
  summary: string;
  body: string;
  rightsAttested: true;
  privacyAttested: true;
};

export class TeacherContentApiError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
    this.name = "TeacherContentApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const token = tokenStore.get();
  if (!token) throw new TeacherContentApiError("UNAUTHORIZED", 401);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api${path}`, { ...init, headers, signal: controller.signal });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (tokenStore.get() !== token) throw new TeacherContentApiError("AUTH_CHANGED", 401);
    if (!response.ok) throw new TeacherContentApiError(body.error ?? `HTTP_${response.status}`, response.status);
    return body as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export const teacherContentApi = {
  getTeacherProfile(signal?: AbortSignal) {
    return request<{ teacher: TeacherSummary }>("/teacher/profile", {}, signal);
  },
  listOwn(signal?: AbortSignal) {
    return request<{ materials: TeacherMaterial[] }>("/teacher/materials", {}, signal);
  },
  submit(input: SubmitTeacherMaterial) {
    return request<{ material: TeacherMaterial }>("/teacher/materials", { method: "POST", body: JSON.stringify(input) });
  },
  assignTeacher(email: string, levelIds: TeacherLevelId[]) {
    return request<{ teacher: TeacherSummary }>("/admin/teachers/assignment", { method: "PUT", body: JSON.stringify({ email, levelIds }) });
  },
  listTeachers(signal?: AbortSignal) {
    return request<{ teachers: TeacherSummary[] }>("/admin/teachers", {}, signal);
  },
  listForReview(status?: TeacherMaterialReviewFilter, signal?: AbortSignal) {
    const query = status ? `?${new URLSearchParams({ status })}` : "";
    return request<{ materials: TeacherMaterial[] }>(`/admin/teacher-materials${query}`, {}, signal);
  },
  review(id: string, decision: "approve" | "reject" | "withdraw", reviewNote?: string) {
    return request<{ material: TeacherMaterial }>(`/admin/teacher-materials/${id}`, {
      method: "PATCH", body: JSON.stringify({ decision, ...(reviewNote ? { reviewNote } : {}) }),
    });
  },
  listForStudent(studentId: string, signal?: AbortSignal) {
    return request<{ materials: TeacherMaterial[] }>(`/students/${studentId}/teacher-materials`, {}, signal);
  },
};
