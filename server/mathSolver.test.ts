import { describe, expect, it } from "vitest";
import { solveBasicMath, type MathHistoryRow } from "./mathSolver.js";

function turn(question: string, history: MathHistoryRow[] = []) {
  const result = solveBasicMath(question, history);
  expect(result).not.toBeNull();
  return { result: result!, history: [{ question, ...result! }, ...history] };
}

describe("teach-first verified math", () => {
  it("keeps continue and hint requests on the teaching path", () => {
    const first = turn("10 tambah berapa menjadi 323");
    expect(first.result.provider).toBe("verified-math-teach");
    expect(first.result.answer).toContain("323 − 10");
    expect(first.result.answer).not.toContain("313");
    const next = turn("teruskan", first.history);
    expect(next.result.provider).toBe("verified-math-teach");
    expect(next.result.answer).not.toBe(first.result.answer);
    expect(next.result.answer).not.toContain("313");
    const hint = turn("Saya perlukan petunjuk", next.history);
    expect(hint.result.provider).toBe("verified-math-teach");
    expect(hint.result.answer).not.toBe(next.result.answer);
    expect(hint.result.answer).not.toContain("313");
    const worked = turn("Tunjukkan langkah penyelesaian", hint.history);
    expect(worked.result.provider).toBe("verified-math");
    expect(worked.result.answer).toContain("313");
  });

  it("retains the exercise through repeated wrong attempts and accepts a later correct answer", () => {
    const first = turn("50x10 berapa jumlahnya");
    const wrong = turn("5", first.history);
    expect(wrong.result.provider).toBe("verified-math-teach");
    expect(wrong.result.answer).toContain("Belum tepat");
    expect(wrong.result.answer).not.toContain("500");
    const wrongAgain = turn("50", wrong.history);
    expect(wrongAgain.result.provider).toBe("verified-math-teach");
    expect(wrongAgain.result.answer).not.toContain("500");
    const correct = turn("500", wrongAgain.history);
    expect(correct.result.provider).toBe("verified-math");
    expect(correct.result.answer).toContain("Betul");
  });

  it("does not reveal a repeated exercise or generic answer request", () => {
    const first = turn("8 + 9");
    expect(turn("8 + 9", first.history).result.provider).toBe("verified-math-teach");
    expect(turn("beri jawapan", first.history).result.provider).toBe("verified-math-teach");
    expect(solveBasicMath("Tunjukkan langkah penyelesaian")).toBeNull();
  });

  it("starts a new exercise instead of checking it as an attempt", () => {
    const first = turn("50 x 10");
    const next = turn("8 + 9", first.history);
    expect(next.result.provider).toBe("verified-math-teach");
    expect(turn("17", next.history).result.provider).toBe("verified-math");
  });

  it.each(["gemini-free:test", "verified-math"])("stops at a completed or unrelated %s turn", (provider) => {
    const first = turn("50x10 berapa jumlahnya");
    const history = [{ question: "Kenapa pecahan setara?", answer: "Penjelasan.", provider }, ...first.history];
    expect(solveBasicMath("teruskan", history)).toBeNull();
    expect(solveBasicMath("500", history)).toBeNull();
  });

  it("does not skip an unrelated teaching row to resume stale math", () => {
    const first = turn("50 x 10");
    const history = [{ question: "ceritakan tentang tumbuhan", answer: "Cuba dahulu.", provider: "verified-math-teach" }, ...first.history];
    expect(solveBasicMath("teruskan", history)).toBeNull();
  });
});

