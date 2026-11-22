-- 추가 신청 API(2026-11) raw → racing 반영.
-- 실행 순서: 01_schema.sql → 02_reference.sql → seed_from_staging.sql → 이 파일 → export_seed.sh
-- raw.api_response에는 api별 최신 조회분만 남아 있다(load_raw.py가 같은 조건 재조회 시 교체).
set search_path = racing, public;

-- ── 변환 함수 (적재용 DB의 stg 스키마에 둔다) ──
create or replace function stg.ymd(t text) returns date language sql immutable as $$
  select case when t ~ '^[0-9]{8}$' and t <> '00000000' then to_date(t, 'YYYYMMDD') end $$;
create or replace function stg.meet_code(t text) returns smallint language sql immutable as $$
  select case t when '서울' then 1 when '제주' then 2 when '부산경남' then 3 when '부경' then 3
                when '영남' then 3 when '영천' then 4 end::smallint $$;
create or replace function stg.dash(t text) returns text language sql immutable as $$
  select nullif(nullif(btrim(t), '-'), '') $$;

begin;

-- 조회 시점 스냅샷 뷰 (같은 번호가 여러 경마장 조회에 나오면 하나만)
create temp view v_jk as
  select distinct on (lpad(i->>'jkNo', 6, '0')) lpad(i->>'jkNo', 6, '0') jk_no, i
  from (select item i from raw.api_response where api = 'jockey_info') x order by 1, (i->>'rcCntT')::int desc nulls last;
create temp view v_jr as
  select distinct on (lpad(i->>'jkNo', 6, '0')) lpad(i->>'jkNo', 6, '0') jk_no, i
  from (select item i from raw.api_response where api = 'jockey_result') x order by 1, (i->>'rcCntT')::int desc nulls last;
create temp view v_tr as
  select distinct on (lpad(i->>'trNo', 6, '0')) lpad(i->>'trNo', 6, '0') tr_no, i
  from (select item i from raw.api_response where api = 'trainer_info') x order by 1, (i->>'rcCntT')::int desc nulls last;
create temp view v_ow as
  select distinct on (lpad(i->>'owNo', 6, '0')) lpad(i->>'owNo', 6, '0') ow_no, i
  from (select item i from raw.api_response where api = 'owner_info') x order by 1, (i->>'rcCntT')::int desc nulls last;
create temp view v_hr as
  select distinct on (lpad(i->>'hrNo', 7, '0')) lpad(i->>'hrNo', 7, '0') hr_no, i
  from (select item i from raw.api_response where api = 'horse_info') x order by 1;
create temp view v_es as   -- 출전표
  select stg.meet_code(i->>'meet') meet_code, stg.ymd(i->>'rcDate') race_date, (i->>'rcNo')::smallint race_no,
         (i->>'chulNo')::smallint chul_no, lpad(i->>'hrNo', 7, '0') hr_no,
         lpad(nullif(i->>'jkNo', ''), 6, '0') jk_no, lpad(nullif(i->>'trNo', ''), 6, '0') tr_no,
         lpad(nullif(i->>'owNo', ''), 6, '0') ow_no, i
  from (select distinct item i from raw.api_response where api = 'entry_sheet') x;

-- ── 1. 사람 마스터: 새 번호 추가 후 프로필·성적 갱신 ──
insert into jockey (jk_no, name, name_en, home_meet)
select jk_no, i->>'jkName', null, stg.meet_code(i->>'meet') from v_jk
union all
select distinct on (jk_no) jk_no, i->>'jkName', i->>'jkNameEn', meet_code from v_es where jk_no is not null
on conflict (jk_no) do nothing;

update jockey j set
  name = coalesce(nullif(i->>'jkName', ''), j.name),
  part = stg.dash(i->>'part'),
  birth_date = coalesce(stg.ymd(i->>'birthday'), j.birth_date),
  debut_date = coalesce(stg.ymd(i->>'debut'), j.debut_date),
  carry_kg_min = stg.nz(i->>'wgOther'),
  starts_total = stg.num(i->>'rcCntT'), wins_total = stg.num(i->>'ord1CntT'),
  seconds_total = stg.num(i->>'ord2CntT'), thirds_total = stg.num(i->>'ord3CntT'),
  starts_1y = stg.num(i->>'rcCntY'), wins_1y = stg.num(i->>'ord1CntY'),
  seconds_1y = stg.num(i->>'ord2CntY'), thirds_1y = stg.num(i->>'ord3CntY'),
  stats_at = current_date, updated_at = now()
