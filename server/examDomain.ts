import { z } from "zod";
import type { ExamAnswer, ExamAttempt, ExamAttemptSummary, ExamMode, ExamPaper, ExamPaperSummary, ExamPrivatePaper, ExamPrivateQuestion, ExamQuestion, ExamQuestionReview } from "./examContracts.js";
import { accessError } from "./familyAccess.js";

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/).refine(v => !["constructor", "prototype", "__proto__"].includes(v));
const text = z.string().trim().min(1).max(16000);
const marks = z.number().int().min(0).max(100);
const questionSchema = z.object({
  id, number: text, prompt: text, kind: z.enum(["choice", "numeric", "structured"]),
  options: z.array(z.object({ id, text }).strict()).min(2).max(8).optional(), unit: z.string().trim().min(1).max(40).optional(),
  skillId: id, skillName: text, autoMarks: marks.min(1), manualMarks: marks,
  key: z.object({ choiceId: id.optional(), numeric: z.number().finite().optional(), tolerance: z.number().min(0).max(1e-6).optional() }).strict(),
  solution: z.array(text).min(1).max(30), note: z.object({ id, title: text, body: text, example: text }).strict(),
  rubric: z.array(z.object({ id, description: text, marks: marks.min(1) }).strict()).max(20),
}).strict();
const paperSchema = z.object({
  id, version: z.number().int().positive(), title: text, exam: z.enum(["UASA", "SPM"]),
  levelIds: z.array(z.enum(["d4", "d5", "d6", "t4", "t5"])).min(1).max(3), subjectId: z.literal("math"),
  durationMinutes: z.number().int().min(1).max(240), scopeLabel: text,
  source: z.object({ kind: z.enum(["original", "past_exam", "trial", "school_exam"]), provider: text,
    year: z.number().int().min(2000).max(2100).nullable(), url: z.string().url().nullable(), rights: z.enum(["owned", "licensed", "unknown"]),
    rightsEvidence: z.string().nullable(), review: z.enum(["pending", "approved"]), reviewer: z.string().nullable(), reviewedAt: z.string().nullable(),
  }).strict(),
  questions: z.array(questionSchema.extend({ retry: questionSchema })).min(1).max(100),
}).strict();

export function validatePaper(input: unknown): input is ExamPrivatePaper {
  const parsed = paperSchema.safeParse(input);
  if (!parsed.success) return false;
  const p = parsed.data;
  const ids = new Set<string>();
  if (new Set(p.levelIds).size !== p.levelIds.length || p.levelIds.some(l => p.exam === "UASA" ? !l.startsWith("d") : !l.startsWith("t"))) return false;
  for (const primary of p.questions) {
    if (primary.retry.id === primary.id || primary.retry.prompt === primary.prompt || primary.retry.skillId !== primary.skillId || primary.retry.kind !== primary.kind) return false;
    for (const q of [primary, primary.retry]) {
      if (ids.has(q.id)) return false;
      ids.add(q.id);
      if (p.exam === "UASA" && q.kind === "choice") return false;
      if (q.kind === "choice") {
        if (!q.options || !q.key.choiceId || q.key.numeric !== undefined || q.key.tolerance !== undefined || q.unit) return false;
        if (new Set(q.options.map(o => o.id)).size !== q.options.length || new Set(q.options.map(o => o.text)).size !== q.options.length || !q.options.some(o => o.id === q.key.choiceId)) return false;
      } else if (q.key.numeric === undefined || q.key.choiceId !== undefined || q.options) return false;
      if (q.kind !== "structured" && (q.manualMarks !== 0 || q.rubric.length)) return false;
      if (new Set(q.rubric.map(r => r.id)).size !== q.rubric.length || q.rubric.reduce((sum, r) => sum + r.marks, 0) !== q.manualMarks) return false;
    }
  }
  return true;
}

