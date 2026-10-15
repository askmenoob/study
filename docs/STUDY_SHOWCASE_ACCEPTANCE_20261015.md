# Smart Academy approved showcase implementation — 15 October 2026

## Scope and reference

The user supplied `IMAI Smart Academy Dashboard Showcase.png` and a master implementation prompt. This image is the controlling visual reference for this release. The earlier blue/white refresh is the functional baseline, not the replacement reference. The poster's laptop/phone frames and surrounding characters are presentation artwork, not application navigation or data.

Source baseline: private `94785ed`; public snapshot `3374529`. Existing React/TypeScript/Vite/PWA/Fastify/PostgreSQL application retained. No backend endpoint, schema, provider credential, financial rate, permission rule or curriculum is changed.

## Audit and implemented gaps

| Surface | Baseline gap | Implemented result |
| --- | --- | --- |
| Shared shell | 244px sidebar, oversized banners and repeated framed introductions | 220px desktop sidebar, 66px header, 28px gutters, 16px cards, 18px overview gaps; 188px tablet sidebar and 16px mobile gutters |
| Student | Main class/progress information below a large hero and quick-action block | Actual name/grade welcome, accepted upcoming or current class beside recorded subject mastery, compact quick actions, actual streak and seven-day activity, existing homework and age-specific learning |
| Student navigation | Learning and teacher materials combined in broad destinations | Dashboard, Kelas Saya, Latihan, AI Tutor, Tugasan, Library, Prestasi and Bahan Guru reach existing real screens; mobile retains complete menu |
| Parent | Weekly activity occupied the first viewport; subject progress far below | Child identity selector, selected-child mastery beside confirmed session, compact weekly and recent activity cards, reports, family and teacher connections preserved |
| Teacher | Large introductions followed by long forms | Real KPI strip, confirmed session and teaching desk side by side, pending connection/material/profile actions, existing forms and private sandbox statements below |
| Admin | Large six-card grid and long operating sections | Compact real metrics with IMAI/external split, application and feedback previews, protected operating destinations retained |
| Responsive | Legacy selectors overrode card sizing and margins | Removed doubled operational gutter, repaired mobile admin title/button collision, compact parent insight footer, intentional mobile card order and readable controls |

The showcase styles extend the existing Academy design tokens and Lucide icon family. They do not introduce another component library. Core colors are blue `#1569E8`, navy `#16325A`, canvas `#F4F8FF`, white, green `#22A879`, orange `#F4A340`, purple `#7952C8` and border `#DFEAF8`.

## Data and interaction contract

- A class appears in the upcoming overview only when its booking is accepted and its end time is still in the future. Current sessions remain discoverable. Pending, cancelled, completed and sibling bookings do not qualify. No selected child means no child booking is shown.
- Mastery, streak and activity use saved learning records. Activity days use the Malaysia calendar and exclude other levels and future attempts. Empty progress remains zero with its source disclosed.
- Teacher overview counts come from the existing owned class, enrollment and material reads. Affiliation is displayed independently of identity-evidence completion. Sandbox drafts never imply transferred earnings.
- Admin applications use the existing admin-only pending-application API; feedback previews reuse the inbox request. No teacher email, child identity evidence or private admin projection is passed into family components.
- New class-detail buttons focus the actual destination. Reduced-motion users receive immediate scrolling. Existing drawer focus trap, Escape behavior, labels, control states and safe-area navigation are retained.
- Lower-grade welcome opens actual reading material. Secondary learners retain the mature dashboard and do not receive the children's welcome illustration. Existing voice restrictions remain unchanged.

## Fresh verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full regression | PASS: 680 tests / 122 files, zero skipped, zero failed | `npm test -- --maxWorkers=2`, using the isolated PostgreSQL test database |
| Existing affected component checks | PASS: 18 tests / 4 files before full suite | AcademyChrome, FocusDashboard, teacher and admin summaries |
| New independent invariants | PASS in full suite | Accepted/current versus pending/cancelled/finished sessions, sibling/no-profile isolation, Malaysia-day aggregation and truthful zero mastery |
| TypeScript + production build | PASS | `npm run build`, including web, API and PWA generation |
| Content checks | PASS | `npm run validate:curriculum`, `npm run validate:library`; 12 levels / 1200 topics, zero errors |
| Four-role responsive matrix | PASS: 20 cases | 1440×900, 1920×1080, 768×1024, 390×844, 360×800 for student/parent/teacher/admin; no horizontal document overflow or JS/console errors |
| Main interaction UAT | PASS: 16 assertions, 20 state screenshots | Actual QA parent/student/teacher/admin APIs; booking pending → accepted; sibling selection; role-denied admin reads; teacher affiliation restored after checking both Guru IMAI and Guru Luar |
| Learning/detail regression | PASS: 22 additional states | Guided primary reading, secondary notes/questions/feedback/revision, Library typography/bookmark, challenge entry, install/share/device guides, dialogs, profile, roster and controlled session exit → guardian approval → ended |
| Basic accessibility | PASS for exercised flows | Named progress bars, keyboard menu/destination focus, Escape restoration, readable labels, reduced motion, 44px mobile targets on new controls, keyboard-scrollable user table preserved; not a WCAG certification |
| In-app browser | PASS | Updated PWA after reload; selected-child change and corresponding actual identity/progress/empty session verified independently |

The Browser plugin/skill is not available. The repeatable matrix and UAT used installed Chrome via Playwright; the Codex in-app browser independently checked current UI and accessibility state. Existing PWA service-worker behavior was observed: an already open page initially held the preceding bundle, then loaded the new bundle after update/reload.

