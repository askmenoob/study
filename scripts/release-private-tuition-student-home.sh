#!/usr/bin/env bash
set -Eeuo pipefail
cd /mnt/data/projects/imai-study
mkdir -p .ai
log=".ai/student-tuition-release-$(date +%Y%m%dT%H%M%S).log"
exec > >(tee -a "$log") 2>&1
echo "START $(date -Is) SHA $(git rev-parse --short HEAD)"
db_before=$(docker inspect -f '{{.Id}}' imai-study-postgres-1)
tunnel_before=$(docker inspect -f '{{.Id}}' imai-study-tunnel-1)
echo "BACKUP_START"
bash deploy/backup.sh
echo "API_WEB_DEPLOY_START"
docker compose --env-file .env up -d --build --no-deps api web
ok=0
for i in $(seq 1 30); do
  if curl --max-time 5 -fsS http://127.0.0.1:4181/api/health >/dev/null 2>&1 &&
     curl --max-time 5 -fsS http://127.0.0.1:4178/ >/dev/null 2>&1 &&
     [ "$(docker inspect -f '{{.State.Health.Status}}' imai-study-web-1)" = "healthy" ] &&
     [ "$(docker inspect -f '{{.State.Health.Status}}' imai-study-api-1)" = "healthy" ]; then ok=1; break; fi
  sleep 4
done
if [ "$ok" != 1 ]; then echo "BLOCKED_APP_HEALTH"; exit 31; fi
test "$db_before" = "$(docker inspect -f '{{.Id}}' imai-study-postgres-1)"
test "$tunnel_before" = "$(docker inspect -f '{{.Id}}' imai-study-tunnel-1)"
echo "DB_TUNNEL_UNCHANGED_PASS"
student_id="11111111-1111-4111-8111-111111111111"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://127.0.0.1:4181/api/students/$student_id/tuition-classes")
if [ "$code" != "401" ]; then echo "BLOCKED_AUTH:$code"; exit 32; fi
echo "STUDENT_TUITION_UNAUTH_401_PASS"
public=$(curl -s -o /dev/null -w '%{http_code}' --max-time 12 https://study.imai.my/)
test "$public" = "200"
echo "PUBLIC_WEB_200_PASS"
docker compose --env-file .env ps
echo "RELEASE_SUCCESS $(date -Is) $(git rev-parse --short HEAD)"
echo "LOG=$log"
