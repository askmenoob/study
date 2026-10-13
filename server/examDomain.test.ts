import { describe, expect, it } from "vitest";
import { examFixture } from "./examFixtures.js";
import { gradeQuestion, parseNumeric, publicationFor, createSnapshot, makeAttempt, presentAttempt, mutateAttempt, retrySnapshot } from "./examDomain.js";

const start = Date.parse("2026-09-09T00:00:00Z");
const fresh = (mode: "guided" | "simulation" = "guided") => makeAttempt(createSnapshot(examFixture(), true), {
  id: "attempt", studentId: "student", clientAttemptId: "request", mode, retryOfAttemptId: null,
}, start);

describe("exam publication and trusted grading", () => {
  it("blocks pending originals by default and unknown rights even in preview", () => {
    const p = examFixture();
    expect(publicationFor(p, false)).toBe(null);
    expect(publicationFor(p, true)).toBe("preview");
    p.source.rights = "unknown";
    expect(publicationFor(p, true)).toBe(null);
    p.source.rights = "owned"; p.source.rightsEvidence = " ";
    expect(publicationFor(p, true)).toBe(null);
  });
  it("requires actual reviewer evidence for published packs and genuine upstream identity", () => {
    const p = examFixture(); p.source.review = "approved";
    expect(publicationFor(p, true)).toBe(null);
    p.source.reviewer = "QA educator"; p.source.reviewedAt = "2026-09-09";
    expect(publicationFor(p, false, start)).toBe("published");
    p.source.reviewedAt = "2099-01-01";
    expect(publicationFor(p, false, start)).toBe(null);
    p.source.reviewedAt = "2026-02-31";
    expect(publicationFor(p, false, start)).toBe(null);
    p.source.reviewedAt = "2026-09-09";
    p.source.kind = "past_exam";
    expect(publicationFor(p, false)).toBe(null);
    p.source.year = 2025; p.source.url = "https://example.test/paper"; p.source.rights = "licensed";
    expect(publicationFor(p, false, start)).toBe("published");
  });
  it("rejects malformed IDs, format, rubric totals and duplicate alternatives", () => {
    for (const damage of [
      (p: ReturnType<typeof examFixture>) => { p.questions[1].retry.id = p.questions[0].id; },
      (p: ReturnType<typeof examFixture>) => { p.questions[1].manualMarks = 3; },
      (p: ReturnType<typeof examFixture>) => { p.levelIds = ["t4"]; },
      (p: ReturnType<typeof examFixture>) => { p.questions[0].key.numeric = Infinity; },
      (p: ReturnType<typeof examFixture>) => { p.questions[0].key.tolerance = 0.5; },
      (p: ReturnType<typeof examFixture>) => { p.questions[0].id = "__proto__"; },
    ]) { const p = examFixture(); damage(p); expect(publicationFor(p, true)).toBe(null); }
  });
  it("accepts equivalent numbers while rejecting malformed/nonfinite expressions and wrong units", () => {
    const q = examFixture().questions[0];
    for (const value of ["1/2", "2 / 4", "0.5", ".5", "-1/-2"]) expect(gradeQuestion(q, { value }).correct).toBe(true);
    for (const value of ["", "Infinity", "NaN", "1/0", "0x.5", "1+1", "5e-1", "1/2 junk", "1e309"]) {
      expect(parseNumeric(value)).toBe(null); expect(gradeQuestion(q, { value }).correct).toBe(false);
    }
    const unitQ = examFixture().questions[1];
    expect(gradeQuestion(unitQ, { value: "0.5", unit: "m" }).autoScore).toBe(1);
    expect(gradeQuestion(unitQ, { value: "0.5", unit: "cm" }).autoScore).toBe(0);
    expect(gradeQuestion(unitQ, { value: "0.5" }).autoScore).toBe(0);
    expect(gradeQuestion(q, { value: "0.5001" }).autoScore).toBe(0);
  });
});

