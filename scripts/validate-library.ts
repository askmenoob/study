import { libraryUnits, libraryResources } from "../server/library/catalog";
import { getSubjectsForLevel, levels } from "../src/data/curriculum";
import { resources, isResourceForLevel } from "../src/data/resources";

const errors: string[] = [];
const check = (ok: unknown, message: string) => { if (!ok) errors.push(message); };
const unique = (items: string[]) => new Set(items).size === items.length;
const normal = (text: string) => text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ms-MY");
check(unique(resources.map(r => r.id)), "Resource IDs must be unique, including existing resources.");
check(unique(libraryUnits.map(u => u.id)), "Unit IDs must be unique.");
check(unique(libraryResources.map(r => normal(r.title))), "New resource titles must be distinct.");
check(unique(libraryResources.map(r => normal(r.body.join(" ")))), "New resource bodies must be distinct.");

for (const unit of libraryUnits) {
  const level = levels.find(l => l.id === unit.levelId);
  check(level && getSubjectsForLevel(level.id).some(s => s.id === unit.subjectId), `${unit.id}: valid level and subject required`);
  check(unit.id.startsWith(`library-${unit.levelId}-${unit.subjectId}-`), `${unit.id}: stable ID prefix`);
  check(unit.note.body.length >= 3 && (unit.note.keyPoints?.length ?? 0) >= 3, `${unit.id}: explanation, example and key points required`);
  check(unit.note.body.join(" ").length >= (unit.levelId === "d1" ? 80 : 160), `${unit.id}: note has too little content`);
  check(unit.reading.body.join(" ").length >= (unit.levelId === "d1" ? 30 : 140), `${unit.id}: reading has too little context`);
  check(unit.reading.questions?.length === 2 && unit.practice.questions?.length === 4, `${unit.id}: requires two reading and four practice questions`);
  check(unit.curriculum.objectives.length >= 3, `${unit.id}: explicit learning objectives required`);
  const positions = new Set<number>();
  for (const kind of ["note", "reading", "practice"] as const) {
    const part = unit[kind];
    check(part.title.trim().length > 3 && part.summary.trim().length > 10, `${unit.id}/${kind}: descriptive title and summary required`);
    check(part.body.every(p => typeof p === "string" && p.trim().length > 0), `${unit.id}/${kind}: empty body paragraph`);
    check(!/\b(?:TODO|TBD|lorem ipsum)\b/i.test(JSON.stringify(part)), `${unit.id}/${kind}: unfinished content`);
    for (const [index, question] of (part.questions ?? []).entries()) {
      const prefix = `${unit.id}/${kind}/${index + 1}`;
      // Case and punctuation can be the learning objective in language questions.
      check(question.options.length === 4 && unique(question.options.map(o => o.normalize("NFKC").trim().replace(/\s+/g, " "))) && question.options.every(o => o.trim()), `${prefix}: four distinct nonempty options required`);
      check(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, `${prefix}: invalid answer`);
      check(question.prompt.trim().length > 5 && question.explanation.trim().length > 15 && question.hint?.trim().length > 10, `${prefix}: prompt, explanation and hint required`);
      if (unit.levelId === "d1") check(question.support?.choices.length === 4, `${prefix}: pre-reader picture choices required`);
      positions.add(question.answer);
    }
  }
  check(positions.size >= 2, `${unit.id}: correct answer position never varies`);
}

const coverage = levels.map(level => {
  const subjects = getSubjectsForLevel(level.id);
  for (const subject of subjects) {
    check(libraryUnits.filter(u => u.levelId === level.id && u.subjectId === subject.id).length >= 1, `${level.id}/${subject.id}: unit missing`);
    for (const kind of ["note", "reading", "practice"] as const) {
      check(libraryResources.some(r => r.levelIds[0] === level.id && r.subjectId === subject.id && r.kind === kind), `${level.id}/${subject.id}/${kind}: material missing`);
    }
  }
  return { level: level.id, subjects: subjects.length, newMaterials: libraryResources.filter(r => r.levelIds[0] === level.id).length, totalMaterials: resources.filter(r => isResourceForLevel(r, level.id, level.stage)).length };
});
const result = { units: libraryUnits.length, newMaterials: libraryResources.length, totalMaterials: resources.length, newQuestions: libraryResources.reduce((n,r) => n + (r.questions?.length ?? 0),0), coverage, errors };
console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 1 : 0;
