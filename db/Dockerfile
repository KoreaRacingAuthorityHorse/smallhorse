# TRACK:ON 경주 데이터 DB 이미지
# 처음 컨테이너를 띄울 때 init/ 아래 스크립트가 이름 순서대로 실행된다.
#   01_schema.sql      racing 스키마(테이블·관계·주석)
#   02_reference.sql   경마장·승식·결과 상태·용어 사전
#   03_seed.sql.gz     실제 경주 데이터 2023-01 ~ 2026-10 (마사회 공공데이터)
#   99_search_path.sh  기본 검색 경로를 racing으로 지정(테이블을 스키마 이름 없이 조회)
FROM postgres:16-alpine

ENV POSTGRES_DB=trackon \
    POSTGRES_USER=trackon \
    TZ=Asia/Seoul \
    PGTZ=Asia/Seoul

COPY init/ /docker-entrypoint-initdb.d/
COPY init-search-path.sh /docker-entrypoint-initdb.d/99_search_path.sh

HEALTHCHECK --interval=10s --timeout=5s --retries=12 \
  CMD pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1
