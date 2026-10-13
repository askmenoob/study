import type { AttemptRecord, LevelId, StudyState, StudentProfile } from "../types";
const KEY = "imai-study:v2";
const defaultProfile: StudentProfile = { name: "Adam", levelId: "d4" as LevelId, goalMinutes: 15 };
const emptyState: StudyState = { profile: defaultProfile, attempts: [], streak: 0 };
export function loadState(): StudyState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const legacyName = localStorage.getItem("imai_student");
      const legacyLevel = localStorage.getItem("imai_level") as LevelId | null;
      if (legacyName || legacyLevel) return { ...emptyState, profile: { ...defaultProfile, name: legacyName || defaultProfile.name, levelId: legacyLevel || defaultProfile.levelId } };
      return emptyState;
    }
    const parsed = JSON.parse(raw) as StudyState;
    return { ...emptyState, ...parsed, profile: { ...defaultProfile, ...parsed.profile } };
  } catch { return emptyState; }
}
export function saveState(state: StudyState) { localStorage.setItem(KEY, JSON.stringify(state)); }
export function addAttempt(state: StudyState, attempt: AttemptRecord): StudyState {
  const today = new Date().toISOString().slice(0, 10);
  const nextStreak = state.lastStudyDate === today ? state.streak : state.streak + 1;
  const next = { ...state, attempts: [...state.attempts, attempt], streak: nextStreak, lastStudyDate: today };
  saveState(next); return next;
}