from v_jk v where v.jk_no = j.jk_no;

update jockey j set
  win_rate_total = stg.num(i->>'winRateT'), qnl_rate_total = stg.num(i->>'qnlRateT'),
  win_rate_1y = stg.num(i->>'winRateY'), qnl_rate_1y = stg.num(i->>'qnlRateY')
from v_jr v where v.jk_no = j.jk_no;

insert into trainer (tr_no, name, home_meet)
select tr_no, i->>'trName', stg.meet_code(i->>'meet') from v_tr
union all
select distinct on (tr_no) tr_no, i->>'trName', meet_code from v_es where tr_no is not null
on conflict (tr_no) do nothing;

update trainer t set
  name = coalesce(nullif(i->>'trName', ''), t.name),
  part = stg.dash(i->>'part'),
  birth_date = coalesce(stg.ymd(i->>'birthday'), t.birth_date),
  debut_date = coalesce(stg.ymd(i->>'stDate'), t.debut_date),
  starts_total = stg.num(i->>'rcCntT'), wins_total = stg.num(i->>'ord1CntT'),
  seconds_total = stg.num(i->>'ord2CntT'), thirds_total = stg.num(i->>'ord3CntT'),
  starts_1y = stg.num(i->>'rcCntY'), wins_1y = stg.num(i->>'ord1CntY'),
  seconds_1y = stg.num(i->>'ord2CntY'), thirds_1y = stg.num(i->>'ord3CntY'),
  win_rate_total = stg.num(i->>'winRateT'), qnl_rate_total = stg.num(i->>'qnlRateT'),
  win_rate_1y = stg.num(i->>'winRateY'), qnl_rate_1y = stg.num(i->>'qnlRateY'),
  plc_rate_total = stg.num(i->>'plcRateT'), plc_rate_1y = stg.num(i->>'plcRateY'),
  stats_at = current_date, updated_at = now()
from v_tr v where v.tr_no = t.tr_no;

insert into owner (ow_no, name, home_meet)
select ow_no, i->>'owName', stg.meet_code(i->>'meet') from v_ow
union all
select distinct on (ow_no) ow_no, i->>'owName', meet_code from v_es where ow_no is not null
on conflict (ow_no) do nothing;

update owner o set
  name = coalesce(nullif(i->>'owName', ''), o.name),
  horses_owned = stg.num(i->>'ownerHorses'), horses_total = stg.num(i->>'totHorses'),
  first_reg_date = stg.ymd(i->>'stDate'),
  starts_total = stg.num(i->>'rcCntT'), wins_total = stg.num(i->>'ord1CntT'),
  starts_1y = stg.num(i->>'rcCntY'), wins_1y = stg.num(i->>'ord1CntY'),
  prize_total = stg.num(i->>'chaksunT'), prize_1y = stg.num(i->>'chaksunY'),
  stats_at = current_date, updated_at = now()
from v_ow v where v.ow_no = o.ow_no;

-- ── 2. 경주마: 현역마 상세(API8_2) + 출전표의 신마 ──
insert into horse (hr_no, name, sex, birth_date, birth_country, home_meet)
select hr_no, i->>'hrName', i->>'sex', stg.ymd(i->>'birthday'), i->>'name', stg.meet_code(i->>'meet') from v_hr
union all
select distinct on (hr_no) hr_no, i->>'hrName', i->>'sex', null, i->>'prd', meet_code from v_es
on conflict (hr_no) do nothing;

