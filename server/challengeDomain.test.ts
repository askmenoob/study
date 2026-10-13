import { describe, expect, it } from "vitest";
import type { ChallengeGenerationResult, ChallengeHistory } from "./challengeContracts.js";
import { malaysiaWeek, mutateChallenge, presentChallenge, rankingCredit, validateSnapshot, type StoredChallenge } from "./challengeDomain.js";
export function challengeFixture(total = 40, prefix = "q"): ChallengeGenerationResult {
  return { questions: Array.from({length:total},(_,i) => ({ id: `${prefix}${i}`, fingerprint: `${prefix}-fp${i}`, conceptId: "add", topicId: "number", topicName: "Nombor", prompt: `${i}+1?`, options: [String(i+1),String(i+2),String(i+3),String(i+4)], answer: 0, explanation: "PRIVATE_EXPLANATION", hint: "PRIVATE_HINT", difficulty: 1, source: "bank", phase: "current", repeat: false })), notices: total < 40 ? ["Sesi ringkas berdasarkan bahan tersedia."] : [] };
}
function row(total = 40): StoredChallenge { return { id: "session", studentId: "student", levelId: "d1", subjectId: "math", stage: 1, snapshot: challengeFixture(total), state: { answers: Array(total).fill(null), hints: Array(total).fill(false) }, status: "active", revision: 0, createdAt: new Date(0).toISOString(), completedAt: null }; }
const history = (changes: Partial<ChallengeHistory> = {}): ChallengeHistory => ({ fingerprint: "q-fp0", topicId: "number", answered: 1, correct: 0, lastCorrect: false, lastAnsweredAt: new Date(0).toISOString(), rankingAwarded: false, ...changes });
describe("challenge authoritative domain", () => {
  it("validates real 1–40 distinct questions and rejects malformed private data", () => {
    for (const total of [1,12,40]) expect(() => validateSnapshot(challengeFixture(total))).not.toThrow();
    for (const total of [0,41]) expect(() => validateSnapshot(challengeFixture(total))).toThrow("CHALLENGE_CONTENT_INVALID");
    const duplicate = challengeFixture(); duplicate.questions[1].fingerprint = duplicate.questions[0].fingerprint;
    expect(() => validateSnapshot(duplicate)).toThrow("CHALLENGE_CONTENT_INVALID");
    const samePrompt = challengeFixture(); samePrompt.questions[1].prompt = `  ${samePrompt.questions[0].prompt}  `;
    expect(() => validateSnapshot(samePrompt)).toThrow("CHALLENGE_CONTENT_INVALID");
    const twoOptions = challengeFixture(); twoOptions.questions[0].options = ["1","2"];
    expect(() => validateSnapshot(twoOptions)).toThrow("CHALLENGE_CONTENT_INVALID");
    const malformed = challengeFixture(); malformed.questions[0].answer = 4;
    expect(() => validateSnapshot(malformed)).toThrow("CHALLENGE_CONTENT_INVALID");
  });
  it("conceals keys, explanations, fingerprints and hints until authorized disclosure", () => {
    const r = row();
    expect(() => mutateChallenge(r,{kind:"answer",index:39,selected:0,expectedRevision:0,requestId:"skip"},undefined,0)).toThrow("INDEX_OUT_OF_ORDER");
    expect(JSON.stringify(presentChallenge(r))).not.toMatch(/PRIVATE_|fingerprint|"answer"/);
    const hinted = mutateChallenge(r,{kind:"hint",index:0,expectedRevision:0,requestId:"hint"},undefined,0);
    expect(presentChallenge(hinted).questions[0].hint).toBe("PRIVATE_HINT");
    expect(JSON.stringify(presentChallenge(hinted))).not.toMatch(/PRIVATE_EXPLANATION|"answer"/);
    const answered = mutateChallenge(hinted,{kind:"answer",index:0,selected:0,expectedRevision:1,requestId:"answer"},undefined,0);
    expect(presentChallenge(answered).questions[0].feedback).toEqual({ selected:0,correct:true,answer:0,explanation:"PRIVATE_EXPLANATION",hintUsed:true });
    expect(() => mutateChallenge(answered,{kind:"answer",index:0,selected:1,expectedRevision:2,requestId:"other"},undefined,0)).toThrow("ANSWER_LOCKED");
    expect(() => mutateChallenge(answered,{kind:"hint",index:1,expectedRevision:0,requestId:"old"},undefined,0)).toThrow("REVISION_CONFLICT");
  });
  it("awards novel/recovery/hinted credit once and never rewards repeatedly mastered questions", () => {
    expect(rankingCredit(undefined,true,false)).toBe(10); expect(rankingCredit(undefined,true,true)).toBe(5);
    expect(rankingCredit(history(),true,false)).toBe(5); expect(rankingCredit(history(),true,true)).toBe(2);
    expect(rankingCredit(history({correct:1,rankingAwarded:true}),true,false)).toBe(0);
    expect(rankingCredit(history({correct:1}),true,false)).toBe(0); expect(rankingCredit(undefined,false,false)).toBe(0);
  });
  it("requires every actual question and advances precisely at 80 percent", () => {
    for (const correct of [31,32,40]) {
      let r = row(); for (let i=0;i<40;i++) { r = mutateChallenge(r,{kind:"answer",index:i,selected:i<correct?0:1,expectedRevision:i,requestId:`r${i}`},undefined,i); if(i<39) expect(r.status).toBe("active"); }
      expect(presentChallenge(r).result).toMatchObject({ accuracy:correct/40*100,passed:correct>=32,nextStage:correct>=32?2:1 });
    }
    let short = row(5); for(let i=0;i<5;i++) short=mutateChallenge(short,{kind:"answer",index:i,selected:i<4?0:1,expectedRevision:i,requestId:`s${i}`},undefined,i);
    expect(presentChallenge(short)).toMatchObject({total:5,status:"completed",result:{accuracy:80,passed:true,nextStage:2}});
  });
  it("uses Malaysia Monday boundaries independent of the server timezone", () => {
    expect(malaysiaWeek(Date.parse("2026-09-06T15:59:59.999Z"))).toEqual({weekStart:"2026-08-30T16:00:00.000Z",weekEnd:"2026-09-06T16:00:00.000Z"});
    expect(malaysiaWeek(Date.parse("2026-09-06T16:00:00Z"))).toEqual({weekStart:"2026-09-06T16:00:00.000Z",weekEnd:"2026-09-13T16:00:00.000Z"});
  });
});
