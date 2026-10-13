import { describe, expect, it } from "vitest";
import { mathematicsBank } from "./mathematics";
import type { Question } from "../../types";

type Unit = "" | "sen" | "RM" | "batang" | "cm" | "cm³" | "m" | "cm²";
type Solution = { value: number; unit: Unit; concept: string };

// Read only the learner-visible problem: do not derive answers from row IDs,
// loop indices, levels, explanations, or the production bank's parameters.
function solvePrompt(prompt: string): Solution {
  const result = (value: number, unit: Unit, concept: string): Solution => ({ value, unit, concept });
  let match: RegExpMatchArray | null;
  if ((match = prompt.match(/^(\d+) ([+−]) (\d+) = \?$/))) {
    const [, first, operation, second] = match;
    return result(operation === "+" ? Number(first) + Number(second) : Number(first) - Number(second), "", operation === "+" ? "addition" : "subtraction");
  }
  if ((match = prompt.match(/^Aina ada (\d+) sen\. Dia menerima (\d+) sen lagi\. Berapakah jumlah wangnya dalam sen\?$/))) {
    return result(Number(match[1]) + Number(match[2]), "sen", "coins");
  }
  if ((match = prompt.match(/^Lengkapkan pola tambah (\d+): (\d+), (\d+), (\d+), __\.$/))) {
    const [step, first, second, third] = match.slice(1).map(Number);
    if (second - first !== step || third - second !== step) throw new Error(`Inconsistent sequence: ${prompt}`);
    return result(third + (third - second), "", "sequence");
  }
  if ((match = prompt.match(/^Terdapat (\d+) pek pensel\. Setiap pek mengandungi (\d+) batang pensel\. Berapakah jumlah pensel\?$/))) {
    return result(Number(match[1]) * Number(match[2]), "batang", "multiplication");
  }
  if ((match = prompt.match(/^Harga buku ialah RM(\d+\.\d{2})\. Baki yang diterima selepas membayar RM(\d+\.\d{2}) ialah…$/))) {
    const cents = (amount: string) => Number(amount.replace(".", ""));
    const change = cents(match[2]) - cents(match[1]);
    if (change < 0) throw new Error(`Payment does not cover the price: ${prompt}`);
    return result(change, "RM", "change");
  }
  if ((match = prompt.match(/^Selesaikan (\d+)x \+ (\d+) = (\d+)\. Apakah nilai x\?$/))) {
    return result((Number(match[3]) - Number(match[2])) / Number(match[1]), "", "linear equation");
  }
  if ((match = prompt.match(/^Permudahkan \(a\^(\d+) × a\^(\d+)\) ÷ a\^(\d+) untuk a ≠ 0\. Berapakah eksponen a dalam jawapan\?$/))) {
    return result(Number(match[1]) + Number(match[2]) - Number(match[3]), "", "indices");
  }
  if ((match = prompt.match(/^Diberi x² − (\d+)x \+ (\d+) = 0 dan x > (\d+)\. Apakah nilai x\?$/))) {
    const [, coefficient, constant, lowerBound] = match.map(Number);
    const discriminant = coefficient ** 2 - 4 * constant;
    const roots = [(coefficient + Math.sqrt(discriminant)) / 2, (coefficient - Math.sqrt(discriminant)) / 2];
    const validRoots = [...new Set(roots)].filter(root => root > lowerBound);
    if (validRoots.length !== 1) throw new Error(`Quadratic does not specify a unique real root: ${prompt}`);
    return result(validRoots[0], "", "quadratic equation");
  }
  if ((match = prompt.match(/^y berubah secara langsung dengan x\. Apabila x = (\d+), y = (\d+)\. Cari y apabila x = (\d+)\.$/))) {
    return result(Number(match[2]) * Number(match[3]) / Number(match[1]), "", "direct variation");
  }
  if ((match = prompt.match(/^Segi empat tepat mempunyai panjang (\d+) cm dan lebar (\d+) cm\. Berapakah perimeternya\?$/))) {
    const length = Number(match[1]), width = Number(match[2]);
    return result(length + width + length + width, "cm", "perimeter");
  }
  if ((match = prompt.match(/^Jejari silinder ialah (\d+) cm dan tingginya (\d+) cm\. Cari isi padu dengan π = (\d+)\/(\d+)\.$/))) {
    const [radius, height, piNumerator, piDenominator] = match.slice(1).map(Number);
    return result(piNumerator / piDenominator * radius ** 2 * height, "cm³", "cylinder volume");
  }
  if ((match = prompt.match(/^Skala pelan ialah (\d+):(\d+)\. Panjang pada pelan ialah (\d+) cm\. Berapakah panjang sebenar dalam meter\?$/))) {
    return result(Number(match[3]) * Number(match[2]) / Number(match[1]) / 100, "m", "scale conversion");
  }
  if ((match = prompt.match(/^Objek bergerak pada laju tetap (\d+) m\/s selama (\d+) s\. Berapakah jarak yang dilalui\?$/))) {
    return result(Number(match[1]) * Number(match[2]), "m", "distance");
  }
  if ((match = prompt.match(/^Sebuah segi empat sama mempunyai sisi (\d+) cm\. Selepas pembesaran faktor skala (\d+), berapakah luas imejnya\?$/))) {
    return result((Number(match[1]) * Number(match[2])) ** 2, "cm²", "area enlargement");
  }
  if ((match = prompt.match(/^Cari min bagi ([\d, ]+)\.$/))) {
    const values = match[1].split(", ").map(Number);
    return result(values.reduce((sum, value) => sum + value, 0) / values.length, "", "mean");
  }
  if ((match = prompt.match(/^Data ialah ([\d, ]+)\. Berapakah julat data\?$/))) {
    const values = match[1].split(", ").map(Number);
    return result(Math.max(...values) - Math.min(...values), "", "range");
  }
  if ((match = prompt.match(/^Dalam jadual kekerapan, nilai (\d+) mempunyai kekerapan (\d+) dan nilai (\d+) mempunyai kekerapan (\d+)\. Cari min bagi kelima-lima data\.$/))) {
    const [firstValue, firstCount, secondValue, secondCount] = match.slice(1).map(Number);
    if (firstCount + secondCount !== 5) throw new Error(`Frequency total contradicts the prompt: ${prompt}`);
    const observations = [...Array(firstCount).fill(firstValue), ...Array(secondCount).fill(secondValue)] as number[];
    return result(observations.reduce((sum, value) => sum + value, 0) / observations.length, "", "frequency mean");
  }
  throw new Error(`No independent answer check for prompt: ${prompt}`);
}