update horse h set
  name = coalesce(nullif(i->>'hrName', ''), h.name),
  birth_date = coalesce(stg.ymd(i->>'birthday'), h.birth_date),
  birth_country = coalesce(stg.dash(i->>'name'), h.birth_country),
  sire_hr_no = stg.dash(i->>'faHrNo'), sire_name = stg.dash(i->>'faHrName'),
  dam_hr_no = stg.dash(i->>'moHrNo'), dam_name = stg.dash(i->>'moHrName'),
  grade = stg.dash(i->>'rank'),
  rating = coalesce(stg.nz(i->>'rating'), h.rating),
  trainer_no = coalesce((select tr_no from trainer where tr_no = lpad(i->>'trNo', 6, '0')), h.trainer_no),
  owner_no = coalesce((select ow_no from owner where ow_no = lpad(i->>'owNo', 6, '0')), h.owner_no),
  purchase_note = stg.dash(i->>'hrLastAmt'),
  -- "56,979천원(개별)" → 56,979,000원
  purchase_price = (nullif(regexp_replace(split_part(i->>'hrLastAmt', '천원', 1), '[^0-9]', '', 'g'), '')::bigint * 1000),
  is_active = true,
  starts_total = stg.num(i->>'rcCntT'), wins_total = stg.num(i->>'ord1CntT'),
  seconds_total = stg.num(i->>'ord2CntT'), thirds_total = stg.num(i->>'ord3CntT'),
  starts_1y = stg.num(i->>'rcCntY'), wins_1y = stg.num(i->>'ord1CntY'),
  seconds_1y = stg.num(i->>'ord2CntY'), thirds_1y = stg.num(i->>'ord3CntY'),
  prize_total = stg.num(i->>'chaksunT'),
  stats_at = current_date, updated_at = now()
from v_hr v where v.hr_no = h.hr_no;
update horse set is_active = false where is_active is null;

-- ── 3. 예정 경주: 경주계획표에 있고 결과가 아직 없는 경주 ──
insert into race (meet_code, race_date, race_no, race_day_seq, status, is_final, race_name, distance_m,
                  grade_raw, origin_cond, weight_rule, age_cond, sex_cond, rating_min, rating_max,
                  prize_1st, prize_2nd, prize_3rd, prize_4th, prize_5th, bonus_1st, bonus_2nd, bonus_3rd,
                  scheduled_start)
select distinct on (m, d, n) m, d, n, stg.num(i->>'ilsu'), 'SCHEDULED', false, stg.dash(i->>'rcName'), stg.num(i->>'rcDist'),
       i->>'rank', left(i->>'rank', 1), stg.dash(i->>'budam'), stg.dash(i->>'ageCond'), stg.dash(i->>'sexCond'),
       stg.nz(i->>'stRating'), stg.nz(i->>'spRating'),
       stg.nz(i->>'chaksun1'), stg.nz(i->>'chaksun2'), stg.nz(i->>'chaksun3'), stg.nz(i->>'chaksun4'), stg.nz(i->>'chaksun5'),
       stg.nz(i->>'buga1'), stg.nz(i->>'buga2'), stg.nz(i->>'buga3'),
       case when i->>'schStTime' ~ '^[0-9]{3,4}$'
            then (d + make_time(lpad(i->>'schStTime', 4, '0')::int / 100, lpad(i->>'schStTime', 4, '0')::int % 100, 0))
                 at time zone 'Asia/Seoul' end
from (select stg.meet_code(item->>'meet') m, stg.ymd(item->>'rcDate') d, (item->>'rcNo')::smallint n, item i
      from raw.api_response where api = 'race_plan') p
where d is not null
on conflict (meet_code, race_date, race_no) do nothing;

update race set grade = case when grade_raw ~ 'OPEN' then 0 else nullif(regexp_replace(grade_raw, '[^0-9]', '', 'g'), '')::smallint end
where status = 'SCHEDULED';

update race r set n_entries = x.cnt
from (select meet_code, race_date, race_no, max(stg.num(i->>'dusu')) cnt from v_es group by 1, 2, 3) x
where r.status = 'SCHEDULED' and (r.meet_code, r.race_date, r.race_no) = (x.meet_code, x.race_date, x.race_no);

-- ── 4. 예정 경주 출전표 ──
insert into race_entry (race_id, chul_no, hr_no, horse_name, jk_no, jockey_name, tr_no, trainer_name, ow_no, owner_name,
                        sex, age, birth_country, rating, carried_kg, status_code)
select r.race_id, e.chul_no, e.hr_no, e.i->>'hrName', e.jk_no, e.i->>'jkName', e.tr_no, e.i->>'trName',
       e.ow_no, e.i->>'owName', e.i->>'sex', stg.num(e.i->>'age'), e.i->>'prd', stg.nz(e.i->>'rating'),
       stg.nz(e.i->>'wgBudam'), 'ENTERED'
