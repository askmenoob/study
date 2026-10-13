import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ChallengeLeaderboard, ChallengePublicQuestion, ChallengeSession } from "../../server/challengeContracts";
import { ChallengeCompletion, ChallengeProgress, ChallengeQuestionCard, ChallengeRankingTable } from "./ChallengeJourney";

const question: ChallengePublicQuestion = {
  id: "question-1", topicId: "fractions", topicName: "Pecahan", prompt: "Berapakah 1/2 + 1/2?", options: ["1", "2", "3", "4"],
  difficulty: 1, source: "bank", phase: "review", repeat: false, resourceIds: ["fraction-note"],
};
const actions = { selected: null, disabled: false, onSelect: () => {}, onAnswer: () => {}, onHint: () => {}, onNext: () => {}, onReadResource: () => {} };

describe("challenge learner presentation", () => {
  it("keeps the complete Library passage separate from the question heading", () => {
    const html = renderToStaticMarkup(createElement(ChallengeQuestionCard, { question: { ...question, prompt: "Dina ada tiga lencana.\n\nAbang memberi empat lagi.\n\nBerapa lencana sekarang?" }, index: 0, total: 40, ...actions }));
    expect(html).toContain('aria-label="Bahan bacaan soalan"');
    expect(html).toContain("Dina ada tiga lencana.");
    expect(html).toContain("Abang memberi empat lagi.");
    expect(html).toContain('<h2 id="challenge-question-title" dir="auto">Berapa lencana sekarang?</h2>');
  });
  it("shows no key, explanation or related answer note before a first answer", () => {
    const html = renderToStaticMarkup(createElement(ChallengeQuestionCard, { question, index: 0, total: 40, ...actions }));
    expect(html).toContain("Soalan 1 / 40");
    expect(html).toContain("Beri petunjuk");
    expect(html).not.toContain("Jawapan betul");
    expect(html).not.toContain("Baca semula nota berkaitan");
    expect(html).not.toContain("challengeFeedback");
    expect(html).toMatch(/disabled=""[^>]*>Semak jawapan/);
  });

  it("shows the locked server feedback, supportive correction and optional note after answering", () => {
    const answered = { ...question, feedback: { selected: 1, correct: false, answer: 0, explanation: "Dua bahagian separuh menjadi satu.", hintUsed: false } };
    const html = renderToStaticMarkup(createElement(ChallengeQuestionCard, { question: answered, index: 13, total: 14, ...actions }));
    expect(html).toContain('<fieldset class="challengeOptions" disabled="">');
    expect(html).toContain("Belum tepat. Jom faham bersama.");
    expect(html).toContain("Dua bahagian separuh menjadi satu.");
    expect(html).toContain("Jawapan betul");
    expect(html).toContain("Baca semula nota berkaitan");
    expect(html).toContain("Lihat keputusan");
    expect(html).not.toContain("Semak jawapan");
  });

  it("shows a server hint only when it has been requested and returned", () => {
    const html = renderToStaticMarkup(createElement(ChallengeQuestionCard, { question: { ...question, hint: "Bayangkan dua separuh kek." }, index: 0, total: 40, ...actions }));
    expect(html).toContain("Bayangkan dua separuh kek.");
    expect(html).toContain("Petunjuk dibuka");
    expect(html).not.toContain("Jawapan betul");
  });

  it("renders four ten-question blocks and a shorter final block when supply is limited", () => {
    const full = renderToStaticMarkup(createElement(ChallengeProgress, { answered: 10, total: 40 }));
    expect(full.match(/role="progressbar"/g)).toHaveLength(4);
    expect(full).toContain("10 / 40 selesai");
    expect(full).toContain("31–40");
    const shorter = renderToStaticMarkup(createElement(ChallengeProgress, { answered: 10, total: 14 }));
    expect(shorter.match(/role="progressbar"/g)).toHaveLength(2);
    expect(shorter).toContain("11–14");
    expect(shorter).toContain('aria-valuemax="4"');
    expect(shorter).not.toContain("40");
  });

  it("uses actual total and authoritative progression for a shorter completed set", () => {
    const session = { stage: 2, correctCount: 12, total: 14, hintCount: 1, result: { accuracy: 86, passed: true, nextStage: 3, rankingPoints: 9 } } as ChallengeSession;
    const html = renderToStaticMarkup(createElement(ChallengeCompletion, { session, busy: false, onStart: () => {}, onBack: () => {} }));
    expect(html).toContain(" / 14");
    expect(html).toContain("86%");
    expect(html).toContain("Tahap 3 sedia");
    expect(html).toContain("Ke tahap seterusnya");
    expect(html).not.toContain(" / 40");
    const support = renderToStaticMarkup(createElement(ChallengeCompletion, { session: { ...session, result: { accuracy: 50, passed: false, nextStage: 2, rankingPoints: 2 } }, busy: false, onStart: () => {}, onBack: () => {} }));
    expect(support).toContain("kukuhkan tahap 2");
    expect(support).toContain("Cuba set pengukuhan");
  });

  it("renders pseudonyms and self markers without private learner identifiers", () => {
    const ranking: ChallengeLeaderboard = { levelId: "d4", subjectId: "math", weekStart: "2026-09-07", weekEnd: "2026-09-14", yourPoints: 10, dailySessionLimit: 3, rows: [{ rank: 1, alias: "Bintang Ungu", points: 10, sessions: 1, isYou: true }] };
    const html = renderToStaticMarkup(createElement(ChallengeRankingTable, { ranking }));
    expect(html).toContain("Bintang Ungu");
    expect(html).toContain("Kamu");
    expect(html).not.toContain("studentId");
  });
});
