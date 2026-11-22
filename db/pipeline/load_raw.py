"""마사회 성적·기록 API를 호출해 응답 원본을 Postgres raw 스키마에 적재한다.

같은 (api, params) 조합을 다시 적재하면 이전 적재분을 지우고 새로 넣는다(멱등).
사용: python load_raw.py --months 202608 202609 202610
     python load_raw.py --months - --extra --clinic   (추가 신청 API)
"""
import argparse
import json
import os
import time
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

from kra_client import call, header, items

PAGE = 5000
MEETS = ["1", "2", "3", "4"]  # 서울, 제주, 부산경남, 영천

# 경마장 × 월 단위로 호출하는 API
MONTHLY = {
    "race_result": "API214_1/RaceDetailResult_1",
    "race_record": "API4_3/raceResult_3",
    "race_result_total": "API299/Race_Result_total",
    "race_section": "API6_1/raceDetailSectionRecord_1",
    "corner_rank": "API303/corner_rank",
    "race_info": "API3_1/raceInfo_1",
    "race_summary": "API34_1/raceSummaryResult_1",
}
# 경주일 단위로만 조회되는 API (경주개요에서 얻은 경주일 목록 사용)
DAILY = {
    "race_detail": ("racedetailresult/getracedetailresult", lambda m, d: {"meet": m, "rc_date": d}),
    "ai_race_result": ("API155/raceResult", lambda m, d: {"rccrs_cd": m, "race_dt": d}),
    "ai_race_result_dtl": ("API156/raceRsutDtl", lambda m, d: {"rccrs_cd": m, "race_dt": d}),
    # 37_1은 meet 3이 영남(부경+영천)이라 영천 경주일도 3으로 조회
    "horse_section_stats": ("API37_1/sectionRecord_1", lambda m, d: {"meet": "3" if m == "4" else m, "rc_date": d}),
}
# 날짜 조건 없이 전체를 받는 API
FULL = {
    "top_record": ("API32_1/topRecordByCondition_1", [{}]),
    "total_record": ("API27_1/totalRecord_1", [{"meet": m, "pr_gubun": g} for m in ["1", "2", "3"] for g in ["0", "1", "2", "3"]]),
    "horse_prize": ("horseraceprizeinfo/gethorseraceprizeinfo", [{"meet": m} for m in MEETS]),
}

# 2026-11 추가 신청 API. --extra로 적재한다.
YEARS = ["2023", "2024", "2025", "2026"]
EXTRA = {
    # 예정 경주
    "race_plan": ("API72_2/racePlan_2", lambda a: [{"meet": m, "rc_month": ym} for m in MEETS for ym in a.plan_months]),
    "entry_sheet": ("API26_2/entrySheet_2", lambda a: [{"meet": m, "rc_month": ym} for m in MEETS for ym in a.plan_months]),
    "entry_weight": ("API25_1/entryHorseWeightInfo_1", lambda a: [{"meet": m, "rc_month": ym} for m in MEETS for ym in a.plan_months]),
    "entry_cancel": ("API9_1/raceHorseCancelInfo_1", lambda a: [{"meet": m, "rc_year": y} for m in MEETS for y in YEARS]),
    "jockey_change": ("API10_1/jockeyChangeInfo_1", lambda a: [{"meet": m, "rc_year": y} for m in MEETS for y in YEARS]),
    "track": ("API189_1/Track_1", lambda a: [{"meet": m, "rc_date_fr": "20230101", "rc_date_to": "20261231"} for m in MEETS]),
    # 모든 조합 확정 배당 (양이 많아 최근 월만)
    "odds_all": ("API160_1/integratedInfo_1", lambda a: [{"meet": m, "rc_month": ym} for m in MEETS for ym in a.odds_months]),
    # 사람·말 마스터 (조회 시점 스냅샷)
    "horse_info": ("API8_2/raceHorseInfo_2", lambda a: [{"meet": m} for m in ["1", "2", "3"]]),
    "horse_rating": ("API77/raceHorseRating", lambda a: [{"meet": m} for m in MEETS]),
    "jockey_info": ("API12_1/jockeyInfo_1", lambda a: [{"meet": m} for m in ["1", "2", "3"]]),
    "jockey_result": ("API11_1/jockeyResult_1", lambda a: [{"meet": m} for m in ["1", "2", "3"]]),
    "trainer_info": ("API19_1/trainerInfo_1", lambda a: [{"meet": m} for m in ["1", "2", "3"]]),
    "owner_info": ("API14_1/horseOwnerInfo_1", lambda a: [{"meet": m} for m in ["1", "2", "3"]]),
    "horse_equipment": ("API24_1/horseMedicalAndEquipment_1", lambda a: [{"meet": m} for m in MEETS]),
    "horse_result": ("API15_2/raceHorseResult_2", lambda a: [{}]),
}