from v_es e
join race r on (r.meet_code, r.race_date, r.race_no) = (e.meet_code, e.race_date, e.race_no) and r.status = 'SCHEDULED'
on conflict do nothing;

update race r set scheduled_start = coalesce(r.scheduled_start,
  (r.race_date + substring(e.i->>'stTime' from '([0-9]{1,2}:[0-9]{2})')::time) at time zone 'Asia/Seoul')
from v_es e
where r.status = 'SCHEDULED' and (r.meet_code, r.race_date, r.race_no) = (e.meet_code, e.race_date, e.race_no)
  and e.i->>'stTime' ~ '[0-9]{1,2}:[0-9]{2}';

-- 경주 시점 말 성적(출전표 제공분). 기수·조교사 성적은 출전표에 없어 비워 둔다
insert into entry_career_snapshot (race_id, chul_no, hr_starts_total, hr_wins_total, hr_seconds_total,
                                   hr_starts_1y, hr_wins_1y, hr_seconds_1y)
select re.race_id, re.chul_no, stg.num(e.i->>'rcCntT'), stg.num(e.i->>'ord1CntT'), stg.num(e.i->>'ord2CntT'),
       stg.num(e.i->>'rcCntY'), stg.num(e.i->>'ord1CntY'), stg.num(e.i->>'ord2CntY')
from v_es e
join race r on (r.meet_code, r.race_date, r.race_no) = (e.meet_code, e.race_date, e.race_no) and r.status = 'SCHEDULED'
join race_entry re on re.race_id = r.race_id and re.chul_no = e.chul_no
on conflict do nothing;

-- 마체중
update race_entry re set body_weight_kg = stg.nz(w.item->>'wgHr'), body_weight_delta = stg.num(w.item->>'wgHrDiff')
from raw.api_response w
join race r on (r.meet_code, r.race_date, r.race_no) =
               (stg.meet_code(w.item->>'meet'), stg.ymd(w.item->>'rcDate'), (w.item->>'rcNo')::smallint)
where w.api = 'entry_weight' and re.race_id = r.race_id and re.chul_no = (w.item->>'chulNo')::smallint
  and re.body_weight_kg is null;

-- 장구·폐출혈·최근 진료 메모
update race_entry re set
  equipment = coalesce(re.equipment, stg.dash(q.item->>'toolName')),
  bleeding_count = stg.num(q.item->>'bleedingCnt'),
  last_bleeding_date = stg.ymd(regexp_replace(q.item->>'bleedingDate', '[^0-9]', '', 'g')),
  medical_note = stg.dash(q.item->>'illName')
from raw.api_response q
join race r on (r.meet_code, r.race_date, r.race_no) =
               (stg.meet_code(q.item->>'meet'), stg.ymd(q.item->>'rcDate'), (q.item->>'rcNo')::smallint)
where q.api = 'horse_equipment' and re.race_id = r.race_id and re.chul_no = (q.item->>'chulNo')::smallint;

-- ── 5. 경주로 정보: 날씨·주로상태·함수율 (결과 API에 없거나 예정 경주인 경우 채움) ──
update race r set
  weather = coalesce(r.weather, stg.dash(t.item->>'weather')),
  track_state = coalesce(r.track_state, stg.dash(t.item->>'track')),
  water_pct = coalesce(r.water_pct, stg.num(t.item->>'waterPercent')),
  wind_speed = coalesce(r.wind_speed, stg.num(t.item->>'windSpeed')),
  temperature = coalesce(r.temperature, stg.num(t.item->>'temperature'))
from raw.api_response t
where t.api = 'track'
  and (r.meet_code, r.race_date, r.race_no) = (stg.meet_code(t.item->>'meet'), stg.ymd(t.item->>'rcDate'), (t.item->>'rcNo')::smallint);

-- ── 6. 경주 전 변경: 출전취소·기수변경 ──
insert into entry_change (race_id, chul_no, change_type, reason)
select distinct re.race_id, re.chul_no, 'SCRATCH', stg.dash(c.item->>'reason')
from raw.api_response c
join race r on (r.meet_code, r.race_date, r.race_no) =
               (stg.meet_code(c.item->>'meet'), stg.ymd(c.item->>'rcDate'), (c.item->>'rcNo')::smallint)
