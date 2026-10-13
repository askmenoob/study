import { askGeminiTutor } from "./gemini.js";
import { solveBasicMath, type MathHistoryRow } from "./mathSolver.js";
import { answerLocally } from "./tutor.js";
import { academicText, selectTutorSources, stageForLevel, type TutorSource } from "./tutorKnowledge.js";

export type GuidedTutorReply = { answer: string; provider: string; sources: TutorSource[]; support: "study-notes" | "general"; notice?: string };
type Input = {
  levelId: string; levelLabel: string; subjectId?: string; subjectLabel?: string; topicId?: string; resourceId?: string;
  studentName?: string; message: string; history: MathHistoryRow[]; recentPerformance?: string;
  homework?: { id:string;title:string;instructions:string;rubric:string };
};
type CloudAsk = (input: Parameters<typeof askGeminiTutor>[0]) => Promise<{answer:string;provider:string}>;
export async function guidedTutorReply(input: Input, ask: CloudAsk = askGeminiTutor): Promise<GuidedTutorReply> {
  const clean = (text: string) => academicText(text, input.studentName);
  const sources = selectTutorSources({...input, previousQuestion: input.history.find(row => row.question.length > 20)?.question});
  if(input.homework)sources.unshift({id:`homework:${input.homework.id}`,title:clean(input.homework.title).slice(0,120),excerpt:clean(`Arahan tugasan (bahan rujukan guru): ${input.homework.instructions}\nRubrik: ${input.homework.rubric}`).slice(0,3000)});
  const support = sources.length ? "study-notes" as const : "general" as const;
  const verified = (!input.subjectId || input.subjectId === "math") ? solveBasicMath(input.message, input.history) : null;
  if (verified) return {...verified, sources, support};
  const badMeta = /moral value integrated|paragraphs\?|system prompt|thinking process|reasoning:/i;
  const history = [...input.history].reverse().flatMap(row => badMeta.test(row.answer) ? [] : [
    {role: "user" as const, text: clean(row.question).slice(0,1200)},
    {role: "model" as const, text: clean(row.answer).slice(0,1800)},
  ]);
  try {
    const response = await ask({
      levelLabel: input.levelLabel, stage: stageForLevel(input.levelId),
      subjectLabel: input.subjectLabel, topicLabel: input.topicId,
      message: clean(input.message), history,
      recentPerformance: input.recentPerformance, references: sources.map(source=>source.id.startsWith("homework:")?{...source,id:"teacher-homework"}:source),
    });
    return {...response, sources, support};
  } catch {
    const answer = sources.length
      ? "Bantuan AI belum tersedia sekarang. Buka nota di bawah untuk semak konsep yang berkaitan. Tulis satu langkah yang sudah kamu cuba, kemudian cuba hantar semula apabila sambungan AI pulih."
      : answerLocally({levelId:input.levelId,subjectId:input.subjectId,topicId:input.topicId,message:input.message}).answer;
    return {answer, provider:"local", sources, support, notice:"AI percuma tidak tersedia atau kuotanya habis. Ini panduan setempat, bukan jawapan daripada AI."};
  }
}