export function publicationFor(paper: unknown, preview = false, now = Date.now()): "preview" | "published" | null {
  if (!validatePaper(paper)) return null;
  const s = paper.source;
  if (s.rights === "unknown" || !s.rightsEvidence?.trim()) return null;
  if (s.kind === "original") {
    if (s.rights !== "owned" || s.year !== null || s.url !== null) return null;
  } else {
    if (!s.year || !s.url || !/^https?:\/\//.test(s.url) || s.rights !== "licensed") return null;
    const url = new URL(s.url);
    if (url.username || url.password) return null;
  }
  if (s.review === "approved") {
    if (!s.reviewer?.trim() || !s.reviewedAt || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s.reviewedAt) || !Number.isFinite(Date.parse(s.reviewedAt))) return null;
    const reviewed = new Date(s.reviewedAt);
    if (reviewed.toISOString().slice(0, 10) !== s.reviewedAt.slice(0, 10)) return null;
    const malaysiaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    if (s.reviewedAt.length === 10 ? s.reviewedAt > malaysiaDate : reviewed.getTime() > now) return null;
    return "published";
  }
  // Pending preview is permitted only for owned original material, never imports.
  return preview && s.kind === "original" && s.reviewer === null && s.reviewedAt === null ? "preview" : null;
}

export type SnapshotQuestion = Omit<ExamPrivateQuestion, "retry"> & { retry?: Omit<ExamPrivateQuestion, "retry"> };
export interface ExamSnapshot {
  paper: Omit<ExamPrivatePaper, "questions"> & { questions: SnapshotQuestion[] };
  publication: "preview" | "published";
}
export interface ExamStoredAttempt {
  id: string; studentId: string; clientAttemptId: string; snapshot: ExamSnapshot; mode: ExamMode;
  status: "draft" | "submitted"; revision: number; startedAt: string; updatedAt: string; endsAt: string | null;
  submittedAt: string | null; retryOfAttemptId: string | null;
  state: { answers: Record<string, ExamAnswer>; checkedQuestionIds: string[]; selfMarks: Record<string, Record<string, boolean>> };
}
export function createSnapshot(paper: ExamPrivatePaper, preview: boolean): ExamSnapshot {
  const publication = publicationFor(paper, preview);
  if (!publication) throw accessError("PAPER_UNAVAILABLE", 404);
  return { paper: structuredClone(paper), publication };
}
export function publicQuestion(q: SnapshotQuestion): ExamQuestion {
  return { id: q.id, number: q.number, prompt: q.prompt, kind: q.kind, skillId: q.skillId, skillName: q.skillName,
    autoMarks: q.autoMarks, manualMarks: q.manualMarks, ...(q.options ? { options: q.options.map(o => ({ id: o.id, text: o.text })) } : {}), ...(q.unit ? { unit: q.unit } : {}) };
}
export function paperSummary(snapshot: ExamSnapshot): ExamPaperSummary {
  const p = snapshot.paper;
  return { id: p.id, version: p.version, title: p.title, exam: p.exam, levelIds: [...p.levelIds], subjectId: p.subjectId,
    durationMinutes: p.durationMinutes, scopeLabel: p.scopeLabel, source: { ...p.source }, publication: snapshot.publication,
    questionCount: p.questions.length, autoMarks: p.questions.reduce((n, q) => n + q.autoMarks, 0), manualMarks: p.questions.reduce((n, q) => n + q.manualMarks, 0) };
}
export function publicPaper(snapshot: ExamSnapshot): ExamPaper {
  return { ...paperSummary(snapshot), questions: snapshot.paper.questions.map(publicQuestion) };
}
export function parseNumeric(raw: string): number | null {
  const decimal = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const match = raw.trim().match(new RegExp(`^(${decimal})(?:\\s*\\/\\s*(${decimal}))?$`));
  if (!match) return null;
  const numerator = Number(match[1]), denominator = match[2] === undefined ? 1 : Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}
