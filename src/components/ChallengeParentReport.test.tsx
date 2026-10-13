import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ChallengeParentReport } from "../../server/challengeContracts";
import { ChallengeParentReportContent } from "./ChallengeParentReport";

describe("parent challenge report", () => {
  it("shows mastery, recurring errors, hints, current stage and actual recent totals", () => {
    const report: ChallengeParentReport = { studentId: "private-child-id", levelId: "d4", completedSessions: 1, answered: 14, correct: 9, hintsUsed: 2,
      subjects: [{ subjectId: "math", subjectName: "Matematik", stage: 1, completedSessions: 1, accuracy: 64, answered: 14, hintsUsed: 2, activeSessionId: "private-session-id", topics: [{ topicId: "fractions", topicName: "Pecahan", answered: 8, correct: 4, mastery: 50, repeatedErrors: 2 }] }],
      recentSessions: [{ id: "private-completed-id", subjectId: "math", stage: 1, total: 14, correct: 9, completedAt: "2026-09-09T08:00:00Z", passed: false }] };
    const html = renderToStaticMarkup(createElement(ChallengeParentReportContent, { report }));
    expect(html).toContain("Pecahan");
    expect(html).toContain("50%");
    expect(html).toContain("2 kesilapan berulang");
    expect(html).toContain("2 petunjuk");
    expect(html).toContain("Tahap 1");
    expect(html).toContain("Ada set belum selesai");
    expect(html).toContain("9 / 14");
    expect(html).toContain("Pengukuhan");
    expect(html).not.toContain("private-");
    expect(html).not.toContain("minggu ini");
    expect(html).toContain("bukan penilaian penuh silibus");
  });

  it("does not display zero percent mastery for a child with no answers", () => {
    const report: ChallengeParentReport = { studentId: "child", levelId: "d4", completedSessions: 0, answered: 0, correct: 0, hintsUsed: 0, subjects: [], recentSessions: [] };
    const html = renderToStaticMarkup(createElement(ChallengeParentReportContent, { report }));
    expect(html).toContain("Belum ada jawapan cabaran");
    expect(html).toContain("—");
    expect(html).not.toContain("0%");
  });
});
