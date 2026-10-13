# Continuing challenges and Library alignment

**Historical challenge baseline:** the grade-alignment candidate supersedes the
entry flow, bank counts and uniform 40-question policy in this document. See
`GRADE_ALIGNMENT.md`. Its challenge storage, ownership and ranking contracts
continue to apply. Neither candidate has been deployed by this workstream.

Release candidate based on production `63a67cc496ce508879a63f10fa0750f20ed86f67`.
This work does not deploy or replace that production release.

## Learner and parent behavior

- Open Latihan topik, select a subject, then start or resume Cabaran ilmu. The separate Pilih topik latihan action retains the existing short topic exercises.
- A challenge contains at most 40 questions, with a rest checkpoint after each 10. Valid shorter sets show their actual total. Every confirmed answer and hint is stored in PostgreSQL and can be resumed after reloading or changing devices within the same authorized account.
- Completing the whole set with at least 80% correct advances the challenge stage. Other results offer another strengthening set at the same stage. Challenge stages do not change the child's academic grade. There is no daily session limit.
- The server grades the first answer, locks it, and returns its explanation. Later answer keys and explanations remain private. Request UUIDs and revisions protect retry and concurrent-tab behavior.
- Weekly rankings compare the same academic level and subject, use Malaysia days/weeks, count the best three completed sessions per day, and expose pseudonyms. No speed bonus. A first correct answer earns 10 points, or 5 with a hint; correcting a previously wrong question earns 5, or 2 with a hint. Previously rewarded/mastered questions earn no new ranking points.
- Parents see challenge totals, topic accuracy, repeated errors, hints and recent completed sets. Challenge results are separate from legacy topic metrics and exam results. Student tokens cannot access parent reports or siblings' sessions; focus-session expiry is checked again inside mutations.

## Question supply and its limits

The checked-in server bank is reproducibly exported from the existing curriculum with `npm run build:challenge-bank`: 1,827 existing questions across 102 supported academic-level/subject pairs. It is not 1,827 newly authored questions.

The generator combines the bank, authored Library exercises with their full reading context, finite mathematical templates and optional newly generated questions reviewed by a separate AI call. It prioritizes unseen questions, review and weak topics without advancing to another academic grade. Meaningful capitalization and punctuation in language answer choices are preserved.

Continuing sessions are unlimited; unique verified questions are not. With cloud generation disabled, all 102 supported pairs start successfully, with 14–40 distinct questions per set in coverage tests. Exhausted content may recur and is labelled as revision. There are no fabricated or cosmetic filler questions merely to reach 40.

AI uses only the application's existing Gemini configuration, with bounded batches, timeout, concurrency, cooldown and cache. It has no paid-provider fallback. Candidates require exact supplied Library note IDs, matching units and a second independent solve/review. AI review is not educator review. Production provider availability, quota and generated-content quality have not been established by this candidate's tests; provider calls were mocked or disabled throughout QA.

## Library as the learning foundation

Implemented here: questions may carry `resourceIds` and `conceptId`; authored Library passages retain their context; reviewed AI questions must cite supplied notes; answered questions can open the related reading and return to the saved challenge. Existing unmapped questions explicitly have no note link. None are falsely labelled as based on a child's reading history.

The next content workstream should implement:

1. Stable learning units per academic grade, subject and topic, with short notes, worked examples, readings, recap cards and learning objectives.
2. Source/version mapping for each question to a specific unit and taught concept, plus a coverage report that exposes missing material or questions.
3. Per-child reading and recall events. Opening a page alone must not count as mastery; use a short closed-note recall check.
4. A personal revision mode that selects only covered units and a separately labelled full-syllabus simulation mode. Do not silently restrict a full exam simulation to material already read.
5. Varied questions testing the same learned concept, including application in a new context, rather than repeated exact answer wording. Schedule retrieval again after a delay and route errors to the relevant section.
6. Educator/curriculum review before any complete-syllabus or official-exam claim. Expansion must use original or appropriately licensed material.

This candidate does not add a full new Library corpus, record reading completion, align every legacy topic/exam item, or create exam papers for every academic level. In particular, the existing exam catalogue does not yet provide Tingkatan 6 papers.

## Verification and operations

- Final suite: 351 tests passed; 16 unrelated legacy database tests skipped. All 9 challenge integration tests ran against a disposable PostgreSQL 17 database, including migration idempotence, ownership, focus expiry, request replay/races, immutable snapshots, stage progression, ranking caps and shorter-set completion.
- Full TypeScript/web/API build passed. Both Docker images built; the exact API and nginx web images were smoke-tested together on a private QA network and disposable database.
- 33 PWA artifact checks passed, preserving explicit skipWaiting/clientsClaim. These are not physical Android installation tests.
- Chrome/Playwright: 119 end-to-end assertions passed across primary mathematics, STPM Bahasa Melayu and Chinese, including 40/17/14-question completion, checkpoints/reload, source navigation, response-loss retries, advancement/remediation, reports and legacy topic access. After the final reading-layout refinement, 13 additional checks passed for 320/390/768/1280 widths and real student-role restrictions. No page exceptions occurred. No public production data or paid AI was used.
- QA evidence is kept outside the repository under the matching challenge release operations directory; temporary QA accounts/database and owned preview processes are removed after review.

Deployment needs coordinated API and web images because the web calls new endpoints. API startup adds `challenge_sessions`, `challenge_requests`, `challenge_history` and their indexes/immutable-snapshot trigger. No existing learning records are rewritten by the migration. Preserve a database backup and the current combined production image tags before an approved rollout. Rolling the applications back can leave these additive tables intact; do not drop learner challenge history as part of routine rollback.

Question history and request replay records grow with use. Before a larger rollout, measure retention and query/storage costs; the current report/overview aggregates stored challenge snapshots. Avoid promising unlimited storage or independently verified AI accuracy.
