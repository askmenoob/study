import expansionD1 from "./expansion/d1.json" with { type: "json" };
import expansionD2 from "./expansion/d2.json" with { type: "json" };
import expansionD3 from "./expansion/d3.json" with { type: "json" };
import expansionD4 from "./expansion/d4.json" with { type: "json" };
import expansionD5 from "./expansion/d5.json" with { type: "json" };
import expansionD6 from "./expansion/d6.json" with { type: "json" };
import expansionT1 from "./expansion/t1.json" with { type: "json" };
import expansionT2 from "./expansion/t2.json" with { type: "json" };
import expansionT3 from "./expansion/t3.json" with { type: "json" };
import expansionT4 from "./expansion/t4.json" with { type: "json" };
import expansionT5 from "./expansion/t5.json" with { type: "json" };
import expansionT6 from "./expansion/t6.json" with { type: "json" };
import languages from "./languages.json" with { type: "json" };
import stem from "./stem.json" with { type: "json" };
import humanities from "./humanities.json" with { type: "json" };
import stpm from "./stpm.json" with { type: "json" };
import primaryMalay from "./primaryMalay.json" with { type: "json" };
import primaryEnglish from "./primaryEnglish.json" with { type: "json" };
import primaryStem from "./primaryStem.json" with { type: "json" };
import { earlyLibraryUnits, type PictureSupport } from "./earlyLearning.js";
import { unitCurriculum, type UnitCurriculum } from "./learningPolicy.js";
import { reviseLibraryUnit } from "./curriculumEdits.js";

export type LibraryLevelId = "d1" | "d2" | "d3" | "d4" | "d5" | "d6" | "t1" | "t2" | "t3" | "t4" | "t5" | "t6";
export type LibraryKind = "note" | "reading" | "practice";
export interface ReadingEvidence { paragraph: number; text: string }
export interface ReadingIllustration { afterParagraph: number; caption: string; visual: import("./earlyLearning.js").LearningVisual }
export type LibraryQuestion = { id?: string; prompt: string; options: string[]; answer: number; explanation: string; hint: string; support?: PictureSupport; evidence?: ReadingEvidence };
type Section = { title: string; summary: string; body: string[]; keyPoints?: string[]; vocabulary?: { term: string; meaning: string }[]; questions?: LibraryQuestion[]; illustrations?: ReadingIllustration[] };
export type LibraryUnit = { id: string; levelId: LibraryLevelId; subjectId: string; note: Section; reading: Section; practice: Section; sourceIds?: string[] };
export type LibraryResource = Section & {
  id: string; unitId: string; kind: LibraryKind; subjectId: string;
  levelIds: LibraryLevelId[]; stages: ("KSSR" | "KSSM" | "STPM")[]; minutes: number;
  language: "ms" | "en" | "zh" | "ta" | "ar";
  curriculum: UnitCurriculum;
  sourceIds?: string[];
  readingBody?: string[];
};

const englishSubjects = new Set(["en", "lit_en", "mgmt_math", "stpm_math", "ict", "physics", "chemistry", "biology"]);

// One authored source feeds both the offline reader and server tutor retrieval.
// Structural and full selectable-subject coverage are checked before release.
export const archivedEarlyUnits = [...languages, ...stem, ...humanities, ...stpm].filter(u => u.levelId === "d1") as LibraryUnit[];
export const archivedRevisedUnits = (stpm as LibraryUnit[]).filter(u => reviseLibraryUnit(u).id !== u.id);
export const primaryReadingUnits = [...primaryMalay, ...primaryEnglish, ...primaryStem] as LibraryUnit[];
export const expansionUnits = [...expansionD1, ...expansionD2, ...expansionD3, ...expansionD4, ...expansionD5, ...expansionD6, ...expansionT1, ...expansionT2, ...expansionT3, ...expansionT4, ...expansionT5, ...expansionT6] as LibraryUnit[];
export const libraryUnits = ([...languages, ...stem, ...humanities, ...stpm].filter(u => u.levelId !== "d1") as LibraryUnit[])
  .concat(earlyLibraryUnits, primaryReadingUnits, expansionUnits).map(reviseLibraryUnit).map(unit => ({ ...unit, curriculum: unitCurriculum(unit.levelId, unit.subjectId, unit.note.keyPoints ?? [unit.note.summary],unit.id) }));
export const libraryResources: LibraryResource[] = libraryUnits.flatMap(unit =>
  (["note", "reading", "practice"] as const).map((kind): LibraryResource => ({
    ...unit[kind],
    id: `${unit.id}-${kind}`,
    unitId: unit.id,
    kind,
    subjectId: unit.subjectId,
    curriculum: unit.curriculum,
    sourceIds: unit.sourceIds,
    readingBody: unit.sourceIds ? unit.reading.body : undefined,
    language: unit.subjectId === "bc" ? "zh" : unit.subjectId === "bt" ? "ta" : unit.subjectId === "ba" ? "ar" : englishSubjects.has(unit.subjectId) ? "en" : "ms",
    levelIds: [unit.levelId],
    stages: [unit.levelId.startsWith("d") ? "KSSR" : unit.levelId === "t6" ? "STPM" : "KSSM"],
    minutes: Math.max(3, Math.ceil(unit[kind].body.join(" ").length / 650) + (unit[kind].questions?.length ?? 0)),
    questions: unit[kind].questions?.map((question, index) => ({ ...question, id: `${unit.id}-${kind}-q${index + 1}` })),
  })),
);
