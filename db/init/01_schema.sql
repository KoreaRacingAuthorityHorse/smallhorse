-- TRACK:ON 경주 데이터 스키마 (경주 도메인)
-- 사용자·포인트·구매·정산(서비스 도메인)은 이후 별도 스키마로 추가한다.
-- 원천: 한국마사회 공공데이터 OpenAPI. 각 테이블 주석에 원천 API를 적었다.
-- 원천 API별 적재 범위는 docs/kra-api-plan.md 참고.

create schema if not exists racing;
set search_path = racing;

-- ─────────────────────────────────────────────────────────────
-- 참조 데이터
-- ─────────────────────────────────────────────────────────────

create table racecourse (
  meet_code   smallint primary key,          -- 마사회 경마장 코드 (API 요청 파라미터 meet)
  name        text not null unique,          -- 서울, 제주, 부산경남, 영천
  region      text not null,                 -- 영천은 부산경남과 같은 영남권역(순회경마)
  lap_m       integer                        -- 외주로 한 바퀴 길이(m). 화면 시뮬레이션용, 미확인이면 null
);
comment on table racecourse is '경마장. meet_code는 마사회 API의 meet 값과 같다.';

create table bet_pool (
  pool_code    text primary key,             -- WIN, PLACE, QUINELLA, EXACTA, QUINELLA_PLACE, TRIO, TRIFECTA
  name_ko      text not null unique,         -- 단승, 연승, 복승, 쌍승, 복연승, 삼복승, 삼쌍승
  picks        smallint not null check (picks between 1 and 3),
  ordered      boolean not null,
  sort_order   smallint not null
);
comment on table bet_pool is '승식. 프론트 BetType 코드와 같다.';

create table entry_status (
  status_code  text primary key,             -- FINISHED, SCRATCHED ...
  name_ko      text not null unique,         -- 완주, 출전취소, 경주제외 ...
  refundable   boolean not null,             -- 이 말이 포함된 베팅을 환불하는지
  description  text
);
comment on table entry_status is '출전마 결과 상태. 마사회 순위비고(ordBigo) 값을 코드로 정리.';

create table glossary (
  term_id      serial primary key,
  category     text not null,
  term         text not null unique,
  easy_desc    text not null,
  api_fields   text,
  example      text,
  confidence   text not null check (confidence in ('확실', '추정', '확인 필요'))
);
comment on table glossary is '입문자용 경마 용어 사전. 화면 용어 툴팁(E-2)에 사용.';

-- ─────────────────────────────────────────────────────────────
-- 사람·말 (마스터)
-- 이름은 바뀔 수 있어 최신값만 둔다. 경주 당시 이름은 race_entry에 함께 저장한다.
-- ─────────────────────────────────────────────────────────────

create table jockey (
  jk_no        text primary key,             -- 기수번호 (전국 유일, 여러 경마장에서 기승)
  name         text not null,
  name_en      text,
  home_meet    smallint references racecourse,
  part         text,                         -- 소속조
  birth_date   date,
  debut_date   date,
  retired_date date,
  carry_kg_min numeric(4,1),                 -- 기승 가능 최저 중량
  -- 통산(T)·최근 1년(Y) 성적. 조회 시점 값이라 stats_at에 수집일을 남긴다
  starts_total integer, wins_total integer, seconds_total integer, thirds_total integer,
  starts_1y    integer, wins_1y    integer, seconds_1y    integer, thirds_1y    integer,
  win_rate_total numeric(5,1), qnl_rate_total numeric(5,1),
  win_rate_1y    numeric(5,1), qnl_rate_1y    numeric(5,1),
  stats_at     date,
  updated_at   timestamptz not null default now()
);
comment on table jockey is '기수. 원천: 경주성적정보(번호·이름), 기수 상세정보 API12_1(프로필·성적), 기수 성적 API11_1(승률).';

create table trainer (
  tr_no        text primary key,
  name         text not null,
  name_en      text,
  home_meet    smallint references racecourse,
  part         text,
  birth_date   date,
  debut_date   date,
  -- 통산(T)·최근 1년(Y) 성적. 조회 시점 값이라 stats_at에 수집일을 남긴다
  starts_total integer, wins_total integer, seconds_total integer, thirds_total integer,
  starts_1y    integer, wins_1y    integer, seconds_1y    integer, thirds_1y    integer,
  win_rate_total numeric(5,1), qnl_rate_total numeric(5,1),
  win_rate_1y    numeric(5,1), qnl_rate_1y    numeric(5,1),
  stats_at     date,
  plc_rate_total numeric(5,1), plc_rate_1y numeric(5,1),   -- 3위 안 비율
  updated_at   timestamptz not null default now()
);
comment on table trainer is '조교사. 원천: 경주성적정보, 조교사 상세정보 API19_1(프로필·성적).';

