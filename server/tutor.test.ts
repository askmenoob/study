import { describe, expect, it } from "vitest";
import { answerLocally } from "./tutor.js";

describe("local tutor", () => {
  it("explains fractions for primary learner", () => {
    const result = answerLocally({ levelId: "d4", subjectId: "math", topicId: "fraction", message: "Kenapa 1/2 sama dengan 2/4?" });
    expect(result.provider).toBe("local");
    expect(result.answer).toContain("1/2 = 2/4");
    expect(result.answer).toContain("sekolah rendah");
  });
  it("uses STPM guidance for form six", () => {
    const result = answerLocally({ levelId: "t6", subjectId: "history", message: "Bagaimana saya patut jawab soalan?" });
    expect(result.answer).toContain("STPM");
  });
});
