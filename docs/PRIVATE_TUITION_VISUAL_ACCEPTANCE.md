# IMAI Smart Academy — Visual Acceptance Contract

Reference: user-approved 16:9 image "IMAI Smart Academy — Gambaran Aplikasi Siap", produced October 14, 2026.
Audience: Pelajar, Ibu Bapa, Guru IMAI/Guru Luar, Admin. Desktop + responsive Android mobile.
The image is concept art; it is **not** a pixel-accurate Figma source. Sample metrics, payment records, AI teacher portraits and mockup dates are illustrative only.

## Invariants
- Never fabricate live classes, student attendance, income, test scores, dates, fees, notifications or financial/teacher verification claims. Use real API data, honest empty states and clearly labeled unavailable functionality.
- Preserve all prior revision-study features, primary vs secondary learning differentiation, student session locks and parent authorization, and free cloud AI policy.
- Accessible keyboard focus/skip links, readable contrast, safe-area mobile nav, no horizontal clipping at 390px, desktop min 1280px.
- Existing environment, tunnel, secrets, and unrelated worktree changes are **not** part of UI release.

## Target surface / implementation
| Role | Mockup elements | Implementation | Verification requirement |
| --- | --- | --- | --- |
| Shared | Royal-blue + white cards, cap logo, premium SaaS sidebar, top bar, responsive menu | AcademyChrome.tsx/css; existing role shells reused | Production desktop/mobile screenshot and functional link clicks |
| Pelajar | Welcome banner with illustration, quick tiles, class list, homework, tutor and real progress | AcademyWelcomeBanner + AcademyStudentActions + StudentTuitionOverview + LearnerDashboard | Login as actual student fixture, refresh, switch screens, tutor, class controls |
| Ibu Bapa | Multi-child selection, real subject mastery, class bookings, notifications and homework | AcademyParentInsights + ParentDashboard + ParentTuitionOverview | Test 0, 1, 2 children, attendance, scheduling, cross-parent data isolation |
| Guru | Brand sidebar, mobile tabs, teaching metrics, slot list, material submission & assignments | AcademyWorkspaceNav + TeacherDashboard + TeacherTuitionSummary | Approved Guru IMAI and Guru Luar login, submit/approve slots, availability |
| Admin | Unified sidebar, teacher approval, aggregate KPIs, triage and audit | AcademyWorkspaceNav + AdminFeedbackInbox + AdminTuitionOverview | Super admin login, teacher approval, in-review/resolve, audit log, non-admin denied |

## Non-equivalence to illustrated art (must not hide)
1. The original concept art includes stylized teacher/child portraits. Current UI uses iconography and original IMAI artwork, rather than unauthorized/synthetic depictions of real users.
2. Future-state chat/video calls, payment gateway/payout, automatic receipts and teacher earnings must not be shown as working before backend + sandbox/production integration and UAT.
3. Mockup values (e.g., 86 teachers, 312 classes, 92% attendance and April 2025 dates) are **not actual**. Every KPI must be real or explicitly unavailable.
4. Exact pixel parity requires editable design source, font/image assets, responsive variations and real screenshot-side comparison; generated pixels alone are not code. Treat visual parity as open until reference-based screenshot QA is performed.

## Final release gates
- [x] Desktop 1440x900/1920x1080, tablet 768x1024 and mobile 390x844/360x800 screenshots for each role inspected against the user-supplied reference in multiple comparison passes (15 October 2026).
- [x] Exercised keyboard menu/destination focus, long names, zero/one/multiple children and API error/retry states; operational tables remain scrollable. Large production-scale class-list load testing remains outside visual QA.
- [x] Authenticated isolated QA browser UAT (Pelajar/Ibu Bapa/Guru IMAI/Guru Luar/Admin), real booking confirmation and sibling isolation; user joint full-app acceptance remains pending.
- [x] Basic labels/focus/touch/reduced-motion checks for exercised flows; existing voice-age restrictions preserved; not WCAG certification.
- [ ] Payments: sandbox signed-webhook/idempotency and payouts; deploy only with authorized provider configuration
- [ ] True video-class integration and student-safety/privacy review
- [x] Grade/curriculum regression680/680, current backup SHA256 checks and automatic frontend rollback exercised on15October; database-restore rehearsal remains the previously recorded isolated release evidence.

## Approved showcase refinement — 15 October 2026

The user reissued the approved four-role showcase as the controlling target. Compact dashboard composition, real next-session previews, recorded progress/activity, parent child-first overview, teacher teaching desk and admin application/feedback previews are implemented. All 20 required role/viewport cases pass; real QA booking/selection/authorization and 22 existing detail states pass. Full suite: 680/680 tests in 122 files, zero skipped. See STUDY_SHOWCASE_ACCEPTANCE_20261015.md for the comparison ledger, copy audit and intentional deviations. This evidence does not change the 26 VERIFIED / 6 BLOCKED / 2 IN_PROGRESS master status, activate providers, or claim the joint full-app UAT is complete.
Production M17 deployed: source dc0c3be/public aee9e16, exact-commit CI38705604478 PASS. Backup20261015T163025, current public asset and20deployed-frontend/QA-API role-viewports verified. See STUDY_SHOWCASE_ACCEPTANCE_20261015.md for rollback-baseline correction and production-account UAT limits.


## M18 character artwork correction — 15 October 2026

The user's visual correction is implemented with original fictional student/parent/teacher/admin illustrations plus mature secondary study objects, transparent WebP, restrained CSS motion, automatic reduced-motion support and persistent pause/resume. Characters are decorative, never real account avatars or teacher-verification claims. Four-role five-viewport visual QA, loaded assets/motion/reduced-motion/pause/reload checks pass. See STUDY_ROLE_ILLUSTRATIONS_20261015.md for the prompt set, asset provenance, exact sizes, comparison and evidence. Prior M17 omission of character art is superseded; live records and privacy/provider boundaries remain unchanged.
