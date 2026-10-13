import { expect, it } from "vitest";
import { libraryUnits, libraryResources, expansionUnits } from "../../server/library/catalog.js";
import { readingSources } from "../../server/library/readingSources.js";
import { validPictureSupport } from "../../server/library/earlyLearning.js";
import { getSubjectsForLevel, levels, getTopics } from "./curriculum";

const added = expansionUnits;
const normal = (s: string) => s.normalize("NFKC").toLocaleLowerCase("ms-MY").replace(/\s+/g, " ").trim();
it("provides 100 linked notes, readings and practice sets per grade", () => {
  expect(added.length).toBe(1068);
  for (const level of levels) {
    expect(libraryUnits.filter(u => u.levelId === level.id), level.id).toHaveLength(100);
    for (const kind of ["note", "reading", "practice"])
      expect(libraryResources.filter(r => r.levelIds[0] === level.id && r.kind === kind), `${level.id}/${kind}`).toHaveLength(100);
  }
});
it("grounds every added question in its own reading and varies the task", () => {
  for (const unit of added) {
    expect(unit.sourceIds?.length, unit.id).toBeGreaterThan(0);
    expect(unit.sourceIds!.every(id => readingSources.some(s => s.id === id && s.levels.includes(unit.levelId))), unit.id).toBe(true);
    const questions = [...unit.reading.questions!, ...unit.practice.questions!];
    expect(questions, unit.id).toHaveLength(6);
    expect(questions.filter(q => !/_{3,}/.test(q.prompt)).length, unit.id).toBeGreaterThanOrEqual(2);
    for (const q of questions) {
      const evidence = q.evidence!;
      expect(evidence, `${unit.id}: ${q.prompt}`).toBeDefined();
      expect(Number.isInteger(evidence.paragraph), unit.id).toBe(true);
      expect(unit.reading.body[evidence.paragraph], unit.id).toContain(evidence.text);
      expect(evidence.text.trim().length, unit.id).toBeGreaterThan(5);
    }
    const passage = normal(unit.reading.body.join(" "));
    // Linked resources may repeat a taught principle; the reading must add content.
    expect(passage, `${unit.id}: identical note and reading`).not.toBe(normal(unit.note.body.join(" ")));
  }
});
it("keeps added titles and teaching bodies distinct across grades", () => {
  for (const kind of ["note", "reading"] as const) {
    const seen = new Map<string, string>();
    for (const unit of libraryUnits) {
      const body = normal(unit[kind].body.join(" "));
      expect(seen.get(body), `${unit.id}: duplicates ${seen.get(body)}`).toBeUndefined();
      seen.set(body, unit.id);
    }
  }
});
it("provides a valid visual for every D1 reading paragraph and choice", () => {
  for (const unit of added.filter(u => u.levelId === "d1")) {
    unit.reading.body.forEach((_, index) => {
      const illustrations = unit.reading.illustrations?.filter(i => i.afterParagraph === index) ?? [];
      expect(illustrations, `${unit.id}/${index}`).toHaveLength(1);
      expect(validPictureSupport({choices:Array(4).fill(illustrations[0].visual)}), unit.id).toBe(true);
    });
    for (const q of [...unit.reading.questions!, ...unit.practice.questions!])
      expect(validPictureSupport(q.support), `${unit.id}/${q.prompt}`).toBe(true);
  }
});
it("makes the same six questions available in matching grade and subject practice", () => {
  for (const level of levels) for (const subject of getSubjectsForLevel(level.id)) {
    const topics = getTopics(level.id, subject.id);
    for (const unit of added.filter(u => u.levelId === level.id && u.subjectId === subject.id)) {
      const topic = topics.find(t => t.unitId === unit.id);
      expect(topic, unit.id).toBeDefined();
      expect(topic!.questions, unit.id).toHaveLength(6);
    }
  }
});
