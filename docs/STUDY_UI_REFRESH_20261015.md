# Study Smart Academy UI refresh — 15 October 2026

The login, learning and operational workspaces now use the existing Smart Academy royal-blue and white design language throughout. This release preserves curriculum, roles, scoped access, provider gates and financial behavior.

## User-visible changes

- Shared palette, typography, input sizing, borders, primary/secondary controls and focus treatment across authentication, primary/secondary learning, Library, Tutor, quizzes, revision, guardian reports/profiles, tuition and operations.
- Login uses the existing graduation-cap identity and a reversible password-visibility control. Favicon, Apple and installed-app assets have new filenames; installed-app theme color is blue for every role.
- Five-item mobile navigation includes a Menu entry. Every teacher/admin section remains reachable. Menus support keyboard focus containment, Escape dismissal, visible closing controls, background-scroll restoration and viewport changes.
- Teacher Profile & Settings opens the real profile/preferences section. Financial records, admin readiness and retention are directly discoverable. Selected operational links reflect the selected hash.
- Connection notices occupy their own space rather than covering forms. Nested operational and exam headers grow with their content rather than inheriting the legacy fixed-height/sticky header.

## Design contract and visual review

Reference: the existing live Smart Academy dashboards, extended with a generated coordinated design board. The board is saved outside source as `outputs/study-ui-design-reference.png`. Implementation uses real account data and existing educational assets; mockup skeleton rows, invented Add User actions, altered navigation labels, generated quiz text and a new wordmark were deliberately not adopted. Existing information architecture and user-owned content are the controlling reference.

Tokens: blue #1569e8, navy #16325a, muted #59708c, canvas #f4f8ff, white panels, borders #dce7f5; Inter/system typography; 46px fields, at least 44px principal touch controls, 10–22px radii. Semantic correct/wrong/warning colors remain distinct. Secondary students retain their age-appropriate information density within the shared palette.

Visual comparison inspected palette, heading/control typography, 244px desktop sidebar rhythm, input/button geometry, asset framing, navigation states, mobile collapse, and text wrapping. Repairs included the old black login-wordmark style, legacy purple accents, hidden mobile menu destinations, wrong teacher profile anchor, overlapping notices and inherited exam-header sizing. No added marketing claims or fake operational values.

## Verification

- Type checking and web/API/PWA builds pass. Curriculum and Library validation pass.
- Full existing suite: 675/675 tests, 121 files, both PostgreSQL integration suites enabled on the dedicated synthetic test database. Final affected checks: 27/27.
- In-app browser independently verifies the teacher mobile menu, the real profile destination and no relevant console errors. Dedicated Playwright regression (Browser plugin absent) captures 36 rendered states and 28 screenshots using synthetic accounts; loaded exam catalogue separately verified at 320×740, 390×844 and 1440×1000. No horizontal overflow, framework overlay, JS exception or server 5xx observed in the successful pass.
- Password visibility, registration-mode switching, wrong-password error, teacher/admin target existence and selected navigation, mobile menu dismissal and body-scroll restoration, all guardian navigation, normal student Library/Tutor/progress, secondary lesson → quiz → feedback → unit revision → exam catalogue exercised.
- Repeated harness logins reached the existing 20-per-15-minute authentication guard. The isolated QA API was restarted once for a fresh verification window; no production authentication limit or application protection was changed.

This evidence verifies the redesigned UI and regression checks. Joint full-app UAT, genuine ToyyibPay acceptance, real video-room delivery, external messages and actual payouts remain separate outstanding work. No QA accounts or transactions are copied to production.

## Release boundary

The production release replaces the web container only. The API image, PostgreSQL and tunnel are retained. Deployment requires a successful exact-commit CI run, a checksum-verified backup, a tagged prior web image, and unchanged shared Cloudflared configuration/backups. Post-release checks verify the new web entry/icons/theme and existing protected API boundaries.
