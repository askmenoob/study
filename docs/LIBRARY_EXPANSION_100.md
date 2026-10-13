# Library expansion: 100 linked units per grade

Prepared 10 September 2026. This change adds 1,068 authored units to the existing 132. Each of the 12 grades now has 100 notes, 100 readings and 100 practice sets. A unit contributes two reading questions and four practice questions. The existing fractions pilot remains available as an additional resource in D4.

| Grade | Notes | Readings | Practice sets | Library including pilot | Topic questions |
|---|---:|---:|---:|---:|---:|
| D1 | 100 | 100 | 100 | 300 | 600 |
| D2 | 100 | 100 | 100 | 300 | 616 |
| D3 | 100 | 100 | 100 | 300 | 616 |
| D4 | 100 | 100 | 100 | 301 | 600 |
| D5 | 100 | 100 | 100 | 300 | 616 |
| D6 | 100 | 100 | 100 | 300 | 600 |
| T1 | 100 | 100 | 100 | 300 | 616 |
| T2 | 100 | 100 | 100 | 300 | 616 |
| T3 | 100 | 100 | 100 | 300 | 616 |
| T4 | 100 | 100 | 100 | 300 | 616 |
| T5 | 100 | 100 | 100 | 300 | 616 |
| T6 | 100 | 100 | 100 | 300 | 600 |
| Total | 1,200 | 1,200 | 1,200 | 3,601 | 7,328 |

There are 7,200 Library questions plus 128 existing mapped mathematics questions. The pilot has eight further questions outside this topic-bank count. Counts are per grade across its offered subjects, not 100 units per subject. Detailed subject counts are in `docs/audits/library-expansion-counts.json`.

## Learning design and review limits

D1 uses short supported reading frames, picture choices, letter/syllable cards, numbers and shapes. D2 adds short reading contexts. Later grades use concept notes and short applications, worked examples or case readings. Each added question carries an exact quotation and paragraph index from its unit's reading. The same unit IDs connect Library, topic practice, server challenge generation and tutor retrieval. Existing IDs, progress mappings, voice restrictions and the pilot are preserved.

The readings are deliberately short: primary medians range from 31 to 90 whitespace-delimited words, T1–T4 around 69–71, and T5–T6 around 98–99. Whitespace word counts are not meaningful reading-length measures for Chinese. These are short learning materials, not long stories or a complete textbook series.

Automated checks cover exact counts, IDs, normalized duplicate bodies/titles, answer-option uniqueness, evidence, question linkage, D1 visuals and near-duplicate review candidates. A shared-principle flag is informational: 165 T5/T6 readings repeat teaching principles from their linked notes while adding a worked case and analysis. Such reuse within a linked unit is intentional; it does not establish that different units are duplicates.

Independent editorial sampling covered every offered subject/grade grouping among the new files, plus recalculation of all 139 added mathematics units in D1–T4 and selected STPM quantitative cases. Reported ambiguous distractors, missing context, overlapping definitions, binary-place-value terminology and index domains were corrected and targeted rechecks completed. Sampling does not prove every item is free of semantic error.

Reference and scope metadata is stored beside each two-grade batch in `server/library/expansion/*-sources.json`. KPM/BPK directories and other primary sources were used for discovery and concept checks. The MPM syllabus endpoint returned HTTP 502 during this task. Exact DSKP standard mapping, STPM semester alignment and educator approval remain pending; no complete curriculum certification is claimed.

## Verification

- `npm run build:challenge-bank`: passed; regenerated the server bank from the same topic data.
- `npm run validate:library` and `python3 scripts/audits/check-expansion.py`: passed.
- `npm run build`: passed for both TypeScript projects, the web/PWA and API.
- `npm test`: 384 passed, 25 pre-existing database integration tests skipped.
- `node scripts/validate-pwa.mjs`: 57 artifact checks passed, including all 12 grade chunks in the precache and the existing activation behavior.
- Isolated Chrome browser verification: 15 flows, 76 answered questions, zero page errors. It covers all grades, additional Chinese/Tamil/Arabic T6 flows, 100-count tabs, pagination, search, the teaching flow, evidence after answering, outgoing attempt unit IDs and horizontal overflow. API responses were mocked; this is not a production persistence test. The first harness attempt omitted parent-panel response shapes; correcting those mocks resolved the harness failure.
- D1 mobile and T6 Arabic screenshots were visually inspected.

Each expanded grade has a separate eager content chunk, preserving the synchronous offline reader. The built grade files range from about 332 KB to 945 KB; the main entry is about 1.40 MB. The precache has 23 entries totaling about 7.69 MiB. This is cache partitioning, not on-demand grade loading. Artifact verification does not prove installation on a physical Android phone.

Browser reproduction uses `scripts/audits/browser-fixtures.py` to export fixtures beside `browser-library-expansion.mjs`, with `PLAYWRIGHT_MODULE`, `CHROME_PATH` and `STUDY_QA_BASE` pointing to an isolated preview. No real accounts or paid AI calls are needed.

## Deployment coordination

No production deployment is performed by this task. The isolated feature branch starts at `c75f727`. During the work, a separate access-logging task deployed web and API images named `imai-study-web:access-c75f727-d330a02-20260910` and `imai-study-api:access-c75f727-d330a02-20260910`, while canonical main remained at `c75f727`.

Before a future release, preserve and integrate that live access-logging patch from `/mnt/data/releases/imai-study/20260910-access-logging`, including its nginx trusted-ingress configuration. Do not deploy this feature's older base over those changes or roll back to a prior voice image. Library content and its generated challenge bank require both web and API release synchronization. Database and tunnel changes are not required.
