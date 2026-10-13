import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ExamAttempt, ExamPaperSummary, ExamQuestionReview } from "../../server/examContracts";
import { ExamRevisionReview, ExamRevisionScores, ExamRevisionSource } from "./ExamRevisionViews";

const paper: ExamPaperSummary = { id: "original", version: 1, title: "Preview", exam: "UASA", levelIds: ["d4"], subjectId: "math", durationMinutes: 10,
  questionCount: 6, autoMarks: 6, manualMarks: 4, publication: "preview", scopeLabel: "Enam soalan asli; bukan soalan peperiksaan tahun lepas",
  source: { kind: "original", provider: "IMAI", year: null, url: null, rights: "owned", rightsEvidence: "private editorial evidence", review: "pending", reviewer: null, reviewedAt: null } };
describe("exam publication and focus-session presentation", () => {
  it("labels original preview content and pending review without inventing a past-paper year", () => {
    const html = renderToStaticMarkup(createElement(ExamRevisionSource, { paper, allowExternalLinks: true }));
    expect(html).toContain("Set asli IMAI"); expect(html).toContain("Preview"); expect(html).toContain("Belum disemak pendidik");
    expect(html).toContain("bukan soalan peperiksaan tahun lepas");
    expect(html).not.toContain("private editorial evidence"); expect(html).not.toContain("2026");
  });
  it("removes external links inside a focus session while keeping source identity visible", () => {
    const linked = { ...paper, source: { ...paper.source, kind: "trial" as const, provider: "Penyedia", year: 2025, url: "https://example.com/paper.pdf" } };
    const focused = renderToStaticMarkup(createElement(ExamRevisionSource, { paper: linked, allowExternalLinks: false }));
    expect(focused).not.toContain("href="); expect(focused).toContain("Penyedia"); expect(focused).toContain("2025");
    const ordinary = renderToStaticMarkup(createElement(ExamRevisionSource, { paper: linked, allowExternalLinks: true }));
    expect(ordinary).toContain('href="https://example.com/paper.pdf"'); expect(ordinary).toContain('rel="noopener noreferrer"');
  });
  it("never creates a link for an unsafe source URL", () => {
    const linked = { ...paper, source: { ...paper.source, url: "javascript:alert(1)" } };
    expect(renderToStaticMarkup(createElement(ExamRevisionSource, { paper: linked, allowExternalLinks: true }))).not.toContain("href=");
  });
  it("shows separate automatic and self-mark scores with no official grade claim", () => {
    const attempt = { status: "submitted", autoScore: 4, autoMarks: 6, manualScore: 1, manualMarks: 4, needsSelfMark: true } as ExamAttempt;
    const html = renderToStaticMarkup(createElement(ExamRevisionScores, { attempt }));
    expect(html).toContain("Markah automatik"); expect(html).toContain("4 / 6"); expect(html).toContain("1 / 4");
    expect(html).toContain("Self-mark bukan markah rasmi"); expect(html).toContain("Masih perlu semakan sendiri");
  });
  it("keeps the short note collapsed and marks an unsubmitted self-mark selection clearly", () => {
    const review: ExamQuestionReview = { questionId: "q1", correct: false, autoScore: 0, autoMarks: 1, manualMarks: 1, manualScore: null,
      solution: ["Semak penyebut."], note: { id: "note", title: "Pecahan", body: "Isi nota", example: "Contoh: 1/2" }, rubric: [{ id: "step", description: "Tunjuk pengiraan", marks: 1 }], selfMarks: {} };
    const html = renderToStaticMarkup(createElement(ExamRevisionReview, { review, disabled: false, onSelfMark: () => {} }));
    expect(html).toContain('<details class="examNote">'); expect(html).not.toContain(" open=");
    expect(html).toContain("Pilihan self-mark belum disimpan"); expect(html).toContain("Jawapan belum tepat");
    expect(html.match(/Contoh:/g)).toHaveLength(1);
  });
});
