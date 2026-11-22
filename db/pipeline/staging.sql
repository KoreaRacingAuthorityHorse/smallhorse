-- raw → stg 변환. 매번 전체를 다시 만든다(멱등).
-- 실행: psql -f staging.sql
create schema if not exists stg;

-- ── 공통 함수 ────────────────────────────────────────────────
-- 숫자로 바꿀 수 없거나 '-'면 NULL
create or replace function stg.num(t text) returns numeric language sql immutable as $$
  select case when t ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' then t::numeric end $$;
-- 0을 "값 없음"으로 쓰는 필드용
create or replace function stg.nz(t text) returns numeric language sql immutable as $$
  select nullif(stg.num(t), 0) $$;
-- '0:37.0' 같은 분:초 문자열을 초로
create or replace function stg.mmss(t text) returns numeric language sql immutable as $$
  select case when t ~ '^[0-9]+:[0-9]+(\.[0-9]+)?$'
              then nullif(split_part(t, ':', 1)::numeric * 60 + split_part(t, ':', 2)::numeric, 0) end $$;
-- 원문자 ①~⑳ → 정수
create or replace function stg.circled(t text) returns int language sql immutable as $$
  select nullif(strpos('①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳', t), 0) $$;
-- 착차 표기 → 마신 수. 코·머리·목은 관례적 근사값(0.1/0.2/0.3), 60마신 초과는 이상값으로 NULL
create or replace function stg.margin_len(t text) returns numeric language sql immutable as $$
  select case
    when t is null or t in ('-', '') then null
    when t = '동순위' then 0
    when t like '%코' then 0.1
    when t like '%머리' then 0.2
    when t like '%목' then 0.3
    when t ~ '^[0-9]+$' and t::int <= 60 then t::numeric
    when t ~ '^[0-9]*[¼½¾]$' then coalesce(nullif(regexp_replace(t, '[¼½¾]', ''), '')::numeric, 0)
         + case right(t, 1) when '¼' then 0.25 when '½' then 0.5 else 0.75 end
  end $$;

-- 경마장 코드 (응답의 경마장명이 비어 있는 경우가 있어 요청 파라미터 기준)
create table if not exists stg.racecourse (meet_code int primary key, meet_name text, region text);
insert into stg.racecourse values (1, '서울', '서울'), (2, '제주', '제주'), (3, '부산경남', '영남'), (4, '영천', '영남')
on conflict do nothing;

-- 최신 적재분만 보는 헬퍼 뷰
create or replace view stg.v_api_response as
select i.api, f.params, i.item, f.fetched_at
from raw.api_response i join raw.api_call_log f on f.id = i.fetch_id;

