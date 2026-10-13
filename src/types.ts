export type Stage = "KSSR" | "KSSM" | "STPM";
export type LevelId = `d${1|2|3|4|5|6}` | `t${1|2|3|4|5|6}`;
export interface Level { id: LevelId; label: string; stage: Stage; year: number }
export interface Subject { id: string; name: string; short: string; stages: Stage[] }
export interface Question { id: string; prompt: string; options: string[]; answer: number; explanation: string; hint?: string; difficulty?: 1|2|3; resourceIds?: string[]; originTopicId?: string; support?: import("../server/library/earlyLearning").PictureSupport; evidence?: import("../server/library/catalog").ReadingEvidence }
export interface Topic { id: string; name: string; description: string; target: number; questions: Question[]; unitId?: string; resourceId?: string }
export interface AttemptAnswer { questionId: string; selected: number; correct: boolean }
export interface AttemptRecord { id: string; levelId: LevelId; subjectId: string; topicId: string; correct: number; total: number; completedAt: string; answers?: AttemptAnswer[] }
export interface StudentProfile { name: string; levelId: LevelId; goalMinutes: number; cloudId?: string }
export interface QuestionHistoryEntry { levelId: string; subjectId: string; topicId: string; questionId: string; correct: boolean; completedAt: string }
export interface StudyState { questionHistory?: QuestionHistoryEntry[]; profile: StudentProfile; attempts: AttemptRecord[]; streak: number; lastStudyDate?: string }
export interface TutorSource { id: string; title: string; excerpt: string }
export interface TutorResponse {
  answer: string; provider: string; sources?: TutorSource[];
  support?: "study-notes" | "general"; notice?: string;
}
export interface TutorMessage {
  role: "user" | "assistant"; text: string; provider?: string;
  sources?: TutorSource[]; support?: TutorResponse["support"]; notice?: string;
}
