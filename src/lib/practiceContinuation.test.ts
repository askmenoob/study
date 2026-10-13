import { describe, expect, it } from "vitest";
import { practicePool, selectPracticeQuestions } from "./practice";
import { dailyMission } from "./adaptive";
import type { AttemptRecord, Topic } from "../types";
const topic: Topic = { id: "large", name: "Large", description: "", target: 80, questions: Array.from({length: 14}, (_, i) => ({id: `q${i}`, prompt: `Item ${i}`, options: ["A", "B", "C", "D"], answer: 0, explanation: "A"})) };
const record = (ids: string[], n: number): AttemptRecord => ({ id: `a${n}`, levelId: "d4", subjectId: "math", topicId: "large", correct: ids.length, total: ids.length, completedAt: `${new Date().toISOString().slice(0,10)}T12:${String(n).padStart(2,"0")}:00Z`, answers: ids.map(questionId => ({questionId, selected: 0, correct: true})) });
describe("continuing practice on the same day", () => {
  it("delivers short non-overlapping sets even after the daily goal is met", () => {
    const attempts: AttemptRecord[] = [];
    const seen: string[] = [];
    for (const [index, count] of [5, 5, 4].entries()) {
      const questions = selectPracticeQuestions(practicePool(topic, "d4", "math", attempts));
      expect(questions).toHaveLength(count);
      const ids = questions.map(q => q.id);
      expect(ids.some(id => seen.includes(id))).toBe(false);
      seen.push(...ids); attempts.push(record(ids,index));
    }
    expect(dailyMission(attempts)).toMatchObject({ questions: 14, sessions: 3, questionsGoalMet: true });
    const exhausted = practicePool(topic,"d4","math",attempts);
    expect(selectPracticeQuestions(exhausted)).toEqual([]);
    expect(selectPracticeQuestions(exhausted,"review")).toHaveLength(5);
  });
  it("cycles revision by last practice time instead of repeating the first five", () => {
    const attempts = [record(topic.questions.map(q=>q.id),0)];
    const first = selectPracticeQuestions(practicePool(topic,"d4","math",attempts),"review");
    attempts.push(record(first.map(q=>q.id),1));
    const next = selectPracticeQuestions(practicePool(topic,"d4","math",attempts),"review");
    expect(next).toHaveLength(5);
    expect(next.some(q=>first.some(previous=>q.id===previous.id))).toBe(false);
    expect(selectPracticeQuestions(practicePool(topic,"d5","math",attempts))).toHaveLength(5);
  });
});
