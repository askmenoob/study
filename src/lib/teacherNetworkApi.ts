import { tokenStore } from "./api";
import type { TeacherLevelId } from "./teacherContentApi";

export type TeacherApplicationStatus = "pending" | "needs_info" | "approved" | "rejected" | "withdrawn";
export type TeacherApplication = {
  id: string; userId: string; email?: string; fullName: string; publicName: string; schoolName: string;
  state: string; district: string; positionTitle: string; academicYear: number; levelIds: TeacherLevelId[];
  subjectIds: string[]; identityAttested: boolean; termsAttested: boolean; status: TeacherApplicationStatus;
  reviewNote?: string; submittedAt: string; reviewedAt?: string;
  teacherStatus?: "active" | "suspended" | "revoked";
  tuitionAffiliation?: "imai" | "external";
};
export type TeacherApplicationInput = Omit<TeacherApplication, "id" | "userId" | "email" | "status" | "reviewNote" | "submittedAt" | "reviewedAt" | "teacherStatus">;
export type TeacherNetworkProfile = { id: string; publicName: string; status: "active" | "suspended" | "revoked"; tuitionAffiliation?: "imai" | "external"; schoolName: string; levelIds: TeacherLevelId[]; subjectIds: string[]; academicYear: number; email?: string };
export type TeacherClass = {
  id: string; teacherId: string; teacherPublicName: string; schoolName: string; name: string; academicYear: number;
  levelId: TeacherLevelId; subjectId: string; status: "active" | "archived"; codeHint?: string; joinCode?: string;
  activeStudents?: number; pendingStudents?: number;
};
export type TeacherEnrollment = {
  id: string; studentId: string; studentName: string; classId: string; className: string; teacherPublicName: string;
  schoolName: string; academicYear: number; levelId: TeacherLevelId; subjectId: string;
  status: "pending_teacher" | "active" | "declined" | "revoked"; parentApprovedAt?: string;
  teacherStatus: "active" | "suspended" | "revoked"; teacherAcceptedAt?: string; activatedAt?: string; replacesEnrollmentId?: string;
};
export type TuitionAdminSummary = {
  pendingApplications: number; needsInfoApplications: number;
  imaiTeachers: number; externalTeachers: number; suspendedTeachers: number;
  activeClasses: number; activeEnrollments: number; pendingEnrollments: number;
  problemFeedback: number;
};
export type StudentTuitionClass = {
  id: string; className: string; teacherPublicName: string; subjectId: string;
  status: "active" | "pending_teacher";
};
export type TuitionTeacher = {
  id: string; publicName: string; affiliation: "imai" | "external";
  levelIds: TeacherLevelId[]; subjectIds: string[];
  positionTitle: string; state: string;
  experienceYears?:number;qualifications?:string;
};
export type TeacherRosterItem = {
  enrollmentId: string; studentId: string; studentName: string; status: "active";
  activatedAt?: string; metricLabel: string;
};

