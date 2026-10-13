# Science and humanities question-bank additions

Authored and reviewed on 9 September 2026. Implementation: `src/data/banks/scienceHumanities.ts`, exporting `scienceHumanitiesBank: LevelBank` through the shared `bankTopic` helper.

## Scope and counts

| Subject | Levels | New pairs | Questions per pair | New questions |
| --- | --- | ---: | ---: | ---: |
| Science | d1–d6, t1–t5 | 11 | 8 | 88 |
| History | d4–d6, t1–t5 | 8 | 8 | 64 |
| Geography | t1–t5 | 5 | 8 | 40 |
| Total | | 24 | 8 | 192 |

These are original supplementary practice questions, not copied examination questions or a claim of complete KSSR/KSSM syllabus coverage. Situations, numerical examples, options and explanations were authored for this bank. No paid API is needed to serve them.

One topic is added per requested subject–level pair. New topic IDs use the shared `practice-` namespace; question IDs use `bank-v2-{level}-{subject}-{topic-slug}-{semantic-key}`. Do not reuse a semantic key for a materially different meaning or correct answer. Answer positions rotate through the helper, giving two answers at each index in each eight-question topic.

## Progression

| Level | Science focus | History focus | Geography focus |
| --- | --- | --- | --- |
| d1 | Concrete senses, visible characteristics, water and absorbency | — | — |
| d2 | Growth, life cycles, germination, water and magnets | — | — |
| d3 | Teeth, feeding groups, soil, materials and fair comparison | — | — |
| d4 | Respiration, plant responses, light, sound and food chains | Family chronology, records, artefacts and interpretation of photographs | — |
| d5 | Circuit application, heat transfer, expansion and rust | Independence, national institutions and symbols, event evidence | — |
| d6 | Organism interactions, preservation, speed, gravity and Moon observations | Formation of Malaysia, separation of Singapore, unity and regional identity | — |
| t1 | Measurement, density, cell structures, particles and separation | Prehistory, early civilisation and source evaluation | Directions, keys, scale, drainage and settlement |
| t2 | Ecosystems, nutrition, neutralisation, pH, sound and convection | Port trade, governance, diplomatic relationships and trade records | Earth movements, weather, monsoon, transport and communication |
| t3 | Coordination, circulation, xylem, electrical power and energy | Colonial intervention, economic change and interpretation of colonial evidence | Data, sectors, resources, forests and environmental management |
| t4 | Simple inheritance, chromosomes, isotopes, ions, force and nuclear processes | Nationalism, post-war chronology, constitutional preparation and independence | Topographic skills, tectonics, rivers, coasts, rainfall and runoff |
| t5 | Microorganisms, rates, carbon compounds, electroplating, hydraulics and satellites | Sovereignty, constitutional monarchy, federalism, Malaysia formation and diplomacy | Population measures, migration, development and sustainability |

Difficulty is an editorial progression, not a calibrated psychometric rating. Lower-primary prompts emphasize familiar observable situations; secondary prompts increasingly require conditions, calculations, causal reasoning and limits of evidence. The 107 distractor sets revised during review favour nearby concepts and common reasoning errors over unrelated answers.

## Sources consulted

Public institutional sources were used to check stable fact clusters. The links below are references for maintainers; no source passage or examination bank was copied into the implementation.

### Science and physical geography

