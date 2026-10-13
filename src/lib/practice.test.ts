import { describe, expect, it } from "vitest";
import { getArchivedTopics } from "../data/curriculum";
import { includePendingHistory, mergeQuestionHistory, practicePool, selectPracticeQuestions } from "./practice";
import type { AttemptRecord, QuestionHistoryEntry } from "../types";
import type { AttemptPayload } from "./api";

const topic = getArchivedTopics("d4", "math").find(t => t.id === "fraction")!;
const attempt = (ids: string[], correct = true, completedAt = "2026-09-09T01:00:00Z"): AttemptRecord => ({
  id: completedAt, levelId: "d4", subjectId: "math", topicId: topic.id, correct: correct ? ids.length : 0,
  total: ids.length, completedAt, answers: ids.map(questionId => ({ questionId, selected: 0, correct })),
});
describe("topic practice history", () => {
  it("starts with all questions for a new learner and leaves the authored bank unchanged", () => {
    const selected = selectPracticeQuestions(practicePool(topic, "d4", "math", []));
    expect(selected.map(q => q.id)).toEqual(["pm-f1", "pm-f2", "pm-f3"]);
    selected.pop();
    expect(topic.questions).toHaveLength(3);
  });
  it("skips an answered diagnostic question, whether its answer was right or wrong", () => {
    for (const correct of [true, false]) {
      const pool = practicePool(topic, "d4", "math", [attempt(["pm-f1"], correct)]);
      expect(selectPracticeQuestions(pool).map(q => q.id)).toEqual(["pm-f2", "pm-f3"]);
    }
  });
  it("requires explicit revision after the whole available set is answered", () => {
    const pool = practicePool(topic, "d4", "math", [attempt(["pm-f1", "pm-f2", "pm-f3"], false)]);
    expect(selectPracticeQuestions(pool)).toEqual([]);
    expect(selectPracticeQuestions(pool, "incorrect")).toHaveLength(3);
    expect(selectPracticeQuestions(pool, "review")).toHaveLength(3);
    expect(pool).toMatchObject({ total: 3, answered: 3 });
  });
  it("uses the latest result for wrong-answer review independently of history ordering", () => {
    const old = attempt(["pm-f1", "pm-f2"], false);
    const recent = attempt(["pm-f1"], true, "2026-09-09T02:00:00Z");
    for (const history of [[old, recent], [recent, old]]) {
      expect(practicePool(topic, "d4", "math", history).incorrect.map(q => q.id)).toEqual(["pm-f2"]);
    }
  });
  it("keeps subject, level and topic histories separate even when IDs match", () => {
    const done = attempt(["pm-f1"]);
    expect(practicePool(topic, "d5", "math", [done]).unseen).toHaveLength(3);
    expect(practicePool(topic, "d4", "science", [done]).unseen).toHaveLength(3);
    expect(practicePool({ ...topic, id: "other" }, "d4", "math", [done]).unseen).toHaveLength(3);
  });
  it("retains completion from the complete server history after reload without altering session totals", () => {
    const history = mergeQuestionHistory([attempt(["pm-f1", "pm-f2", "pm-f3"])]);
    const reloaded = JSON.parse(JSON.stringify(history)) as QuestionHistoryEntry[];
    expect(practicePool(topic, "d4", "math", [], reloaded).unseen).toEqual([]);
  });
  it("offers newly added IDs even when the previous bank is exhausted", () => {
    const expanded = { ...topic, questions: [...topic.questions, { ...topic.questions[0], id: "pm-f4" }] };
    expect(practicePool(expanded, "d4", "math", [attempt(["pm-f1", "pm-f2", "pm-f3"])]).unseen.map(q => q.id)).toEqual(["pm-f4"]);
  });
  it("does not invent per-question completion from legacy aggregate scores", () => {
    const legacy = { ...attempt(["pm-f1", "pm-f2", "pm-f3"]), answers: undefined };
    expect(practicePool(topic, "d4", "math", [legacy])).toMatchObject({ answered: 0, hasLegacyHistory: true });
  });
  it("does not create questions for an empty bank", () => {
    expect(selectPracticeQuestions(practicePool({ ...topic, questions: [] }, "d4", "math", []))).toEqual([]);
  });
  it("preserves unsynced work only for the selected student when hydrating", () => {
    const payload: AttemptPayload = { clientAttemptId: "pending", studentId: "a", levelId: "d4", subjectId: "math",
      topicId: topic.id, score: 0, total: 1, completedAt: "2026-09-09T02:00:00Z", answers: [{ questionId: "pm-f1", selected: 0, correct: false }] };
    const cloud = mergeQuestionHistory([attempt(["pm-f2"])]);
    const history = includePendingHistory(cloud, [payload], "a");
    expect(practicePool(topic, "d4", "math", [], history).unseen.map(q => q.id)).toEqual(["pm-f3"]);
    expect(practicePool(topic, "d4", "math", [], includePendingHistory(cloud, [payload], "b")).unseen.map(q => q.id)).toEqual(["pm-f1", "pm-f3"]);
    expect(cloud).toHaveLength(1);
  });
  it("preserves the server tie-break when a capped log and complete history have the same timestamp", () => {
    const cloud = mergeQuestionHistory([attempt(["pm-f1"], true)]);
    expect(practicePool(topic, "d4", "math", [attempt(["pm-f1"], false)], cloud).incorrect).toEqual([]);
  });
});