export function gradeQuestion(question: SnapshotQuestion, answer?: ExamAnswer): { correct: boolean; autoScore: number } {
  let correct = false;
  if (answer) {
    const unitMatches = (question.unit ?? "").normalize("NFKC").trim() === (answer.unit ?? "").normalize("NFKC").trim();
    if (question.kind === "choice") correct = answer.value === question.key.choiceId && unitMatches;
    else {
      const value = parseNumeric(answer.value);
      correct = value !== null && unitMatches && Math.abs(value - question.key.numeric!) <= (question.key.tolerance ?? 0);
    }
  }
  return { correct, autoScore: correct ? question.autoMarks : 0 };
}
export function makeAttempt(snapshot: ExamSnapshot, input: Pick<ExamStoredAttempt, "id" | "studentId" | "clientAttemptId" | "mode" | "retryOfAttemptId">, now: number): ExamStoredAttempt {
  const time = new Date(now).toISOString();
  return { ...input, snapshot, revision: 0, status: "draft", startedAt: time, updatedAt: time,
    endsAt: input.mode === "simulation" ? new Date(now + snapshot.paper.durationMinutes * 60000).toISOString() : null,
    submittedAt: null, state: { answers: {}, checkedQuestionIds: [], selfMarks: {} } };
}
export function reviewsFor(row: ExamStoredAttempt): ExamQuestionReview[] {
  const visible = row.status === "submitted" ? row.snapshot.paper.questions : row.mode === "guided" ? row.snapshot.paper.questions.filter(q => row.state.checkedQuestionIds.includes(q.id)) : [];
  return visible.map(q => {
    const selfMarks = Object.hasOwn(row.state.selfMarks, q.id) ? row.state.selfMarks[q.id] : {};
    const complete = q.rubric.every(r => Object.hasOwn(selfMarks, r.id));
    return { questionId: q.id, ...gradeQuestion(q, row.state.answers[q.id]), autoMarks: q.autoMarks, manualMarks: q.manualMarks,
      manualScore: q.manualMarks === 0 ? 0 : complete ? q.rubric.reduce((n, r) => n + (selfMarks[r.id] ? r.marks : 0), 0) : null,
      solution: [...q.solution], note: { ...q.note }, rubric: q.rubric.map(r => ({ ...r })), selfMarks: { ...selfMarks } };
  });
}
export function presentAttempt(row: ExamStoredAttempt): ExamAttempt {
  const paper = publicPaper(row.snapshot), reviews = reviewsFor(row);
  return { id: row.id, clientAttemptId: row.clientAttemptId, studentId: row.studentId, paper, mode: row.mode, status: row.status,
    revision: row.revision, startedAt: row.startedAt, updatedAt: row.updatedAt, endsAt: row.endsAt, submittedAt: row.submittedAt, retryOfAttemptId: row.retryOfAttemptId,
    answers: structuredClone(row.state.answers), checkedQuestionIds: [...row.state.checkedQuestionIds], reviews,
    autoScore: reviews.reduce((n, r) => n + r.autoScore, 0), autoMarks: paper.autoMarks,
    manualScore: reviews.reduce((n, r) => n + (r.manualScore ?? 0), 0), manualMarks: paper.manualMarks,
    needsSelfMark: reviews.some(r => r.manualMarks > 0 && r.manualScore === null) };
}
export function attemptSummary(row: ExamStoredAttempt): ExamAttemptSummary {
  const p = presentAttempt(row);
  return { id: p.id, paperId: p.paper.id, paperVersion: p.paper.version, title: p.paper.title, mode: p.mode, status: p.status,
    updatedAt: p.updatedAt, autoScore: p.autoScore, autoMarks: p.autoMarks, manualScore: p.manualScore, manualMarks: p.manualMarks,
    needsSelfMark: p.needsSelfMark, wrongCount: p.reviews.filter(r => !r.correct).length, retryOfAttemptId: p.retryOfAttemptId };
}
export type ExamMutation = { kind: "save"; expectedRevision: number; answers: Record<string, ExamAnswer> }
  | { kind: "check"; expectedRevision: number; questionId: string; answer: ExamAnswer }
  | { kind: "submit"; expectedRevision: number }
  | { kind: "self-mark"; expectedRevision: number; marks: Record<string, Record<string, boolean>> };