- [NASA: Moon phases](https://science.nasa.gov/moon/moon-phases/) and [NASA: Top Moon questions](https://science.nasa.gov/moon/top-moon-questions/): d6 phase geometry and the distinction between normal phases and Earth's shadow in a lunar eclipse.
- [NASA Space Place: What causes the seasons?](https://spaceplace.nasa.gov/seasons/): t2 geography, axial tilt and opposite seasons. The questions do not attribute seasons to changing Earth–Sun distance.
- [NASA: Catalog of Earth satellite orbits](https://science.nasa.gov/earth/earth-observatory/catalog-of-earth-satellite-orbits/) and [NOAA: Geostationary satellites](https://www.nesdis.noaa.gov/our-satellites/currently-flying/geostationary-satellites): t5 science geostationary orbital conditions. The item uses one Earth rotation, avoiding an inaccurate exact 24-hour sidereal claim.
- [NHGRI: Dominant traits and alleles](https://www.genome.gov/genetics-glossary/Dominant-Traits-and-Alleles) and [NHGRI: Allele](https://www.genome.gov/genetics-glossary/Allele): t4 simple inheritance terminology. The question explicitly assumes a single gene and complete dominance; it does not imply that all human traits follow that model.
- [CDC: Antibiotic use facts](https://www.cdc.gov/antibiotic-use/data-research/facts-stats/index.html): t5 distinction between bacterial and viral infections. This is a conceptual biology question, with no medication or treatment instructions.
- [METMalaysia: Weather phenomena](https://www.met.gov.my/en/pendidikan/fenomena-cuaca/) and [METMalaysia: Malaysia's climate](https://www.met.gov.my/en/pendidikan/iklim-malaysia/): t2 geography monsoon timing and the east-coast rainfall pattern. Wording states the usual pattern rather than a daily forecast or a universal rule for every location.
- [USGS: Surface runoff and the water cycle](https://www.usgs.gov/water-science-school/science/surface-runoff-and-water-cycle) and [USGS: Infiltration and the water cycle](https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle): t3/t4 forest, runoff and impermeable-surface reasoning.

### History and national institutions

- [Department of Museums Malaysia: Glossary](https://www.jmm.gov.my/en/node/1890): artefacts, excavation, conservation, prehistory and Neolithic settlement/agriculture. This was read as a concept reference; no date range is imposed universally on all regions.
- [British Museum: Early Egypt](https://www.britishmuseum.org/collection/galleries/early-egypt): Nile agriculture and early Egyptian civilisation.
- [Department of Museums Malaysia: National Museum](https://www.jmm.gov.my/en/content/national-museum): early Malay kingdoms and Melaka's role in regional trade.
- [Arkib Negara: Proclamation of Independence Memorial](https://www.arkib.gov.my/en/perkhidmatan/arkib-memorial/info-galeri/the-proclamation-of-independence-memorial): independence chronology, including 1957, and the earlier Portuguese conquest of Melaka.
- [Arkib Negara: Pangkor Treaty catalogue record](https://ofa.arkib.gov.my/ofa/group/asset/868810) and [National Library of Malaysia: Perjanjian Pangkor](https://www.pnm.gov.my/yangpertama/Sidang_Pangkor.htm): the 1874 treaty and Resident system. The catalogue verifies the record/year; the National Library page was discoverable through indexed text, but direct page retrieval failed during this session.
- [National Library Board Singapore: Malayan Union is inaugurated](https://www.nlb.gov.sg/main/article-detail?cmsuuid=e8db672a-3571-4fa3-9df0-220e83ee2a88): 1946 inauguration, sovereignty-related opposition, and replacement by the Federation of Malaya in 1948.
- [Arkib Negara: Perlembagaan Asas Perundangan Negara](https://www.arkib.gov.my/images/pameran-maya/perlembagaan-asas-perundangan-negara-1.pdf) and [Department of Information: Malaysia Baharu 2018, page 106](https://dbook.penerangan.gov.my/dbook/dmdocuments/malaysia_baharu_2018/files/basic-html/page106.html): Reid Commission and constitutional preparation. Indexed extracts were available; a direct fetch of the Arkib PDF timed out.
- [MKN: Background to the formation of Malaysia](https://www.mkn.gov.my/web/ms/2023/05/10/latar-belakang-penubuhan-malaysia/): 1963 constituent territories, formation date and the Cobbold Commission's purpose. This article contains inconsistent years in its preliminary-event chronology; those preliminary dates and its support-percentage estimate were deliberately not used.
- [MyGovernment: Rukun Negara](https://www.malaysia.gov.my/my/government/kenali-malaysia/rukun-negara): unity purpose and named principles.
- [MKN: Kenali Malaysia Kita](https://www.mkn.gov.my/web/ms/2026/08/16/kenali-malaysia-kita/): national symbols, including Negaraku and bunga raya.
- [Parliament of Malaysia: General information](https://www.parlimen.gov.my/maklumat-umum.html?uweb=dr): constitutional monarchy and Parliament. Indexed institutional content was available; direct retrieval returned a gateway error. Questions cover stable institutional definitions, not current officeholders or political composition.
- [ASEAN: Founding history](https://asean.org/the-founding-of-asean/) and [ASEAN: original Bangkok Declaration](https://agreement.asean.org/media/download/20140117154159.pdf): 1967 establishment and regional cooperation. No present-day membership count is asked.

## Review and verification

The author reviewed each correct answer and explanation for a single answer under the stated conditions. Specific ambiguity controls include: ordinary transparent water for a bottom-meniscus reading; dry air for nitrogen proportion; arteries defined by direction rather than oxygen content; model food-chain effects with other factors held fixed; complete dominance explicitly stated; and an ideal hydraulic system. History items distinguish a direct observation from an inference and do not assume that official records are automatically unbiased.

A fresh Python structural check parsed every literal row and reconstructed the helper's IDs. It exited 0 with:

- 24 pairs exactly matching the requested scope; eight questions in every pair.
- 192 distinct IDs, 192 distinct prompts and no exact prompt collision with the existing `curriculum.ts` bank.
- Exactly one nonempty correct-answer string plus three nonempty distinct distractors for every row.
- Nonempty teaching explanations and semantic keys matching the lowercase hyphenated key convention.

Numerical answers were independently recalculated for speed, density, map scales, temperature range, power, energy, pressure, acceleration, rates, hydraulics, population density, natural increase and net migration. Quantities and units agree with the prompts.

TypeScript, Vitest and build verification are delegated to the integrating parent because this isolated snapshot has no `node_modules`. This note records author/structural review, not independent classroom validation or a completed application build.
