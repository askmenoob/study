import { describe, expect, it } from "vitest";
import { buildStudyPlan, dailyMission, diagnosticQuestions, masteryBand, rankTopics } from "./adaptive";
import type { Subject, Topic } from "../types";

const subjects: Subject[] = [{ id: "math", name: "Matematik", short: "M", stages: ["KSSR"] }];
const topics: Topic[] = [
  { id: "a", name: "A", description: "", target: 80, questions: [{ id: "q1", prompt: "?", options: ["1","2"], answer: 0, explanation: "" },{ id: "q3", prompt: "?", options: ["1","2"], answer: 0, explanation: "" }] },
  { id: "b", name: "B", description: "", target: 80, questions: [{ id: "q2", prompt: "?", options: ["1","2"], answer: 0, explanation: "" },{ id: "q4", prompt: "?", options: ["1","2"], answer: 0, explanation: "" }] },
];
const getTopics = () => topics;

describe("adaptive helpers", () => {
  it("ranks weakest attempted topic first", () => {
    const attempts = [
      { id:"1", levelId:"d4" as const, subjectId:"math", topicId:"a", correct:1, total:4, completedAt:new Date().toISOString() },
      { id:"2", levelId:"d4" as const, subjectId:"math", topicId:"b", correct:3, total:4, completedAt:new Date().toISOString() },
    ];
    expect(rankTopics(attempts, "d4", subjects, getTopics)[0].topic.id).toBe("a");
  });
  it("samples diagnostic questions across topic rounds", () => expect(diagnosticQuestions(subjects, "d4", getTopics, 4).map(x=>x.question.id)).toEqual(["q1","q2","q3","q4"]));
  it("labels mastery bands", () => { expect(masteryBand(20)).toBe("foundation"); expect(masteryBand(75)).toBe("proficient"); expect(masteryBand(95)).toBe("mastered"); });
  it("does not fill future sessions by recycling the same topic", () => expect(buildStudyPlan(rankTopics([], "d4", subjects, getTopics)).map(item => item.topic.id)).toEqual(["a", "b"]));
  it("computes daily mission", () => {
    const now = new Date().toISOString();
    const mission = dailyMission([{ id:"1", levelId:"d4", subjectId:"math", topicId:"a", correct:8, total:10, completedAt:now }]);
    expect(mission.questionsGoalMet).toBe(true); expect(mission.accuracyGoalMet).toBe(true); expect(mission.xp).toBe(140);
  });
});

const completed = (ids: string[]) => topics.map(topic => ({
  id: topic.id, levelId: "d4" as const, subjectId: "math", topicId: topic.id,
  correct: 0, total: ids.length, completedAt: "2026-09-09T00:00:00Z",
  answers: topic.questions.filter(q => ids.includes(q.id)).map(q => ({ questionId: q.id, selected: 1, correct: false })),
}));
it("diagnostic moves past previously answered questions", () => {
  expect(diagnosticQuestions(subjects, "d4", getTopics, 4, completed(["q1", "q2"])).map(item => item.question.id)).toEqual(["q3", "q4"]);
});
it("exhausted diagnostic does not silently recycle the bank", () => {
  expect(diagnosticQuestions(subjects, "d4", getTopics, 4, completed(["q1", "q2", "q3", "q4"]))).toEqual([]);
});

it("does not recommend exhausted topics even after wrong answers", () => {
  const ranked = rankTopics(completed(["q1", "q2", "q3", "q4"]), "d4", subjects, getTopics);
  expect(buildStudyPlan(ranked)).toEqual([]);
});
it("can finish unseen questions despite a perfect partial score", () => {
  const partial = completed(["q1"])[0]; partial.correct = 1; partial.total = 1; partial.answers[0].correct = true;
  expect(buildStudyPlan(rankTopics([partial], "d4", subjects, getTopics)).map(item => item.topic.id)).toContain("a");
});
