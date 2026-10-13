import { describe, expect, it, vi } from "vitest";
import bankJson from "./challengeBank.json" with { type: "json" };
import { challengeFingerprint, challengeSubjects, createChallengeGenerator, normalizeChallengePrompt, validateChallengeQuestion } from "./challengeGenerator.js";
import { libraryResources } from "./library/catalog.js";
import type { ChallengeBankSubject, ChallengeQuestion } from "./challengeContracts.js";

const bank = bankJson as ChallengeBankSubject[];
const input = (levelId = "t4", subjectId = "bm") => ({ levelId, subjectId, stage: 1, seed: "fixed", history: [] });
const example = (n: number): ChallengeQuestion => ({ id: `q${n}`, fingerprint: "", prompt: `Original question ${n}?`, options: ["A", "B", "C", "D"], answer: 0, hint: "Think carefully.", explanation: "A is correct.", difficulty: 2, topicId: "topic", topicName: "Topic", conceptId: "concept", source: "bank" });
const subject = (questions: ChallengeQuestion[]): ChallengeBankSubject => ({ levelId: "t4", levelName: "Tingkatan 4", subjectId: "bm", subjectName: "Bahasa Melayu", questions });

describe("challenge generator", () => {
  it("starts every one of 102 level/subject pairs without any cloud calls, using at most 40 distinct questions", async () => {
    expect(challengeSubjects()).toHaveLength(102);
    const generate = createChallengeGenerator({ cloud: null });
    for (const entry of challengeSubjects()) {
      const result = await generate(input(entry.levelId, entry.subjectId));
      expect(result.questions.length, `${entry.levelId}/${entry.subjectId}`).toBeGreaterThan(0);
      expect(result.questions.length).toBeLessThanOrEqual(40);
      expect(new Set(result.questions.map(q => normalizeChallengePrompt(q.prompt))).size).toBe(result.questions.length);
      expect(result.questions.every(validateChallengeQuestion)).toBe(true);
      expect(result.questions.every(q => !q.repeat)).toBe(true);
      if (result.questions.length < 40) expect(result.notices.join(" ")).toContain(`Sesi ini mempunyai ${result.questions.length} soalan`);
    }
  });

  it("deduplicates cosmetic punctuation, whitespace and answer-order changes while retaining arithmetic operators", async () => {
    const a = example(1), b = { ...a, prompt: "  ORIGINAL   QUESTION 1!  ", options: ["D", "A", "B", "C"], answer: 1 };
    const generate = createChallengeGenerator({ subjects: [subject([a, b])], cloud: null, includeLibrary: false, includeTemplates: false });
    expect((await generate(input())).questions).toHaveLength(1);
    expect(challengeFingerprint("d1", "math", "3 + 4", "7")).not.toBe(challengeFingerprint("d1", "math", "3 - 4", "-1"));
    expect(challengeFingerprint("d1", "bm", a.prompt, "A")).toBe(challengeFingerprint("d1", "bm", b.prompt, "A"));
  });

  it("preserves meaningful capitalization and punctuation differences in grammar options", () => {
    expect(validateChallengeQuestion({ ...example(1), options: ["Ali.", "ali.", "Ali?", "Ali!"] })).toBe(true);
    expect(validateChallengeQuestion({ ...example(1), options: ["Ali", " Ali ", "Abu", "Ayu"] })).toBe(false);
  });

  it("rejects malformed items and fails explicitly only when no valid content exists", async () => {
    const invalid = { ...example(1), options: ["one", "one", "two", "three"] };
    const generate = createChallengeGenerator({ subjects: [subject([invalid])], cloud: null, includeLibrary: false, includeTemplates: false });
    await expect(generate(input())).rejects.toThrow("CHALLENGE_QUESTIONS_UNAVAILABLE");
    await expect(generate(input("t6", "missing"))).rejects.toThrow("CHALLENGE_SUBJECT_NOT_AVAILABLE");
  });

  it("marks seen questions as repeats, adapts difficulty, and explains missing phase coverage", async () => {
    // Keep unseen easy questions available after session one, so adaptation can be observed.
    const questions = Array.from({ length: 150 }, (_, i) => ({ ...example(i), difficulty: (1 + i % 3) as 1 | 2 | 3 }));
    const generate = createChallengeGenerator({ subjects: [subject(questions)], cloud: null, includeLibrary: false, includeTemplates: false });
    const first = await generate(input());
    const history = first.questions.map((q, i) => ({ fingerprint: q.fingerprint, topicId: q.topicId, answered: 1, correct: 0, lastCorrect: false, lastAnsweredAt: new Date(1700000000000 + i).toISOString(), rankingAwarded: false }));
    const second = await generate({ ...input(), history });
    expect(second.questions).toHaveLength(40);
    expect(second.questions.filter(q => q.phase === "review")).toHaveLength(10);
    expect(second.questions.filter(q => q.phase === "strengthen")).toHaveLength(10);
    expect(second.questions.filter(q => q.phase === "current" && !q.repeat).some(q => q.difficulty === 1)).toBe(true);
    expect(second.questions.some(q => q.repeat)).toBe(true);
    expect(second.notices.join(" ")).toContain("pernah dijawab");
    expect(first.notices.join(" ")).toContain("Agihan soalan disesuaikan");
    expect(await generate(input())).toEqual(first);
  });

  it("includes reading passages and only real source IDs belonging to the selected pair", async () => {
    const generate = createChallengeGenerator({ subjects: [subject([])], cloud: null, includeTemplates: false });
    const result = await generate(input());
    expect(result.questions.length).toBeGreaterThan(0);
    for (const q of result.questions) {
      const ref = libraryResources.find(r => r.id === q.resourceIds?.[0]);
      expect(ref?.subjectId).toBe("bm");
      expect(ref?.levelIds).toContain("t4");
      for (const paragraph of ref!.readingBody ?? ref!.body) expect(q.prompt).toContain(paragraph);
    }
  });

  it("coalesces concurrent subject requests and limits retries after provider failure", async () => {
    let release!: () => void;
    const cloud = vi.fn(async () => { await new Promise<void>(resolve => { release = resolve; }); throw new Error("quota"); });
    const generate = createChallengeGenerator({ subjects: [subject([example(1)])], cloud, includeLibrary: false, includeTemplates: false });
    const first = generate(input()), second = generate(input());
    expect(cloud).toHaveBeenCalledTimes(1);
    release();
    expect((await first).questions).toHaveLength(1);
    expect((await second).questions).toHaveLength(1);
    await generate(input());
    expect(cloud).toHaveBeenCalledTimes(1);
  });

  it("rejects fabricated source lineage at the generator boundary", async () => {
    const cloud = vi.fn(async () => [{ ...example(99), source: "ai-reviewed" as const, resourceIds: ["fake-source"] }]);
    const generate = createChallengeGenerator({ subjects: [subject([example(1)])], cloud, includeLibrary: false, includeTemplates: false });
    expect((await generate(input())).questions).toHaveLength(1);
  });
});
