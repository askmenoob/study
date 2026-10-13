import { describe, expect, it } from "vitest";
import { libraryUnits } from "./library/catalog.js";
import { tutorBody } from "./tutorRequest.js";

const request = {
  studentId: "11111111-1111-4111-8111-111111111111",
  levelId: "d4",
  message: "Help me understand this material.",
};

describe("tutor request validation", () => {
  it("accepts note and reading requests for every selectable Library level/subject pair", () => {
    expect(new Set(libraryUnits.map(unit => `${unit.levelId}:${unit.subjectId}`)).size).toBe(102);
    for (const unit of libraryUnits) {
      for (const kind of ["note", "reading"]) {
        const body = { ...request, levelId: unit.levelId, subjectId: unit.subjectId, resourceId: `${unit.id}-${kind}` };
        expect(tutorBody.safeParse(body).success, body.resourceId).toBe(true);
      }
    }
  });

  it.each(["lit_en", "mgmt_math", "stpm_math", "sports_science", "visual_art"])(
    "accepts the underscore subject ID %s sent by STPM tutor links", (subjectId) => {
      expect(tutorBody.parse({ ...request, levelId: "t6", subjectId }).subjectId).toBe(subjectId);
    },
  );

  it("preserves optional subjects and the 40-character subject limit", () => {
    expect(tutorBody.safeParse(request).success).toBe(true);
    expect(tutorBody.safeParse({ ...request, subjectId: "a".repeat(40) }).success).toBe(true);
    expect(tutorBody.safeParse({ ...request, subjectId: "a".repeat(41) }).success).toBe(false);
    expect(tutorBody.safeParse({ ...request, subjectId: "math-2" }).success).toBe(true);
  });

  it.each(["", "_math", "2math", "Math", "stpm math", "math/science", "math.science", "math\t", "matemátik"])(
    "rejects malformed subject ID %j", (subjectId) => {
      expect(tutorBody.safeParse({ ...request, subjectId }).success).toBe(false);
    },
  );

  it("preserves the remaining request constraints and message trimming", () => {
    expect(tutorBody.parse({ ...request, message: "  Help me  " }).message).toBe("Help me");
    for (const invalid of [
      { studentId: "not-a-uuid" }, { levelId: "t7" }, { topicId: "topic_with_underscore" },
      { topicId: "a".repeat(81) }, { resourceId: "" }, { resourceId: "a".repeat(101) },
      { conversationId: "not-a-uuid" }, { message: "   " }, { message: "a".repeat(1201) },
    ]) {
      expect(tutorBody.safeParse({ ...request, ...invalid }).success, JSON.stringify(invalid)).toBe(false);
    }
  });
});
