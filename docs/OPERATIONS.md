# Operations — IMAI Study Malaysia

## Paths

- Project: `/mnt/data/projects/imai-study`
- PostgreSQL data: `/mnt/data/data/imai-study/postgres`
- Backups: `/mnt/data/backups/imai-study`
- Public web: `https://study.imai.my`
- Host diagnostics: `http://127.0.0.1:4178`
- API health: `http://127.0.0.1:4181/api/health`
- Teacher class-code key: `/mnt/data/projects/imai-study/secrets/class-code-key` (mode `600`)

## Start / update

```bash
cd /mnt/data/projects/imai-study
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

## Health

```bash
curl -fsS http://127.0.0.1:4181/api/health
curl -fsS http://127.0.0.1:4178/
```
## Backup

```bash
cd /mnt/data/projects/imai-study
./deploy/backup.sh
```

A release backup contains a PostgreSQL custom-format dump, Compose file, protected `.env`, and relative checksum file. The backup directory is created with mode `700`; all contained files use mode `600` so the caller's shell `umask` cannot expose account data.

Teacher class codes are encrypted with the separate `secrets/class-code-key` file. Keep a protected disaster-recovery copy of this key outside the database backup directory. Never commit it or place it in the same archive as the database dump. Restoring the database without the same key leaves existing join codes valid for parents who already know them, but the teacher dashboard cannot decrypt and display them.

## Restore after Ubuntu reinstall

1. Do not format the SSD containing `/mnt/data`.
2. Mount that SSD back at `/mnt/data`.
3. Install Docker Engine + Docker Compose.
4. Confirm `/mnt/data/projects/imai-study/.env` exists and remains mode `600`.
5. Restore `secrets/class-code-key` from the separate protected secret store and set mode `600`.
6. Start PostgreSQL with Compose.
7. Run `./deploy/restore.sh /mnt/data/backups/imai-study/<timestamp>`.
8. Verify API health, web HTTP 200, teacher class-code display, login, student profiles and progress.

The restore script first loads the dump into a temporary database and checks the core `users` table. It keeps the original database under a temporary name until the restored application passes its health check. A failed health check triggers an automatic attempt to switch back to the original database.

The release process also performs a non-destructive restore probe into a temporary database before tagging a version.
## PWA / HTTPS requirement

The LAN URL is for development and UAT. Modern browsers only grant full service-worker/installable-PWA capability to secure contexts (HTTPS) or localhost.

For public commercial launch, terminate TLS on a real domain (for example through Cloudflare/reverse proxy) and set `STUDY_FRONTEND_ORIGIN` to that HTTPS origin before deployment. Do not expose PostgreSQL directly to the internet.
