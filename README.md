# IMAI Study Malaysia

Family-focused revision PWA for Malaysian school learners from Darjah 1 to Tingkatan 6.

## v1 scope

- React + TypeScript installable PWA
- KSSR / KSSM / STPM level and subject catalog
- Typed topic/question engine with seed question packs
- Parent account registration/login
- Multiple child/student profiles per parent
- PostgreSQL-backed cloud progress and attempt history
- Parent performance dashboard and weak-topic recommendation
- Guided AI Tutor with original Study notes, scoped conversations and deterministic maths support
- Docker Compose deployment with Nginx, API and PostgreSQL
- Health checks, curriculum validation, tests, backup and restore

## Important content boundary

v1 contains validated application architecture and seed educational content. It is **not** a claim that every DSKP/STPM topic and official question is fully reproduced. Full curriculum packs must be validated before commercial publication.
## Local quality checks

```bash
npm ci
npm run validate:curriculum
npm run validate:library
npm test
npm run build
```

## Library content

The Library contains 306 new original materials (102 notes, 102 readings and 102 practices) across all 102 selectable level/subject combinations, alongside 16 previous materials. Each unit connects explanation, an original reading and self-check practice. Search, saved-material filters, pagination and the tutor share the same level-specific catalogue. These are selected supplementary units, not the entire official syllabus. See [Library content and integration](server/library/README.md) for editorial sources and the requirement to release matching web/API builds.

## Production deployment

```bash
cp .env.example .env
# Replace passwords/secrets with strong random values.
mkdir -p /mnt/data/data/imai-study/postgres
chmod +x deploy/backup.sh deploy/restore.sh
docker compose --env-file .env up -d --build
```

Public URL: `https://study.imai.my`

Host diagnostics: `http://127.0.0.1:4178`

Health checks:

```bash
curl http://127.0.0.1:4181/api/health
curl http://127.0.0.1:4178/
docker compose ps
```
## Backup / restore

Create a database backup:

```bash
./deploy/backup.sh
```

Restore after Ubuntu/Docker reinstall:

1. Mount the SSD at `/mnt/data`.
2. Install Docker + Compose and Node.js only if local development is required.
3. Copy or retain `/mnt/data/projects/imai-study`.
4. Restore `.env` from the protected backup or create a new one with the same DB password.
5. Run `docker compose --env-file .env up -d postgres`.
6. Run `./deploy/restore.sh /mnt/data/backups/imai-study/<timestamp>`.
7. Verify `/api/health`, web HTTP 200 and login.

## Data locations

- Project: `/mnt/data/projects/imai-study`
- PostgreSQL: `/mnt/data/data/imai-study/postgres`
- Backups: `/mnt/data/backups/imai-study`

Do not store production secrets in Git.

## Release evidence

- `docs/RELEASE_V1.md` — v1 definition of done and QA evidence
- [Current Tutor and practice production release](docs/TUTOR_PRACTICE_PRODUCTION_RELEASE_20260909.md) — deployed commit/images, verification and rollback record
- [Guided Tutor candidate history](docs/TUTOR_GUIDED_RELEASE.md) — original behavior and candidate evidence
- `docs/CONTENT_STATUS.md` — curriculum/content coverage and commercial publishing boundary
- `docs/OPERATIONS.md` — deployment, health, backup, restore and HTTPS notes
## Free Cloud AI policy

IMAI Study v1.3 uses only Google Gemini Developer API Free Tier for AI features.
- Tutor: ordinary questions start with `gemini-3.5-flash-lite`; complex questions start with `gemini-3.5-flash`. Fallbacks stay within the configured Gemini free-tier project.
- Natural TTS: `gemini-3.1-flash-tts-preview` with Malay-capable voice `Sulafat`
- Project billing must remain disabled. If free quota is exhausted, the app falls back to local rule-based guidance for tutor and does not call any paid provider.
- Account IDs and structured profile identity fields are excluded from Gemini requests. Academic context includes the question, recent conversation, level, subject, topic, selected Study notes and recent score summaries. Known profile names and common email/phone/MyKad patterns are removed from conversation text; this is not a guarantee that all personal information in free text will be detected. The composer asks students to omit personal information.
- No paid AI provider is part of the runtime or source integration.

## Topic practice and completed questions

**Latihan** offers only question IDs not yet answered in a saved session for
this student, level, subject and topic. The topic card shows answered/available
counts. Once the set is exhausted, it says there are no new questions and
provides explicit **Ulang soalan salah** and **Ulang seluruh set** choices.
Wrong-answer review uses the latest saved result. Diagnostic also selects unseen
questions; when its bank is exhausted, its button explicitly says it repeats
questions. Suggested sessions stop recycling exhausted topics.

