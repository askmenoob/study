import { practicePool } from "./practice";
import type { AttemptRecord, LevelId, Subject, Topic, QuestionHistoryEntry } from "../types";
import { topicMastery } from "./progress";

export type MasteryBand = "foundation" | "developing" | "proficient" | "mastered";
export interface RankedTopic { subject: Subject; topic: Topic; mastery: number; remaining: number; attempted: boolean; band: MasteryBand }
export interface StudyPlanItem { day: number; subject: Subject; topic: Topic; mastery: number; band: MasteryBand; minutes: number }

export function masteryBand(mastery: number, attempted = true): MasteryBand {
  if (!attempted || mastery < 40) return "foundation";
  if (mastery < 70) return "developing";
  if (mastery < 90) return "proficient";
  return "mastered";
}

export function rankTopics(attempts: AttemptRecord[], levelId: LevelId, subjects: Subject[], getTopicsFor: (levelId: LevelId, subjectId: string) => Topic[], history: QuestionHistoryEntry[] = []): RankedTopic[] {
  return subjects.flatMap((subject) => getTopicsFor(levelId, subject.id).map((topic) => {
    const attempted = attempts.some((a) => a.levelId === levelId && a.subjectId === subject.id && a.topicId === topic.id);
    const mastery = topicMastery(attempts, levelId, subject.id, topic);
    return { subject, topic, mastery, remaining: practicePool(topic, levelId, subject.id, attempts, history).unseen.length, attempted, band: masteryBand(mastery, attempted) };
  })).sort((a, b) => {
    if (a.attempted !== b.attempted) return a.attempted ? -1 : 1;
    return a.mastery - b.mastery;
  });
}

export function dailyMission(attempts: AttemptRecord[]) {
  const today = new Date().toISOString().slice(0, 10);
  const todayAttempts = attempts.filter((a) => a.completedAt.slice(0, 10) === today);
  const questions = todayAttempts.reduce((sum, a) => sum + a.total, 0);
  const correct = todayAttempts.reduce((sum, a) => sum + a.correct, 0);
  const accuracy = questions ? Math.round((correct / questions) * 100) : 0;
  const xp = questions * 10 + correct * 5;
  return { questions, accuracy, sessions: todayAttempts.length, xp, questionsGoalMet: questions >= 10, accuracyGoalMet: questions >= 5 && accuracy >= 80 };
}

export function diagnosticQuestions(subjects: Subject[], levelId: LevelId, getTopicsFor: (levelId: LevelId, subjectId: string) => Topic[], limit = 12, attempts: AttemptRecord[] = [], history: QuestionHistoryEntry[] = [], mode: "new" | "review" = "new") {
  const topicBuckets = subjects.flatMap((subject) => getTopicsFor(levelId, subject.id).map((topic) => ({ subject, topic, questions: mode === "new" ? practicePool(topic, levelId, subject.id, attempts, history).unseen : topic.questions })));
  const pool: Array<{ subject: Subject; topic: Topic; question: Topic["questions"][number] }> = [];
  let questionIndex = 0;
  while (pool.length < limit) {
    let added = false;
    for (const item of topicBuckets) {
      const question = item.questions[questionIndex];
      if (question) { pool.push({ ...item, question }); added = true; if (pool.length >= limit) break; }
    }
    if (!added) break;
    questionIndex += 1;
  }
  return pool;
}

export function buildStudyPlan(ranked: RankedTopic[], days = 7, minutes = 15): StudyPlanItem[] {
  const candidates = ranked.filter((item) => item.remaining > 0).slice(0, Math.max(0, days));
  return candidates.map((chosen, index) => ({ day: index + 1, subject: chosen.subject, topic: chosen.topic,
    mastery: chosen.mastery, band: chosen.band, minutes }));
}
