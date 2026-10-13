# Level-specific Library units

Current candidate status and complete per-unit audit: `../../docs/audits/GRADE_CONTENT_AUDIT.md`.
The older authoring description below predates the grade-alignment candidate.
Current publishing uses six replacement D1 picture units and archives unmapped
legacy resources. Several newly assessed methods now have worked teaching
examples; no unit has educator approval or complete-syllabus status. The current
speech controls also allow matching-language device fallback.

Original IMAI supplementary learning material. These units cover selected skills, not the entire official syllabus or an official examination paper.

Each JSON array contains one unit per assigned level/subject pair. Stable `id`: `library-<level>-<subject>-<topic-slug>`. A unit expands into three resources: `-note`, `-reading`, and `-practice`. Level IDs are d1–d6 and t1–t6; only t6 is STPM.

Unit fields:

```ts
{
  id: string; levelId: string; subjectId: string;
  note: { title: string; summary: string; body: string[]; keyPoints: string[];
    vocabulary?: { term: string; meaning: string }[] };
  reading: { title: string; summary: string; body: string[]; questions: Question[] };
  practice: { title: string; summary: string; body: string[]; questions: Question[] };
}
type Question = { prompt: string; options: string[]; answer: number; explanation: string; hint: string };
```

Acceptance: one original note, reading and practice for every selectable level/subject pair (102 pairs). Notes contain a clear explanation, a worked example and a misconception; 3–5 paragraphs and at least 3 key points. Reading is a distinct, age-appropriate original situation/text with 2 comprehension questions. Practice has its own complete context, 4 distinct questions, hints and teaching explanations. Every question has exactly 4 distinct options and one correct zero-based answer. Correct positions must vary naturally. Early primary language/length must be simpler than secondary/STPM. No repeated generic filler or copied third-party passages. Specialized claims must be checked against primary sources; retain editorial sources separately. IDs and previous resources stay compatible.

## Content and integration

The four authored files contain 102 units, 306 materials and 612 questions. The 16 previous internal resources remain available, with stable resource IDs. The two existing STPM mathematics resources now route to `stpm_math`; the shared fractions note and money/fractions practice are limited to d4–d6.

`catalog.ts` expands the units for both `src/data/resources.ts` and server tutor retrieval. Tutor context includes note/reading paragraphs but excludes attached quiz questions and all practice packs. One source prevents new Library links from being rejected as unknown tutor resources. A release therefore needs matching **web and API builds**; shipping only the new web against the old API would reject new tutor resource IDs. No database migration, schema or provider configuration changes are needed.

The Library shows 12 cards initially, with more on request; search includes body, key points and vocabulary. Saved-material filters use the existing device-local bookmark key and retain old IDs. Answers are temporary, first-choice checks with an explicit retry. They do not update adaptive mastery or official school results. Reader navigation connects the three parts of each unit. Existing focus-session restrictions on external links remain in effect.

Authored English resources have explicit English speech metadata. Mixed/native Chinese, Tamil and Arabic materials can be read and sent as tutor context, but voice controls are withheld because the existing speech API supports only Malay and English. No paid provider or additional AI call is introduced by content loading.

Editorial source records: `languages-sources.md`, `stem-sources.md`, `humanities-sources.md`, `stpm-sources.md`. They distinguish verified concepts from original fictional scenarios and document retrieval limitations. Formal educator review and exact DSKP/MPM mapping remain necessary before calling these selected units a complete or officially validated syllabus.

## Maintenance checks

Run `npm run validate:library`, affected Library/tutor tests, `npm test`, and `npm run build`. The content validator checks every selectable subject/year, material kinds, unique IDs/titles/bodies, option structures, explanations and hints. Numerical and editorial review are separate from structural validation; a passing schema is not proof that every educational claim is correct.
