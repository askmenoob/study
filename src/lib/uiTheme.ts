import type { LevelId } from '../types';

export type StudyTheme = 'primary' | 'secondary' | 'parent';

// Derive this from the current authenticated profile, never a shared preference.
export function studyTheme(role: string | undefined, levelId: LevelId): StudyTheme {
  if (role !== 'student') return 'parent';
  return levelId.startsWith('t') ? 'secondary' : 'primary';
}

export function themeColor(_theme: StudyTheme): string {
  return '#1569e8';
}
