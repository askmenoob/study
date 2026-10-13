import { getSubjectsForLevel, getTopics, levels } from "../src/data/curriculum";
import { additionalTopics } from "../src/data/banks";
let errors = 0, topics = 0, questions = 0, additionalQuestions = 0;
const coverage: Record<string, Record<string, number>> = {};
const fail = (message: string) => { console.error(message); errors++; };
for (const level of levels) {
  coverage[level.id] = {};
  for (const subject of getSubjectsForLevel(level.id)) {
    const list = getTopics(level.id,subject.id);
    const ids = new Set<string>();
    const extra = additionalTopics(level.id,subject.id).flatMap(t=>t.questions);
    if (extra.length < 8) fail(`Insufficient additional questions: ${level.id}/${subject.id}`);
    additionalQuestions += extra.length;
    topics += list.length;
    const all = list.flatMap(t=>t.questions);
    questions += all.length; coverage[level.id][subject.id] = all.length;
    if (!list.length || new Set(list.map(t=>t.id)).size !== list.length) fail(`Invalid topics: ${level.id}/${subject.id}`);
    for (const q of all) {
      if (ids.has(q.id)) fail(`Duplicate ID: ${level.id}/${subject.id}/${q.id}`);
      ids.add(q.id);
      if (!q.prompt.trim() || !q.explanation.trim() || q.options.length !== 4 || q.options.some(o=>!o.trim()) || new Set(q.options.map(o=>o.trim())).size !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) fail(`Invalid question: ${q.id}`);
    }
  }
}
if (getSubjectsForLevel("t6").length !== 23) fail("Expected 23 STPM subjects");
console.log(JSON.stringify({ levels:levels.length, topics, questions, additionalQuestions, errors, coverage },null,2));
if (errors) process.exit(1);
