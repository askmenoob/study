import { describe, expect, it } from "vitest";
import { findLearningResources, resources, archivedResources } from "./resources";
import { libraryUnits } from "../../server/library/catalog";

describe("Library discovery", () => {
  it("combines level, subject and material kind without hiding empty results", () => {
    const result = findLearningResources({ levelId: "d1", stage: "KSSR", subjectId: "math", kind: "reading" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(r => r.subjectId === "math" && r.kind === "reading" && r.levelIds?.includes("d1"))).toBe(true);
    expect(findLearningResources({ levelId: "d1", stage: "KSSR", query: "zzznomatchingmaterialzzz" })).toEqual([]);
  });
  it("searches vocabulary and normalizes case and spacing", () => {
    const r = resources.find(r => r.vocabulary?.length && r.levelIds?.length)!;
    expect(r).toBeDefined();
    const query = `  ${r.vocabulary![0].term.toUpperCase()}   `;
    expect(findLearningResources({ levelId: r.levelIds![0], stage: r.stages[0], query }).some(found => found.id === r.id)).toBe(true);
  });
  it("keeps saved materials inside the selected learner level", () => {
    const d1 = resources.find(r => r.unitId && r.levelIds?.[0] === "d1")!;
    const t6 = resources.find(r => r.unitId && r.levelIds?.[0] === "t6")!;
    const savedIds = new Set([d1.id, t6.id, "removed-unknown-id"]);
    expect(findLearningResources({ levelId: "d1", stage: "KSSR", savedIds }).map(r => r.id)).toEqual([d1.id]);
    expect(findLearningResources({ levelId: "d1", stage: "KSSR", savedIds: new Set() })).toEqual([]);
  });
  it("retains archived identities and keeps the mapped fraction pilot selectable", () => {
    expect(archivedResources.find(r => r.id === "stpm-math-calculus-note")?.subjectId).toBe("stpm_math");
    expect(archivedResources.find(r => r.id === "stpm-practice-function")?.subjectId).toBe("stpm_math");
    expect(resources.find(r => r.id === "imai-d4-fractions-pilot-2026")?.questions).toHaveLength(8);
    for (const unit of libraryUnits) {
      expect(resources.filter(r => r.unitId === unit.id).map(r => r.kind)).toEqual(["note", "reading", "practice"]);
    }
  });
});
