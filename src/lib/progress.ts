import type { AttemptRecord, LevelId, Topic } from "../types";

export function topicMastery(attempts: AttemptRecord[], levelId: LevelId, subjectId: string, topic: Topic) {
  const matches = attempts.filter((a) => a.levelId === levelId && a.subjectId === subjectId && a.topicId === topic.id);
  if (!matches.length) return 0;
  const correct = matches.reduce((sum, item) => sum + item.correct, 0);
  const total = matches.reduce((sum, item) => sum + item.total, 0);
  return total ? Math.round((correct / total) * 100) : 0;
}

export function subjectMastery(attempts: AttemptRecord[], levelId: LevelId, subjectId: string) {
  const matches = attempts.filter((a) => a.levelId === levelId && a.subjectId === subjectId);
  if (!matches.length) return 0;
  const correct = matches.reduce((sum, item) => sum + item.correct, 0);
  const total = matches.reduce((sum, item) => sum + item.total, 0);
  return total ? Math.round((correct / total) * 100) : 0;
}

export function overallAccuracy(attempts: AttemptRecord[]) {
  const total = attempts.reduce((sum, item) => sum + item.total, 0);
  const correct = attempts.reduce((sum, item) => sum + item.correct, 0);
  return total ? Math.round((correct / total) * 100) : 0;
}

export function totalQuestions(attempts: AttemptRecord[]) {
  return attempts.reduce((sum, item) => sum + item.total, 0);
}

export function calculateStreak(attempts: AttemptRecord[]) {
  const days = [...new Set(attempts.map((a) => a.completedAt.slice(0, 10)))].sort().reverse();
  if (!days.length) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const day of days) {
    const expected = cursor.toISOString().slice(0, 10);
    if (day !== expected) {
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        if (day !== cursor.toISOString().slice(0, 10)) break;
      } else break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
