-- stg(정제 단계) → racing(서비스 스키마) 변환.
-- 실행 전: racing 스키마에 01_schema.sql, 02_reference.sql이 적용되어 있어야 한다.
-- 실행 후: export_seed.sh로 racing 데이터를 db/init/03_seed.sql.gz로 내보낸다.
set search_path = racing, public;

begin;

-- ── 사람: 가장 최근 경주의 이름, 가장 많이 출전한 경마장 ──
insert into jockey (jk_no, name, home_meet)
select jk_no,
       coalesce((array_agg(jk_name order by rc_date desc) filter (where coalesce(jk_name, '') <> ''))[1], '(이름 없음)'),
       mode() within group (order by meet_code)
from stg.race_horse_result where coalesce(jk_no, '') <> '' group by jk_no;

insert into trainer (tr_no, name, home_meet)
select tr_no,
       coalesce((array_agg(tr_name order by rc_date desc) filter (where coalesce(tr_name, '') <> ''))[1], '(이름 없음)'),
       mode() within group (order by meet_code)
from stg.race_horse_result where coalesce(tr_no, '') <> '' group by tr_no;

insert into owner (ow_no, name, home_meet)
select ow_no,
       coalesce((array_agg(ow_name order by rc_date desc) filter (where coalesce(ow_name, '') <> ''))[1], '(이름 없음)'),
       mode() within group (order by meet_code)
from stg.race_horse_result where coalesce(ow_no, '') <> '' group by ow_no;

-- ── 경주마: 가장 최근 출전 기준 ──
insert into horse (hr_no, name, sex, birth_date, birth_country, home_meet, rating, trainer_no, owner_no)
select distinct on (e.hr_no)
       e.hr_no, e.hr_name, e.sex, b.birth_date, e.birth_country, e.meet_code, rt.rating,
       nullif(e.tr_no, ''), nullif(e.ow_no, '')
from stg.race_horse_result e
-- 생년월일·최근 레이팅은 말마다 다시 찾지 않고 한 번에 모아 둔다
left join (
  select distinct on (item->>'hrNo') item->>'hrNo' hr_no, to_date(item->>'birthday', 'YYYYMMDD') birth_date
  from raw.api_response
  where api = 'race_result' and coalesce(item->>'birthday', '') ~ '^[0-9]{8}$'
  order by item->>'hrNo') b on b.hr_no = e.hr_no
left join (
  select distinct on (hr_no) hr_no, rating
  from stg.race_horse_result where rating is not null
  order by hr_no, rc_date desc) rt on rt.hr_no = e.hr_no
order by e.hr_no, e.rc_date desc;

-- ── 경주 ──
insert into race (meet_code, race_date, race_no, race_day_seq, status, is_final, race_name, distance_m,
                  grade_raw, grade, origin_cond, weight_rule, age_cond, rating_min, rating_max,
                  prize_1st, prize_2nd, prize_3rd, prize_4th, prize_5th,
                  scheduled_start, actual_start, start_change_reason,
                  weather, track_state, water_pct, tempo, leader_3f_time, leader_4f_time,
                  sales_total, n_entries, n_starters)
select meet_code, rc_date, rc_no, race_day_seq, 'FINISHED', is_final, race_name, distance_m,
       grade_raw, grade, origin_cond, weight_rule, age_cond, rating_min, rating_max,
       prize_1st, prize_2nd, prize_3rd, prize_4th, prize_5th,
       sched_start, actual_start, start_change_reason,
       weather, track_state, water_pct, tempo, leader_3f_time, leader_4f_time,
       sales_total, n_entries, n_starters
from stg.race;

-- ── 출전마 ──
insert into race_entry (race_id, chul_no, hr_no, horse_name, jk_no, jockey_name, tr_no, trainer_name, ow_no, owner_name,
                        sex, age, birth_country, rating, carried_kg, carried_note, jockey_allowance_kg,
                        body_weight_kg, body_weight_delta, equipment, status_code, finish_pos, finish_time,
                        margin_raw, margin_len, margin_to_winner, win_odds, place_odds, popularity_rank,
                        s1f_rank, g3f_rank, g1f_rank, s1f_time, last3f_time, last1f_time)
select r.race_id, e.chul_no, e.hr_no, e.hr_name,
       nullif(e.jk_no, ''), e.jk_name, nullif(e.tr_no, ''), e.tr_name, nullif(e.ow_no, ''), e.ow_name,
       e.sex, e.age, e.birth_country, e.rating, e.carried_kg, e.carried_note, e.jockey_allowance_kg,
       e.body_weight_kg, e.body_weight_delta, e.equipment, s.status_code, e.finish_pos, e.finish_time,
       nullif(e.margin_raw, '-'), e.margin_len, e.margin_to_winner, e.win_odds, e.place_odds,
       case when e.win_odds is not null then rank() over (partition by r.race_id order by e.win_odds nulls last) end,
       e.s1f_rank, e.g3f_rank, e.g1f_rank, e.s1f_time, e.last3f_time, e.last1f_time
