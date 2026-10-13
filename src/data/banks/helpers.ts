import type { LevelId, Question, Topic } from "../../types";

// Keys are permanent: change the key when the meaning or correct answer changes.
export type BankRow = readonly [key: string, prompt: string, correct: string, distractors: readonly [string, string, string], explanation: string];
export type LevelBank = Partial<Record<LevelId, Record<string, Topic[]>>>;
export function bankTopic(level: LevelId, subject: string, slug: string, name: string, rows: readonly BankRow[]): Topic {
  const questions: Question[] = rows.map(([key, prompt, correct, distractors, explanation]) => {
    const id = `bank-v2-${level}-${subject}-${slug}-${key}`;
    let hash = 2166136261;
    for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    const answer = ((hash ^ (hash >>> 16)) >>> 0) % 4;
    const options = [...distractors];
    options.splice(answer, 0, correct);
    return { id, prompt, options, answer, explanation };
  });
  return { id: `practice-${slug}`, name, description: "Latihan konsep dan aplikasi mengikut tahap. Set pendek boleh disambung pada bila-bila masa.", target: 80, questions };
}
