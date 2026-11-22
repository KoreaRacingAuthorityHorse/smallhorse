# TRACK:ON DB (경주 데이터)

마사회 공공데이터로 만든 PostgreSQL 16 이미지다. 띄우면 경주 9,732건, 출전 101,898건(2023-01 ~ 2026-11-22)과 기수·조교사·마주·경주마 정보, 진료·레이팅 이력, 최근 2개월 모든 조합 배당이 들어 있다.
테이블 구조는 [docs/erd.md](../docs/erd.md)를 보면 된다.

## 실행

```bash
cd db
cp .env.example .env      # POSTGRES_PASSWORD를 바꾼다
docker compose up -d --build
```

처음 띄울 때 시드를 넣느라 20~30초 걸린다. `docker compose ps`가 `healthy`가 되면 쓸 수 있다(시드가 다 들어간 뒤에 healthy가 된다).

| 항목 | 값 |
|---|---|
| 호스트 | `127.0.0.1` (내 PC에서만 접속 가능) |
| 포트 | `.env`의 `DB_PORT` (기본 5433) |
| DB / 사용자 | `trackon` / `trackon` |
| 비밀번호 | `.env`의 `POSTGRES_PASSWORD` |
| 기본 스키마 | `racing` (스키마 이름 없이 `select * from race` 가능) |

```bash
docker compose exec db psql -U trackon -c "select count(*) from race"
```

접속 URL 예: `postgresql://trackon:<비밀번호>@127.0.0.1:5433/trackon`

## 초기화 · 삭제

`init/` 스크립트는 **데이터 볼륨이 비어 있을 때만** 실행된다. 스키마나 시드를 바꾼 뒤에는 볼륨을 지우고 다시 띄운다.

```bash
docker compose down -v && docker compose up -d --build
```

## 파일

| 파일 | 내용 |
|---|---|
| `init/01_schema.sql` | `racing` 스키마: 테이블, 관계, 컬럼 설명 |
| `init/02_reference.sql` | 경마장, 승식, 결과 상태, 입문자 용어 사전 |
| `init/03_seed.sql.gz` | 경주 데이터 (`pg_dump --data-only`, gzip) |
| `init-search-path.sh` | 기본 검색 경로를 `racing, public`으로 지정 |
| `pipeline/kra_client.py` | 마사회 API 호출 (키: `KRA_SERVICE_KEY` 환경변수 또는 `pipeline/.env.kra`) |
| `pipeline/load_raw.py` | API 응답 원본을 적재 DB의 `raw` 스키마에 저장 |
| `pipeline/staging.sql` | `raw` → `stg` 정제 (매번 전체 재생성) |
| `pipeline/seed_from_staging.sql` | `stg` → `racing` 변환 (1차 14개 API) |
| `pipeline/seed_extra.sql` | `raw` → `racing` 변환 (추가 16개 API) |
| `pipeline/export_seed.sh` | `racing` 데이터를 `init/03_seed.sql.gz`로 내보내기 |

## 시드 다시 만들기

적재용 Postgres(이미지와 별개, 예: `kra-pg` 컨테이너)에서 한다. 접속 정보는 `PGHOST`·`PGPORT`·`PGUSER`·`PGDATABASE`·`PGPASSWORD` 환경변수로 준다. 키와 비밀번호는 파일에 적어 커밋하지 않는다.

```bash
cd db/pipeline
pip install psycopg[binary]
python load_raw.py --months 202610 202611                 # 1차 API: 경마장 × 월
python load_raw.py --months - --extra --clinic             # 추가 API + 출전마 진료내역
psql -f staging.sql
psql -c "drop schema if exists racing cascade"
psql -f ../init/01_schema.sql -f ../init/02_reference.sql
psql -f seed_from_staging.sql -f seed_extra.sql
./export_seed.sh                                           # → ../init/03_seed.sql.gz
cd .. && docker compose down -v && docker compose up -d --build
```

API마다 하루 3,000건 한도가 있다. `--clinic`은 말 1두당 1건이라 출전마 수만큼 호출한다.

## 아직 없는 데이터

- 경주마 성적 `API15_2`: 신청 당일 한도 초과로 미적재. 통산·1년 성적은 `horse`(API8_2)에 있다.
- 진료내역: 최근 출전마 1,609두만 있다. 현역마 전체는 이틀에 나눠 받는다.
- 모든 조합 배당(`race_odds`): 2026-10~11월만 있다.
- 다음 주 예정 경주: 마사회가 경주계획·출전표를 공개하면 다시 적재한다.

자세한 내용은 [docs/kra-api-plan.md](../docs/kra-api-plan.md).