from stg.race_horse_result e
join race r on (r.meet_code, r.race_date, r.race_no) = (e.meet_code, e.rc_date, e.rc_no)
join entry_status s on s.name_ko = e.result_status;

-- 인기 순위는 단승 배당이 있는 말끼리만 매긴다
with ranked as (
  select race_id, chul_no, rank() over (partition by race_id order by win_odds) rk
  from race_entry where win_odds is not null)
update race_entry e set popularity_rank = ranked.rk
from ranked where (e.race_id, e.chul_no) = (ranked.race_id, ranked.chul_no);

-- 당일 아직 달리지 않은 경주는 성적 API에 착순 0으로 들어온다 → 예정 경주로 돌린다
update race_entry set finish_pos = null where finish_pos = 0;
with not_run as (
  select race_id from race_entry group by race_id
  having count(finish_time) = 0 and count(win_odds) = 0)
update race r set status = 'SCHEDULED', is_final = false from not_run n where r.race_id = n.race_id;
update race_entry e set status_code = 'ENTERED'
from race r where r.race_id = e.race_id and r.status = 'SCHEDULED' and e.status_code = 'FINISHED';

-- ── 지점별 기록 ──
insert into entry_checkpoint (race_id, chul_no, checkpoint, seq, meters_from_start, pass_rank, cum_time)
select re.race_id, re.chul_no, c.checkpoint, c.seq, c.meters_from_start, c.pass_rank, c.cum_time
from stg.race_horse_checkpoint c
join race r on (r.meet_code, r.race_date, r.race_no) = (c.meet_code, c.rc_date, c.rc_no)
join race_entry re on re.race_id = r.race_id and re.hr_no = c.hr_no;

insert into race_split (race_id, furlong, meters, split_time, cum_time)
select r.race_id, s.furlong, s.meters, s.split_time, s.cum_time
from stg.race_leader_split s
join race r on (r.meet_code, r.race_date, r.race_no) = (s.meet_code, s.rc_date, s.rc_no);

insert into race_corner_order (race_id, checkpoint, order_raw)
select distinct on (r.race_id, o.checkpoint) r.race_id, o.checkpoint, o.order_raw
from stg.race_corner_order o
join race r on (r.meet_code, r.race_date, r.race_no) = (o.meet_code, o.rc_date, o.rc_no)
where o.checkpoint is not null
order by r.race_id, o.checkpoint, o.corner_no;

-- ── 배당 ──
insert into race_payout (race_id, pool_code, hit_no, combination, odds)
select r.race_id, b.pool_code, p.hit_no, p.combination, p.odds
from stg.race_payout p
join race r on (r.meet_code, r.race_date, r.race_no) = (p.meet_code, p.rc_date, p.rc_no)
join bet_pool b on b.name_ko = p.pool
where coalesce(p.combination, '') <> '' and p.odds > 0;

-- ── 경주 시점 통산 성적 ──
insert into entry_career_snapshot (race_id, chul_no,
  hr_starts_total, hr_wins_total, hr_seconds_total, hr_starts_1y, hr_wins_1y, hr_seconds_1y,
  jk_starts_total, jk_wins_total, jk_starts_1y, jk_wins_1y,
  tr_starts_total, tr_wins_total, tr_starts_1y, tr_wins_1y)
select re.race_id, re.chul_no,
  s.hr_starts_total, s.hr_wins_total, s.hr_seconds_total, s.hr_starts_1y, s.hr_wins_1y, s.hr_seconds_1y,
  s.jk_starts_total, s.jk_wins_total, s.jk_starts_1y, s.jk_wins_1y,
  s.tr_starts_total, s.tr_wins_total, s.tr_starts_1y, s.tr_wins_1y
from stg.race_horse_career_stats s
join race r on (r.meet_code, r.race_date, r.race_no) = (s.meet_code, s.rc_date, s.rc_no)
join race_entry re on re.race_id = r.race_id and re.hr_no = s.hr_no;

-- ── 적재 이력 ──
insert into ingest_log (source_api, params, rows_loaded, loaded_at, note)
select endpoint,
       jsonb_build_object('calls', count(*),
                          'from', min(coalesce(params->>'rc_month', params->>'rc_date', params->>'race_dt')),
                          'to', max(coalesce(params->>'rc_month', params->>'rc_date', params->>'race_dt'))),
       sum(item_count), max(fetched_at), 'stg 경유 초기 적재'
from raw.api_call_log
where api not in ('race_plan', 'entry_sheet', 'entry_weight', 'entry_cancel', 'jockey_change', 'track', 'odds_all',
                  'horse_info', 'horse_rating', 'jockey_info', 'jockey_result', 'trainer_info', 'owner_info',
                  'horse_equipment', 'horse_result', 'horse_clinic')   -- 추가 API는 seed_extra.sql에서 기록
group by endpoint;

commit;