create table owner (
  ow_no        text primary key,
  name         text not null,
  name_en      text,
  home_meet    smallint references racecourse,
  horses_owned integer,                      -- 현재 보유 두수
  horses_total integer,                      -- 누적 보유 두수
  first_reg_date date,
  starts_total integer, wins_total integer, starts_1y integer, wins_1y integer,
  prize_total  bigint, prize_1y bigint,      -- 상금(원)
  stats_at     date,
  updated_at   timestamptz not null default now()
);
comment on table owner is '마주. 원천: 경주성적정보, 마주 정보 API14_1(보유 두수·성적·상금).';

create table horse (
  hr_no          text primary key,           -- 마번(고유번호). 앞자리 0이 있는 문자열
  name           text not null,              -- 최신 마명
  name_en        text,
  sex            text,                       -- 수, 암, 거
  birth_date     date,
  birth_country  text,
  home_meet      smallint references racecourse,
  sire_hr_no     text,                       -- 부마. 국외 말은 horse 테이블에 없을 수 있어 FK를 걸지 않는다
  sire_name      text,
  dam_hr_no      text,
  dam_name       text,
  grade          text,                       -- 현재 등급
  rating         integer,                    -- 현재 레이팅
  trainer_no     text references trainer,
  owner_no       text references owner,
  purchase_price bigint,                     -- 도입가(원)
  purchase_note  text,                       -- 도입가 원문 (예: 56,979천원(개별))
  is_active      boolean,                    -- 현역 여부(API8_2 조회 시점)
  starts_total integer, wins_total integer, seconds_total integer, thirds_total integer,
  starts_1y    integer, wins_1y    integer, seconds_1y    integer, thirds_1y    integer,
  prize_total  bigint,
  stats_at     date,
  updated_at     timestamptz not null default now()
);
comment on table horse is '경주마. 원천: 경주성적정보(기본), 경주마 상세정보 API8_2(혈통·도입가·성적, 현역마만).';

create table horse_rating_history (
  hr_no        text not null references horse,
  seq          smallint not null,            -- 1이 가장 최근
  rating       integer not null,
  captured_at  date not null,
  primary key (hr_no, captured_at, seq)
);
comment on table horse_rating_history is '레이팅 이력. 원천: 경주마 레이팅 API77(최근 4회). 수집 날짜별로 쌓는다.';

create table horse_treatment (
  treatment_id bigserial primary key,
  hr_no        text not null references horse,
  treated_on   date not null,
  ill_name     text not null,
  hospital     text,
  place        text,
  captured_at  date not null default current_date
);
comment on table horse_treatment is '진료 이력. 원천: 경주마 경주전 1년간 진료내역 API141(말 1두씩 조회). 예정 경주 출전마부터 수집.';
create index horse_treatment_hr_idx on horse_treatment (hr_no, treated_on);

-- ─────────────────────────────────────────────────────────────
-- 경주
-- ─────────────────────────────────────────────────────────────

