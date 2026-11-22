#!/bin/sh
# racing 스키마의 데이터를 init/03_seed.sql.gz로 내보낸다.
# 참조 테이블(경마장·승식·결과 상태·용어)은 02_reference.sql에 있으므로 제외한다.
# 사용: PG_CONTAINER=kra-pg PGUSER=kra PGDATABASE=kra PGPASSWORD=... ./export_seed.sh
set -eu
cd "$(dirname "$0")"
: "${PG_CONTAINER:=kra-pg}" "${PGUSER:=kra}" "${PGDATABASE:=kra}"
docker exec -e PGPASSWORD="${PGPASSWORD:-}" "$PG_CONTAINER" \
  pg_dump -U "$PGUSER" -d "$PGDATABASE" --data-only --no-owner --schema=racing \
    --exclude-table=racing.racecourse --exclude-table=racing.bet_pool \
    --exclude-table=racing.entry_status --exclude-table=racing.glossary \
  | gzip -9 > ../init/03_seed.sql.gz
ls -lh ../init/03_seed.sql.gz
