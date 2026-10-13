import type { LevelId, Question } from "../../types";
import { additionalTopics } from "./index";

// Explicit editorial mappings: only these existing numerical families are taught by the
// selected Library unit. A shared subject name or stage is never enough to publish a row.
const mathematicsMapping: Partial<Record<LevelId, { unitId: string; topicId: string; keyPrefix?: string }>> = {
  d2: { unitId: "library-d2-math-puluh-dan-sa", topicId: "practice-number-lab", keyPrefix: "add-" },
  d3: { unitId: "library-d3-math-kumpulan-sama-banyak", topicId: "practice-daily-maths" },
  d5: { unitId: "library-d5-math-perpuluhan-dan-wang", topicId: "practice-patterns-money" },
  t1: { unitId: "library-t1-math-persamaan-seimbang", topicId: "practice-algebra-lab" },
  t2: { unitId: "library-t2-math-isi-padu-silinder", topicId: "practice-measure-lab" },
  t3: { unitId: "library-t3-math-skala-dan-ukuran-sebenar", topicId: "practice-measure-lab" },
  t4: { unitId: "library-t4-math-punca-kuadratik", topicId: "practice-algebra-lab" },
  t5: { unitId: "library-t5-math-ubah-langsung-songsang", topicId: "practice-algebra-lab" },
};

export function mappedSupplement(levelId: LevelId, subjectId: string, unitId: string): Question[] {
  const mapping = subjectId === "math" ? mathematicsMapping[levelId] : undefined;
  if (!mapping || mapping.unitId !== unitId) return [];
  const topic = additionalTopics(levelId,subjectId).find(t => t.id === mapping.topicId);
  return (topic?.questions ?? []).filter(q => !mapping.keyPrefix || q.id.includes(`-${mapping.keyPrefix}`)).map(q => ({
    ...q, originTopicId: topic!.id, difficulty: 2, resourceIds: [`${unitId}-note`], hint: "Gunakan langkah dalam nota unit. Semak operasi, nilai tempat dan unit jawapan.",
  }));
}
