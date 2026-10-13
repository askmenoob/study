import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LearnerDashboard, ParentDashboard, weeklyLearning } from './FocusDashboard';
import type { CloudStudent } from '../lib/api';
import type { AttemptRecord, LevelId, StudyState } from '../types';

const noop = () => {};
const makeStudy = (levelId: LevelId = 'd1'): StudyState => ({
  profile: { name: 'Alia', levelId, goalMinutes: 15, cloudId: 'child-1' },
  attempts: [], streak: 0,
});
const learner = (levelId: LevelId) => renderToStaticMarkup(createElement(LearnerDashboard, {
  study: makeStudy(levelId), profileKey: `test-${levelId}`,
  onSubject: noop, onRead: noop, onLesson: noop, onLibrary: noop,
  onRevision: noop, onProgress: noop, onTutor: noop, onAllSubjects: noop,
}));
const parent = (students: CloudStudent[], study = makeStudy()) => renderToStaticMarkup(createElement(ParentDashboard, {
  students, study, busy: false, onSwitch: noop, onManage: noop, onReports: noop,
  onLinks: noop, onStudentMode: noop,
}));

describe('age-specific learner dashboards', () => {
  it('keeps the illustrated G learning entry for Darjah 1', () => {
    const html = learner('d1');
    expect(html).toContain('Jom belajar, Alia!');
    expect(html).toContain('/focus-books.webp');
    expect(html).toContain('/focus-reading.webp');
    expect(html).toContain('Mula belajar');
    expect(html).not.toContain('Langkah seterusnya');
    expect(html).not.toContain('Urus anak');
  });

  it.each(['t1', 't6'] as const)('uses H and working action labels for %s without children’s decoration', levelId => {
    const html = learner(levelId);
    expect(html).toContain('Fokus hari ini, Alia.');
    expect(html).toContain('Sambung apa yang dipelajari, satu topik pada satu masa.');
    expect(html).toContain('Subjek kamu');
    expect(html).toContain('Nota dan bacaan');
    for (const action of ['Mula belajar', 'Buka Library', 'Latihan topik', 'Ulang kaji exam', 'Buka AI Tutor']) {
      expect(html).toContain(action);
    }
    expect(html).not.toContain('/focus-books.webp');
    expect(html).not.toContain('/focus-reading.webp');
    expect(html).not.toContain('Urus anak');
  });
});

describe('parent dashboard', () => {
  it('numbers duplicate names within the matching name and grade group', () => {
    const students: CloudStudent[] = [
      { id: 'child-1', name: 'ARIF', level_id: 'd2' },
      { id: 'child-2', name: 'Alia', level_id: 'd1' },
      { id: 'child-3', name: ' arif ', level_id: 'd2' },
      { id: 'child-4', name: 'ARIF', level_id: 'd3' },
    ];
    const html = parent(students);
    expect(html).toContain('aria-label="ARIF · Darjah 2 · Profil 1"');
    expect(html).toContain('aria-label=" arif  · Darjah 2 · Profil 2"');
    expect(html).toContain('<small>Darjah 2 · Profil 1</small>');
    expect(html).toContain('<small>Darjah 2 · Profil 2</small>');
    expect(html).toContain('aria-label="ARIF · Darjah 3"');
    expect(html).not.toContain('Profil 3');
  });

  it('shows a truthful empty state before a parent adds a child', () => {
    const html = parent([]);
    expect(html).toContain('Tambah anak pertama');
    expect(html).not.toContain('Minggu ini');
    expect(html).not.toContain('sesi latihan');
    expect(html).not.toContain('unit dilatih');
    expect(html).not.toContain('Lihat laporan');
  });
});

describe('weekly learning counts', () => {
  it('counts saved sessions and distinct topics only for the current week and selected grade', () => {
    const now = new Date(2026, 8, 10, 12, 0); // Thursday, local time.
    const attempt = (id: string, topicId: string, at: Date, levelId: LevelId = 'd1'): AttemptRecord => ({
      id, topicId, levelId, subjectId: 'bm', correct: 2, total: 4, completedAt: at.toISOString(),
    });
    const attempts = [
      attempt('monday', 'topic-a', new Date(2026, 8, 7, 0, 0)),
      attempt('repeat-topic', 'topic-a', new Date(2026, 8, 8, 9, 0)),
      attempt('second-topic', 'topic-b', now),
      attempt('last-week', 'old-topic', new Date(2026, 8, 6, 23, 59)),
      attempt('future', 'future-topic', new Date(2026, 8, 10, 13, 0)),
      attempt('other-grade', 'other-topic', new Date(2026, 8, 9, 11, 0), 'd2'),
    ];
    expect(weeklyLearning(attempts, 'd1', now)).toEqual({ sessions: 3, units: 2 });
  });
});
