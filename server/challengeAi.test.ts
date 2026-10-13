import { describe, expect, it, vi } from "vitest";
import { createChallengeCloud, type ChallengeAiRequest } from "./challengeAi.js";

const request: ChallengeAiRequest = { subject: { levelId: "d1", levelName: "Darjah 1", subjectId: "math", subjectName: "Matematik", questions: [] }, references: [{ id: "library-d1-math-note", title: "Tambah", body: ["Tambah menghitung jumlah dua kumpulan."] }], existingPrompts: [], count: 4 };
const candidate = { levelId: "d1", subjectId: "math", language: "ms", topicId: "number", topicName: "Tambah", conceptId: "library-d1-math", resourceIds: ["library-d1-math-note"], prompt: "3 + 4 = ?", options: ["7", "6", "8", "9"], answer: 0, hint: "Kira ke hadapan empat langkah.", explanation: "3 + 4 = 7.", difficulty: 1 };
const review = { index: 0, approved: true, solvedAnswer: 0, uniqueAnswer: true, correctSubject: true, correctLevel: true, correctLanguage: true, explanationCorrect: true, hintSafe: true, distinctProblem: true, groundedInReferences: true };

describe("separate AI review gate", () => {
  it("accepts a structurally valid grounded question only after independent solving agrees", async () => {
    const call = vi.fn().mockResolvedValueOnce({ questions: [candidate] }).mockResolvedValueOnce({ reviews: [review] });
    const result = await createChallengeCloud(call)(request);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("ai-reviewed");
    expect(call).toHaveBeenCalledTimes(2);
    const reviewInput = JSON.parse(call.mock.calls[1][1]);
    expect(reviewInput.questions[0]).not.toHaveProperty("answer");
    expect(reviewInput.references).toEqual(request.references);
    expect(result[0].resourceIds).toEqual(["library-d1-math-note"]);
  });

  it("preserves capitalization and punctuation in distinct grammar options", async () => {
    const call = vi.fn().mockResolvedValueOnce({ questions: [{ ...candidate, options: ["Ali.", "ali.", "Ali?", "Ali!"] }] }).mockResolvedValueOnce({ reviews: [review] });
    expect(await createChallengeCloud(call)(request)).toHaveLength(1);
  });

  it.each(["approved", "uniqueAnswer", "correctSubject", "correctLevel", "correctLanguage", "explanationCorrect", "hintSafe", "distinctProblem", "groundedInReferences"])("rejects reviewer failure: %s", async flag => {
    const call = vi.fn().mockResolvedValueOnce({ questions: [candidate] }).mockResolvedValueOnce({ reviews: [{ ...review, [flag]: false }] });
    expect(await createChallengeCloud(call)(request)).toEqual([]);
  });

  it("rejects independent answer mismatch and duplicate reviewer rows", async () => {
    for (const reviews of [[{ ...review, solvedAnswer: 1 }], [review, review]]) {
      const call = vi.fn().mockResolvedValueOnce({ questions: [candidate] }).mockResolvedValueOnce({ reviews });
      expect(await createChallengeCloud(call)(request)).toEqual([]);
    }
  });

  it.each([{ levelId: "t6" }, { subjectId: "history" }, { language: "en" }, { resourceIds: ["invented"] }, { conceptId: "other-unit" }, { options: ["7", "7", "8", "9"] }, { answer: 4 }])("rejects invalid generation before any review call: %j", async patch => {
    const call = vi.fn().mockResolvedValue({ questions: [{ ...candidate, ...patch }] });
    expect(await createChallengeCloud(call)(request)).toEqual([]);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("never approves content when either provider call fails", async () => {
    const call = vi.fn().mockResolvedValueOnce({ questions: [candidate] }).mockRejectedValueOnce(new Error("free quota"));
    await expect(createChallengeCloud(call)(request)).rejects.toThrow("free quota");
  });
});
