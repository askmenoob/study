# Language bank evidence

Prepared 9 September 2026 for `src/data/banks/languages.ts`.

## Scope and counts

The exported `languageBank: LevelBank` adds one new topic per level and language through the existing `bankTopic` helper. It contains **264 questions: 132 BM and 132 English**, with permanent semantic row keys. No existing curriculum, helper, type, state, API or UI file was edited by this task.

| Level | BM | English | Intended progression |
| --- | ---: | ---: | --- |
| d1 | 12 | 12 | Words, simple actions and explicit sentence details |
| d2 | 12 | 12 | Everyday grammar, punctuation, short notices and order |
| d3 | 12 | 12 | Word formation, tense, cause and simple inference |
| d4 | 12 | 12 | Sentence control and connected short passages |
| d5 | 12 | 12 | Voice, relative clauses, fact/opinion and summaries |
| d6 | 12 | 12 | Conditional meaning, evidence and bounded conclusions |
| t1 | 12 | 12 | Full sentence structure, narrative links and purpose |
| t2 | 12 | 12 | Reported speech, figurative meaning and viewpoints |
| t3 | 12 | 12 | Editing, assumptions, counterarguments and synthesis |
| t4 | 12 | 12 | Precise register, literary interpretation and qualified claims |
| t5 | 12 | 12 | Nuanced rewriting, critical reading and integrated arguments |

These are graded **practice supplements**, not a complete official KSSR/KSSM syllabus, certified year-level mapping, CEFR assessment or examination prediction. Mini-passages, scenarios and sample figures are original fictional exercises. No textbook, commercial question bank or past paper was copied. Established grammar rules and conventional idioms are used as learning content. Some skills recur with added complexity; no question was expanded by merely changing its level label or shuffling its options.

## Reference checks

Primary language references were checked on 9 September 2026 for the following boundaries; examples and questions were authored independently.

| Boundary checked | Primary reference |
| --- | --- |
| BM kata pemeri and unnecessary copular wording | [DBP: Perihal Kata Pemeri](https://dewanbahasa.jendeladbp.my/2022/04/11/3186/) |
| BM source/comparison prepositions | [DBP PRPM: dari dan daripada](https://prpm.dbp.gov.my/Cari1?d=175768&keyword=dari+dan+daripada) |
| BM first-person passive forms | [DBP PRPM: kenali](https://prpm.dbp.gov.my/Cari1?d=175768&keyword=kenali), [DBP Khidmat Nasihat](https://kndbp.dbp.gov.my/soalanlazim/nb_soalan_lazim.aspx?ctl00_contentPlaceHolder_dgCarianBaruChangePage=887_20) |
| BM solid/open compound spelling | [DBP PRPM: garis panduan and tanggungjawab](https://prpm.dbp.gov.my/Cari1?d=175768&keyword=garispanduan) |
| Conventional idiom/proverb meanings | [DBP: ringan tulang](https://kndbp.dbp.gov.my/soalanlazim/nb_soalan_lazim.aspx?ctl00_contentPlaceHolder_dgCarianBaruChangePage=1300), [DBP PRPM: kemahuan](https://prpmv1.dbp.gov.my/Search.aspx?k=kemahuan) |
| Third and mixed conditional meaning | [British Council: Conditionals, third and mixed](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/conditionals-third-mixed) |
| Non-defining relative clauses | [British Council: Non-defining relative clauses](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/relative-clauses-non-defining-relative-clauses) |
| Present perfect with continuing states | [British Council: Present perfect](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/present-perfect) |
| Future perfect completion | [British Council: Future continuous and future perfect](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/future-continuous-future-perfect) |
| Passive tense patterns and causative service construction | [British Council: Passives, including the LearnEnglish team's explanation of causative have](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/passives?page=4) |

Some PRPM checks used the official site's indexed search excerpts because direct retrieval was unreliable; the `dari/daripada` page returned HTTP 502. A Cambridge causative reference returned HTTP 403, so the readable British Council explanation was used instead. These checks support grammar decisions; they do not establish official syllabus coverage. No paid API was used.

## Verification and self-review

- A fresh Node 24 direct import of the actual TypeScript bank and current helper completed with exit status **0**. A resolver hook only supplied the `.ts` extension for local imports.
- Assertions verified the exact 11 levels, both required subjects, 12 questions per cell, 264 unique IDs and 264 distinct normalised prompts, four distinct options per question, valid answer indices and nonempty explanations.
- Every generated `options[answer]` was compared with its independently read authored row's correct-answer string. All 264 mappings passed with the current stable-hash helper. Answer-position totals were `[63, 60, 67, 74]`.
- The D2 BM row `nama-khas-aina` deliberately has options differing by letter case: the skill being assessed is capitalisation. It is the only case-only option set. Duplicate-option checks must preserve case for this exercise.
- Self-review replaced an ambiguous ownership question with an explicit explanation of lending, specified formal written English for `fewer`, specified backshift or a target tense where alternative tense readings could otherwise be possible, and required a contrast connector explicitly. A repeated concessive grammar pattern was replaced with a distinct causative question. Inference questions use contextual clues and qualified conclusions; neither irony nor a limited survey is treated as conclusive evidence of unrelated facts.
- This source snapshot has no `.git` directory and no project dependencies or TypeScript compiler installed. Full application typecheck/build and UI integration remain the coordinator's checks; the direct import establishes syntax and the bank's runtime data contract, not the whole application build.

The source was declared ready and frozen for integration after the successful mapping check. This note can be integrated separately.
