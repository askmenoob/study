#!/usr/bin/env sh
set -eu
umask 077
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"
STAMP="$(date +%Y%m%dT%H%M%S)"
DEST="${STUDY_BACKUP_DIR:-/mnt/data/backups/imai-study}/$STAMP"
mkdir -p "$DEST"
chmod 700 "$DEST"

echo "Backing up PostgreSQL..."
docker compose --env-file .env exec -T postgres \
  pg_dump -U imai_study -d imai_study -Fc > "$DEST/imai-study.dump"

cp compose.yml "$DEST/compose.yml"
cp .env "$DEST/.env"
chmod 600 "$DEST/imai-study.dump" "$DEST/compose.yml" "$DEST/.env"
(
  cd "$DEST"
  sha256sum imai-study.dump compose.yml .env > SHA256SUMS
)
chmod 600 "$DEST/SHA256SUMS"
echo "$DEST"
