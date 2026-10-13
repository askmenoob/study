# Grade alignment candidate

Follow-up editorial review of every selected unit is now recorded in
`audits/GRADE_CONTENT_AUDIT.md` and its JSON companion. It identifies unresolved
grade placement, distractor quality and STPM depth separately from structural
checks. The earlier passing technical tests below are not curriculum approval.

Based on `acba20a52e5dd39ec370169bad781ed5f1ff42bb`, in branch
`codex/study-grade-alignment-20260910`. No production deployment is performed.
Production at preparation remains `63a67cc496ce508879a63f10fa0750f20ed86f67`.

## Problem and resulting behavior

Legacy seeds reused questions across adjacent grades. Library practice opened a
generic subject, and beginning readers could reach text questions immediately.
Published topic selection now uses exact-grade Library units. Opening a topic or
its challenge first opens the unit's teaching material. Direct Darjah 1 Library
practice links also go through teaching.

All six Darjah 1 subjects have three or four short illustrated teaching frames,
question/choice/explanation audio controls, four picture choices and up to six
guided activities. Listening support is a per-child preference, not a change to
academic grade. Audio uses the existing free service with matching-language
device fallback; unavailable audio asks for adult reading support. It can be
stopped, repeated and cancelled when leaving the question.

| Academic grade | Maximum challenge questions | Rest checkpoint |
| --- | ---: | ---: |
| Darjah 1 | 6 | 3, if challenge API is used |
| Darjah 2 | 12 | 4 |
| Darjah 3 | 16 | 4 |
| Darjah 4–6 | 24 | 10 |
| Tingkatan 1–6 | 40 | 10 |

Darjah 1's main UI uses its six-activity guided topic flow, with no timed formal
exam and no mixed diagnostic. It does not display the challenge entry. Other
short topic sets retain a maximum of five questions; the table governs challenge
sets. There is no requirement to fill an exhausted bank to the maximum and no
daily learning-session limit. Completed topic sets are saved; partially answered
topic sets do not acquire the challenge engine's cross-device resume contract.

Unit revision lists learned units, and mixed revision selects covered units only.
Reading markers are per-account/per-child on the current device, supplemented by
completed topic attempts. They record passing through the teaching sequence, not
proof of comprehension or official KPM Tahap Penguasaan. Reading markers alone do
not synchronize across devices. Formal exam packs remain a separate catalogue;
`EXAM_PREVIEW=false` continues to hide pending packs. There is no published STPM
formal exam pack in this candidate.

## Published supply and preserved history

- 102 exact-grade subject pairs, currently one selected unit per pair.
- 306 unit resources plus the existing Darjah 4 fractions pilot: 307 resources.
- 612 unit questions plus 128 explicitly mapped, unchanged supplementary maths
  questions: 740 published topic questions. The pilot's eight questions are
  separate Library practice, not additional topic-bank entries.
- Existing unmapped seeds and resources are retained as archives, not chosen for
  current grade learning paths. Original question IDs and attempt data are not
  deleted. Explicit `originTopicId` mappings keep the 128 moved maths questions
  connected to their existing history without accepting unrelated ID collisions.
- D1 old units and the superseded STPM Mathematics unit retain archived IDs.
- Mathematical templates stay within a mapped unit and grade. Distractors and
  correct positions vary; D1 uses its authored picture activities without cloud
  generation. Finite template supply and possible revision repeats are disclosed.
- Every published topic question references a resource from the same unit.
  Current challenge selection is per subject; because there is one published
  unit per grade/subject it has the same boundary. Before adding multiple units
  to a subject, add explicit unit selection to the challenge contract and verify
  learned-unit filtering there. Do not assume today's subject boundary remains
  sufficient after that expansion.

## Reference basis and honest curriculum limits

The automated audit verifies grades, resource links, answer structure, duplicate
prompts, age caps and authored numeric answers. It is not an educator's moderation
of all 102 units. Most units still have pending exact standard mapping and teacher
review. The app and metadata say selected coverage, not complete syllabus.

- [KPM PBD guidance, 2019](https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/Panduan%20Pelaksanaan%20Pentaksiran%20Bilik%20Darjah%20Edisi%202%20-%202019.pdf): informs varied observation, oral and written assessment. App scores are not official PBD results.
- [KPM 2025 BM/BI Tahap I curriculum-alignment letter](https://www.moe.gov.my/surat-siaran-kpm-bil-1-tahun-2025-pelaksanaan-dokumen-penjajaran-kurikulum-standard-sekolah-rendah-semakan-2017): design reference only; no invented SK/SP codes or claim that this letter verifies every subject.
- [MPM revised STPM syllabus directory](https://portal.mpm.edu.my/stpm/sukatan-pelajaran-peperiksaan-stpm-yang-dimurnikan): distinguishes STPM subjects and current documents.
- [MPM Mathematics 954 syllabus effective Semester 1 STPM 2026](https://portal.mpm.edu.my/stpm/sukatan-pelajaran-peperiksaan-stpm-yang-dimurnikan?args%5B0%5D=a9241797c4e460c1edada9b51a400707&element=7bedb034-a982-4a7b-950c-ec33cea388fc&format=raw&item_id=303&method=download&task=callelement): the revised Mathematics unit partially maps to Semester 2, 8.2(a), 8.2(b), 9.3(a). The previously assessed endpoint extremum was removed because the referenced 8.2 scope excludes endpoint extrema. The replacement asks for a decreasing interval. This is a substantive content correction with a new stable unit ID.

The Management Mathematics 950 download returned an invalid-file response during
verification. Its semester remains unverified; no semester was guessed. Other
STPM units are not presented as fully mapped simply because the directory exists.
No third-party papers, textbook pages or protected answer banks were imported.

## Verification and release boundaries

- 348 non-database tests passed. All 25 database integration tests separately
  passed against a disposable PostgreSQL 17 instance: 373 total tests.
- Frontend/API TypeScript and builds passed. Library and curriculum validators
  passed. PWA activation/artifact checks passed with explicit skipWaiting and
  clientsClaim retained.
- Browser QA uses the built candidate, its own API and disposable database.
  All six D1 subjects complete 36 activities with locked first answers and six
  matching cloud attempts. Grade-specific lesson entry is checked across all 12
  grades. D2 Library-to-Mathematics navigation and learned-unit revision filters
  are exercised, along with 320/390/1280-pixel layout checks.
- Cloud AI is disabled in QA. Audio playback/stop tests use synthetic audio and
  exercise the unavailable-language message. They do not establish voice quality,
  production quota availability, or physical Android PWA installation.
- Final web build reports a large-bundle warning (about 1.22 MB before gzip).
  This is recorded rather than treated as a failed build or measured phone speed.
- Evidence is kept in the matching grade-alignment operations directory outside
  the source tree. Temporary QA services and fixtures must be removed after QA.

No new database schema is added by grade alignment itself. Deploying this branch
also brings the earlier challenge candidate's additive migrations and API routes,
so an approved release must coordinate API and web from the same reviewed source.
Preserve the main combined production revision, database backup, PostgreSQL and
tunnel configuration. Never deploy an older PWA/source-reference image over the
combined production release. Reverting published content must preserve learner
history; do not delete progress rows as a content rollback.
