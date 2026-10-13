import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { levels, getSubjectsForLevel, getTopics } from "../data/curriculum";
import { libraryUnits } from "../../server/library/catalog";
import { LearningLibrary } from "./LearningLibrary";
import { UnitQuestionCard } from "./UnitQuestionCard";
import { ChallengeQuestionCard } from "./ChallengeJourney";

it("shows voice controls only in D1 and D2 across Library, topic answers and challenges", () => {
  for (const level of levels) {
    const enabled = ["d1", "d2"].includes(level.id);
    const unit = libraryUnits.find(u => u.levelId === level.id && u.subjectId === "bm")!;
    const question = getTopics(level.id, "bm").find(t => t.unitId === unit.id)!.questions[0];
    const props = { levelId: level.id, question, onSelect: () => {}, onNext: () => {}, last: false, language: "ms" };
    for (const selected of [null, question.answer]) {
      const html = renderToStaticMarkup(createElement(UnitQuestionCard, { ...props, selected }));
      expect(html.includes("Dengar soalan dan pilihan"), level.id).toBe(enabled);
      expect(html.includes("Dengar pilihan A"), level.id).toBe(enabled);
      expect(html).toContain(question.options[0]);
      if (selected !== null) expect(html.includes("Dengar penerangan"), level.id).toBe(enabled);
    }
    const challenge = renderToStaticMarkup(createElement(ChallengeQuestionCard, {
      levelId: level.id, question: { id: "qa", topicId: "qa", topicName: "Bacaan", prompt: "Soalan", options: ["A","B","C","D"], difficulty: 1, source: "bank", phase: "review", repeat: false, hint: "Petunjuk teks", feedback: { selected: 0, answer: 0, correct: true, explanation: "Penerangan teks", hintUsed: true } },
      index: 0, total: 40, selected: 0, disabled: false, onSelect: () => {}, onAnswer: () => {}, onHint: () => {}, onNext: () => {},
    }));
    expect(challenge.includes("Dengar petunjuk"), level.id).toBe(enabled);
    expect(challenge.includes("Dengar penerangan"), level.id).toBe(enabled);
    expect(challenge).toContain("Penerangan teks");
    if (level.id !== "d1") {
      const html = renderToStaticMarkup(createElement(LearningLibrary, { levelId: level.id, stage: level.stage, levelLabel: level.label, subjects: getSubjectsForLevel(level.id), onOpenSubject: () => {}, initialResourceId: unit.id + "-reading" }));
      expect(html.includes("Baca dengan AI"), level.id).toBe(enabled);
      expect(html.includes("Dengar soalan dan pilihan"), level.id).toBe(enabled);
      expect(html).toContain("Besarkan teks");
    }
  }
});
