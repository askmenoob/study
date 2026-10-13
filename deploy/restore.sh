#!/usr/bin/env sh
set -eu
umask 077

if [ "$#" -ne 1 ]; then echo "Usage: $0 /path/to/backup-dir"; exit 2; fi
BACKUP="$(CDPATH= cd -- "$1" && pwd)"
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose --env-file .env"
STAMP="$(date +%Y%m%dT%H%M%S)"
PROBE_DB="imai_study_restore_${STAMP}_$$"
OLD_DB="imai_study_old_${STAMP}_$$"
FAILED_DB="imai_study_failed_${STAMP}_$$"
CUTOVER_STARTED=0

database_exists() {
  [ "$($COMPOSE exec -T postgres psql -U imai_study -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='$1'")" = "1" ]
}

terminate_database() {
  $COMPOSE exec -T postgres psql -U imai_study -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$1' AND pid <> pg_backend_pid();" >/dev/null
}

drop_database() {
  $COMPOSE exec -T postgres psql -U imai_study -d postgres -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS \"$1\" WITH (FORCE);" >/dev/null
}

recover_on_failure() {
  status=$?
  trap - EXIT HUP INT TERM
  if [ "$status" -ne 0 ]; then
    set +e
    echo "Restore failed. Attempting rollback to the original database..." >&2
    if [ "$CUTOVER_STARTED" -eq 1 ]; then
      $COMPOSE stop api web >/dev/null 2>&1
      if database_exists imai_study && database_exists "$OLD_DB"; then
        terminate_database imai_study
        $COMPOSE exec -T postgres psql -U imai_study -d postgres -v ON_ERROR_STOP=1 \
          -c "ALTER DATABASE imai_study RENAME TO \"$FAILED_DB\";" >/dev/null
      fi
      if database_exists "$OLD_DB" && ! database_exists imai_study; then
        $COMPOSE exec -T postgres psql -U imai_study -d postgres -v ON_ERROR_STOP=1 \
          -c "ALTER DATABASE \"$OLD_DB\" RENAME TO imai_study;" >/dev/null
      fi
      drop_database "$FAILED_DB"
      $COMPOSE up -d api web tunnel >/dev/null 2>&1
    fi
    drop_database "$PROBE_DB"
  fi
  exit "$status"
}
trap recover_on_failure EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

test -f "$BACKUP/imai-study.dump"
test -f "$BACKUP/SHA256SUMS"
(cd "$BACKUP" && sha256sum -c SHA256SUMS)

$COMPOSE up -d postgres
until $COMPOSE exec -T postgres pg_isready -U imai_study -d imai_study >/dev/null 2>&1; do sleep 2; done

echo "Validating restore in a temporary database..."
drop_database "$PROBE_DB"
$COMPOSE exec -T postgres psql -U imai_study -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE \"$PROBE_DB\" OWNER imai_study;" >/dev/null
$COMPOSE exec -T postgres pg_restore -U imai_study -d "$PROBE_DB" --no-owner --no-privileges \
  < "$BACKUP/imai-study.dump"
$COMPOSE exec -T postgres psql -U imai_study -d "$PROBE_DB" -Atc \
  "SELECT CASE WHEN to_regclass('public.users') IS NOT NULL THEN 'ok' ELSE 'missing' END" | grep -qx ok

echo "Cutting over to the validated database..."
$COMPOSE stop api web >/dev/null
CUTOVER_STARTED=1
terminate_database imai_study
$COMPOSE exec -T postgres psql -U imai_study -d postgres -v ON_ERROR_STOP=1 \
  -c "ALTER DATABASE imai_study RENAME TO \"$OLD_DB\";" >/dev/null
$COMPOSE exec -T postgres psql -U imai_study -d postgres -v ON_ERROR_STOP=1 \
  -c "ALTER DATABASE \"$PROBE_DB\" RENAME TO imai_study;" >/dev/null

$COMPOSE up -d api web tunnel
attempt=0
until curl -fsS http://127.0.0.1:4178/api/health >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "Restored application did not become healthy within 60 seconds." >&2
    exit 1
  fi
  sleep 2
done

drop_database "$OLD_DB"
trap - EXIT HUP INT TERM
echo "Restore completed and health check passed."
