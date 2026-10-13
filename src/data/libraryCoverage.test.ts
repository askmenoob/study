import { describe, expect, it } from "vitest";
import { levels, getSubjectsForLevel } from "./curriculum";
import { resources, isResourceForLevel } from "./resources";
import { selectTutorSources } from "../../server/tutorKnowledge";

describe("Library coverage for every learner level", () => {
  it("offers an exact-level note, reading and practice for each selectable subject", () => {
    const missing: string[] = [];
    for (const level of levels) for (const subject of getSubjectsForLevel(level.id)) {
      for (const kind of ["note", "reading", "practice"] as const) {
        if (!resources.some(r => r.subjectId === subject.id && r.kind === kind
          && r.levelIds?.length === 1 && r.levelIds[0] === level.id
          && isResourceForLevel(r, level.id, level.stage))) missing.push(`${level.id}/${subject.id}/${kind}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("allows every offered note and reading to be selected as tutor context", () => {
    const rejected: string[] = [];
    for (const level of levels) for (const r of resources.filter(r => r.kind !== "practice" && isResourceForLevel(r, level.id, level.stage))) {
      try {
        const selected = selectTutorSources({ levelId: level.id, subjectId: r.subjectId, resourceId: r.id, message: "Terangkan nota ini" });
        if (selected.length !== 1 || selected[0].id !== r.id || !r.body.join("\n\n").startsWith(selected[0].excerpt)) rejected.push(r.id);
      } catch { rejected.push(r.id); }
    }
    expect(rejected).toEqual([]);
  });

  it("never routes Library to a subject unavailable for that level", () => {
    for (const level of levels) {
      const available = getSubjectsForLevel(level.id).map(s => s.id);
      const invalid = resources.filter(r => isResourceForLevel(r, level.id, level.stage) && !available.includes(r.subjectId));
      expect(invalid.map(r => r.id), level.id).toEqual([]);
    }
  });
});
