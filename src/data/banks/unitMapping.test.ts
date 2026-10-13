import { expect, it } from "vitest";
import { mappedSupplement } from "./unitMapping";
it("does not attach old arithmetic to an unrelated new reading unit", () => {
  expect(mappedSupplement("d2", "math", "library-d2-math-data-reading")).toEqual([]);
  expect(mappedSupplement("d3", "math", "library-d3-math-money-reading")).toEqual([]);
});
it("preserves the explicitly reviewed older mapping and history", () => {
  const questions = mappedSupplement("d2", "math", "library-d2-math-puluh-dan-sa");
  expect(questions.length).toBeGreaterThan(0);
  expect(questions.every(q => q.originTopicId === "practice-number-lab")).toBe(true);
});