const answerEqual = (a?: ExamAnswer, b?: ExamAnswer) => Boolean(a && b && a.value === b.value && (a.unit ?? "") === (b.unit ?? "") && (a.working ?? "") === (b.working ?? ""));
export function mutateAttempt(row: ExamStoredAttempt, action: ExamMutation, now: number): ExamStoredAttempt {
  if (action.kind === "submit" && row.status === "submitted") return row;
  if (action.expectedRevision !== row.revision) throw accessError("REVISION_CONFLICT", 409);
  if (row.status === "submitted" && action.kind !== "self-mark") throw accessError("ATTEMPT_SUBMITTED", 409);
  if (row.status === "draft" && row.mode === "simulation" && row.endsAt && Date.parse(row.endsAt) <= now && action.kind !== "submit") throw accessError("TIME_EXPIRED", 409);
  if (row.mode === "simulation" && row.status === "draft" && (action.kind === "check" || action.kind === "self-mark")) throw accessError("SIMULATION_NO_HINTS", 409);
  const result = structuredClone(row), questions = row.snapshot.paper.questions;
  const question = (questionId: string) => { const q = questions.find(q => q.id === questionId); if (!q) throw accessError("INVALID_INPUT", 400); return q; };
  if (action.kind === "save") {
    Object.keys(action.answers).forEach(question);
    for (const checkedId of row.state.checkedQuestionIds) if (!answerEqual(row.state.answers[checkedId], action.answers[checkedId])) throw accessError("CHECKED_ANSWER_LOCKED", 409);
    result.state.answers = structuredClone(action.answers);
  } else if (action.kind === "check") {
    question(action.questionId);
    if (row.state.checkedQuestionIds.includes(action.questionId)) {
      if (!answerEqual(row.state.answers[action.questionId], action.answer)) throw accessError("CHECKED_ANSWER_LOCKED", 409);
      return row;
    }
    result.state.answers[action.questionId] = structuredClone(action.answer);
    result.state.checkedQuestionIds.push(action.questionId);
  } else if (action.kind === "submit") {
    result.status = "submitted"; result.submittedAt = new Date(now).toISOString();
  } else {
    const reviewIds = new Set(reviewsFor(row).map(r => r.questionId));
    for (const [qid, values] of Object.entries(action.marks)) {
      const q = question(qid);
      if (q.kind !== "structured" || !q.manualMarks || !reviewIds.has(qid) || Object.keys(values).some(id => !q.rubric.some(r => r.id === id))) throw accessError("INVALID_INPUT", 400);
      result.state.selfMarks[qid] = { ...(result.state.selfMarks[qid] ?? {}), ...values };
    }
  }
  result.revision++; result.updatedAt = new Date(now).toISOString();
  return result;
}
export function retrySnapshot(row: ExamStoredAttempt): ExamSnapshot {
  if (row.status !== "submitted") throw accessError("PAPER_UNAVAILABLE", 404);
  const wrong = new Set(reviewsFor(row).filter(r => !r.correct).map(r => r.questionId));
  const selected = row.snapshot.paper.questions.filter(q => wrong.has(q.id));
  if (!selected.length || selected.some(q => !q.retry)) throw accessError("PAPER_UNAVAILABLE", 404);
  const result = structuredClone(row.snapshot);
  result.paper.questions = selected.map(q => structuredClone(q.retry!));
  result.paper.title = `${row.snapshot.paper.title} — Cuba semula`;
  result.paper.scopeLabel = `Alternatif baharu untuk ${selected.length} soalan yang belum tepat. Sumber dan status semakan mengikut pack asal; bukan set peperiksaan penuh.`;
  return result;
}
