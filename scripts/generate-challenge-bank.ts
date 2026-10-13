import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { levels, getSubjectsForLevel, getTopics } from "../src/data/curriculum";
import type { ChallengeBankSubject } from "../server/challengeContracts";

// Export the same curated bank for server-side grading; never accept answer keys from clients.
const fingerprint = (prompt: string, answer: string) => createHash("sha256")
  .update([prompt, answer].map(v => v.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()).join("\n"))
  .digest("hex");
const bank: ChallengeBankSubject[] = levels.flatMap(level => getSubjectsForLevel(level.id).map(subject => ({
  levelId: level.id, levelName: level.label, subjectId: subject.id, subjectName: subject.name,
  questions: getTopics(level.id, subject.id).flatMap(topic => topic.questions.map(question => ({
    ...question, id: `bank:${level.id}:${subject.id}:${topic.id}:${question.id}`,
    fingerprint: fingerprint(question.prompt, question.options[question.answer]),
    conceptId: topic.id, topicId: topic.id, topicName: topic.name,
    hint: question.hint ?? `Gunakan contoh dalam unit ${topic.name}.`,
    difficulty: question.difficulty ?? 2, source: "bank" as const,
  }))),
})));
writeFileSync(new URL("../server/challengeBank.json", import.meta.url), JSON.stringify(bank, null, 2) + "\n");
console.log(JSON.stringify({ subjects: bank.length, questions: bank.reduce((n, s) => n + s.questions.length, 0), minimum: Math.min(...bank.map(s => s.questions.length)) }));
