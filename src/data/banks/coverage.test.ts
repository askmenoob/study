import { expect, it } from "vitest";
import { getSubjectsForLevel, getTopics, getArchivedTopics, levels } from "../curriculum";
import { additionalTopics } from "./index";
import { bankTopic, type BankRow } from "./helpers";
it("offers validated additional practice in every selectable level and subject, including STPM", () => {
  const globalIds = new Set<string>();
  for (const level of levels) for (const subject of getSubjectsForLevel(level.id)) {
    const topics = getTopics(level.id,subject.id);
    const extra = additionalTopics(level.id,subject.id).flatMap(t=>t.questions);
    expect(extra.length, `${level.id}/${subject.id}`).toBeGreaterThanOrEqual(8);
    expect(new Set(topics.map(t=>t.id)).size).toBe(topics.length);
    const prompts = new Set<string>();
    for (const q of extra) {
      expect(globalIds.has(q.id),q.id).toBe(false); globalIds.add(q.id);
      const prompt=q.prompt.trim().normalize("NFKC").toLowerCase();
      expect(prompts.has(prompt), `${level.id}/${subject.id}: ${q.prompt}`).toBe(false); prompts.add(prompt);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map(s=>s.trim().normalize("NFKC"))).size,q.id).toBe(4);
      expect(Number.isInteger(q.answer)).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(4);
      expect(q.explanation.trim().length,q.id).toBeGreaterThan(12);
    }
  }
  expect(levels).toHaveLength(12);
  expect(getSubjectsForLevel("t6")).toHaveLength(23);
});
it("does not route unknown or unavailable subjects to an unrelated values pack", () => {
  expect(getTopics("d1","history")).toEqual([]);
  expect(getTopics("d1","unknown")).toEqual([]);
  expect(getTopics("t6","islam")).toEqual([]);
});
it("retires upper-primary arithmetic from early-primary practice while keeping historical question objects unchanged", () => {
  for (const level of ["d1","d2","d3"] as const) expect(getTopics(level,"math").flatMap(t=>t.questions).some(q=>q.id.startsWith("pm-"))).toBe(false);
  expect(getArchivedTopics("d4","math").find(t=>t.id==="number")?.questions[0].id).toBe("pm-n1");
});

it("keeps question identity and option positions stable when editors reorder rows", () => {
  const rows: BankRow[] = [["sum", "2 + 3 = ?", "5", ["3","4","6"], "Dua ditambah tiga ialah lima."], ["product", "2 × 3 = ?", "6", ["3","4","5"], "Dua kumpulan tiga berjumlah enam."]];
  const original = bankTopic("d1","math","stability","Test",rows).questions;
  const reordered = bankTopic("d1","math","stability","Test",[...rows].reverse()).questions;
  expect(reordered.reverse()).toEqual(original);
});
