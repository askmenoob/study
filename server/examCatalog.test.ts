import { describe, expect, it } from "vitest";
import { EXAM_PAPERS } from "./examCatalog.js";

// Independent answer ledger: fractions written as rational expectations, not
// calculated by authoring helpers. Educator review is still required.
const expected = {
  d4: [[5 / 8, 1 / 2], [735 / 100, 778 / 100], [6000, 800], [21, 24], [560 / 100, 350 / 100], [84, 72]],
  d5: [[1 / 2, 5 / 8], [21 / 10, 195 / 100], [1 / 4, 2 / 5], [30, 72], [675 / 100, 8], [54, 40]],
  d6: [[3 / 2, 5 / 2], [33 / 10, 3], [10, 15], [9, 13], [72, 90], [68, 120]],
  spm: [[2, 3], [3 / 10, 2 / 5], ["b", "c"], [40, 50], [2120, 1680], [13, 17]],
} as const;

describe("original exam preview content", () => {
  it("covers precisely four authored packs and 48 distinct primary/retry items", () => {
    expect(EXAM_PAPERS.map(p => p.levelIds)).toEqual([["d4"], ["d5"], ["d6"], ["t4", "t5"]]);
    const items = EXAM_PAPERS.flatMap(p => p.questions.flatMap(q => [q, q.retry]));
    expect(items).toHaveLength(48);
    expect(new Set(items.map(q => q.id)).size).toBe(48);
    expect(new Set(items.map(q => q.prompt)).size).toBe(48);
  });

  for (const [packIndex, packKey] of (["d4", "d5", "d6", "spm"] as const).entries()) {
    it(`${packKey}: preserves provenance and unapproved preview scope`, () => {
      const p = EXAM_PAPERS[packIndex];
      expect(p.id).toBe(`original-${packKey}-math-preview`);
      expect(p.questions).toHaveLength(6);
      expect(p.version).toBe(1);
      expect(p.subjectId).toBe("math");
      expect(p.durationMinutes).toBeGreaterThan(0);
      expect(p.title).toContain("original");
      expect(p.scopeLabel).toContain("6 soalan");
      expect(p.scopeLabel).toContain("belum disemak guru");
      expect(p.scopeLabel).toContain("bukan kertas peperiksaan sebenar");
      expect(p.source).toMatchObject({kind:"original", provider:"Study IMAI — original berbantukan AI", year:null, url:null, rights:"owned", review:"pending", reviewer:null, reviewedAt:null});
      expect(p.source.rightsEvidence).toContain("2026-09-09");
      expect(p.source.rightsEvidence).toContain("EXAM_SOURCE_AUDIT.md");
      expect(p.questions.reduce((n,q) => n + q.autoMarks, 0)).toBe(6);
      expect(p.questions.reduce((n,q) => n + q.manualMarks, 0)).toBe(4);
    });

    expected[packKey].forEach((answers, i) => {
      for (const [variantIndex, variant] of ["primary", "retry"].entries()) {
        it(`${packKey} q${i+1} ${variant}: independent key, useful review and bounded marks`, () => {
          const primary = EXAM_PAPERS[packIndex].questions[i];
          const q = variantIndex === 0 ? primary : primary.retry;
          const answer = answers[variantIndex];
          if (typeof answer === "number") {
            expect(q.key.numeric).toBeCloseTo(answer, 10);
            expect(q.key.tolerance).toBe(1e-9);
            expect(q.key.choiceId).toBeUndefined();
          } else {
            expect(q.key.choiceId).toBe(answer);
            expect(q.options?.find(o => o.id === answer)).toBeDefined();
            expect(new Set(q.options?.map(o => o.id)).size).toBe(4);
            expect(new Set(q.options?.map(o => o.text)).size).toBe(4);
          }
          expect(q.autoMarks).toBe(1);
          expect(q.manualMarks).toBe(i >= 4 ? 2 : 0);
          expect(q.kind).toBe(i >= 4 ? "structured" : packKey === "spm" && i === 2 ? "choice" : "numeric");
          expect(q.rubric.reduce((n,r) => n+r.marks, 0)).toBe(q.manualMarks);
          expect(new Set(q.rubric.map(r => r.id)).size).toBe(q.rubric.length);
          for (const r of q.rubric) {
            expect(r.marks).toBe(1);
            expect(r.description.length).toBeGreaterThan(15);
          }
          expect(q.solution.length).toBeGreaterThanOrEqual(2);
          expect(q.solution.at(-1)).toMatch(/^Jawapan:/);
          expect(q.note.title.length).toBeGreaterThan(4);
          expect(q.note.body.length).toBeGreaterThan(35);
          expect(q.note.body.length).toBeLessThan(500);
          expect(q.note.example.length).toBeGreaterThan(10);
          expect(q.skillId).toBe(primary.skillId);
          expect(q.kind).toBe(primary.kind);
          if (variantIndex === 1) {
            expect(q.id).not.toBe(primary.id);
            expect(q.number).not.toBe(primary.number);
            expect(q.prompt).not.toBe(primary.prompt);
            expect(q.key).not.toEqual(primary.key);
            expect("retry" in q).toBe(false);
          }
        });
      }
    });
  }
});
