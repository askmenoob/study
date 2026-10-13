import { describe, expect, it } from "vitest";
import { overallAccuracy, subjectMastery, topicMastery, totalQuestions } from "./progress";
import type { AttemptRecord, Topic } from "../types";

const attempts: AttemptRecord[] = [
  { id: "1", levelId: "d4", subjectId: "math", topicId: "fraction", correct: 2, total: 3, completedAt: "2026-09-08T00:00:00Z" },
  { id: "2", levelId: "d4", subjectId: "math", topicId: "fraction", correct: 3, total: 3, completedAt: "2026-09-08T01:00:00Z" },
  { id: "3", levelId: "d4", subjectId: "bm", topicId: "grammar", correct: 1, total: 2, completedAt: "2026-09-08T02:00:00Z" },
];
const topic: Topic = { id: "fraction", name: "Pecahan", description: "", target: 80, questions: [] };

describe("progress engine", () => {
  it("calculates total questions", () => expect(totalQuestions(attempts)).toBe(8));
  it("calculates overall accuracy", () => expect(overallAccuracy(attempts)).toBe(75));
  it("calculates subject mastery", () => expect(subjectMastery(attempts, "d4", "math")).toBe(83));
  it("calculates topic mastery", () => expect(topicMastery(attempts, "d4", "math", topic)).toBe(83));
});
