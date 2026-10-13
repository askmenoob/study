import { describe, expect, it } from "vitest";
import { referenceMaterials, findReferences } from "./referenceMaterials";

describe("curated references for a learner", () => {
  it("keeps Darjah 4 Maths references separate from other years and subjects", () => {
    const results = findReferences("d4", "math", "");
    expect(results.some(r => r.id === "gb-math-d4-practice")).toBe(true);
    expect(results.every(r => r.levelIds.includes("d4"))).toBe(true);
    expect(results.every(r => !r.subjectIds.length || r.subjectIds.includes("math"))).toBe(true);
    expect(results.some(r => r.id === "gb-en-d5-starter")).toBe(false);
    expect(results.some(r => r.id === "gb-spm-math-mrsm-2025")).toBe(false);
  });
  it("does not relabel SPM sources as STPM", () => expect(findReferences("t6", "all", "")).toEqual([]));
  it("searches title and credited contributor without being case sensitive", () => {
    expect(findReferences("d4", "math", "  ROZZI  ").map(r=>r.id)).toEqual(["gb-math-d4-practice"]);
    expect(findReferences("d4", "math", "nonexistent resource")).toEqual([]);
  });
  it("keeps third-party materials as links with explicit review limits", () => {
    expect(new Set(referenceMaterials.map(r=>r.id)).size).toBe(referenceMaterials.length);
    for (const r of referenceMaterials) {
      expect(new URL(r.url).protocol).toBe("https:");
      expect(r.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.verification.length).toBeGreaterThan(20);
      expect(r.reuse).toBe("link-only");
      if (r.publisher === "GuruBesar.my") {
        expect(r.official).toBe(false);
        expect(r.curriculumReview).toBe("Belum dipetakan kepada DSKP");
      }
    }
  });
});