DDL = """
create schema if not exists raw;
create table if not exists raw.api_call_log (
    id           bigserial primary key,
    api          text not null,
    endpoint     text not null,
    params       jsonb not null,
    fetched_at   timestamptz not null default now(),
    result_code  text,
    result_msg   text,
    total_count  int,
    item_count   int,
    error        text
);
create table if not exists raw.api_response (
    id        bigserial primary key,
    fetch_id  bigint not null references raw.api_call_log(id) on delete cascade,
    api       text not null,
    item      jsonb not null
);
create index if not exists api_response_api_idx on raw.api_response (api);
create index if not exists api_call_log_api_params_idx on raw.api_call_log (api, params);
"""


def connect():
    """접속 정보는 libpq 환경변수(PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD 또는 ~/.pgpass)로 받는다."""
    return psycopg.connect(autocommit=True)


def fetch_all(endpoint, params):
    """모든 페이지를 받아 (items, total, result_code, result_msg, error) 반환."""
    out, page, total, code, msg = [], 1, None, None, None
    while True:
        status, body = call(endpoint, {**params, "numOfRows": str(PAGE), "pageNo": str(page)})
        if not isinstance(body, dict):
            return out, total, code, msg, str(body)[:500]
        code, msg = header(body) or (None, None)
        its, total = items(body)
        if its is None:
            return out, total, code, msg, json.dumps(body, ensure_ascii=False)[:500]
        out.extend(its)
        total = int(total or 0)
        if len(out) >= total or not its:
            return out, total, code, msg, None
        page += 1
        time.sleep(0.2)


def load(conn, api, endpoint, params):
    its, total, code, msg, err = fetch_all(endpoint, params)
    p = Jsonb(params)
    with conn.transaction():
        conn.execute("delete from raw.api_call_log where api = %s and params = %s", (api, p))
        fid = conn.execute(
            """insert into raw.api_call_log (api, endpoint, params, result_code, result_msg, total_count, item_count, error)
               values (%s, %s, %s, %s, %s, %s, %s, %s) returning id""",
            (api, endpoint, p, code, msg, total, len(its), err)).fetchone()[0]
        with conn.cursor().copy("copy raw.api_response (fetch_id, api, item) from stdin") as cp:
            for it in its:
                cp.write_row((fid, api, Jsonb(it)))
    flag = "" if err is None and len(its) == (total or 0) else f"  !! err={err} total={total}"
    print(f"{api:20s} {json.dumps(params, ensure_ascii=False):45s} {len(its):6d}{flag}", flush=True)
    time.sleep(0.2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--months", nargs="+", required=True, help="YYYYMM 목록")
    ap.add_argument("--skip-full", action="store_true", help="날짜 조건 없는 전체 API 생략")
    ap.add_argument("--only", nargs="+", help="지정한 api 이름만 적재 (예: race_detail)")
    ap.add_argument("--extra", action="store_true", help="추가 신청 API(EXTRA)만 적재")
    ap.add_argument("--plan-months", nargs="+", default=["202611", "202612"])
    ap.add_argument("--odds-months", nargs="+", default=["202610", "202611"])
    ap.add_argument("--clinic", action="store_true", help="예정 출전마(entry_sheet)의 진료내역 적재")
    args = ap.parse_args()
    want = (lambda api: api in args.only) if args.only else (lambda api: True)

    conn = connect()
    conn.execute(DDL)

    if args.extra:
        for api, (endpoint, mk) in EXTRA.items():
            if want(api):
                for params in mk(args):
                    load(conn, api, endpoint, params)
        if args.clinic:
            hrs = [r[0] for r in conn.execute(
                "select distinct item->>'hrNo' from raw.api_response where api = 'entry_sheet' order by 1")]
            print(f"-- 진료내역 대상 {len(hrs)}두")
            for h in hrs:
                load(conn, "horse_clinic", "API141/clincList", {"hr_no": h})
        return

    for api, endpoint in MONTHLY.items():
        if not want(api):
            continue
        for ym in args.months:
            for m in MEETS:
                load(conn, api, endpoint, {"meet": m, "rc_month": ym})

    # 경주개요에 나온 경주일을 기준으로 일 단위 API 호출
    days = conn.execute(
        """select distinct f.params->>'meet', (i.item->>'rcDate')
           from raw.api_response i join raw.api_call_log f on f.id = i.fetch_id
           where i.api = 'race_info' and left(i.item->>'rcDate', 6) = any(%s)
           order by 2, 1""", (args.months,)).fetchall()
    print(f"-- 경주일 {len(days)}개 (경마장×일)")
    for api, (endpoint, mk) in DAILY.items():
        if not want(api):
            continue
        seen = set()
        for meet, d in days:
            params = mk(meet, d)
            key = json.dumps(params, sort_keys=True)
            if key in seen:
                continue
            seen.add(key)
            load(conn, api, endpoint, params)

    if not args.skip_full:
        for api, (endpoint, plist) in FULL.items():
            if not want(api):
                continue
            for params in plist:
                load(conn, api, endpoint, params)


if __name__ == "__main__":
    main()
