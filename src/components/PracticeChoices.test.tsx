import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PracticeChoices } from "./PracticeChoices";
import { practicePool } from "../lib/practice";
import { getArchivedTopics } from "../data/curriculum";
import type { AttemptRecord } from "../types";
const topic = getArchivedTopics("d4", "math").find(topic => topic.id === "number")!;
const html = (attempts: AttemptRecord[]) => renderToStaticMarkup(createElement(PracticeChoices, {
  pool: practicePool(topic, "d4", "math", attempts), onStart: () => {},
}));
it("offers unseen practice with the actual count", () => {
  expect(html([])).toContain("Sambung latihan · 3 soalan baharu");
  expect(html([])).not.toContain("Sambung ulang kaji");
});
it("shows exhaustion and explicit revision instead of offering a new session", () => {
  const markup = html([{ id: "1", levelId: "d4", subjectId: "math", topicId: topic.id, correct: 2, total: 3,
    completedAt: "2026-09-09T01:00:00Z", answers: topic.questions.map((q, i) => ({ questionId: q.id, selected: 0, correct: i > 0 })) }]);
  expect(markup).toContain("Tiada soalan baharu dalam set ini");
  expect(markup).toContain("Ulang soalan salah (1)");
  expect(markup).toContain("Sambung ulang kaji · 3 soalan");
  expect(markup).not.toContain("soalan baharu</button>");
});
it("explains why old records with missing question IDs cannot exclude questions reliably", () => {
  expect(html([{ id: "1", levelId: "d4", subjectId: "math", topicId: topic.id, correct: 3, total: 3, completedAt: "2026-09-09T01:00:00Z" }]))
    .toContain("Rekod lama tidak menyimpan ID soalan");
});
