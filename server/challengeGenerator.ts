import { createHash } from "node:crypto";
import bankJson from "./challengeBank.json" with { type: "json" };
import { libraryResources } from "./library/catalog.js";
import { learningPolicy } from "./library/learningPolicy.js";
import { validPictureSupport } from "./library/earlyLearning.js";
import { challengeTemplates } from "./challengeTemplates.js";
import { generateReviewedChallengeQuestions, type ChallengeCloud } from "./challengeAi.js";
import type { ChallengeBankSubject, ChallengeGenerationInput, ChallengeGenerationResult, ChallengeHistory, ChallengePhase, ChallengeQuestion } from "./challengeContracts.js";

const bank = bankJson as ChallengeBankSubject[];
export const normalizeChallengePrompt = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[“”‘’"'`]/gu, "").replace(/[\p{Z}\p{Cf}\s]+/gu, " ").trim().replace(/[?!.。？！]+$/gu, "").trim();
export const normalizeChallengeOption = (text: string) => text.normalize("NFKC").replace(/\s+/gu, " ").trim();
export function challengeFingerprint(levelId: string, subjectId: string, prompt: string, correctAnswer: string): string {
  return createHash("sha256").update(JSON.stringify([levelId, subjectId, normalizeChallengePrompt(prompt), normalizeChallengePrompt(correctAnswer)])).digest("hex").slice(0, 32);
}

export function validateChallengeQuestion(question: ChallengeQuestion): boolean {
  if (!question || typeof question !== "object") return false;
  if (question.support !== undefined && !validPictureSupport(question.support)) return false;
  if (!["prompt", "hint", "explanation", "conceptId", "topicId", "topicName"].every(k => typeof question[k as keyof ChallengeQuestion] === "string" && String(question[k as keyof ChallengeQuestion]).trim())) return false;
  return question.prompt.length <= 10000 && question.explanation.length <= 4000 && question.hint.length <= 1500 && Array.isArray(question.options) && question.options.length === 4 && question.options.every(o => typeof o === "string" && o.trim() && o.length <= 2000) && new Set(question.options.map(normalizeChallengeOption)).size === 4 && Number.isInteger(question.answer) && question.answer >= 0 && question.answer <= 3 && [1, 2, 3].includes(question.difficulty) && ["bank", "template", "ai-reviewed"].includes(question.source);
}

function uniqueQuestions(subject: ChallengeBankSubject, questions: ChallengeQuestion[]): ChallengeQuestion[] {
  const prompts = new Set<string>();
  const result: ChallengeQuestion[] = [];
  for (const q of questions) {
    if (!validateChallengeQuestion(q)) continue;
    const normalized = normalizeChallengePrompt(q.prompt);
    if (prompts.has(normalized)) continue;
    prompts.add(normalized);
    const fingerprint = challengeFingerprint(subject.levelId, subject.subjectId, q.prompt, q.options[q.answer]!);
    result.push({ ...q, options: [...q.options], fingerprint, id: `challenge-${fingerprint}` });
  }
  return result;
}

function libraryQuestions(subject: ChallengeBankSubject): ChallengeQuestion[] {
  return libraryResources.filter(r => r.levelIds.includes(subject.levelId as never) && r.subjectId === subject.subjectId).flatMap(resource => (resource.questions ?? []).map((q): ChallengeQuestion => ({
    ...q, id: q.id ?? `${resource.id}-q`, fingerprint: "", conceptId: resource.unitId, topicId: resource.unitId, topicName: resource.title, source: "bank", difficulty: q.support ? 1 : resource.kind === "practice" ? 2 : 1,
    // Reading/practice questions depend on the authored passage. Keep it with the question.
    prompt: q.support ? q.prompt : `${(resource.readingBody ?? resource.body).join("\n\n")}\n\n${q.prompt}`, resourceIds: [resource.id],
  })));
}

export const challengeSubjects = () => bank.map(({ levelId, levelName, subjectId, subjectName }) => ({ levelId, levelName, subjectId, subjectName }));

export interface ChallengeGeneratorOptions {
  subjects?: ChallengeBankSubject[];
  cloud?: ChallengeCloud | null;
  now?: () => number;
  includeLibrary?: boolean;
  includeTemplates?: boolean;
}

/** Bounded per-process cache: <=160 reviewed AI items per known subject, two cloud batches at once. */
export function createChallengeGenerator(options: ChallengeGeneratorOptions = {}) {
  const subjects = options.subjects ?? bank;
  const cloud = options.cloud === undefined ? generateReviewedChallengeQuestions : options.cloud;
  const now = options.now ?? Date.now;
  const pools = new Map(subjects.map(subject => [`${subject.levelId}:${subject.subjectId}`, uniqueQuestions(subject, [
    ...(options.includeLibrary === false ? [] : libraryQuestions(subject)), ...subject.questions,
    ...(options.includeTemplates === false ? [] : challengeTemplates(subject)),
  ])]));
  const cache = new Map<string, ChallengeQuestion[]>();
  const pending = new Map<string, Promise<boolean>>();
  const nextAttempt = new Map<string, number>();
  let activeCloud = 0;

  async function replenish(subject: ChallengeBankSubject, key: string, existing: ChallengeQuestion[], count: number): Promise<boolean> {
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    // Early learners use authored picture activities; free-text model output is not a pre-reader activity.
    if (!cloud || subject.levelId === "d1" || activeCloud >= 2 || (nextAttempt.get(key) ?? 0) > now()) return false;
    nextAttempt.set(key, now() + 60_000);
    activeCloud++;
    const task = (async () => {
      try {
        const references = libraryResources.filter(r => r.kind === "note" && r.levelIds.includes(subject.levelId as never) && r.subjectId === subject.subjectId).map(({ id, title, body }) => ({ id, title, body }));
        if (!references.length) return false;
        const generated = await cloud({ subject, references, existingPrompts: existing.map(q => q.prompt), count });
        const priorPrompts = new Set(existing.map(q => normalizeChallengePrompt(q.prompt)));
        const accepted = uniqueQuestions(subject, generated.filter(q => !priorPrompts.has(normalizeChallengePrompt(q.prompt)) && q.source === "ai-reviewed" && q.resourceIds?.length && q.resourceIds.every(id => references.some(r => r.id === id && q.conceptId === r.id.replace(/-note$/, "")))));
        if (!accepted.length) return false;
        cache.set(key, uniqueQuestions(subject, [...(cache.get(key) ?? []), ...accepted]).slice(-160));
        return true;
      } catch { return false; }
      finally { activeCloud--; }
    })();
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  }

  return async (input: ChallengeGenerationInput): Promise<ChallengeGenerationResult> => {
    const key = `${input.levelId}:${input.subjectId}`;
    const subject = subjects.find(s => s.levelId === input.levelId && s.subjectId === input.subjectId);
    if (!subject) throw new Error("CHALLENGE_SUBJECT_NOT_AVAILABLE");
    const maximum = learningPolicy(input.levelId).maximum;
    const history = new Map<string, ChallengeHistory>();
    for (const h of input.history) if (h.answered > 0 && h.correct >= 0 && h.correct <= h.answered) history.set(h.fingerprint, h);
    let pool = uniqueQuestions(subject, [...(pools.get(key) ?? []), ...(cache.get(key) ?? [])]);
    const notices: string[] = [];
    if (pool.filter(q => !history.has(q.fingerprint)).length < maximum) {
      const available = await replenish(subject, key, pool, Math.min(32, Math.max(6, maximum - pool.filter(q => !history.has(q.fingerprint)).length)));
      pool = uniqueQuestions(subject, [...(pools.get(key) ?? []), ...(cache.get(key) ?? [])]);
      if (!available) notices.push("Sesi ini menggunakan soalan yang tersedia. Soalan baharu belum tersedia.");
    }
    if (!pool.length) throw new Error("CHALLENGE_QUESTIONS_UNAVAILABLE: Tiada soalan sah tersedia untuk subjek ini. Cuba latihan topik sementara menunggu soalan baharu.");
    notices.push(`Sesi ini mempunyai ${Math.min(pool.length,maximum)} soalan; maksimum ${maximum} untuk rentak gred ini. Kamu boleh sambung sesi lain selepas selesai.`);
    notices.push("Latihan meliputi unit Library pilihan yang dipaparkan, bukan keseluruhan silibus atau gred peperiksaan rasmi.");

    const recent = [...history.values()].sort((a, b) => b.lastAnsweredAt.localeCompare(a.lastAnsweredAt)).slice(0, 30);
    const answered = recent.reduce((sum, h) => sum + h.answered, 0);
    const accuracy = answered ? recent.reduce((sum, h) => sum + h.correct, 0) / answered : null;
    const target = accuracy === null ? Math.min(2, 1 + Math.floor(Math.max(0, input.stage - 1) / 4)) : accuracy < 0.6 ? 1 : accuracy < 0.85 ? 2 : 3;
    const topics = new Map<string, { answered: number; correct: number }>();
    for (const h of history.values()) {
      const topic = topics.get(h.topicId) ?? { answered: 0, correct: 0 };
      topic.answered += h.answered; topic.correct += h.correct; topics.set(h.topicId, topic);
    }
    const weak = new Set([...topics].filter(([, t]) => t.correct / t.answered < 0.8).map(([id]) => id));
    const tie = (q: ChallengeQuestion) => createHash("sha256").update(`${input.seed}:${q.fingerprint}`).digest("hex");
    const order = (a: ChallengeQuestion, b: ChallengeQuestion) => {
      const ah = history.get(a.fingerprint), bh = history.get(b.fingerprint);
      return Number(!!ah) - Number(!!bh) || (ah && bh ? ah.lastAnsweredAt.localeCompare(bh.lastAnsweredAt) : 0) || Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target) || tie(a).localeCompare(tie(b));
    };
    const remaining = [...pool].sort(order);
    const chosen: ChallengeGenerationResult["questions"] = [];
    const quota: Array<{ phase: ChallengePhase; count: number; match: (q: ChallengeQuestion) => boolean }> = [
      { phase: "review", count: Math.floor(maximum/4), match: q => history.has(q.fingerprint) },
      { phase: "current", count: Math.floor(maximum*3/8), match: q => !history.has(q.fingerprint) && q.difficulty === target },
      { phase: "strengthen", count: Math.floor(maximum/4), match: q => weak.has(q.topicId) },
      { phase: "challenge", count: Math.floor(maximum/8), match: q => q.difficulty === 3 },
    ];
    const take = (phase: ChallengePhase, count: number, match: (q: ChallengeQuestion) => boolean) => {
      let taken = 0;
      for (let i = 0; i < remaining.length && taken < count;) {
        if (!match(remaining[i]!)) { i++; continue; }
        const q = remaining.splice(i, 1)[0]!;
        chosen.push({ ...q, phase, repeat: history.has(q.fingerprint) }); taken++;
      }
      return taken;
    };
    const shortages: string[] = [];
    for (const { phase, count, match } of quota) {
      const taken = take(phase, count, match);
      if (taken < count) shortages.push(`${phase} ${taken}/${count}`);
    }
    // Missing categories become current-level practice, with actual phase labels and a visible notice.
    take("current", maximum - chosen.length, () => true);
    if (shortages.length) notices.push("Agihan soalan disesuaikan dengan latihan kamu dan soalan yang tersedia.");
    const repeats = chosen.filter(q => q.repeat).length;
    if (repeats) notices.push(`${repeats} soalan ulang kaji daripada latihan yang pernah dijawab.`);
    if (chosen.some(q => !q.resourceIds?.length)) notices.push("Sesetengah soalan belum mempunyai pautan nota.");
    return { questions: chosen, notices };
  };
}

export const generateChallenge = createChallengeGenerator();
