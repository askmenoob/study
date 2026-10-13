import type { ExamAnswer, ExamAttempt, ExamMode } from "../../server/examContracts";

const PREFIX = "imai-study:exam-draft:v1:";
export interface ExamDraft {
  schema: 1;
  accountKey: string;
  studentId: string;
  attemptId: string;
  paperId: string;
  paperVersion: number;
  title: string;
  mode: ExamMode;
  baseRevision: number;
  answers: Record<string, ExamAnswer>;
  savedAt: string;
}
type Result<T> = { value: T; error: boolean };
const accountPrefix = (accountKey: string) => `${PREFIX}${encodeURIComponent(accountKey)}:`;
export const examDraftKey = (accountKey: string, studentId: string, attemptId: string) =>
  `${accountPrefix(accountKey)}${encodeURIComponent(studentId)}:${encodeURIComponent(attemptId)}`;

function validAnswers(value: unknown): value is Record<string, ExamAnswer> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.entries(value).length <= 300 &&
    Object.entries(value).every(([key, item]) => key.length < 250 && item !== null && typeof item === "object" &&
      typeof item.value === "string" && item.value.length <= 10000 &&
      (item.unit === undefined || typeof item.unit === "string") &&
      (item.working === undefined || (typeof item.working === "string" && item.working.length <= 20000)));
}
function parseDraft(raw: string | null): ExamDraft | null {
  if (!raw) return null;
  const data = JSON.parse(raw) as Partial<ExamDraft>;
  if (data.schema !== 1 || ![data.accountKey, data.studentId, data.attemptId, data.paperId, data.title, data.savedAt].every(v => typeof v === "string") ||
    !Number.isInteger(data.paperVersion) || !Number.isInteger(data.baseRevision) || !validAnswers(data.answers) ||
    (data.mode !== "guided" && data.mode !== "simulation")) throw new Error("INVALID_DRAFT");
  return data as ExamDraft;
}
export function readExamDraft(accountKey: string, studentId: string, attemptId: string, storage?: Storage): Result<ExamDraft | null> {
  try {
    const draft = parseDraft((storage ?? localStorage).getItem(examDraftKey(accountKey, studentId, attemptId)));
    if (draft && (draft.accountKey !== accountKey || draft.studentId !== studentId || draft.attemptId !== attemptId)) return { value: null, error: true };
    return { value: draft, error: false };
  } catch { return { value: null, error: true }; }
}
export function makeExamDraft(accountKey: string, attempt: ExamAttempt, answers: Record<string, ExamAnswer>): ExamDraft {
  return { schema: 1, accountKey, studentId: attempt.studentId, attemptId: attempt.id, paperId: attempt.paper.id,
    paperVersion: attempt.paper.version, title: attempt.paper.title, mode: attempt.mode, baseRevision: attempt.revision,
    answers: Object.fromEntries(Object.entries(answers).map(([id, answer]) => [id, {
      value: answer.value, ...(answer.unit === undefined ? {} : { unit: answer.unit }), ...(answer.working === undefined ? {} : { working: answer.working }),
    }])), savedAt: new Date().toISOString() };
}
export function writeExamDraft(draft: ExamDraft, storage?: Storage): boolean {
  try { (storage ?? localStorage).setItem(examDraftKey(draft.accountKey, draft.studentId, draft.attemptId), JSON.stringify(draft)); return true; }
  catch { return false; }
}
export function removeExamDraft(accountKey: string, studentId: string, attemptId: string, storage?: Storage): boolean {
  try { (storage ?? localStorage).removeItem(examDraftKey(accountKey, studentId, attemptId)); return true; }
  catch { return false; }
}
export function listExamDrafts(accountKey: string, studentId: string, storage?: Storage): Result<ExamDraft[]> {
  const drafts: ExamDraft[] = [];
  let error = false;
  try {
    const target = storage ?? localStorage;
    const prefix = `${accountPrefix(accountKey)}${encodeURIComponent(studentId)}:`;
    for (let index = 0; index < target.length; index++) {
      const key = target.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const draft = parseDraft(target.getItem(key));
        if (draft?.accountKey === accountKey && draft.studentId === studentId && key === examDraftKey(accountKey, studentId, draft.attemptId)) drafts.push(draft);
        else error = true;
      } catch { error = true; }
    }
  } catch { error = true; }
  return { value: drafts.sort((a, b) => b.savedAt.localeCompare(a.savedAt)), error };
}
export function clearExamDrafts(accountKey: string, storage?: Storage): boolean {
  try {
    const target = storage ?? localStorage;
    const prefix = accountPrefix(accountKey);
    const keys: string[] = [];
    for (let i = 0; i < target.length; i++) { const key = target.key(i); if (key?.startsWith(prefix)) keys.push(key); }
    for (const key of keys) target.removeItem(key);
    return true;
  } catch { return false; }
}
export function examAnswersEqual(a: Record<string, ExamAnswer>, b: Record<string, ExamAnswer>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every(key => (a[key]?.value ?? "") === (b[key]?.value ?? "") &&
    (a[key]?.unit ?? "") === (b[key]?.unit ?? "") && (a[key]?.working ?? "") === (b[key]?.working ?? ""));
}
export function examTimeExpired(attempt: Pick<ExamAttempt, "endsAt" | "mode">, now = Date.now()): boolean {
  return attempt.mode === "simulation" && attempt.endsAt !== null && Date.parse(attempt.endsAt) <= now;
}
export function reconcileExamDraft(draft: ExamDraft | null, attempt: ExamAttempt, now = Date.now()): "saved" | "pending" | "conflict" {
  if (!draft) return "saved";
  if (draft.studentId !== attempt.studentId || draft.attemptId !== attempt.id || draft.paperId !== attempt.paper.id ||
    draft.paperVersion !== attempt.paper.version) return "conflict";
  if (examAnswersEqual(draft.answers, attempt.answers)) return "saved";
  if (draft.baseRevision !== attempt.revision || attempt.status !== "draft" || examTimeExpired(attempt, now)) return "conflict";
  return "pending";
}
export function mergeEditableExamAnswers(draft: ExamDraft, attempt: ExamAttempt, now = Date.now()): Record<string, ExamAnswer> {
  if (attempt.status !== "draft" || examTimeExpired(attempt, now) || draft.studentId !== attempt.studentId ||
    draft.attemptId !== attempt.id || draft.paperId !== attempt.paper.id || draft.paperVersion !== attempt.paper.version) return attempt.answers;
  const answers = { ...attempt.answers };
  const checked = new Set(attempt.checkedQuestionIds);
  for (const question of attempt.paper.questions) {
    if (!checked.has(question.id) && Object.hasOwn(draft.answers, question.id)) answers[question.id] = draft.answers[question.id];
  }
  return answers;
}
