import type { AttemptRecord, LevelId, QuestionHistoryEntry, Topic } from "../types";
import type { AttemptPayload } from "./api";

export const PRACTICE_SET_SIZE = 5;
export type PracticeMode = "new" | "incorrect" | "review";
const key = (entry: QuestionHistoryEntry) => JSON.stringify([entry.levelId, entry.subjectId, entry.topicId, entry.questionId]);

export function mergeQuestionHistory(attempts: AttemptRecord[], history: QuestionHistoryEntry[] = []): QuestionHistoryEntry[] {
  const latest = new Map<string, QuestionHistoryEntry>();
  const accept = (entry: QuestionHistoryEntry) => {
    if (!entry.questionId || typeof entry.correct !== "boolean" || !Number.isFinite(Date.parse(entry.completedAt))) return;
    const previous = latest.get(key(entry));
    if (!previous || Date.parse(entry.completedAt) > Date.parse(previous.completedAt)) latest.set(key(entry), entry);
  };
  // Server history resolves timestamp ties using persisted attempt IDs.
  history.forEach(accept);
  [...attempts].sort((a, b) => b.completedAt.localeCompare(a.completedAt) || b.id.localeCompare(a.id)).forEach(attempt => {
    if (!Array.isArray(attempt.answers)) return;
    [...attempt.answers].reverse().forEach(answer => {
      if (answer) accept({ levelId: attempt.levelId, subjectId: attempt.subjectId, topicId: attempt.topicId,
        questionId: answer.questionId, correct: answer.correct, completedAt: attempt.completedAt });
    });
  });
  return [...latest.values()];
}

export function includePendingHistory(history: QuestionHistoryEntry[], pending: AttemptPayload[], studentId: string, now = new Date().toISOString()) {
  const entries = pending.filter(attempt => attempt.studentId === studentId).flatMap(attempt =>
    attempt.answers.map(answer => ({ levelId: attempt.levelId, subjectId: attempt.subjectId, topicId: attempt.topicId,
      questionId: answer.questionId, correct: answer.correct, completedAt: attempt.completedAt ?? now })));
  return mergeQuestionHistory([], [...entries.reverse(), ...history]);
}

export function practicePool(topic: Topic, levelId: LevelId, subjectId: string, attempts: AttemptRecord[], history: QuestionHistoryEntry[] = []) {
  const origins = new Map(topic.questions.filter(q => q.originTopicId).map(q => [q.id,q.originTopicId]));
  const matches = mergeQuestionHistory(attempts, history).filter(entry =>
    entry.levelId === levelId && entry.subjectId === subjectId && (entry.topicId === topic.id || origins.get(entry.questionId) === entry.topicId));
  // Moving an unchanged question into a linked unit does not make it new again.
  const latest = new Map<string,QuestionHistoryEntry>();
  for (const entry of matches) {
    const prior = latest.get(entry.questionId);
    if (!prior || Date.parse(entry.completedAt) > Date.parse(prior.completedAt)) latest.set(entry.questionId,entry);
  }
  const unseen = topic.questions.filter(question => !latest.has(question.id));
  // Oldest practised first: repeated review sessions rotate through the bank.
  const byLastPractice = (a: Topic["questions"][number], b: Topic["questions"][number]) =>
    (Date.parse(latest.get(a.id)?.completedAt ?? "") || 0) - (Date.parse(latest.get(b.id)?.completedAt ?? "") || 0);
  const incorrect = topic.questions.filter(question => latest.get(question.id)?.correct === false).sort(byLastPractice);
  const hasLegacyHistory = attempts.some(attempt => attempt.levelId === levelId && attempt.subjectId === subjectId
    && attempt.topicId === topic.id && attempt.total > 0 && !attempt.answers?.length);
  return { total: topic.questions.length, answered: topic.questions.length - unseen.length, unseen, incorrect,
    review: [...topic.questions].sort(byLastPractice), hasLegacyHistory };
}
export type PracticePool = ReturnType<typeof practicePool>;
export function selectPracticeQuestions(pool: PracticePool, mode: PracticeMode = "new", maximum = PRACTICE_SET_SIZE) {
  return (mode === "new" ? pool.unseen : mode === "incorrect" ? pool.incorrect : pool.review).slice(0, Math.max(1,Math.min(40,maximum)));
}
