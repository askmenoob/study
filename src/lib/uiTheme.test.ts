import { describe, expect, it } from 'vitest';
import { studyTheme, themeColor } from './uiTheme';
import type { LevelId } from '../types';

describe('profile themes', () => {
  it.each(['d1','d2','d3','d4','d5','d6'] as LevelId[])('%s receives primary G', grade => {
    expect(studyTheme('student', grade)).toBe('primary');
  });
  it.each(['t1','t2','t3','t4','t5','t6'] as LevelId[])('%s receives secondary H', grade => {
    expect(studyTheme('student', grade)).toBe('secondary');
  });
  it('keeps the parent dashboard consistent when switching children', () => {
    expect(studyTheme('parent', 'd1')).toBe('parent');
    expect(studyTheme('parent', 't6')).toBe('parent');
    expect(studyTheme(undefined, 't6')).toBe('parent');
  });
  it('returns the correct theme after switching between sibling sessions', () => {
    expect(['d2','t4','d1'].map(grade => studyTheme('student', grade as LevelId)))
      .toEqual(['primary','secondary','primary']);
    expect(themeColor('secondary')).toBe('#167a79');
    expect(themeColor('primary')).toBe('#795078');
  });
});