create table race (
  race_id          bigint generated always as identity primary key,
  meet_code        smallint not null references racecourse,
  race_date        date not null,
  race_no          smallint not null,
  -- 경마장-YYYYMMDD-경주번호 (예: 1-20261011-5). to_char는 생성 컬럼에 쓸 수 없어 연·월·일을 직접 붙인다
  race_key         text generated always as (
                     meet_code::text || '-' ||
                     lpad(extract(year from race_date)::int::text, 4, '0') ||
                     lpad(extract(month from race_date)::int::text, 2, '0') ||
                     lpad(extract(day from race_date)::int::text, 2, '0') || '-' || race_no::text) stored unique,
  race_day_seq     integer,                  -- 그해 몇 번째 경마일
  status           text not null default 'SCHEDULED'
                   check (status in ('SCHEDULED', 'FINISHED', 'CANCELLED')),
  is_final         boolean not null default false,   -- 결과 확정 여부. 모의베팅 정산은 true만 사용
  race_name        text,
  distance_m       integer not null,
  grade_raw        text,                     -- 국6등급, 혼4등급, 제3등급, 국OPEN ...
  grade            smallint,                 -- 1~6, OPEN은 0
  origin_cond      text,                     -- 국(국산마), 혼(혼합), 제(제주)
  weight_rule      text,                     -- 핸디캡, 별정A~D, 마령
  age_cond         text,
  sex_cond         text,
  rating_min       integer,
  rating_max       integer,
  prize_1st        bigint, prize_2nd bigint, prize_3rd bigint, prize_4th bigint, prize_5th bigint,
  bonus_1st        bigint, bonus_2nd bigint, bonus_3rd bigint,
  scheduled_start  timestamptz,
  actual_start     timestamptz,
  start_change_reason text,
  weather          text,
  track_state      text,                     -- 건조, 양호, 다습, 포화, 불량
  water_pct        numeric(4,1),             -- 함수율(%)
  wind_speed       numeric(4,1),
  temperature      numeric(4,1),
  tempo            smallint,                 -- 주로빠르기(①~⑨ → 1~9). 의미 확인 필요
  leader_3f_time   numeric(5,1),
  leader_4f_time   numeric(5,1),
  sales_total      bigint,                   -- 전체 승식 매출(원)
  n_entries        smallint,
  n_starters       smallint,
  updated_at       timestamptz not null default now(),
  unique (meet_code, race_date, race_no)
);
comment on table race is '경주 1건. race_key(경마장-일자-번호)가 외부에 노출하는 식별자. 원천: 경주개요 API3_1, 경주결과종합 API299, 코너별통과순위 API303, 경주계획표 API72_2(예정 경주), 경주로정보 API189_1(날씨·주로상태·함수율).';
create index race_date_idx on race (race_date, meet_code);

create table race_entry (
  race_id            bigint not null references race on delete cascade,
  chul_no            smallint not null,      -- 출주번호(그 경주의 등번호). 말 식별자는 hr_no
  hr_no              text not null references horse,
  horse_name         text not null,          -- 경주 당시 마명
  jk_no              text references jockey,
  jockey_name        text,
  tr_no              text references trainer,
  trainer_name       text,
  ow_no              text references owner,
  owner_name         text,
  sex                text,
  age                smallint,
  birth_country      text,
  rating             integer,
  carried_kg         numeric(4,1),           -- 부담중량
  carried_note       text,                   -- 증량 신청 표시
  jockey_allowance_kg numeric(3,1),          -- 수습기수 감량
  body_weight_kg     smallint,
  body_weight_delta  smallint,
  equipment          text,                   -- 장구 원문 (예: 계란형큰,망사눈)
  bleeding_count     smallint,               -- 폐출혈 횟수
  last_bleeding_date date,
  medical_note       text,                   -- 최근 진료 메모 원문 (API24_1 illName)
  status_code        text not null default 'FINISHED' references entry_status,
  finish_pos         smallint,               -- 완주한 말만 값이 있다
  finish_time        numeric(6,1),           -- 초
  margin_raw         text,                   -- 착차 원문 (½, 목, 코 ...)
  margin_len         numeric(5,2),           -- 앞 말과의 착차(마신, 근사)
  margin_to_winner   numeric(6,2),
  win_odds           numeric(7,1),           -- 확정 단승 배당
  place_odds         numeric(7,1),           -- 확정 연승 배당
  popularity_rank    smallint,               -- 단승 배당 기준 인기 순위
  s1f_rank           smallint,
  g3f_rank           smallint,
  g1f_rank           smallint,
  s1f_time           numeric(5,1),           -- 출발 200m
  last3f_time        numeric(5,1),           -- 마지막 600m
  last1f_time        numeric(5,1),           -- 마지막 200m
  primary key (race_id, chul_no),
  unique (race_id, hr_no)
);
comment on table race_entry is '출전마 1두의 경주 전 정보와 결과. 원천: 경주성적정보 API214_1, 출전표 상세 API26_2·마체중 API25_1·장구/폐출혈 API24_1(예정 경주). 예정 경주는 status_code=ENTERED, 결과 컬럼이 비어 있다.';
create index race_entry_horse_idx on race_entry (hr_no);
create index race_entry_jockey_idx on race_entry (jk_no);
create index race_entry_trainer_idx on race_entry (tr_no);