describe("exam state and private exposure", () => {
  it("keeps keys/notes/solutions/rubrics private until each guided check", () => {
    const row = fresh();
    const draft = JSON.stringify(presentAttempt(row));
    expect(draft).not.toMatch(/PRIVATE_|"key"|"retry"/);
    const checked = mutateAttempt(row, { kind: "check", expectedRevision: 0, questionId: "q1", answer: { value: "0.1" } }, start + 1);
    expect(presentAttempt(checked).reviews.map(r => r.questionId)).toEqual(["q1"]);
    expect(presentAttempt(checked).autoScore).toBe(0);
    expect(() => mutateAttempt(checked, { kind: "save", expectedRevision: 1, answers: { q1: { value: "0.5" } } }, start + 2)).toThrow("CHECKED_ANSWER_LOCKED");
    expect(() => mutateAttempt(checked, { kind: "save", expectedRevision: 0, answers: checked.state.answers }, start + 2)).toThrow("REVISION_CONFLICT");
  });
  it("simulation hides reviews and rejects changes at deadline, then submits saved answers", () => {
    let row = fresh("simulation");
    row = mutateAttempt(row, { kind: "save", expectedRevision: 0, answers: { q1: { value: "0.5" } } }, start + 1);
    expect(presentAttempt(row).reviews).toEqual([]);
    expect(presentAttempt(row).autoScore).toBe(0);
    expect(() => mutateAttempt(row, { kind: "check", expectedRevision: 1, questionId: "q1", answer: { value: "0.5" } }, start + 2)).toThrow("SIMULATION_NO_HINTS");
    const deadline = Date.parse(row.endsAt!);
    expect(() => mutateAttempt(row, { kind: "save", expectedRevision: 1, answers: {} }, deadline)).toThrow("TIME_EXPIRED");
    const submitted = mutateAttempt(row, { kind: "submit", expectedRevision: 1 }, deadline);
    expect(presentAttempt(submitted).autoScore).toBe(1);
    expect(presentAttempt(submitted).reviews).toHaveLength(2);
    expect(mutateAttempt(submitted, { kind: "submit", expectedRevision: 0 }, deadline + 1)).toBe(submitted);
  });
  it("bounds self marks by reviewed rubric and keeps automatic results separate", () => {
    let row = fresh();
    expect(() => mutateAttempt(row, { kind: "self-mark", expectedRevision: 0, marks: { q2: { method: true } } }, start + 1)).toThrow("INVALID_INPUT");
    row = mutateAttempt(row, { kind: "check", expectedRevision: 0, questionId: "q2", answer: { value: "0.1", unit: "m" } }, start + 1);
    row = mutateAttempt(row, { kind: "self-mark", expectedRevision: 1, marks: { q2: { method: true, steps: false } } }, start + 2);
    expect(presentAttempt(row)).toMatchObject({ autoScore: 0, manualScore: 1, manualMarks: 2, needsSelfMark: false });
    expect(() => mutateAttempt(row, { kind: "self-mark", expectedRevision: 2, marks: { q2: { invented: true } } }, start + 3)).toThrow("INVALID_INPUT");
  });
  it("retry uses unseen authored alternatives from the snapshot, never the same item", () => {
    let row = fresh();
    row = mutateAttempt(row, { kind: "save", expectedRevision: 0, answers: { q1: { value: "0.5" }, q2: { value: "0", unit: "m" } } }, start + 1);
    row = mutateAttempt(row, { kind: "submit", expectedRevision: 1 }, start + 2);
    const retry = retrySnapshot(row);
    expect(retry.paper.questions.map(q => q.id)).toEqual(["r2"]);
    expect(retry.paper.questions[0].key.numeric).toBe(0.75);
    const next = makeAttempt(retry, { id: "retry", studentId: "student", clientAttemptId: "retry-key", mode: "guided", retryOfAttemptId: row.id }, start + 3);
    const done = mutateAttempt(next, { kind: "submit", expectedRevision: 0 }, start + 4);
    expect(() => retrySnapshot(done)).toThrow("PAPER_UNAVAILABLE");
  });
});
