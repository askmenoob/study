#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=/mnt/data/projects/imai-study
cd "$ROOT"
mkdir -p .ai
LOG=".ai/private-tuition-m1-$(date +%Y%m%dT%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1
echo "M1_RELEASE_STARTED $(date -Is)"
echo "PREDEPLOY_SHA $(git rev-parse --short HEAD)"
# Never stage pre-existing cloudflared tunnel changes or unrelated backup files.
git add -- docs/PRIVATE_TUITION_TODO.md server/teacherNetworkRoutes.ts server/teacherNetworkStore.ts server/tuitionDirectory.test.ts src/App.tsx src/components/AdminTeacherApplications.tsx src/components/TuitionTeacherDirectory.css src/components/TuitionTeacherDirectory.tsx src/lib/teacherNetworkApi.ts scripts/release-private-tuition-m1.sh
git diff --cached --check
if ! git diff --cached --quiet; then git commit -m "feat(study): introduce private tuition teacher directory and affiliation"; fi
echo "RELEASE_SHA $(git rev-parse --short HEAD)"
echo "DEPLOY_API_WEB_START $(date -Is)"
docker compose --env-file .env up -d --build api web
echo "DEPLOY_COMPLETE $(date -Is)"
healthy=0
for i in $(seq 1 24); do
  if curl --max-time 4 -fsS http://127.0.0.1:4181/api/health > /dev/null &&
     curl --max-time 4 -fsS http://127.0.0.1:4178/ > /dev/null; then healthy=1; break; fi
  sleep 5
done
if [ "$healthy" != 1 ]; then echo "BLOCKER_LOCAL_HEALTH"; exit 21; fi
echo "LOCAL_HEALTH_PASS"
code=$(curl --max-time 5 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4181/api/tuition/teachers)
if [ "$code" != "401" ] && [ "$code" != "403" ]; then echo "BLOCKER_AUTH_GUARD:$code"; exit 22; fi
echo "DIRECTORY_UNAUTH_GUARD_PASS:$code"
column=$(docker compose --env-file .env exec -T postgres psql -U imai_study -d imai_study -tAc "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='teacher_profiles' AND column_name='tuition_affiliation'")
if [ "$column" != 1 ]; then echo "BLOCKER_MIGRATION:$column"; exit 23; fi
echo "MIGRATION_COLUMN_PASS"
public_code=$(curl --max-time 12 -s -o /dev/null -w '%{http_code}' https://study.imai.my)
if [ "$public_code" != "200" ]; then echo "BLOCKER_PUBLIC_WEB:$public_code"; exit 24; fi
echo "PUBLIC_WEB_PASS:$public_code"
echo "M1_RELEASE_VERIFIED $(date -Is)"
echo "LOG_PATH=$ROOT/$LOG"
