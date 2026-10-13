#!/usr/bin/env bash
set -Eeuo pipefail
cd /mnt/data/projects/imai-study
mkdir -p .ai
log=".ai/pt008-release-$(date +%Y%m%dT%H%M%S).log"
exec > >(tee -a "$log") 2>&1
echo "START $(date -Is) SHA $(git rev-parse --short HEAD)"
echo "PREDEPLOY_DATABASE_BACKUP"
bash deploy/backup.sh
echo "DEPLOY_API_WEB_WITHOUT_DEPENDENCY_RESTART"
docker compose --env-file .env up -d --build --no-deps api web
ok=0
for attempt in $(seq 1 25); do
  if curl -fsS --max-time 5 http://127.0.0.1:4178/ >/dev/null 2>&1 &&
     curl -fsS --max-time 5 http://127.0.0.1:4181/api/health >/dev/null 2>&1; then
    ok=1; break
  fi
  sleep 4
done
if [ "$ok" -ne 1 ]; then echo "FAIL_HEALTH"; exit 33; fi
list_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 6 http://127.0.0.1:4181/api/tuition/teachers)
detail_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 6 http://127.0.0.1:4181/api/tuition/teachers/11111111-1111-4111-8111-111111111111)
test "$list_code" = "401"
test "$detail_code" = "401"
echo "UNAUTH_DIRECTORY_AND_DETAIL_401_PASS"
public_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://study.imai.my/)
test "$public_code" = "200"
echo "PUBLIC_WEB_200_PASS"
docker compose --env-file .env ps
echo "PT008_M2_RELEASE_VERIFIED $(date -Is) SHA $(git rev-parse --short HEAD)"
echo "LOG_PATH=/mnt/data/projects/imai-study/$log"
