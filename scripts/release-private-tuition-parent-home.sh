#!/usr/bin/env bash
set -Eeuo pipefail
cd /mnt/data/projects/imai-study
mkdir -p .ai
log=".ai/private-tuition-parent-home-$(date +%Y%m%dT%H%M%S).log"
exec > >(tee -a "$log") 2>&1
echo "RELEASE_START $(date -Is) $(git rev-parse --short HEAD)"
api_before=$(docker inspect -f '{{.Id}}' imai-study-api-1)
db_before=$(docker inspect -f '{{.Id}}' imai-study-postgres-1)
tunnel_before=$(docker inspect -f '{{.Id}}' imai-study-tunnel-1)
docker compose --env-file .env up -d --build --no-deps web
ready=0
for i in $(seq 1 25); do
  if curl --max-time 5 -fsS http://127.0.0.1:4178/ >/dev/null 2>&1 && [ "$(docker inspect -f '{{.State.Health.Status}}' imai-study-web-1)" = "healthy" ]; then ready=1; break; fi
  sleep 3
done
if [ "$ready" != 1 ]; then echo "BLOCKER_WEB_HEALTH"; exit 41; fi
test "$api_before" = "$(docker inspect -f '{{.Id}}' imai-study-api-1)"
test "$db_before" = "$(docker inspect -f '{{.Id}}' imai-study-postgres-1)"
test "$tunnel_before" = "$(docker inspect -f '{{.Id}}' imai-study-tunnel-1)"
echo "API_DB_TUNNEL_UNCHANGED_PASS"
test "$(curl --max-time 8 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4181/api/health)" = "200"
test "$(curl --max-time 12 -s -o /dev/null -w '%{http_code}' https://study.imai.my/)" = "200"
echo "LOCAL_API_AND_PUBLIC_WEB_200_PASS"
echo "RELEASE_VERIFIED $(date -Is) $(git rev-parse --short HEAD)"
echo "LOG_PATH=/mnt/data/projects/imai-study/$log"
