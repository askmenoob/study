import { describe, expect, it } from "vitest";
import { fractionPilot } from "./fractionPilot";
import { isResourceForLevel, resources } from "./resources";
import { referenceMaterials } from "./referenceMaterials";

describe("original fraction learning pilot", () => {
  it("is reachable in Darjah 4 Library without leaking into other primary years", () => {
    expect(resources).toContain(fractionPilot);
    expect(isResourceForLevel(fractionPilot, "d4", "KSSR")).toBe(true);
    for (const id of ["d1", "d2", "d3", "d5", "d6"] as const) expect(isResourceForLevel(fractionPilot, id, "KSSR")).toBe(false);
    expect(isResourceForLevel(fractionPilot, "t4", "KSSM")).toBe(false);
    expect(fractionPilot.review).toContain("Belum disemak guru");
  });
  it("has exactly one numerically correct option for each independently calculated answer", () => {
    const expected = [4/6, 3/4, (3+2)/8, (7-3)/10, 1/2+1/4, (8-3)/8, 18/3*2, 3/4-1/8];
    const questions = fractionPilot.questions!;
    expect(questions).toHaveLength(expected.length);
    const value = (text: string) => {
      const numeric = text.replace(/ (biji|m)$/, "");
      const [numerator, denominator = "1"] = numeric.split("/");
      return Number(numerator) / Number(denominator);
    };
    questions.forEach((question, index) => {
      const matching = question.options.map((option, i) => Math.abs(value(option) - expected[index]) < 1e-10 ? i : -1).filter(i=>i!==-1);
      expect(matching, question.id).toEqual([question.answer]);
      expect(question.hint?.length).toBeGreaterThan(30);
      expect(question.explanation.length).toBeGreaterThan(40);
    });
    expect(questions[3].options[questions[3].answer]).toBe("2/5");
    expect(questions[7].options.every(option=>option.endsWith(" m"))).toBe(true);
    expect(new Set(questions.map(q=>q.id)).size).toBe(questions.length);
  });
  it("links to known further reading and retains original authorship", () => {
    expect(fractionPilot.referenceIds!.every(id=>referenceMaterials.some(r=>r.id===id))).toBe(true);
    expect(fractionPilot.review).toContain("Original IMAI");
    expect(fractionPilot.body.join(" ")).toContain("soalan ini ditulis khas untuk Study");
  });
});
