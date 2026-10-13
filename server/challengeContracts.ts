export type ChallengeDifficulty = 1 | 2 | 3;
export type ChallengeSource = "bank" | "template" | "ai-reviewed";
export type ChallengePhase = "review" | "current" | "strengthen" | "challenge";
export interface ChallengeQuestion {
  id: string; fingerprint: string; conceptId: string; topicId: string; topicName: string;
  prompt: string; options: string[]; answer: number; explanation: string; hint: string;
  difficulty: ChallengeDifficulty; source: ChallengeSource;
  resourceIds?: string[];
  support?: import("./library/earlyLearning.js").PictureSupport;
}
export interface ChallengeBankSubject {
  levelId: string; levelName: string; subjectId: string; subjectName: string; questions: ChallengeQuestion[];
}
export interface ChallengeHistory {
  fingerprint: string; topicId: string; answered: number; correct: number; lastCorrect: boolean;
  lastAnsweredAt: string; rankingAwarded: boolean;
}
export interface ChallengeGenerationInput {
  levelId: string; subjectId: string; stage: number; seed: string; history: ChallengeHistory[];
}
export interface ChallengeGenerationResult {
  questions: Array<ChallengeQuestion & { phase: ChallengePhase; repeat: boolean }>;
  notices: string[];
}
export type ChallengeGenerator = (input: ChallengeGenerationInput) => Promise<ChallengeGenerationResult>;
export interface ChallengePublicQuestion {
  id: string; topicId: string; topicName: string; prompt: string; options: string[];
  difficulty: ChallengeDifficulty; source: ChallengeSource; phase: ChallengePhase; repeat: boolean;
  resourceIds?: string[];
  support?: import("./library/earlyLearning.js").PictureSupport;
  hint?: string;
  feedback?: { selected: number; correct: boolean; answer: number; explanation: string; hintUsed: boolean };
}
export interface ChallengeSession {
  id: string; studentId: string; levelId: string; subjectId: string; stage: number;
  status: "active" | "completed"; revision: number; questions: ChallengePublicQuestion[];
  answeredCount: number; correctCount: number; total: number; hintCount: number;
  createdAt: string; completedAt?: string; notices: string[];
  result?: { accuracy: number; passed: boolean; nextStage: number; rankingPoints: number };
}
export interface ChallengeSubjectProgress {
  subjectId: string; subjectName: string; stage: number; completedSessions: number;
  accuracy: number; answered: number; activeSessionId?: string;
}
export interface ChallengeOverview { studentId: string; levelId: string; subjects: ChallengeSubjectProgress[] }
export interface ChallengeLeaderboard {
  levelId: string; subjectId: string; weekStart: string; weekEnd: string;
  rows: Array<{ rank: number; alias: string; points: number; sessions: number; isYou: boolean }>;
  yourPoints: number; dailySessionLimit: number;
}
export interface ChallengeParentReport {
  studentId: string; levelId: string; completedSessions: number; answered: number; correct: number; hintsUsed: number;
  subjects: Array<ChallengeSubjectProgress & { hintsUsed: number; topics: Array<{ topicId: string; topicName: string; answered: number; correct: number; mastery: number; repeatedErrors: number }> }>;
  recentSessions: Array<{ id: string; subjectId: string; stage: number; total: number; correct: number; completedAt: string; passed: boolean }>;
}
