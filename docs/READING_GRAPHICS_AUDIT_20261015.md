# Reading graphics audit and implementation

## Scope and baseline

The published catalogue contains1,200 reading resources:100 per grade d1–d6 and t1–t6, across28 subjects. The full library contains3,601 resources including the linked notes/practice and fraction pilot. Before this change,125 readings had a visible graphical route:100 D1 teaching-first entries and25 primary illustrated passages.119 readings carry338 authored paragraph illustrations; six early units additionally use picture frames. All338 authored reading illustrations have a valid paragraph target, nonblank caption/accessible label and nonempty graphic items.

The normal reader previously gated illustrated rendering on sourceIds. This coupled source attribution to presentation and left most readings as paragraphs only. The fix uses the illustrated paragraph renderer independently of source attribution. Source IDs and source notices retain their original meaning.

## Change contract

Every published reading entry must reach a real local thematic image and a reading map derived from its authored passage. The same visual components also cover library notes/practice, selected tutor notes and teacher-contributed text readers/previews. Teacher text remains escaped/plain and is not rewritten or sent to an image service. External linked books/PDFs remain external resources; their source documents are not modified.

Thirteen original3D object illustrations cover language, mathematics, nature, matter, energy, world, community, heritage, faith, enterprise, digital, creative and health. The illustrations are shared by related subjects, not1,200 bespoke story scenes. The graphic header identifies its theme; the reading map contains resource-specific quotations from the passage. Captions explicitly direct learners to the passage for facts. No chart, historical event, religious text or scientific reaction is invented by the artwork.

The existing authored pictures, exact question objects, answers, reading evidence, source links, teacher attribution and stable resource/unit IDs are retained. D1 still opens teaching before questions and retains all counting, sound, shape and picture-choice supports. The new fraction strips use equal CSS cells with explicit accessible labels and shade only proper fractions found in the maths passage/title context. Dates, negative values, improper/oversized denominators and non-maths text do not become a positive fraction model. Attached question answers are never read by the graphical model.

## Assets and performance

Versioned assets live at public/reading-art/*-v1.webp.13 optimized transparent640×480 WebP images total854,358 bytes. Originals and delivery manifest are retained in the local workspace outputs/reading-art-originals and outputs/reading-art-manifest.json. Card thumbnails load lazily; the opened reader reserves dimensions and loads its image eagerly. Related cards reuse the same cached theme asset. Existing PWA WebP precaching covers the assets. No animation, external image host, new dependency, API call or paid AI provider is needed when reading.

## Audit outputs and verification

Run npx tsx scripts/audit-reading-graphics.ts. It writes READING_GRAPHICS_INVENTORY.json and .csv beside this report, with one row per resource: ID, grade, subject, previous graphical route, current local asset, authored illustration count, early frames, source paragraph indexes and fraction models. These are structural and rendering-coverage evidence, not a claim of formal educator approval or full syllabus coverage.

The new tests exercise every reading through LearningLibrary (including the D1 teaching-first branch), every resource through the visual component, all authored paragraph pictures, multilingual escaping, English labels, subject assignment, lazy image semantics and fraction correctness/exclusions. Existing library, unit lesson and teacher-content checks remain required. Browser QA covers actual navigation/search/opening, loaded image bytes, desktop/mobile layouts, reading map collapse, font tools, D1 picture frames, multilingual passages and tutor preview without invoking provider speech/chat. Production promotion requires the integrated build/test and exact-commit hosted CI to pass, a fresh backup and runtime verification.

## Original image prompts

Built-in image_gen mode, transparent_background=true; no CLI/API-key fallback. Shared direction: original polished editorial3D educational object still life for study.imai.my; tactile clay/soft realistic materials; cobalt blue, amber and mint; soft studio light; sophisticated friendly primary-to-pre-university style, no people, transparent alpha, generous margin and landscape4:3 arrangement. No words, letters, numbers, logos, watermark or rectangular backdrop. Introductory theme art, not a labelled factual diagram.

Subject prompts:

- language: open illustrated storybook, fountain pen, blank paper speech bubbles, stack of colorful books.
- mathematics: abacus, unmarked ruler, compass, wooden cubes and fraction circles; no labels/equations. All assessed fraction geometry is rendered independently in code.
- nature: leafy plant/soil, butterfly, small bird and magnifying glass.
- matter: closed round blue-liquid flask, amber-liquid beaker, two empty test tubes/stand and magnifying lens; no flames/fumes/mixing/bonds/reaction.
- energy: separate battery, glowing bulb, gear and wind turbine; no connected wires or circuit diagram.
- world: globe with abstract land shapes, abstract terrain map, compass and layered mountain; no political borders/flags/coordinates.
- community: miniature welcoming neighborhood, three houses/shared courtyard/tree and heart sculpture; no real location.
- heritage: blank rolled manuscript, museum pavilion miniature, magnifying glass, closed archive box; no identifiable building/event/person.
- faith: wooden stand supporting closed unmarked blue book, geometric arch and eight-point tile; no sacred text/calligraphy/religious figure.
- enterprise: miniature storefront, blank ledger, abacus and blank calculator; no currency/chart/monetary figures.
- digital: laptop/blank mint screen, unmarked processor, magnifying glass and interlocking data cubes; no UI, network arrows or algorithm.
- creative: sketchbook/abstract swatches, palette/brushes/pencils and geometric sculpture; no lettering.
- health: athletic shoe, basketball, blank stopwatch, water bottle and folded towel; no anatomy or medical claim.

## Release boundary

Fresh integrated checks:685/685 tests in123 files, zero skipped; web/API/typecheck/PWA build and both curriculum/library validators PASS. The full coverage test exercises all1,200 reading entries and all3,601 visual-resource inputs. Browser QA:28 selected readings,56 desktop/mobile captures, all12 grades, all13 themes, Chinese/Tamil/Arabic, map collapse/reopen, D1 picture frames and320px enlarged-text checks PASS, with no JavaScript/console errors. One published teacher resource was observed via a production count-only query; no private body was copied or transmitted. Reader-level coverage applies to teacher text dynamically.

Mobile review moved graphics directly beneath the reading title. The source passage and learning controls remain below the graphic guide. The complete per-resource inventory is a coverage audit; screenshot sampling is explicitly28 readings, not1,200 manually viewed pages. The exact source reading text and all338 authored paragraph illustrations remain unchanged.

This frontend graphics change preserves the backend/schema/provider/commercial/privacy controls. Full production-account joint UAT and the existing six blocked/two in-progress business dependencies remain separately tracked. Fresh test, CI, browser and deployment evidence is recorded in the release checkpoint and canonical release log after completion.
