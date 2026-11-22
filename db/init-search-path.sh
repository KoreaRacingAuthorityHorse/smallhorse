#!/bin/sh
# 초기화 마지막 단계: 기본 검색 경로를 racing으로 지정
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "ALTER DATABASE \"$POSTGRES_DB\" SET search_path = racing, public;"