function optionValue(option: string, unit: Unit): number {
  if (unit === "RM") {
    const match = option.match(/^RM(\d+)\.(\d{2})$/);
    if (!match) throw new Error(`Invalid ringgit option: ${option}`);
    return Number(match[1]) * 100 + Number(match[2]);
  }
  const suffix = unit ? ` ${unit}` : "";
  if (!option.endsWith(suffix)) throw new Error(`Expected unit ${unit}: ${option}`);
  const number = suffix ? option.slice(0, -suffix.length) : option;
  if (!/^-?\d+(\.\d+)?$/.test(number)) throw new Error(`Invalid numeric option: ${option}`);
  return Number(number);
}

const levels = Object.entries(mathematicsBank);
const allQuestions: Question[] = levels.flatMap(([, subjects]) => subjects.math.flatMap(topic => topic.questions));

describe("supplemental mathematics practice bank", () => {
  it("has exactly one mathematically correct option for every learner-visible question", () => {
    for (const question of allQuestions) {
      const solution = solvePrompt(question.prompt);
      expect(Number.isFinite(solution.value), question.id).toBe(true);
      const values = question.options.map(option => optionValue(option, solution.unit));
      expect(new Set(values).size, `${question.id}: numerically distinct options`).toBe(4);
      const matches = values.flatMap((value, index) => Math.abs(value - solution.value) < 1e-8 ? [index] : []);
      expect(matches, `${question.id}: ${question.prompt}`).toEqual([question.answer]);
    }
  });

  it("offers at least three five-question sets per topic across Darjah 1–6 and Tingkatan 1–5", () => {
    expect(levels.map(([level]) => level).sort()).toEqual(["d1", "d2", "d3", "d4", "d5", "d6", "t1", "t2", "t3", "t4", "t5"]);
    for (const [level, subjects] of levels) {
      expect(subjects.math.length, level).toBeGreaterThanOrEqual(3);
      expect(new Set(subjects.math.map(topic => topic.id)).size, level).toBe(subjects.math.length);
      for (const topic of subjects.math) expect(topic.questions.length, `${level}/${topic.id}`).toBeGreaterThanOrEqual(15);
    }
  });

  it("keeps saved-history IDs globally unique and avoids repeated prompts within a level", () => {
    expect(new Set(allQuestions.map(question => question.id)).size).toBe(allQuestions.length);
    expect(new Set(allQuestions.map(question => question.prompt.trim())).size).toBe(allQuestions.length);
    for (const [level, subjects] of levels) {
      const questions = subjects.math.flatMap(topic => topic.questions);
      const prompts = questions.map(question => question.prompt.trim().replace(/\s+/g, " "));
      expect(new Set(prompts).size, level).toBe(questions.length);
    }
  });

  it("provides four distinct choices, valid answer positions, and explanations", () => {
    for (const [, subjects] of levels) {
      for (const topic of subjects.math) {
        expect(new Set(topic.questions.map(question => question.answer)).size, topic.id).toBe(4);
        for (const question of topic.questions) {
          expect(question.options, question.id).toHaveLength(4);
          expect(new Set(question.options.map(option => option.trim())).size, question.id).toBe(4);
          expect(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, question.id).toBe(true);
          expect(question.explanation.trim().length, question.id).toBeGreaterThan(20);
        }
      }
    }
  });

  it("does not let learners answer a topic by always choosing the smallest or largest number", () => {
    for (const [level, subjects] of levels) {
      for (const topic of subjects.math) {
        const correctRanks = topic.questions.map(question => {
          const solution = solvePrompt(question.prompt);
          return question.options.filter(option => optionValue(option, solution.unit) < solution.value).length;
        });
        expect(new Set(correctRanks).size, `${level}/${topic.id}: vary the numerical rank of the answer`).toBeGreaterThan(1);
      }
    }
  });

  it("retains checks for money, patterns, algebra, geometry, and statistical question families", () => {
    const concepts = new Set(allQuestions.map(question => solvePrompt(question.prompt).concept));
    expect([...concepts].sort()).toEqual([
      "addition", "area enlargement", "change", "coins", "cylinder volume", "direct variation", "distance", "frequency mean", "indices",
      "linear equation", "mean", "multiplication", "perimeter", "quadratic equation", "range", "scale conversion", "sequence", "subtraction",
    ].sort());
  });

  it("covers money carrying/borrowing and the full generated cylinder and sequence ranges", () => {
    const valuesFor = (concept: string) => allQuestions.map(question => solvePrompt(question.prompt)).filter(solution => solution.concept === concept).map(solution => solution.value);
    // Explicit boundary expectations are hand-calculated from the visible problems.
    expect([Math.min(...valuesFor("coins")), Math.max(...valuesFor("coins"))]).toEqual([20, 310]);
    expect([Math.min(...valuesFor("change")), Math.max(...valuesFor("change"))]).toEqual([100, 550]);
    expect([Math.min(...valuesFor("cylinder volume")), Math.max(...valuesFor("cylinder volume"))]).toEqual([462, 2772]);
    expect([Math.min(...valuesFor("sequence")), Math.max(...valuesFor("sequence"))]).toEqual([5, 62]);
  });
});
