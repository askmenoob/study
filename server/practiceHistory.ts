import type { Pool } from "pg";

export interface PracticeQuestionHistory {
  levelId: string;
  subjectId: string;
  topicId: string;
  questionId: string;
  correct: boolean;
  completedAt: string;
}

// Query the full answer history independently of the capped recent-attempt list.
// Call only after the route has authenticated and verified student ownership.
export async function loadPracticeQuestionHistory(pool: Pick<Pool, "query">, studentId: string): Promise<PracticeQuestionHistory[]> {
  const { rows } = await pool.query<Omit<PracticeQuestionHistory, "completedAt"> & { completedAt: Date }>(`
    SELECT DISTINCT ON (a.level_id, a.subject_id, a.topic_id, item.value->>'questionId')
      a.level_id AS "levelId", a.subject_id AS "subjectId", a.topic_id AS "topicId",
      item.value->>'questionId' AS "questionId",
      (item.value->'correct' = 'true'::jsonb) AS correct,
      a.created_at AS "completedAt"
    FROM attempts a
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(a.answers) = 'array' THEN a.answers ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS item(value, position)
    WHERE a.student_id = $1
      AND jsonb_typeof(item.value) = 'object'
      AND jsonb_typeof(item.value->'questionId') = 'string'
      AND item.value->>'questionId' ~ '[^[:space:]]'
      AND jsonb_typeof(item.value->'correct') = 'boolean'
    ORDER BY a.level_id, a.subject_id, a.topic_id, item.value->>'questionId',
      a.created_at DESC, a.id DESC, item.position DESC
  `, [studentId]);
  return rows.map(row => ({ ...row, completedAt: row.completedAt.toISOString() }));
}