create table entry_checkpoint (
  race_id      bigint not null,
  chul_no      smallint not null,
  checkpoint   text not null,                -- S1F, 1C~4C, G8F~G1F
  seq          smallint not null,            -- 출발부터의 순서
  meters_from_start integer,                 -- 코너는 위치를 알 수 없어 null
  pass_rank    smallint,
  cum_time     numeric(6,1),                 -- 출발부터 누적 시간(초)
  primary key (race_id, chul_no, checkpoint),
  foreign key (race_id, chul_no) references race_entry on delete cascade
);
comment on table entry_checkpoint is '출전마의 지점별 통과 순위·누적 기록. 경마장마다 다른 원천 필드를 통일. 다시보기·구간 순위 화면에 사용.';

create table race_split (
  race_id      bigint not null references race on delete cascade,
  furlong      smallint not null,            -- 1 = 첫 200m
  meters       integer not null,
  split_time   numeric(5,1),
  cum_time     numeric(6,1),
  primary key (race_id, furlong)
);
comment on table race_split is '선두 기준 200m 구간기록. 원천: 경주 구간별 성적 API6_1.';

create table race_corner_order (
  race_id      bigint not null references race on delete cascade,
  checkpoint   text not null,
  order_raw    text not null,                -- 출주번호 나열. 괄호=나란히, 하이픈=간격
  primary key (race_id, checkpoint)
);
comment on table race_corner_order is '지점별 통과 순서 원문. 원천: 코너별통과순위 API303.';

create table race_payout (
  race_id      bigint not null references race on delete cascade,
  pool_code    text not null references bet_pool,
  hit_no       smallint not null,            -- 같은 승식에 적중 조합이 여러 개일 때 순번(연승·복연승)
  combination  text not null,                -- 출주번호를 '-'로 연결. 순서형 승식은 들어온 순서
  odds         numeric(9,1) not null,
  primary key (race_id, pool_code, hit_no)
);
comment on table race_payout is '승식별 적중 조합과 확정 배당. 원천: 경주 요약성적표 API34_1.';

create table race_odds (
  race_id      bigint not null references race on delete cascade,
  pool_code    text not null references bet_pool,
  combination  text not null,                -- 출주번호를 '-'로 연결. 순서 없는 승식은 작은 번호부터
  odds         numeric(9,1) not null,
  primary key (race_id, pool_code, combination)
);
comment on table race_odds is '승식별 모든 조합의 확정 배당(적중 여부와 무관). "이 조합에 걸었다면" 화면에 사용. 원천: 확정배당율 통합 API160_1. 양이 많아 최근 월만 적재.';

create table entry_change (
  change_id     bigserial primary key,
  race_id       bigint not null,
  chul_no       smallint not null,
  change_type   text not null check (change_type in ('JOCKEY', 'SCRATCH')),
  before_jk_no  text,
  after_jk_no   text,
  before_kg     numeric(4,1),
  after_kg      numeric(4,1),
  reason        text,
  announced_at  timestamptz,
  foreign key (race_id, chul_no) references race_entry on delete cascade
);
comment on table entry_change is '경주 전 변경: 기수변경·출전취소. 원천: 기수변경 API10_1, 출전취소 API9_1.';

create table entry_career_snapshot (
  race_id          bigint not null,
  chul_no          smallint not null,
  hr_starts_total  integer, hr_wins_total integer, hr_seconds_total integer,
  hr_starts_1y     integer, hr_wins_1y    integer, hr_seconds_1y    integer,
  jk_starts_total  integer, jk_wins_total integer,
  jk_starts_1y     integer, jk_wins_1y    integer,
  tr_starts_total  integer, tr_wins_total integer,
  tr_starts_1y     integer, tr_wins_1y    integer,
  primary key (race_id, chul_no),
  foreign key (race_id, chul_no) references race_entry on delete cascade
);
comment on table entry_career_snapshot is '경주 시점의 말·기수·조교사 통산·1년 성적. 블라인드 출전표에서 결과 유출 없이 쓰는 값. 원천: 경주결과종합 API299.';

-- ─────────────────────────────────────────────────────────────
-- 적재 기록
-- ─────────────────────────────────────────────────────────────

create table ingest_log (
  ingest_id    bigserial primary key,
  source_api   text not null,                -- 예: API214_1/RaceDetailResult_1
  params       jsonb not null,
  rows_loaded  integer not null,
  loaded_at    timestamptz not null default now(),
  note         text
);
comment on table ingest_log is '원천 API 적재 이력. 언제 어떤 범위를 받았는지 추적.';