-- ── 경주 ─────────────────────────────────────────────────────
drop table if exists stg.race cascade;
create table stg.race as
with info as (
  select (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no, item
  from stg.v_api_response where api = 'race_info'),
corner as (
  select (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no, item
  from stg.v_api_response where api = 'corner_rank'),
total as (  -- 출발시각·확정여부는 경주결과종합에서 경주 단위로 집계
  select (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no,
         min((item->>'schStTime')::timestamptz) sched_start,
         min((item->>'stTime')::timestamptz) actual_start,
         bool_and(item->>'finalBit' = '1') is_final,
         max(nullif(item->>'stTimeChgReason', '-')) start_change_reason
  from stg.v_api_response where api = 'race_result_total' group by 1, 2, 3),
entries as (
  select (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no,
         count(*) n_entries, count(*) filter (where (item->>'ord')::int < 90) n_starters
  from stg.v_api_response where api = 'race_result' group by 1, 2, 3)
select
  i.meet_code, m.meet_name, i.rc_date, i.rc_no,
  (i.item->>'ilsu')::int                      race_day_seq,
  (i.item->>'rcDist')::int                    distance_m,
  i.item->>'rank'                             grade_raw,
  substring(i.item->>'rank' from '^(국|혼|제)') origin_cond,   -- 국: 국산 한정, 혼: 국외산 혼합, 제: 제주
  case when i.item->>'rank' ~ 'OPEN' then 0 else stg.num(substring(i.item->>'rank' from '([0-9])등급'))::int end grade,
  i.item->>'budam'                            weight_rule,
  i.item->>'rcName'                           race_name,
  i.item->>'ageCond'                          age_cond,
  stg.nz(i.item->>'stRating')::int            rating_min,
  stg.nz(i.item->>'spRating')::int            rating_max,
  nullif(i.item->>'weather', '-')             weather,
  nullif(trim(i.item->>'track'), '')          track_state,
  case when nullif(trim(i.item->>'track'), '') is not null then stg.num(i.item->>'waterRate') end water_pct,
  stg.circled(c.item->>'tempo')               tempo,
  stg.mmss(c.item->>'passtime_3f')            leader_3f_time,
  stg.mmss(c.item->>'passtime_4f')            leader_4f_time,
  (i.item->>'chaksun1')::bigint prize_1st, (i.item->>'chaksun2')::bigint prize_2nd, (i.item->>'chaksun3')::bigint prize_3rd,
  (i.item->>'chaksun4')::bigint prize_4th, (i.item->>'chaksun5')::bigint prize_5th,
  (i.item->>'totalAmt')::bigint               sales_total,
  t.sched_start, t.actual_start, t.start_change_reason,
  coalesce(t.is_final, false)                 is_final,
  e.n_entries, e.n_starters
from info i
join stg.racecourse m using (meet_code)
left join corner c using (meet_code, rc_date, rc_no)
left join total t using (meet_code, rc_date, rc_no)
left join entries e using (meet_code, rc_date, rc_no);
alter table stg.race add primary key (meet_code, rc_date, rc_no);
comment on column stg.race.is_final is '경주결과종합(API299)의 finalBit가 모든 출전마에서 1. false면 미확정·미시행 경주로 분석에서 제외';

-- ── 출전마 결과 ──────────────────────────────────────────────
drop table if exists stg.race_horse_result cascade;
create table stg.race_horse_result as
with r as (
  select (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no, item
  from stg.v_api_response where api = 'race_result'),
base as (
  select
    meet_code, rc_date, rc_no,
    item->>'hrNo'                        hr_no,
    item->>'hrName'                      hr_name,
    (item->>'chulNo')::int               chul_no,
    case when (item->>'ord')::int < 90 then (item->>'ord')::int end finish_pos,
    case when item->>'ordBigo' in ('-', '') then '완주' else item->>'ordBigo' end result_status,
    (item->>'ord')::int                  ord_raw,
    item->>'sex'                         sex,
    stg.num(item->>'age')::int           age,
    item->>'name'                        birth_country,
    stg.nz(item->>'rating')::int         rating,
    stg.num(item->>'wgBudam')            carried_kg,
    nullif(item->>'wgBudamBigo', '-')    carried_note,
    stg.nz(item->>'wgJk')                jockey_allowance_kg,
    item->>'jkNo' jk_no, item->>'jkName' jk_name,
    item->>'trNo' tr_no, item->>'trName' tr_name,
    item->>'owNo' ow_no, item->>'owName' ow_name,
    stg.nz(substring(item->>'wgHr' from '^([0-9]+)'))::int                 body_weight_kg,
    stg.num(substring(item->>'wgHr' from '\(([+-]?[0-9]+)\)'))::int        body_weight_delta,
    stg.nz(item->>'rcTime')              finish_time,
    item->>'diffUnit'                    margin_raw,
    stg.margin_len(item->>'diffUnit')    margin_len,
    stg.nz(item->>'winOdds')             win_odds,
    stg.nz(item->>'plcOdds')             place_odds,     -- 포털 설명은 '복승식'이나 실제 값은 연승식
    nullif(item->>'hrTool', '-')         equipment,
    -- 구간 기록: 경마장마다 필드가 달라 통일된 3개 지표로 환산
    case when meet_code = 1 then stg.nz(item->>'seS1fAccTime')
         when meet_code = 2 then stg.nz(item->>'jeS1fTime')
         else stg.nz(item->>'buS1fAccTime') end                              s1f_time,
    case when meet_code = 1 then stg.nz(item->>'rcTime') - stg.nz(item->>'seG3fAccTime')
         when meet_code = 2 then stg.nz(item->>'jeG3fTime')
         else stg.nz(item->>'bu_3fGTime') end                                last3f_time,
    case when meet_code = 1 then stg.nz(item->>'rcTime') - stg.nz(item->>'seG1fAccTime')
         when meet_code = 2 then stg.nz(item->>'jeG1fTime')
         else stg.nz(item->>'bu_1fGTime') end                                last1f_time,
    case when meet_code in (1, 2) then stg.nz(item->>'sjS1fOrd') else stg.nz(item->>'buS1fOrd') end::int  s1f_rank,
    case when meet_code in (1, 2) then stg.nz(item->>'sjG3fOrd') else stg.nz(item->>'buG3fOrd') end::int  g3f_rank,
    case when meet_code in (1, 2) then stg.nz(item->>'sjG1fOrd') else stg.nz(item->>'buG1fOrd') end::int  g1f_rank
  from r)
select b.*,
  -- 착차는 바로 앞 말과의 차이 → 우승마까지의 누적 착차
  case when finish_pos = 1 then 0
       when finish_pos is not null then sum(coalesce(margin_len, 0)) over w end    margin_to_winner,
  count(*) filter (where finish_pos is not null) over (partition by meet_code, rc_date, rc_no) n_finishers
from base b
window w as (partition by meet_code, rc_date, rc_no order by finish_pos rows between unbounded preceding and current row);
alter table stg.race_horse_result add primary key (meet_code, rc_date, rc_no, hr_no);
comment on column stg.race_horse_result.last3f_time is '마지막 600m 소요 시간(초). 서울은 기록-G3F누적, 제주·영남은 제공 구간기록';
comment on column stg.race_horse_result.margin_len is '앞 말과의 착차(마신). 코 0.1, 머리 0.2, 목 0.3은 근사값';

-- ── 출전마 지점별 통과 기록 (long) ───────────────────────────
drop table if exists stg.race_horse_checkpoint cascade;
create table stg.race_horse_checkpoint as
with r as (
  select (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no,
         (item->>'rcDist')::int dist, item
  from stg.v_api_response where api = 'race_result' and (item->>'ord')::int < 90)
select meet_code, rc_date, rc_no, item->>'hrNo' hr_no, cp.seq, cp.checkpoint,
       case when cp.checkpoint = 'S1F' then 200
            when cp.checkpoint ~ '^G[0-9]F$' then dist - substring(cp.checkpoint from 2 for 1)::int * 200 end meters_from_start,
       stg.nz(cp.rank_raw)::int pass_rank,
       stg.nz(cp.time_raw)      cum_time
from r,
lateral (
  -- 서울: 누적기록(se_*AccTime) + 순위(sj_*Ord)
  select * from (values
    (1, 'S1F', item->>'sjS1fOrd', item->>'seS1fAccTime'),
    (2, '1C',  item->>'sj_1cOrd', item->>'se_1cAccTime'),
    (3, '2C',  item->>'sj_2cOrd', item->>'se_2cAccTime'),
    (4, '3C',  item->>'sj_3cOrd', item->>'se_3cAccTime'),
    (5, 'G3F', item->>'sjG3fOrd', item->>'seG3fAccTime'),
    (6, '4C',  item->>'sj_4cOrd', item->>'se_4cAccTime'),
    (7, 'G1F', item->>'sjG1fOrd', item->>'seG1fAccTime')) v(seq, checkpoint, rank_raw, time_raw)
  where meet_code = 1
  union all
  -- 제주: 코너는 누적기록, S1F·G3F·G1F는 구간기록이라 누적으로 환산
  select * from (values
    (1, 'S1F', item->>'sjS1fOrd', item->>'jeS1fTime'),
    (2, '1C',  item->>'sj_1cOrd', item->>'je_1cTime'),
    (3, '2C',  item->>'sj_2cOrd', item->>'je_2cTime'),
    (4, '3C',  item->>'sj_3cOrd', item->>'je_3cTime'),
    (5, 'G3F', item->>'sjG3fOrd', (stg.nz(item->>'rcTime') - stg.nz(item->>'jeG3fTime'))::text),
    (6, '4C',  item->>'sj_4cOrd', item->>'je_4cTime'),
    (7, 'G1F', item->>'sjG1fOrd', (stg.nz(item->>'rcTime') - stg.nz(item->>'jeG1fTime'))::text)) v(seq, checkpoint, rank_raw, time_raw)
  where meet_code = 2
  union all
  -- 부산경남·영천: 결승까지 남은 거리 기준 누적기록
  select * from (values
    (1, 'S1F', item->>'buS1fOrd', item->>'buS1fAccTime'),
    (2, 'G8F', item->>'buG8fOrd', item->>'buG8fAccTime'),
    (3, 'G6F', item->>'buG6fOrd', item->>'buG6fAccTime'),
    (4, 'G4F', item->>'buG4fOrd', item->>'buG4fAccTime'),
    (5, 'G3F', item->>'buG3fOrd', item->>'buG3fAccTime'),
    (6, 'G2F', item->>'buG2fOrd', item->>'buG2fAccTime'),
    (7, 'G1F', item->>'buG1fOrd', item->>'buG1fAccTime')) v(seq, checkpoint, rank_raw, time_raw)
  where meet_code in (3, 4)
) cp
where stg.nz(cp.rank_raw) is not null or stg.nz(cp.time_raw) is not null;
alter table stg.race_horse_checkpoint add primary key (meet_code, rc_date, rc_no, hr_no, checkpoint);

-- ── 경주별 선두 구간기록 (200m 단위) ─────────────────────────
drop table if exists stg.race_leader_split cascade;
create table stg.race_leader_split as
select (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no,
       f furlong, f * 200 meters,
       stg.nz(item->>('time_' || f || 'f'))      split_time,
       stg.nz(item->>('passtime_' || f || 'f'))  cum_time
from stg.v_api_response, generate_series(1, 12) f
where api = 'race_section' and stg.nz(item->>('time_' || f || 'f')) is not null;
alter table stg.race_leader_split add primary key (meet_code, rc_date, rc_no, furlong);

-- ── 코너별 통과 순서 (원문 문자열 보존) ──────────────────────
drop table if exists stg.race_corner_order cascade;
create table stg.race_corner_order as
select (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no,
       c.n corner_no,
       case when (params->>'meet')::int in (1, 2)
            then (array['1C','2C','3C','4C',null,null,'S1F','G1F',null])[c.n]
            else (array['G8F','G6F','G4F',null,'G3F',null,'S1F','G2F','G1F'])[c.n] end checkpoint,
       item->>('corner_' || c.n) order_raw
from stg.v_api_response, generate_series(1, 9) c(n)
where api = 'corner_rank' and coalesce(item->>('corner_' || c.n), 'X') not in ('X', '-', '');
comment on column stg.race_corner_order.order_raw is '출주번호 나열. 괄호=나란히 달린 무리, 하이픈=간격 벌어짐, ^ 의미 미확인';

-- ── 승식별 확정 배당 ─────────────────────────────────────────
drop table if exists stg.race_payout cascade;
create table stg.race_payout as
with s as (
  select (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no, item
  from stg.v_api_response where api = 'race_summary'),
pools as (
  select meet_code, rc_date, rc_no, p.pool, p.combos, p.odds
  from s, lateral (values
    ('단승', item->>'winChulNo', item->>'winOdds'),
    ('연승', item->>'plcChulNo', item->>'plcOdds'),
    ('복승', item->>'qnlChulNo', item->>'qnlOdds'),
    ('쌍승', item->>'exaChulNo', item->>'exaOdds'),
    ('복연승', item->>'qplChulNo', item->>'qplOdds'),
    ('삼복승', item->>'tlaChulNo', item->>'tlaOdds'),
    ('삼쌍승', item->>'triChulNo', item->>'triOdds')) p(pool, combos, odds))
-- 연승은 '4-9-8' / '3.1-5.5-8.5', 복연승은 '4-9,4-8,9-8' / '28,48.2,62.4' 형태로 여러 적중이 한 칸에 들어 있음
select meet_code, rc_date, rc_no, pool, x.n hit_no,
       x.combo combination,
       stg.num(x.odds) odds
from pools,
lateral (
  select n, c combo, o odds
  from unnest(case when pool = '연승' then string_to_array(combos, '-')
                   when pool = '복연승' then string_to_array(combos, ',')
                   else array[combos] end,
              case when pool = '연승' then string_to_array(odds, '-')
                   when pool = '복연승' then string_to_array(odds, ',')
                   else array[odds] end) with ordinality u(c, o, n)) x
where combos is not null and combos not in ('', '-');

-- ── 출전 시점 스냅샷 (경주결과종합) ──────────────────────────
drop table if exists stg.race_horse_career_stats cascade;
create table stg.race_horse_career_stats as
-- 미확정 경주일(예: 2026-08-26)에 같은 출전마가 두 번 들어오는 경우가 있어 확정본 우선으로 1건만 남긴다
select distinct on ((params->>'meet')::int, to_date(item->>'rcDate', 'YYYYMMDD'), (item->>'rcNo')::int, item->>'hrNo')
       (params->>'meet')::int meet_code, to_date(item->>'rcDate', 'YYYYMMDD') rc_date, (item->>'rcNo')::int rc_no,
       item->>'hrNo' hr_no,
       stg.num(item->>'rcCntT')::int hr_starts_total, stg.num(item->>'ord1CntT')::int hr_wins_total, stg.num(item->>'ord2CntT')::int hr_seconds_total,
       stg.num(item->>'rcCntY')::int hr_starts_1y, stg.num(item->>'ord1CntY')::int hr_wins_1y, stg.num(item->>'ord2CntY')::int hr_seconds_1y,
       stg.num(item->>'jkAge')::int jk_age, item->>'jkCareer' jk_career,
       stg.num(item->>'jkRcCntT')::int jk_starts_total, stg.num(item->>'jkOrd1CntT')::int jk_wins_total,
       stg.num(item->>'jkRcCntY')::int jk_starts_1y, stg.num(item->>'jkOrd1CntY')::int jk_wins_1y,
       item->>'trCareer' tr_career,
       stg.num(item->>'trRcCntT')::int tr_starts_total, stg.num(item->>'trOrd1CntT')::int tr_wins_total,
       stg.num(item->>'trRcCntY')::int tr_starts_1y, stg.num(item->>'trOrd1CntY')::int tr_wins_1y
from stg.v_api_response where api = 'race_result_total' and coalesce(item->>'hrNo', '') <> ''
order by (params->>'meet')::int, to_date(item->>'rcDate', 'YYYYMMDD'), (item->>'rcNo')::int, item->>'hrNo',
         (item->>'finalBit' = '1') desc;
alter table stg.race_horse_career_stats add primary key (meet_code, rc_date, rc_no, hr_no);
