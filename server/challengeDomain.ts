import { createHash } from "node:crypto";
import type { ChallengeGenerationResult, ChallengeHistory, ChallengeSession } from "./challengeContracts.js";
import { accessError } from "./familyAccess.js";
import { validPictureSupport } from "./library/earlyLearning.js";

export interface ChallengeState {
  answers: Array<{ selected: number; correct: boolean; hintUsed: boolean; points: number; answeredAt: string } | null>;
  hints: boolean[];
}
export interface StoredChallenge {
  id: string; studentId: string; levelId: string; subjectId: string; stage: number;
  snapshot: ChallengeGenerationResult; state: ChallengeState; revision: number;
  status: "active" | "completed"; createdAt: string; completedAt: string | null;
}
export type ChallengeMutation = { kind: "answer"; index: number; selected: number; expectedRevision: number; requestId: string }
  | { kind: "hint"; index: number; expectedRevision: number; requestId: string };
export function validateSnapshot(snapshot: ChallengeGenerationResult) {
  if (!snapshot || !Array.isArray(snapshot.questions) || (snapshot.questions.length < 1 || snapshot.questions.length > 40) || !Array.isArray(snapshot.notices) || snapshot.notices.some(n => typeof n !== "string")) throw accessError("CHALLENGE_CONTENT_INVALID", 503);
  const ids = new Set<string>(), fingerprints = new Set<string>(), prompts = new Set<string>();
  for (const q of snapshot.questions) {
    if (q?.support !== undefined && !validPictureSupport(q.support)) throw accessError("CHALLENGE_CONTENT_INVALID",503);
    const prompt = typeof q?.prompt === "string" ? q.prompt.normalize("NFKC").toLocaleLowerCase("ms").replace(/\s+/gu," ").trim() : "";
    if (!q || [q.id,q.fingerprint,q.conceptId,q.topicId,q.topicName,q.prompt,q.explanation,q.hint].some(v => typeof v !== "string" || !v.trim()) || ids.has(q.id) || fingerprints.has(q.fingerprint) || prompts.has(prompt)
      || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(v => typeof v !== "string" || !v.trim() || v.length > 2000) || new Set(q.options).size !== q.options.length
      || q.prompt.length > 10000 || q.explanation.length > 4000 || q.hint.length > 1500
      || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length || ![1,2,3].includes(q.difficulty) || !["bank","template","ai-reviewed"].includes(q.source)
      || (q.resourceIds !== undefined && (!Array.isArray(q.resourceIds) || q.resourceIds.some(id => typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(id))))
      || !["review","current","strengthen","challenge"].includes(q.phase) || typeof q.repeat !== "boolean") throw accessError("CHALLENGE_CONTENT_INVALID", 503);
    ids.add(q.id); fingerprints.add(q.fingerprint); prompts.add(prompt);
  }
}
export function rankingCredit(history: ChallengeHistory | undefined, correct: boolean, hint: boolean) {
  if (!correct || history?.rankingAwarded || (history?.correct ?? 0) > 0) return 0;
  return (history?.answered ?? 0) > 0 ? (hint ? 2 : 5) : (hint ? 5 : 10);
}
export function presentChallenge(row: StoredChallenge): ChallengeSession {
  const answered = row.state.answers.filter(a => a !== null), correct = answered.filter(a => a.correct).length;
  const total = row.snapshot.questions.length, accuracy = correct / total * 100, passed = accuracy >= 80;
  return { id: row.id, studentId: row.studentId, levelId: row.levelId, subjectId: row.subjectId, stage: row.stage,
    status: row.status, revision: row.revision, total, answeredCount: answered.length, correctCount: correct,
    hintCount: row.state.hints.filter(Boolean).length, createdAt: row.createdAt, ...(row.completedAt ? { completedAt: row.completedAt } : {}), notices: row.snapshot.notices,
    questions: row.snapshot.questions.map((q,index) => { const a = row.state.answers[index]; return {
      id: q.id, topicId: q.topicId, topicName: q.topicName, prompt: q.prompt, options: q.options, difficulty: q.difficulty, source: q.source, ...(q.resourceIds ? { resourceIds: q.resourceIds } : {}), phase: q.phase, repeat: q.repeat,
      ...(q.support ? { support: q.support } : {}), ...(row.state.hints[index] ? { hint: q.hint } : {}), ...(a ? { feedback: { selected: a.selected, correct: a.correct, answer: q.answer, explanation: q.explanation, hintUsed: a.hintUsed } } : {}),
    }; }),
    ...(row.status === "completed" ? { result: { accuracy, passed, nextStage: row.stage + (passed ? 1 : 0), rankingPoints: answered.reduce((sum,a) => sum + a.points,0) } } : {}),
  };
}
export function mutateChallenge(row: StoredChallenge, mutation: ChallengeMutation, history: ChallengeHistory | undefined, now: number): StoredChallenge {
  if (mutation.expectedRevision !== row.revision) throw accessError("REVISION_CONFLICT", 409);
  if (row.status !== "active") throw accessError("CHALLENGE_COMPLETED", 409);
  if (!Number.isInteger(mutation.index) || mutation.index < 0 || mutation.index >= row.snapshot.questions.length) throw accessError("INVALID_INPUT", 400);
  if (row.state.answers[mutation.index]) throw accessError("ANSWER_LOCKED", 409);
  const next = structuredClone(row), q = row.snapshot.questions[mutation.index];
  if (mutation.kind === "hint") {
    if (next.state.hints[mutation.index]) return row;
    next.state.hints[mutation.index] = true;
  } else {
    if (mutation.index !== row.state.answers.findIndex(a => a === null)) throw accessError("INDEX_OUT_OF_ORDER", 409);
    if (!Number.isInteger(mutation.selected) || mutation.selected < 0 || mutation.selected >= q.options.length) throw accessError("INVALID_INPUT", 400);
    const correct = mutation.selected === q.answer, hintUsed = next.state.hints[mutation.index];
    next.state.answers[mutation.index] = { selected: mutation.selected, correct, hintUsed, points: rankingCredit(history,correct,hintUsed), answeredAt: new Date(now).toISOString() };
    if (next.state.answers.every(Boolean)) { next.status = "completed"; next.completedAt = new Date(now).toISOString(); }
  }
  next.revision++;
  return next;
}
export function malaysiaWeek(now: number) {
  const offset = 8 * 3600000, local = new Date(now + offset);
  const day = Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate());
  const start = day - ((local.getUTCDay() + 6) % 7) * 86400000 - offset;
  return { weekStart: new Date(start).toISOString(), weekEnd: new Date(start + 7 * 86400000).toISOString() };
}
export const rankingAlias = (studentId: string, weekStart: string) => `Pelajar-${createHash("sha256").update(`${weekStart}:${studentId}`).digest("hex").slice(0,12).toUpperCase()}`;
