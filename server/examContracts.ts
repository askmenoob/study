// Shared DTOs only. Answer keys and editorial notes stay in the server catalogue.
export type ExamLevel = "d4" | "d5" | "d6" | "t4" | "t5";
export type ExamMode = "guided" | "simulation";
export type ExamKind = "UASA" | "SPM";
export interface ExamSource {
  kind: "original" | "past_exam" | "trial" | "school_exam";
  provider: string;
  year: number | null;
  url: string | null;
  rights: "owned" | "licensed" | "unknown";
  rightsEvidence: string | null;
  review: "pending" | "approved";
  reviewer: string | null;
  reviewedAt: string | null;
}
export interface ExamQuestion {
  id: string;
  number: string;
  prompt: string;
  kind: "choice" | "numeric" | "structured";
  options?: { id: string; text: string }[];
  unit?: string;
  skillId: string;
  skillName: string;
  autoMarks: number;
  manualMarks: number;
}
export interface ExamPaperSummary {
  id: string;
  version: number;
  title: string;
  exam: ExamKind;
  levelIds: ExamLevel[];
  subjectId: "math";
  durationMinutes: number;
  questionCount: number;
  autoMarks: number;
  manualMarks: number;
  source: ExamSource;
  publication: "preview" | "published";
  scopeLabel: string;
}
export interface ExamPaper extends ExamPaperSummary { questions: ExamQuestion[] }
export interface ExamAnswer { value: string; unit?: string; working?: string }
export interface ExamNote { id: string; title: string; body: string; example: string }
export interface ExamRubricStep { id: string; description: string; marks: number }
export interface ExamQuestionReview {
  questionId: string;
  correct: boolean;
  autoScore: number;
  autoMarks: number;
  manualMarks: number;
  manualScore: number | null;
  solution: string[];
  note: ExamNote;
  rubric: ExamRubricStep[];
  selfMarks: Record<string, boolean>;
}
export interface ExamAttempt {
  id: string;
  clientAttemptId: string;
  studentId: string;
  paper: ExamPaper;
  mode: ExamMode;
  status: "draft" | "submitted";
  revision: number;
  startedAt: string;
  updatedAt: string;
  endsAt: string | null;
  submittedAt: string | null;
  retryOfAttemptId: string | null;
  answers: Record<string, ExamAnswer>;
  checkedQuestionIds: string[];
  reviews: ExamQuestionReview[];
  autoScore: number;
  autoMarks: number;
  manualScore: number;
  manualMarks: number;
  needsSelfMark: boolean;
}
export interface ExamAttemptSummary {
  id: string;
  paperId: string;
  paperVersion: number;
  title: string;
  mode: ExamMode;
  status: "draft" | "submitted";
  updatedAt: string;
  autoScore: number;
  autoMarks: number;
  manualScore: number;
  manualMarks: number;
  needsSelfMark: boolean;
  wrongCount: number;
  retryOfAttemptId: string | null;
}
export interface ExamCatalogue {
  papers: ExamPaperSummary[];
  attempts: ExamAttemptSummary[];
  preview: boolean;
  coverageNotice: string;
}

// PRIVATE server-only authoring types. Never send these to an API consumer.
export interface ExamPrivateQuestion extends ExamQuestion {
  key: { choiceId?: string; numeric?: number; tolerance?: number };
  solution: string[];
  note: ExamNote;
  rubric: ExamRubricStep[];
  retry: Omit<ExamPrivateQuestion, "retry">;
}
export interface ExamPrivatePaper extends Omit<ExamPaperSummary, "questionCount" | "autoMarks" | "manualMarks" | "publication"> {
  questions: ExamPrivateQuestion[];
}
