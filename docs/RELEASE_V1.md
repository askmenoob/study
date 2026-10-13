# IMAI Study Malaysia v1.0.0 — release gate

## Definition of done

v1 is done when a parent can create an account, create multiple child profiles, choose a Malaysian school level, complete revision quizzes, retain progress in PostgreSQL, view parent analytics, use the tutor fallback, and recover the system from backup after an Ubuntu reinstall.

The release must also be deployable as a Docker Compose stack, produce an installable-PWA build for HTTPS deployment, and pass automated + browser UAT.

## Release results

- Curriculum validator: PASS
- Levels: 12
- STPM catalog subjects: 23
- Topic coverage instances: 138
- Seed question instances: 414
- Structural content errors: 0
- Automated tests: 8 / 8 PASS
- TypeScript typecheck: PASS
- Web/PWA production build: PASS
- API production build: PASS
- npm audit: 0 vulnerabilities
## End-to-end UAT

- API health: 200
- Parent registration: 201
- Login: 200
- Create child profile: 201
- Record quiz attempt: 201
- Repeat same client attempt: 201 with no duplicate session
- Progress summary: correct 2 / total 3, sessions 1
- Tutor: 200, local fallback verified
- Manifest: 200
- Service worker asset: 200
- QA account self-delete: 204

## Browser UAT

Chrome was driven through the real LAN deployment.

- Desktop login: no horizontal overflow
- Desktop home: no horizontal overflow
- Child creation: PASS
- Matematik topic navigation: PASS
- Three-question quiz and completion: PASS
- Parent Dashboard: PASS
- Mobile viewport 390px: no horizontal overflow
- Browser QA account cleanup: 204
## Backup / restore gate

Final pre-release database backup is checksummed and non-empty. The dump was restored into a separate temporary PostgreSQL database and the `users`, `students`, `attempts` and `tutor_logs` tables were verified before the probe database was removed.

## Intentional v1 boundaries

- Seed content is not marketed as complete official KSSR/KSSM/STPM coverage.
- STPM has the full 23-subject catalog, but catalog-only subjects may not yet have a validated question pack.
- AI Tutor uses a deterministic local fallback. The provider boundary is ready for an external LLM later.
- Parent owns the account; children are profiles rather than separate-login users in v1.
- `plan` and subscription status are modeled, but self-service billing/checkout is not configured because a payment provider was not selected for this project.
- LAN HTTP is UAT only. Full installable-PWA behavior for public users requires an HTTPS domain.