The existing small authored bank is unchanged. This fix does not generate new
questions or publish pending exam packs. Completing a set means saving with
**Selesai**; abandoned sessions are not completion records. Completed offline
practice/diagnostic answers are queued for sync. Profile hydration includes only
that student's pending question history. Aggregate legacy records without
question IDs cannot establish exact completion, and the UI explains that limit.

The attempts endpoint still returns at most 1,000 recent sessions for existing
consumers, plus separate latest per-question history across all stored sessions.
This prevents old questions from becoming unseen merely because the session list
was truncated. No attempt history or grades are deleted or rewritten.

## Guided AI Tutor

Open **AI Tutor**, select a subject and optionally choose a Study note. From a
Library note or reading, **Tanya tutor tentang nota ini** opens the tutor with
that material selected. Submit an exercise or concept question, try the next
step, then use **Saya perlukan petunjuk** for more help. After initial guidance,
**Tunjukkan langkah penyelesaian** requests worked steps. **Perbualan baharu**
starts a fresh conversation; changing the student, subject or note also resets
it. Supplied notes and any local-only fallback are identified in the response.

After the normal test/build checks, run
`python3 scripts/test-tutor-integration.py` against the existing local Docker
stack. It starts a unique temporary API/database with synthetic accounts,
checks tutor ownership/history/focus boundaries and cleans up afterward.
See [the current production release](docs/TUTOR_PRACTICE_PRODUCTION_RELEASE_20260909.md)
for deployed versions, verification evidence and remaining browser/device UAT.

## Child study links and focus sessions

Parents can create a single-use link for one child from **Urus anak**. The link
expires after 24 hours; the selected 15–180 minute study duration begins when the
link is redeemed. A 32-byte random code travels in the URL fragment, is removed
from the address bar on capture, and is stored only as a SHA-256 hash in the DB.
Link redemption atomically creates a child-only session. A refresh resumes the
same session from its tab-scoped token. Used links cannot be shared again.

Children can request an early exit. The owning parent approves it from their
own signed-in dashboard. Parent-selected session expiry is advance approval of
ending at that time. Revoking the invite also revokes its active session. Revoked,
approved and expired sessions lose learning API access, while the status route
stays available to display the end reason. Deleting a child cascades to their
links and sessions. Parent tokens are never placed in shared links.

**Device boundary:** this release controls access within Study. It does not block
Home, task switching, browser close, or other applications. Full device locking
requires separately configured Android Lock Task Mode, Apple Guided Access, or
Windows Assigned Access. The web app must not display a device-locked claim.
Android, iPhone/iPad and Windows are the selected targets. Native enforcement
and platform-specific exit approval still require managed test devices and
platform installation; the setup UI does not establish OS enforcement.
See [Device restriction support](docs/DEVICE_LOCK.md) for the current boundary,
kiosk link entry and native acceptance criteria.

Validation: `npm test`, `npm run build`, then
`python3 scripts/test-focus-integration.py`. The integration script starts a
unique temporary API container/database using the existing local Docker stack,
uses generated test accounts only, and cleans up in a finally block. It does not
modify production student data. Migrations add `study_links` and `focus_sessions`
without rewriting existing profiles or attempt history.

## PWA installation

Open `https://study.imai.my/` in a normal Chrome tab on Android. **Install Study**
uses Chrome's own installation prompt when the browser announces availability.
**Cara pasang Study** provides the browser-menu path when a prompt is unavailable.
The control is on the sign-in screen and parent home, and hides after the browser
reports installation or while running standalone. Accepted prompts are not treated
as completed installation. Install before redeeming a child's single-use link;
open a fresh child link inside the installed PWA because sessions are tab-scoped.

The manifest contains 192px/512px general icons plus a separate maskable icon.
Docker includes these public PNG assets; service-worker precaching includes them.
Nginx serves the manifest as application/manifest+json and prevents shared caching
of the manifest, worker and legacy registration script. New pages register the
worker inline with the current HTML, avoiding the old registration URL that
Cloudflare may already have cached. The legacy URL stays available for older
cached pages. App identity/start/scope stay `/`
so shared invite codes never become persistent installation metadata.

Checks after `npm run build`: `node scripts/validate-pwa.mjs`. To check served
assets and response headers: `node scripts/validate-pwa.mjs http://127.0.0.1:4178`.
These checks validate assets and headers, not physical Android installation.
Recreate icons with Pillow installed: `python scripts/generate-pwa-icons.py public/icons`.

## Published source snapshot

This repository starts from the reviewed tuition release `b6badfa`. Earlier server Git history, private checkpoints, secrets and host-specific tunnel configuration are excluded. Copy `deploy/cloudflared-study.example.yml` to `deploy/cloudflared-study.yml` and configure your own tunnel before deployment. The canonical operational TODO remains in the linked Google Sheet. See `docs/PRIVATE_TUITION_OPERATIONS.md` for implemented behaviour and outstanding commercial prerequisites.