QA screenshots are retained as local deliverables, named `showcase-final-{role}-{width}.png`, plus `showcase-uat-*` and `showcase-detail-*`. They contain synthetic QA identities only. Zero/one-child, long-name and network-error scenarios are explicitly simulated transport states; real multi-child selection, bookings and authorization use real isolated QA APIs. The QA booking was cancelled and its slot closed after the test, and teacher affiliation was restored. Production was not seeded.

## Visual comparison ledger

Baseline, first pass, second pass and final screenshots were inspected against the supplied image. The final 20-case capture starts at scroll position zero with reduced motion, avoiding misleading viewport anchoring during resize.

| Reference evidence | Rendered discrepancy | Correction / final treatment |
| --- | --- | --- |
| Slim left navigation and shallow application header | Prior 244px shell and 78px header consumed space | 220px/66px desktop shell; aligned card edges and 28px content gutter |
| Student class/progress pair and compact quick tools | Oversized decorative welcome delayed both | Compact welcome and two-column operational overview; mobile class → tools → progress ordering |
| Parent selector directly above child insight panels | Weekly summary and large empty activity came first | Selector then mastery/schedule; weekly/activity pair follows; all selected names update together |
| Teacher KPI strip and schedule/teaching panels | Forms started before a useful dashboard overview; inherited left margin doubled the new gutter | One shared margin, compact KPI cards, real session + teaching desk, working anchors to detailed forms |
| Admin operating metrics and two review queues | Large intro and metrics pushed all review content below fold | Compact metrics; pending teacher and feedback panels; repaired mobile refresh width so the title cannot collapse into a narrow column |
| White rounded cards, blue/navy typography and colored action icons | Repeated gradients, inconsistent padding and large card heights | Shared neutral canvas, restrained class-card blue tint, consistent icon sizes/radii, colored subject and KPI accents |
| Phone layouts with bottom navigation | Desktop stack shrunk without deliberate hierarchy | Explicit mobile order, five-item bottom navigation plus complete menu, safe-area padding, long-name checks and full-width primary actions |

Above-the-fold copy audit: retained meaningful role greeting, subject names and authentic identity; student navigation now follows the requested labels. Added `Kelas Akan Datang`, `Progress Saya`, `Ruang Mengajar`, `Permohonan Guru Baharu`, and existing feedback wording to identify working modules. Removed the redundant welcome kicker. `Sambung membaca` is the deliberate lower-grade learning action. Copy changes are those required by the user's structure, truthful empty states and working workflow, not invented product claims.

## Intentional deviations and remaining acceptance

1. The poster's sample portraits, ages, dates, 92% attendance, 86 teachers, 312 classes and earnings are not inserted as live facts. Actual records or truthful empty states take their places. User portraits use safe existing iconography; existing original learning artwork remains for younger children.
2. Hardware frames and poster characters outside the application are not rendered around the real application. Typography uses the existing system sans-serif stack; no editable font/layout source was supplied. Responsive geometry follows the measured implementation above rather than claiming a pixel-identical image reproduction.
3. Global decorative search, recording counts and an imminent payment card are not exposed as working features without an existing authorized workflow. Library/teacher discovery retains its real search. Existing operational forms, safety controls and clearly labeled sandbox modules remain reachable even when they extend beyond the poster's visible mockup.
4. Visual and technical QA establishes the implemented responsive dashboard composition. It does not establish real video delivery, ToyyibPay sandbox/production acceptance, money transfer, outbound WhatsApp/email delivery, approved KYC/retention policy, or the user's later joint full-application UAT.
5. The existing large-bundle build warning remains. No performance score, cross-browser/device certification or full WCAG conformance is claimed.

Canonical TODO remains **26 VERIFIED / 6 BLOCKED / 2 IN_PROGRESS** of 34. Provider/commercial/identity/privacy acceptance is not promoted from frontend evidence. Production release evidence is appended after deployment verification.

## Verified production release

Implementation commit: private `dc0c3be320ff9ed172e2be625268ad949c200c0e`, published `aee9e1664f50fe84c14331a1c5474c4201f8be3e`. Exact public-commit CI [38705604478](https://github.com/askmenoob/study/actions/runs/38705604478) passed npm ci, full build/typecheck/PWA, both content validators and 680/680 tests in122files.

Frontend-only Docker deployment completed on15October2026. Live entry `/assets/index-TBUwkghl.js`; web image `sha256:5d15dc08c929ee1ad89a7e364ae7824700c8ca478ac888174d8f0f119e65d4e4`. Backup `20261015T163025` passed SHA256 checks; rollback image `imai-study-web:before-showcase-94785ed-20261015` retained. API, PostgreSQL and tunnel identities match the saved baseline; the unrelated Cloudflared diff and five backup variants match exactly.

A first promotion was automatically rolled back because the old verification helper expected all commerce tables to be empty. The fresh predeployment backup `20261015T162826` proves one package record already existed before promotion. The helper now compares current aggregate counts to that backup, rather than assuming zero. The successful retry preserved that one package and zero invoices, delivery jobs, payout drafts and WhatsApp receipt records. This was a stale verification-baseline failure, not a frontend or data-migration failure. No database records were modified during deployment.

Postrelease checks PASS: public HTTPS login/visibility, manifest/icons, API free-only health, protected endpoints401, inactive WhatsApp webhook503 and exact deployed JS entry. Checkout and notification worker remain off, video remains disabled/provider null, retention periods remain null/unapproved. The full20role/viewport matrix also passed using the actual production HTTPS HTML/JS/CSS with all API requests routed to the isolated QA backend. This validates authenticated rendering of the deployed frontend; it does not claim a real production-user authenticated workflow or the user's joint UAT. Synthetic tokens never reached the production API, and no synthetic accounts or records were created in production.