# Academy role illustrations and motion — 15 October 2026

The user correctly identified that the M17 dashboard layout did not include the prominent character artwork expected from the supplied Smart Academy showcase. This release closes that visual gap with original generated illustrations inside real dashboard welcome banners. These are fictional decorative characters, not profile photos or representations of approved real teachers. Existing avatars, records, permissions and provider gates remain unchanged.

## Assets and delivery

Generated using the built-in imagegen tool with actual transparent alpha. Original PNGs are retained as local deliverables; production delivery only resizes/encodes those originals to alpha-preserving WebP, without creative compositing or changes to the approved reference image.

| Asset | Subject | Original dimensions | Delivered bytes |
| --- | --- | --- | --- |
| `public/academy/student-v1.webp` | Schoolgirl with bun, blue hoodie, laptop and notebook | 1312×1199 | 67448 |
| `public/academy/parent-v1.webp` | Mother in a grey-beige hijab guiding her son | 1374×1145 | 55250 |
| `public/academy/teacher-v1.webp` | Adult teacher with glasses, navy hoodie, laptop and teaching book | 1346×1168 | 54480 |
| `public/academy/admin-v1.webp` | Adult administrator in a navy suit with laptop and tablet | 1374×1145 | 49890 |
| `public/academy/secondary-v1.webp` | Mature navy books, notebook, pencil and headphones; no child character | 1536×1024 | 57956 |

All five files total285024bytes (about278KiB), delivered at720px width with transparency preserved. A role loads its own illustration; the PWA also precaches all five. Each image has a reserved responsive frame, empty alt text and a decorative scene hidden from the accessibility tree.

## Animation and controls

The static generated artwork receives a six-second CSS transform loop: a6px vertical float and0.2degree tilt. Small Lucide star/sparkle accents use a separate restrained five-second loop. This is deliberate lightweight UI motion, not a claim that the still image contains hand, face, speech or skeletal animation.

- `prefers-reduced-motion: reduce` disables animation/transitions and removes transforms automatically.
- A named pause/resume button stops both the character and accent animation. Its choice persists locally under `imai-study-illustration-paused`; storage failure does not prevent the in-session control from working.
- Pause/resume has a44px mobile target, visible keyboard focus and an explicit accessible name/pressed state. The decorative scene cannot intercept pointer input.
- Welcome text and functional controls remain native HTML. Existing family/learning actions, teacher refresh and admin navigation remain usable.
- Desktop frames use a232×190px character region; tablet uses170×170px; mobile uses112×142px, or100×133px at360px width. Headings balance their lines to prevent a lone waving emoji line.

## Verification and comparison

Multiple screenshot passes checked the approved showcase's blue student, orange family, green teacher and purple admin visual cues against the real implementation. All four roles pass the five required viewports1440×900,1920×1080,768×1024,390×844,360×800, with no horizontal document overflow or JS/console errors. Both the supplied reference and current rendered screenshots were inspected directly.

Browser motion checks verify loaded images, transforms changing over time with motion allowed, stationary reduced-motion rendering, pause/resume persistence after reload, reachable44px controls and age-appropriate secondary art. The first pause assertion sampled before the browser's next paint; the harness now waits for computed paused state and two animation frames before comparing the stable transform. It then passes for all four roles. No product check was weakened.

Existing affected component tests18/18 and the full680-test/122-file regression pass. Final type checking and web/API/PWA build pass; exact-commit hosted CI remains the release promotion gate. Browser plugin is unavailable, so installed Chrome/Playwright supplies the repeatable matrix and motion measurements. Production deployment evidence is recorded in the release log and private runtime audit after promotion.

Local evidence: `academy-role-art-manifest.json`, `role-art-motion-result.json`, `showcase-art-final-result.json`, role screenshots and `academy-illustration-animation.webm` (a recording of the actual UI, including pause). No backend, database, dependency or production-provider configuration changes are included.

## Prompt set

Built-in generation mode, `transparent_background=true`, no CLI/API-key fallback. Common character direction: standalone transparent decorative original fictional Malaysian EdTech character; premium polished soft3D animated-film illustration; expressive warm brown eyes, natural anatomy/hands, detailed soft hair/fabric, smooth materials, soft studio lighting and warm highlights; royal blue/navy/white with small orange accents; compact uncropped silhouette readable at160–230px; no background scenery/floor/frame/shadow rectangle, text, letters, logo or watermark. Intended for the right side of a real HTML welcome banner, never a profile photo.

- **Student prompt:** one schoolgirl learning happily at a small laptop, tidy high bun, blue hoodie, seated upper-body three-quarter pose facing slightly left, pencil over an open notebook, cheerful attentive smile; fit bun, shoulders, both hands, laptop and notebook uncropped.
- **Parent prompt:** mother in a soft warm grey-beige hijab and modest navy outfit guiding her young son with an open reading book beside a navy laptop; two characters only, warm reassuring smiles, upper-body three-quarter family pose, mother behind/beside boy, all heads and hands uncropped.
- **Teacher prompt:** adult Malaysian male teacher around28, neatly styled dark brown hair, round dark-rimmed glasses, navy hoodie over white shirt; seated at a slate-blue laptop, holding a closed teaching book in his left hand, right hand naturally near laptop; one adult only, entire asset uncropped.
- **Admin prompt:** adult Malaysian male administrator around32, neat dark brown hair, professional navy suit, white shirt, royal-blue tie and plain blue lanyard; seated behind navy laptop holding a slim tablet/folder; one adult only, full upper-body silhouette and objects uncropped.
- **Secondary prompt:** compact premium3D still life of two navy/royal-blue textbooks, open cream notebook with blank pages, blue pencil, understated dark-blue headphones and small gold bookmark; mature restrained materials, three-quarter horizontal grouped arrangement, no characters/faces/cute eyes/stickers, all objects uncropped; transparent alpha, no scenery/frame/shadow rectangle/text/letters/numbers/logo/watermark.

These additions supersede the M17 decision to omit character illustrations. The poster hardware frames, invented metrics and real-user impersonation remain excluded. Master TODO statuses are not promoted from decorative artwork or animation evidence.
