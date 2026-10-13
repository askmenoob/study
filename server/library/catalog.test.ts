import { describe, expect, it } from "vitest";
import { libraryUnits } from "./catalog.js";
import { eligibleTutorNotes, selectTutorSources } from "../tutorKnowledge.js";

describe("expanded Library tutor boundary", () => {
  it("supplies only teaching text, never attached answer keys, to retrieval", () => {
    for (const unit of libraryUnits) {
      const notes = eligibleTutorNotes(unit.levelId, unit.subjectId).filter(n => n.id.startsWith(unit.id + "-"));
      expect(notes.map(n => n.kind)).toEqual(["note", "reading"]);
      expect(notes.every(note => !("questions" in note))).toBe(true);
      expect(() => selectTutorSources({ levelId: unit.levelId, subjectId: unit.subjectId, resourceId: `${unit.id}-practice`, message: "Terangkan" })).toThrow("TUTOR_RESOURCE_NOT_AVAILABLE");
    }
  });
  it("rejects a new note from a different year or subject", () => {
    const unit = libraryUnits.find(u => u.levelId === "d1" && u.subjectId === "bm")!;
    expect(() => selectTutorSources({ levelId: "d2", subjectId: "bm", resourceId: `${unit.id}-note`, message: "Terangkan" })).toThrow("TUTOR_RESOURCE_NOT_AVAILABLE");
    expect(() => selectTutorSources({ levelId: "d1", subjectId: "math", resourceId: `${unit.id}-note`, message: "Terangkan" })).toThrow("TUTOR_RESOURCE_NOT_AVAILABLE");
  });
});