join race_entry re on re.race_id = r.race_id and re.chul_no = (c.item->>'chulNo')::smallint
where c.api = 'entry_cancel';

update race_entry re set status_code = 'SCRATCHED'
from entry_change c
where c.change_type = 'SCRATCH' and (c.race_id, c.chul_no) = (re.race_id, re.chul_no) and re.status_code = 'ENTERED';

insert into entry_change (race_id, chul_no, change_type, before_jk_no, after_jk_no, before_kg, after_kg, reason)
select distinct re.race_id, re.chul_no, 'JOCKEY', lpad(c.item->>'jkBef', 6, '0'), lpad(c.item->>'jkAft', 6, '0'),
       stg.nz(c.item->>'befBudam'), stg.nz(c.item->>'aftBudam'), stg.dash(c.item->>'reason')
from raw.api_response c
join race r on (r.meet_code, r.race_date, r.race_no) =
               (stg.meet_code(c.item->>'meet'), stg.ymd(c.item->>'rcDate'), (c.item->>'rcNo')::smallint)
join race_entry re on re.race_id = r.race_id and re.chul_no = (c.item->>'chulNo')::smallint
where c.api = 'jockey_change';

-- 예정 경주는 출전표를 변경 후 기수로 맞춘다
update race_entry re set jk_no = c.after_jk_no, jockey_name = j.name, carried_kg = coalesce(c.after_kg, re.carried_kg)
from entry_change c join jockey j on j.jk_no = c.after_jk_no
where c.change_type = 'JOCKEY' and (c.race_id, c.chul_no) = (re.race_id, re.chul_no) and re.status_code = 'ENTERED';

-- ── 7. 모든 조합 확정 배당 ──
insert into race_odds (race_id, pool_code, combination, odds)
select r.race_id, b.pool_code,
       concat_ws('-', nullif(o.item->>'chulNo', '0'), nullif(o.item->>'chulNo2', '0'), nullif(o.item->>'chulNo3', '0')),
       (o.item->>'odds')::numeric
from raw.api_response o
join bet_pool b on b.name_ko || '식' = o.item->>'pool'
join race r on (r.meet_code, r.race_date, r.race_no) =
               (stg.meet_code(o.item->>'meet'), stg.ymd(o.item->>'rcDate'), (o.item->>'rcNo')::smallint)
where o.api = 'odds_all' and stg.num(o.item->>'odds') > 0
on conflict do nothing;

-- ── 8. 레이팅 이력 (최근 4회, 1이 가장 최근) ──
insert into horse_rating_history (hr_no, seq, rating, captured_at)
select h.hr_no, s.seq, s.rating, current_date
from raw.api_response a
join horse h on h.hr_no = lpad(a.item->>'hrNo', 7, '0')
cross join lateral (values (1, stg.nz(a.item->>'rating1')), (2, stg.nz(a.item->>'rating2')),
                           (3, stg.nz(a.item->>'rating3')), (4, stg.nz(a.item->>'rating4'))) s(seq, rating)
where a.api = 'horse_rating' and s.rating is not null
on conflict do nothing;

-- ── 9. 진료 이력 ──
insert into horse_treatment (hr_no, treated_on, ill_name, hospital, place)
select distinct h.hr_no, (a.item->>'treaDt')::date, a.item->>'illName', stg.dash(a.item->>'busnNm'), stg.dash(a.item->>'treaPlceNm')
from raw.api_response a
join horse h on h.hr_no = lpad(a.item->>'hrno', 7, '0')
where a.api = 'horse_clinic' and a.item->>'treaDt' ~ '^\d{4}-\d{2}-\d{2}$' and coalesce(a.item->>'illName', '') <> '';

-- ── 적재 이력 ──
insert into ingest_log (source_api, params, rows_loaded, loaded_at, note)
select endpoint, jsonb_build_object('calls', count(*)), sum(item_count), max(fetched_at), '2026-11 추가 신청 API'
from raw.api_call_log
where api in ('race_plan', 'entry_sheet', 'entry_weight', 'entry_cancel', 'jockey_change', 'track', 'odds_all',
              'horse_info', 'horse_rating', 'jockey_info', 'jockey_result', 'trainer_info', 'owner_info',
              'horse_equipment', 'horse_result', 'horse_clinic')
group by endpoint;

commit;
