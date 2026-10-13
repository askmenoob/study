import type { LibraryUnit } from "./catalog.js";

/** Keep original JSON/IDs available in the archive; revised meanings receive a new unit ID. */
export function reviseLibraryUnit(unit: LibraryUnit): LibraryUnit {
  if (unit.id === "library-d4-math-pecahan-bahagian-sama") return { ...unit, note: { ...unit.note, vocabulary: [
    { term: "Pengangka", meaning: "Bilangan bahagian yang dipilih; ditulis di atas garis pecahan." },
    { term: "Penyebut", meaning: "Bilangan bahagian sama besar dalam satu keseluruhan; ditulis di bawah garis pecahan." },
    { term: "Pecahan wajar", meaning: "Pecahan positif dengan pengangka lebih kecil daripada penyebut." },
  ] } };
  if (unit.id !== "library-t6-stpm_math-stationary-and-area") return unit;
  return {
    ...unit, id: `${unit.id}-v2`,
    note: { ...unit.note, body: [
      unit.note.body[0], unit.note.body[1],
      "A common misconception equates every definite integral with geometric area. If a graph crosses its baseline, signed contributions can cancel. Find crossings and examine signs before calculating area. This unit classifies interior local extrema using derivative tests; it does not assess extremum points at interval endpoints.",
    ], keyPoints: [
      "Use derivative signs or a valid second-derivative test to classify interior stationary points.",
      "A negative derivative indicates a decreasing function on that interval.",
      "Geometric area requires non-negative contributions relative to the baseline.",
    ] },
    practice: { ...unit.practice, title: "Classify local extrema and find area", summary: "Connect derivative signs, local extrema and area above a baseline.",
      body: ["Let f(x) = x³ − 6x² + 9x + 2 for 0 ≤ x ≤ 4. Classify the interior stationary points using derivative signs or the second derivative. The baseline used in the area question is y = 2, and that question concerns only 0 ≤ x ≤ 3. All quantities are dimensionless."],
      questions: unit.practice.questions!.map((q,i) => i !== 2 ? q : ({
        prompt: "On which open interval is f decreasing?",
        options: ["0 < x < 1", "1 < x < 3", "3 < x < 4", "0 < x < 4"], answer: 1,
        hint: "A function is decreasing where its first derivative is negative.",
        explanation: "f′(x) = 3(x − 1)(x − 3) is negative when one factor is positive and the other negative. This happens for 1 < x < 3.",
      })),
    },
  };
}