describe("bounded exact math", () => {
  it.each([
    ["1/2 + 1/4", "3/4", "2/4", "3/4"],
    ["3/4 - 1/2", "1/4", "2/4", "1/4"],
  ])("teaches equivalent fractions for %s before accepting %s", (question, attempt, equivalent, answer) => {
    const first = turn(question);
    expect(first.result.provider).toBe("verified-math-teach");
    expect(first.result.answer).toContain("penyebut");
    expect(first.result.answer).toContain("jawapan akhir");
    expect(first.result.answer).not.toContain("Apakah penyebut");
    expect(first.result.answer).not.toContain(answer);
    const hint = turn("Saya perlukan petunjuk", first.history);
    expect(hint.result.answer).toContain(equivalent);
    expect(hint.result.answer).not.toContain("= " + answer);
    const correct = turn(attempt, hint.history);
    expect(correct.result.provider).toBe("verified-math");
    expect(correct.result.answer).toContain("Betul");
    expect(correct.result.answer).toContain(answer);
  });

  it("recognizes equivalent fraction and decimal attempts without starting division", () => {
    const first = turn("1/2 + 1/4");
    expect(turn("6/8", first.history).result.provider).toBe("verified-math");
    expect(turn("0.75", first.history).result.provider).toBe("verified-math");
    const wrong = turn("1/4", first.history);
    expect(wrong.result.provider).toBe("verified-math-teach");
    expect(wrong.result.answer).toContain("Belum tepat");
    expect(turn("3/4", wrong.history).result.provider).toBe("verified-math");
  });

  it.each([
    ["x + 7 = 15", "x = 8", "8"],
    ["2x + 3 = 11", "4", "4"],
    ["3x - 2 = 7", "3", "3"],
    ["2x + 3 = 4", "1/2", "1/2"],
  ])("teaches balance for %s and checks the actual solution", (question, attempt, answer) => {
    const first = turn(question);
    expect(first.result.provider).toBe("verified-math-teach");
    expect(first.result.answer).toContain("kedua-dua belah");
    expect(first.result.answer).toContain("nilai x");
    expect(first.result.answer).not.toContain("x = " + answer);
    const wrong = turn("5", first.history);
    expect(wrong.result.provider).toBe("verified-math-teach");
    const hint = turn("teruskan", wrong.history);
    expect(hint.result.provider).toBe("verified-math-teach");
    const correct = turn(attempt, hint.history);
    expect(correct.result.provider).toBe("verified-math");
    expect(correct.result.answer).toContain("Betul");
    expect(correct.result.answer).toContain("x = " + answer);
  });

  it("shows a worked equation only after an explicit request following teaching", () => {
    const first = turn("2x + 3 = 11");
    const worked = turn("Tunjukkan langkah penyelesaian", first.history);
    expect(worked.result.provider).toBe("verified-math");
    expect(worked.result.answer).toContain("2x = 8");
    expect(worked.result.answer).toContain("x = 4");
    expect(worked.result.answer).toContain("kedua-dua belah");
  });

  it("checks decimals exactly and rejects a numerically close wrong answer", () => {
    const first = turn("0.1 + 0.2");
    expect(turn("0.3", first.history).result.provider).toBe("verified-math");
    expect(turn("0.3000000001", first.history).result.provider).toBe("verified-math-teach");
    expect(turn("0.3000000001", first.history).result.answer).toContain("Belum tepat");
  });

  it.each([
    "1/2 + 1/4 + 1/8", "1/2 + 1/4 garbage", "1 / 2 + 1 / 0",
    "2 + 3 * 4", "2 + 3 hello", "2 + 3 = 100", "50x10 + 2",
    "10 tambah berapa menjadi 323 tambah 4", "1,5 + 2", "1 / 0",
    "x + 7 = 15 + 2", "2x + 3 = 11y", "x^2 + 3 = 11",
    "0x + 3 = 11", "x + x = 10", "1e3 + 2",
  ])("returns null for unsupported or invalid input %s", (question) => {
    expect(solveBasicMath(question)).toBeNull();
  });
  it.each(["3 13", "3. 13", "31 3", "313!"])("rejects malformed attempts without joining digits: %s", (attempt) => {
    const first = turn("10 tambah berapa menjadi 323");
    expect(solveBasicMath(attempt, first.history)).toBeNull();
  });

  it("accepts spaced fractions but requires exact division results", () => {
    const fraction = turn("1/2 + 1/4");
    expect(turn("3 / 4", fraction.history).result.provider).toBe("verified-math");
    const division = turn("1 / 3");
    expect(turn("0.333333333333", division.history).result.provider).toBe("verified-math-teach");
    expect(turn("1/3", division.history).result.provider).toBe("verified-math");
  });

  it.each(["2 + 3!", "2 + 3!!", "1000000000000 + 2", "2x + 3 = 11!"])("rejects unsupported suffixes or oversized literals: %s", (question) => {
    expect(solveBasicMath(question)).toBeNull();
  });

});