export class TeacherNetworkApiError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); this.name = "TeacherNetworkApiError"; }
}

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const token = tokenStore.get();
  if (!token) throw new TeacherNetworkApiError("UNAUTHORIZED", 401);
  const headers = new Headers(init.headers); headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api${path}`, { ...init, headers, signal });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new TeacherNetworkApiError(body.error ?? `HTTP_${response.status}`, response.status);
  return body as T;
}

export const teacherNetworkApi = {
  getTuitionAdminSummary(signal?: AbortSignal) {
    return request<{ summary: TuitionAdminSummary }>("/admin/tuition/summary", {}, signal);
  },
  listStudentTuitionClasses(studentId: string, signal?: AbortSignal) {
    return request<{ classes: StudentTuitionClass[] }>(
      `/students/${encodeURIComponent(studentId)}/tuition-classes`, {}, signal);
  },
  listTuitionTeachers(filters: { levelId?: TeacherLevelId; subjectId?: string } = {}, signal?: AbortSignal) {
    const query = new URLSearchParams();
    if (filters.levelId) query.set("levelId", filters.levelId);
    if (filters.subjectId) query.set("subjectId", filters.subjectId);
    return request<{ teachers: TuitionTeacher[] }>(`/tuition/teachers${query.size ? `?${query}` : ""}`, {}, signal);
  },
  getTuitionTeacher(teacherId: string, signal?: AbortSignal) {
    return request<{ teacher: TuitionTeacher }>(`/tuition/teachers/${encodeURIComponent(teacherId)}`, {}, signal);
  },
  setTuitionAffiliation(teacherId: string, affiliation: "imai" | "external") {
    return request<{ teacher: { teacherId: string; affiliation: "imai" | "external" } }>(
      `/admin/teachers/${teacherId}/affiliation`, { method: "PATCH", body: JSON.stringify({ affiliation }) });
  },
  getApplication(signal?: AbortSignal) { return request<{ application: TeacherApplication | null }>("/teacher-application", {}, signal); },
  submitApplication(input: TeacherApplicationInput) { return request<{ application: TeacherApplication }>("/teacher-application", { method: "POST", body: JSON.stringify(input) }); },
  listApplications(status: TeacherApplicationStatus = "pending", signal?: AbortSignal) {
    return request<{ applications: TeacherApplication[] }>(`/admin/teacher-applications?${new URLSearchParams({ status })}`, {}, signal);
  },
  reviewApplication(id: string, decision: "approve" | "needs_info" | "reject", reviewNote?: string, schoolDisplayName?: string) {
    return request<{ application: TeacherApplication }>(`/admin/teacher-applications/${id}`, { method: "PATCH", body: JSON.stringify({ decision, ...(reviewNote ? { reviewNote } : {}), ...(schoolDisplayName ? { schoolDisplayName } : {}) }) });
  },
  setTeacherStatus(id: string, status: "active" | "suspended") {
    return request<{ teacher: { teacherId: string; status: string } }>(`/admin/teachers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
  getTeacherProfile(signal?: AbortSignal) { return request<{ teacher: TeacherNetworkProfile }>("/teacher/network-profile", {}, signal); },
  listClasses(signal?: AbortSignal) { return request<{ classes: TeacherClass[] }>("/teacher/classes", {}, signal); },
  createClass(input: { name: string; academicYear: number; levelId: TeacherLevelId; subjectId: string }) {
    return request<{ class: TeacherClass }>("/teacher/classes", { method: "POST", body: JSON.stringify(input) });
  },
  rotateCode(classId: string) { return request<{ joinCode: string; codeHint: string }>(`/teacher/classes/${classId}/rotate-code`, { method: "POST" }); },
  listTeacherEnrollments(signal?: AbortSignal) { return request<{ enrollments: TeacherEnrollment[] }>("/teacher/enrollments", {}, signal); },
  decideEnrollment(id: string, decision: "accept" | "decline") {
    return request<{ enrollment: TeacherEnrollment }>(`/teacher/enrollments/${id}`, { method: "PATCH", body: JSON.stringify({ decision }) });
  },
  getRoster(classId: string, signal?: AbortSignal) { return request<{ roster: TeacherRosterItem[] }>(`/teacher/classes/${classId}/roster`, {}, signal); },
  previewClass(studentId: string, joinCode: string) {
    return request<{ class: TeacherClass; student: { id: string; name: string }; currentEnrollment?: TeacherEnrollment }>(`/students/${studentId}/teacher-connections/preview`, { method: "POST", body: JSON.stringify({ joinCode }) });
  },
  joinClass(studentId: string, joinCode: string, clientRequestId: string, replaceEnrollmentId?: string) {
    return request<{ enrollment: TeacherEnrollment }>(`/students/${studentId}/teacher-connections`, { method: "POST", body: JSON.stringify({
      joinCode, clientRequestId, consentAttested: true, consentVersion: "teacher-class-v1",
      ...(replaceEnrollmentId ? { replaceEnrollmentId } : {}),
    }) });
  },
  listConnections(studentId: string, signal?: AbortSignal) { return request<{ enrollments: TeacherEnrollment[] }>(`/students/${studentId}/teacher-connections`, {}, signal); },
  leaveClass(studentId: string, connectionId: string) { return request<void>(`/students/${studentId}/teacher-connections/${connectionId}`, { method: "DELETE" }); },
};
