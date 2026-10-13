# Study practice bank v2

This release adds 1,440 original question entries across all 102 selectable level/subject pairs: Darjah 1–6, Tingkatan 1–5 and all 23 Tingkatan 6 catalogue subjects. There are 1,827 selectable entries across 253 topics after integration, compared with 414 seed entries. Counts are question entries across levels, not claims of distinct concepts or complete syllabus coverage.

| Bank | Added entries | Approach |
| --- | ---: | --- |
| BM and English | 264 | 12 original items per language and level |
| Science, History and Geography | 192 | Eight original items per applicable pair |
| Islam and Moral | 176 | Eight distinct subject-specific items per pair |
| STPM | 184 | Eight original items in each of 23 subjects |
| Primary and secondary Mathematics | 624 | Deterministic numerical variations, independently solved from the displayed prompts |

New topics appear before the old seed topics. Old upper-primary maths seed questions are no longer offered in Darjah 1–3; stored attempts and historical IDs are retained. Other original seed entries remain available. This explains the total: 414 − 27 retired level-specific entries + 1,440 additions = 1,827.

## Practice behavior

- Each session contains up to five questions. There is no daily session cap and the ten-question daily goal is informational.
- Completing a set stores the result before showing the next-set controls. New sessions select unanswered IDs from the current student's level, subject and topic history.
- At exhaustion the interface explicitly offers revision, without labelling already answered questions as new. Revision prioritises questions least recently practised, so consecutive review sessions rotate through larger banks.
- The bank is finite; an unlimited number of practice sessions does not mean infinitely many unique questions. Parent focus-session controls still apply.
- No paid provider, AI API call, authentication schema or database schema is introduced. All bank content ships in the PWA JavaScript cache.

## Editorial contract

These are original practice supplements with increasing reading and reasoning demands. They are not official examination questions, a full DSKP/MPM syllabus mapping, predicted exam papers, or externally moderated assessment packs. Source-supported conceptual checks and structural/numerical tests do not replace teacher or native-language moderation. See the authors' sources and coverage limits:

- [Language evidence](sources/language-bank-notes.md)
- [Science and humanities evidence](sources/science-humanities-bank-notes.md)
- [Islam and Moral evidence](sources/values-bank-notes.md)
- [STPM evidence](sources/stpm-bank-notes.md)

Keep each semantic row key permanent. Change its key if the question's meaning or correct answer changes; do not reuse IDs for different content. `bankTopic` derives option placement from the full question ID, so moving a row does not change its identity or choice positions. Case differences can be intentional in language orthography questions.

## Checks

Run `npm test -- --maxWorkers=2`, `npm run validate:curriculum`, `npm run build`, and `node scripts/validate-pwa.mjs`. The validator requires at least eight additional entries for every selectable pair, valid options/answers, unique IDs and complete STPM availability. Maths tests independently interpret 18 prompt families, check all 624 answers and reject the shortcut of always choosing the smallest/largest answer. Continuation tests cover several sets beyond the daily goal, exhaustion, and rotating review.

Production deployment is a separate step. The implementation is based on graphics commit a1b6d6b and preserves the PWA skipWaiting/clientsClaim and artwork precache checks.
