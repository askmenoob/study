# STPM supplementary Library: editorial sources and checks

## Follow-up grade audit

The revised MPM 950 Management Mathematics PDF was successfully retrieved by the
STPM audit reviewer through the [official category and download link](https://portal.mpm.edu.my/stpm/sukatan-pelajaran-peperiksaan-stpm-yang-dimurnikan/category/950-mathematics-m-2).
Printed pages 19–20 (PDF pages 30–31, zero-based) place simplex and Big-M in
Semester 3, including three decision variables. The existing two-variable vertex
unit is now explicitly labelled foundational; it does not establish mastery of
16.1/16.2. The coordinator's direct raw URL fetch failed; the reviewer used the
official category and download link successfully.

Question-position references in Management Mathematics, Chemistry and Sports
Science are replaced with named conditions to survive reordered practice.
Full per-unit findings, including weak distractors and missing visual material,
are in `../../docs/audits/GRADE_CONTENT_AUDIT.md`.

Editorial check date: 9 September 2026. Content file: `stpm.json`.

This collection contains 23 selected-skill units for the application's `t6` subjects: 23 notes, 23 original readings, 23 practice sets and 138 questions. It is original supplementary learning material. It is not an MPM publication, an official examination paper, a full syllabus map, or a claim of complete coverage of any current semester.

`src/data/curriculum.ts` supplies the application subject IDs. `src/data/banks/stpm.ts` was consulted only to identify existing subject scope; its questions were not copied. Every narrative, simulated document, dataset, mathematical model, answer option, hint and teaching explanation in this collection was written for this resource. Historical dates and named localities in the history exercises are expressly fictional. Language and literature extracts are original, not prescribed-set-text quotations.

## Scope and language

MPM's [refined STPM syllabus directory](https://portal.mpm.edu.my/stpm/sukatan-pelajaran-peperiksaan-stpm-yang-dimurnikan) was checked for the subject names and examination codes below. Its linked announcements identify the refined syllabuses as applying from Semester 1 STPM 2026; this does not establish that every supplementary exercise is a specified current examination outcome. The directory displayed no downloadable items in its 932 Tahfiz category when checked. Accordingly, no claim of a verified new Tahfiz syllabus is made.

| Application ID | MPM code | Selected focus | Resource language |
| --- | --- | --- | --- |
| bm | 910 | Cohesion, reference, coherence and limits of argument | Malay |
| history | 940 | Provenance, purpose, corroboration and causal alternatives | Malay |
| geo | 942 | Drainage-basin systems, hydrographs and land-use interventions | Malay |
| pa | 900 | Outputs, outcomes, comparison groups and distribution of benefits | Malay |
| bc | 911 | Concession, rhetorical questions and evidence scope | Original Chinese with Malay analytical context |
| bt | 912 | Symbols, narrative perspective and qualified argument | Original Tamil with Malay analytical context |
| ba | 913 | Isim/khabar constructions, grammatical function and inference | Original Arabic with Malay analytical context |
| lit_en | 920 | Narrative distance, objects, irony and evidence-led interpretation | English |
| kmk | 922 | Space, conflict, symbolism and stage adaptation | Malay |
| syariah | 930 | Cost disclosure, contract roles and limits of an akad assessment | Malay |
| usuluddin | 931 | Sanad, matan, source tracing and limits of authentication | Malay |
| tahfiz | 932 | Tasmik evidence, error patterns and targeted murajaah | Malay |
| economics | 944 | Tax wedges, equilibrium, incidence and tax receipts | Malay |
| business | 946 | Relevant costs, sunk costs, capacity and operating choices | Malay |
| accounting | 948 | Accruals, prepayments, unearned revenue and depreciation | Malay |
| mgmt_math | 950 | Linear programming, feasibility, vertices and a resource change | English |
| stpm_math | 954 | Derivative signs, interior local extrema in the published revised unit and geometric area | English |
| ict | 958 | Functional dependencies, decomposition and referential integrity | English |
| physics | 960 | Flux linkage, Faraday's law, Lenz's law and circuit assumptions | English |
| chemistry | 962 | Stoichiometry, Qc/Kc, catalysts, volume and temperature changes | English |
| biology | 964 | Saturation, a supplied Michaelis–Menten model and competitive inhibition | English |
| sports_science | 966 | Static moments, perpendicular moment arms and model limitations | Malay |
| visual_art | 970 | Formal analysis, visual hierarchy, symbolism and communication tests | Malay |

The mathematical and kinetic equations are stated explicitly in their learning contexts. The biology rate equation is a supplied analytical model, not a claim that the equation must be recalled for a particular MPM paper. The language units practise close reading and grammar; they do not claim to replace the full language syllabuses or prescribed literature.

## Primary and publisher sources checked

Sources support the identified concepts, not the invented numerical cases or narratives. No source passage, past-paper question, religious quotation or illustration has been reproduced.

- **BM:** DBP's [PRPM language advice on kohesi](https://prpm.dbp.gov.my/Cari1?d=175768&keyword=kohesi) and [koheren](https://prpm.dbp.gov.my/Cari1?d=175768&keyword=koheren) distinguish linguistic connectedness from a logically organised discourse. The reference and editing examples are original.
- **History:** The US National Archives' [written-document analysis guide](https://www.archives.gov/education/lessons/worksheets/analyze-a-written-document-intermediate) supports examining creator, audience, date, purpose and unanswered questions. The unit applies those methods to explicitly simulated records; it imports no US historical facts into a Malaysian syllabus claim.
- **Geography:** USGS [Surface Runoff and the Water Cycle](https://www.usgs.gov/water-science-school/science/surface-runoff-and-water-cycle) and [Infiltration and the Water Cycle](https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle) support the distinction between infiltration, rapid runoff and stream response. All basin measurements and management outputs are invented teaching data; no numerical USGS runoff multiplier is used.
- **Syariah:** Bank Negara Malaysia's [Murabahah policy document, 23 December 2013](https://www.bnm.gov.my/documents/20124/938039/20131223_S_O_0001.pdf/) identifies disclosure of acquisition cost and markup in the sale structure. The source is used for that conceptual definition, not as a claim about current regulatory compliance or a ruling on an actual financial product. The cases deliberately separate an arithmetic check from a complete contract assessment.
- **Usuluddin:** Jabatan Mufti Wilayah Persekutuan's [Hadith Sahih, Irsyad al-Hadith 104](https://muftiwp.gov.my/ms/artikel/irsyad-al-hadith/1129-irsyad-al-hadith-siri-ke-104-hadith-sahih) supports the stated authentication criteria. Its [Concept of Tabayyun, Bayan Linnas 184](https://www.muftiwp.gov.my/en/artikel/bayan-linnas/3485-bayan-linnas-series-184-the-concept-of-tabayyun) supports careful verification before accepting or transmitting claims. No actual hadith is quoted or graded in the unit.
- **Tahfiz:** Darul Quran JAKIM's [Sijil Tahfiz Malaysia page](https://www.darulquran.gov.my/index.php/peperiksaan/sijil-tahfiz-malaysia) identifies oral and written hafazan assessment as distinct components; its [Sijil Perakuan Hafazan Bertahap page](https://www.darulquran.gov.my/index.php/peperiksaan/sijil-perakuan-hafazan-bertahap) refers to confirmation by an institution or guru tasmik. These are institutional context, not STPM assessment specifications. The original empirical study [Amalan Hafazan Al-Quran di Darul Quran JAKIM](https://ejournal.upsi.edu.my/index.php/PERS/article/view/1773), Abd Ghani, Ismail and Twahir (2017), describes memorisation/revision practice and reports talaqqi and musyafahah in the study population. Its accessible abstract was checked; no percentages or claims of proven effectiveness are imported. Error logs and training decisions in the unit are invented educational cases, not religious text.
- **Economics:** OpenStax, the textbook publisher, [Elasticity and Pricing](https://openstax.org/books/principles-microeconomics-3e/pages/5-3-elasticity-and-pricing), supports analysing tax incidence through buyer and seller price responses. The demand/supply equations and all tax amounts are original; no actual policy, price elasticity estimate or market prediction is given.
- **Accounting:** OpenStax [Adjustment Process and Common Types of Adjusting Entries](https://openstax.org/books/principles-financial-accounting/pages/4-2-discuss-the-adjustment-process-and-illustrate-common-types-of-adjusting-entries) supports distinguishing accrual timing, prepayments and unearned revenue. The entry direction depends explicitly on how each item was initially recorded. Useful life, residual value, acquisition timing and the absence of tax are stipulated in the exercise rather than assumed from an external standard.
- **ICT:** Microsoft Learn [Database normalization description](https://learn.microsoft.com/en-us/previous-versions/troubleshoot/microsoft-365/microsoft-365-apps/access/database-normalization-description) supports dependency-based decomposition and the problem of repeated facts. All schemas and dependencies are original and explicitly stipulated. A surrogate identifier is not presented as a substitute for resolving dependencies or enforcing integrity.
- **Physics:** OpenStax [Faraday's Law](https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law) and [Lenz's Law](https://openstax.org/books/university-physics-volume-2/pages/13-2-lenzs-law) support flux-change magnitude and direction. The coil model defines the normal, viewing direction, closed-circuit resistance, linear time interval and neglected self-inductance. The final constant-field result is confined to those assumptions.
- **Chemistry:** OpenStax [Equilibrium Constants](https://openstax.org/books/chemistry-2e/pages/13-2-equilibrium-constants) and [Shifting Equilibria](https://openstax.org/books/chemistry-2e/pages/13-3-shifting-equilibria-le-chateliers-principle) support Q/K comparison, catalyst effects and temperature-dependent equilibrium. Values and concentrations are original. Reported Kc units use the explicit concentration convention; these are not dimensionless thermodynamic activity constants.
- **Biology:** OpenStax [Enzymes](https://openstax.org/books/biology-2e/pages/6-5-enzymes) supports saturation and the ideal competitive-inhibition pattern in which high substrate approaches the same limiting rate. Numerical work uses the equation and parameter changes explicitly supplied in the unit. The observed pattern is described as consistent with a model, not as direct proof of a molecule's binding structure.
- **Sports science:** OpenStax [Torque](https://openstax.org/books/university-physics-volume-1/pages/10-6-torque) supports the perpendicular lever arm and summation of moments about a common axis. Exercises use an explicitly simplified static segment; they are not exercise prescriptions, injury treatment or measurements of an actual participant.
- **Visual art:** Getty [Understanding Formal Analysis: Principles of Design](https://www.getty.edu/education/teachers/building_lessons/formal_analysis2.html) supports emphasis, balance and relationships among visual elements. All posters are verbal descriptions of invented designs. Interpretations are tied to the described evidence and do not assign universal psychological meanings to colours.

The PA programme comparisons, business cost models, mathematical functions, language texts and literary scenes are self-contained constructions. Their conclusions follow from the stated information and assumptions, rather than from claims about current government performance, real businesses or author biography.

## Editorial safeguards and verification

- All 23 subject IDs match the supplied `t6` list. Every unit ID begins `library-t6-<subjectId>-`; all 69 resource titles are distinct.
- Each note has exactly three explanatory paragraphs, including a worked example and a misconception, and three key points. Notes contain 125–156 whitespace-delimited words. Readings contain 88–109 words by the same count after the final edits; Chinese text is unsegmented and contributes substantial additional native-language content beyond this conservative whitespace measure.
- Readings have exactly two questions; practice sets have exactly four. All 138 questions have four distinct nonempty options, an integer answer index from 0 to 3, a hint and a teaching explanation. Answer-index counts are 35 at index 0, 34 at index 1, 35 at index 2 and 34 at index 3.
- Note, reading and practice have separate contexts; every practice supplies the information required for its four questions. None depends on an unavailable image, prior question-bank answer, external document, or unstated actual event.
- Exact rational arithmetic independently recomputed numerical cases. Linear-programming checks enumerated boundary intersections and rejected infeasible vertices. Calculus checks generated derivatives and integrals from polynomial coefficients rather than copying stated answers.
- Quantitative checks include: geography 37.5%; PA 25 percentage points, 15 additional percentage points and RM200; Syariah RM1150, 20% and RM3000; tax equilibrium Pc/Pp = 42/34 with Q = 54 and receipts RM432; business threshold 2000 units and RM2000 saving at 3000 units; adjusted accounting profit RM37200.
- Further checks: LP optima RM460 and RM482 after the resource change; cubic extrema at x = 1 and 3, decreasing interval 1 < x < 3 in the published revised unit, and area 27/4 (the old endpoint-extremum item is archived); physics 0.54 Wb-turn, 5.4 V and 0.90 A; chemistry 1.20 mol NO₂, Kc = 1.80 and post-expansion Qc = 0.900 in the stated units; enzyme rates 40, 20 and 80 μmol min⁻¹ under the respective cases; biomechanics 21 N m, 600 N and 429 N.
- A separate read-only language review led to correction of a Tamil question-word case and a revision that makes the English drawer claim explicitly contradicted by the narrator's observation. The final language texts remain original.
- Religious content contains no invented Quran verse, hadith wording, sanad chain attributed to actual people, or rulings on real transactions. Tahfiz labels A and P are task identifiers, not substituted religious text. The Arabic grammar samples are expressly ordinary authored exercises.

Validation is an editorial and computational check of this limited supplementary set, not certification by MPM or a substitute for review against a learner's actual current syllabus and prescribed materials.
