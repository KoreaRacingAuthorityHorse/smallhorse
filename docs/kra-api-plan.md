# 마사회 OpenAPI 사용 계획

기능 리스트(`docs/feature-list.md`)의 각 기능이 필요한 데이터를 어느 API에서 가져올지 정리했다.
API는 공공데이터포털의 한국마사회 OpenAPI(기관코드 `B551015`)이고, 호출 주소는 `https://apis.data.go.kr/B551015/{경로}`다.
필드 목록은 포털의 API 명세에서 확인했다. "신청 필요" API는 활용신청 후 실제 응답으로 한 번 더 확인해야 한다.

## 1. 1차 신청·적재 API (14개)

2023-01 ~ 2026-11-22 데이터를 적재했다(경주 9,732개, 출전 101,898행). DB 이미지 `trackon-db:dev`에 들어 있다.

| API | 경로 | 쓰는 기능 | 적재 범위 |
|---|---|---|---|
| 경주성적정보 | `API214_1/RaceDetailResult_1` | B-3, C-7, C-8 (출전·결과·구간 기록의 기준) | 2023-01~2026-11 |
| 경주기록 정보 | `API4_3/raceResult_3` | 경주성적정보와 동일 + 영문명 | 2023-01~2026-11 |
| 경마시행당일_경주결과종합 | `API299/Race_Result_total` | 출발시각, 확정 여부, 경주 시점 통산 성적 | 2023-01~2026-11 |
| 경주 구간별 성적 정보 | `API6_1/raceDetailSectionRecord_1` | C-8 다시보기(선두 구간기록) | 2023-01~2026-11 |
| 경마코너별통과순위_주로빠르기 | `API303/corner_rank` | B-3 구간 순위, C-8 | 2023-01~2026-11 |
| 경주개요 정보 | `API3_1/raceInfo_1` | B-3 경주 조건·함수율·매출 | 2023-01~2026-11 |
| 경주 요약성적표 | `API34_1/raceSummaryResult_1` | C-7·C-8 승식별 적중 조합과 확정 배당 | 2023-01~2026-11 |
| 경주별상세성적표 | `racedetailresult/getracedetailresult` | 마주복색, 수습기수 표기 | 2026-08~10 |
| 마필 구간별 경주기록 | `API37_1/sectionRecord_1` | 말별 구간 최고·평균 기록 | 2026-08~10 |
| 경주조건별 최고기록 | `API32_1/topRecordByCondition_1` | 거리별 최고 기록, 1985년~ 경주 이력 | 전체 |
| 마필·기수·조교사 통산경주기록 | `API27_1/totalRecord_1` | B-4·B-5 통산·1년·6개월 성적 | 전체(조회 시점) |
| 마필경주별 상금정보 | `horseraceprizeinfo/gethorseraceprizeinfo` | B-5 상금 | 전체(서울 일부 재적재 필요) |
| AI학습용_경주결과 | `API155/raceResult` | 교차검증용 | 2026-08~10 |
| AI기반연구용_경주결과상세 | `API156/raceRsutDtl` | 교차검증용 | 2026-08~10 |

## 2. 추가 신청 API

2026-11-22에 P0·P1 16개를 개발계정으로 신청했고 모두 자동승인됐다. 같은 인증키로 호출된다.
16개 중 15개를 적재해 DB 이미지에 넣었다. `API15_2`(경주마 성적)는 신청 당일 일일 한도 초과(429)로 적재하지 못했다(다음 날 재시도). 경주마 성적은 `API8_2`(통산·1년 출주/착순·상금)로 대부분 채워진다.
"확인 건수"는 승인 직후 기본 파라미터로 1회 호출한 `totalCount`다. P2 5개는 신청하지 않았다.

### P0. 예정 경주 모의베팅에 꼭 필요 (C-1, C-6, C-7) · 신청 완료

지금 예정 경주는 전부 가짜 데이터다. 아래 7개가 있어야 실제 이번 주 경주로 베팅하고 결과가 나오면 정산할 수 있다.

| API | 경로 | 포털 | 필요한 이유 | 주요 필드 | 확인 건수 |
|---|---|---|---|---|---:|
| 경주계획표 | `API72_2/racePlan_2` | [15056499](https://www.data.go.kr/data/15056499/openapi.do) | 예정 경주 일정·조건 | rcDate, rcNo, schStTime(발주예정), rcDist, rank, budam, rcName, 상금, 레이팅 상·하한 | 254 |
| 출전표 상세정보 | `API26_2/entrySheet_2` | [15058677](https://www.data.go.kr/data/15058677/openapi.do) | 예정 경주 출전마 (베팅 화면 출전표) | chulNo, hrNo, hrName, sex, rating, jkNo/jkName, trNo, owNo, wgBudam, 통산·1년 성적 | 2,606 |
| 출전마 체중 정보 | `API25_1/entryHorseWeightInfo_1` | [15057498](https://www.data.go.kr/data/15057498/openapi.do) | 경주 직전 마체중·증감 | wgHr, wgHrDiff, recentRcDate | 2,606 |
| 경주마 출전취소 정보 | `API9_1/raceHorseCancelInfo_1` | [15056779](https://www.data.go.kr/data/15056779/openapi.do) | 취소마 베팅 차단·환불 | chulNo, hrNo, reason | 14 |
| 기수변경 정보 | `API10_1/jockeyChangeInfo_1` | [15057181](https://www.data.go.kr/data/15057181/openapi.do) | 출전표 기수 갱신 | jkBef/jkAft, befBudam/aftBudam, reason | 39 |
| 경주로정보 | `API189_1/Track_1` | [15063953](https://www.data.go.kr/data/15063953/openapi.do) | 주로 상태·함수율·날씨(경주 전 정보) | track, waterPercent, weather, windSpeed, temperature | 4,761 |
| 확정배당율 통합 정보 | `API160_1/integratedInfo_1` | [15058559](https://www.data.go.kr/data/15058559/openapi.do) | 결과 확정 시 승식별 배당. 데이터 소개 탭의 "7개 승식 모든 조합 배당" | pool, chulNo~chulNo3, odds | 22,301 |

> `API160_1`은 기본 조회가 22,301건이고 단승·연승 한 마리 조합(`chulNo2=0`)까지 들어 있다. 적중 조합만이 아니라 **승식별 모든 조합의 확정 배당**이다.

### P1. 경주 데이터 화면의 기수·조교사·경주마 탭 (B-4, B-5) · 신청 완료

| API | 경로 | 포털 | 필요한 이유 | 주요 필드 | 확인 건수 |
|---|---|---|---|---|---:|
| 경주마 상세정보 | `API8_2/raceHorseInfo_2` | [15058115](https://www.data.go.kr/data/15058115/openapi.do) | 말 프로필, 부마·모마, 구매가 | birthday, rank, rating, faHrNo/faHrName, moHrNo/moHrName, hrLastAmt(도입가), chaksunT | 4,056 |
| 경주마 성적 정보 | `API15_2/raceHorseResult_2` | [15058779](https://www.data.go.kr/data/15058779/openapi.do) | 승률·복승률, 데뷔일, 최근 경주 | winRateT/Y, qnlRateT/Y, debut, recent* | 429 일일 한도 초과(내일 재확인) |
| 경주마 레이팅 정보 | `API77/raceHorseRating` | [15057323](https://www.data.go.kr/data/15057323/openapi.do) | 최근 레이팅 4회 | rating1~4 | 17,973 |
| 기수 상세정보 | `API12_1/jockeyInfo_1` | [15056828](https://www.data.go.kr/data/15056828/openapi.do) | 기수 프로필 | debut, part(소속조), birthday, 기승가능중량 | 838 |
| 기수 성적 정보 | `API11_1/jockeyResult_1` | [15056591](https://www.data.go.kr/data/15056591/openapi.do) | 기수 승률 정렬 | winRateT/Y, qnlRateT/Y | 638 |
| 조교사 상세정보 | `API19_1/trainerInfo_1` | [15057915](https://www.data.go.kr/data/15057915/openapi.do) | 조교사 프로필·승률 | stDate(데뷔), part, winRate/qnlRate/plcRate | 88 |
| 마주 정보 | `API14_1/horseOwnerInfo_1` | [15033298](https://www.data.go.kr/data/15033298/openapi.do) | 마주 이름·보유 두수 | owNo, owName, ownerHorses, chaksunT | 1,038 |
| 출전마 장구사용 및 폐출혈 정보 | `API24_1/horseMedicalAndEquipment_1` | [15058040](https://www.data.go.kr/data/15058040/openapi.do) | 경주마 탭의 장구·폐출혈 | toolName, bleedingCnt, bleedingDate, illName | 117 |
| 경주마 경주전 1년간 진료내역 | `API141/clincList` | [15144156](https://www.data.go.kr/data/15144156/openapi.do) | 경주마 탭의 진료 이력 | treaDt, illName, busnNm | 마번별 15~97 (`hr_no` 필수) |

### P2. 있으면 좋은 것 · 미신청

| API | 경로 | 포털 | 쓰임 |
|---|---|---|---|
| 출전표용어 | `API135/raceCardTerm` | [15151777](https://www.data.go.kr/data/15151777/openapi.do) | 용어 사전(E-2)을 공식 설명으로 검증·보강 |
| 출전표정보 | `API78/chulmainfo` | [15160316](https://www.data.go.kr/data/15160316/openapi.do) | 조교 횟수, 출전 주기, 장구 현황, 특이사항(초보자용 출전표 정보) |
| 경마시행당일_기수변경상세 | `API300/Jockey_Change_Detail` | [15119538](https://www.data.go.kr/data/15119538/openapi.do) | 기수 변경 고객 공지 시각까지 필요할 때 |
| 혈통정보기본 | `API284/HorseBloodBasicInfo` | [15109000](https://www.data.go.kr/data/15109000/openapi.do) | 부계·모계 혈통 라인(부마·모마 이름은 `API8_2`로 충분) |
| 경주마정보_영문추가 | `API310/raceHorseInfo` | [15130590](https://www.data.go.kr/data/15130590/openapi.do) | 영문 마명·경마장명 |

## 2-1. 추가 API 적재 결과 (2026-11-22)

적재 스크립트: `db/pipeline/load_raw.py --extra --clinic` → `seed_extra.sql`. API마다 하루 3,000건 한도가 따로 있다.

| API | 조회 범위 | 넣은 곳 | 결과 |
|---|---|---|---|
| 경주계획표 `API72_2` | 경마장별 2026-11·12월 | `race` (status=`SCHEDULED`) | 공개분 2026-11-22까지. 다음 주 계획은 아직 미공개 |
| 출전표 상세 `API26_2` | 경마장별 2026-11·12월 | `race_entry` (status=`ENTERED`), `entry_career_snapshot` | 1,730행(11월 경주) |
| 출전마 체중 `API25_1` | 같음 | `race_entry.body_weight_kg·delta` | 1,730행 |
| 출전취소 `API9_1` | 경마장 × 2023~2026년 | `entry_change` (SCRATCH) | 1,178건 |
| 기수변경 `API10_1` | 같음 | `entry_change` (JOCKEY) | 2,153건 |
| 경주로정보 `API189_1` | 2023-01 ~ 2026-11 | `race.weather·track_state·water_pct·wind_speed·temperature` | 경주별 값. 별도 테이블 불필요 |
| 확정배당 통합 `API160_1` | 경마장별 2026-10·11월 | 새 테이블 `race_odds` | 490,326행(421경주). 적중 조합 배당이 `race_payout`과 3,203/3,206건 일치 |
| 경주마 상세 `API8_2` | 서울·제주·영남 현역마 | `horse`(혈통·도입가·성적·상금·`is_active`) | 4,056두 |
| 레이팅 `API77` | 전체(경마장 파라미터 무시됨) | `horse_rating_history` | 22,968행 |
| 기수 `API12_1`·`API11_1` | 서울·제주·영남 | `jockey`(프로필·성적·승률) | 838명(은퇴 기수 포함) |
| 조교사 `API19_1` | 같음 | `trainer` | 88명 갱신 |
| 마주 `API14_1` | 같음 | `owner` | 934명 |
| 장구·폐출혈 `API24_1` | 최근 경주일 | `race_entry.equipment·bleeding_count·last_bleeding_date·medical_note` | 352행 |
| 진료내역 `API141` | 출전표에 있는 말 1,609두(1두 1회 호출) | `horse_treatment` | 41,656건 |
| 경주마 성적 `API15_2` | - | - | 429 한도 초과, 미적재 |

**스키마 변경**
- 추가 테이블: `race_odds`. 장구·경주로 정보는 기존 테이블에 컬럼으로 넣어 새 테이블을 만들지 않았다.
- `jockey`·`trainer`·`owner`·`horse`에 통산·1년 성적 컬럼과 `stats_at` 추가.
- `entry_status`에 `ENTERED`(출전예정) 추가.
- 당일 아직 달리지 않은 경주(성적 API에 착순 0)는 `SCHEDULED`/`ENTERED`로 넣는다.

**남은 일**
1. `API15_2` 재시도.
2. 진료내역 과거 백필: 현역마 전체(약 4,000두)를 이틀에 나눠 조회.
3. 정기 수집: 경주계획·출전표·체중·취소·기수변경은 경주일 전후로 자주, 마스터는 주 1회. 실행 위치(cron 또는 백엔드 배치)는 백엔드 담당과 정한다.

## 3. 쓰지 않는 API

- 홈페이지자료실 계열 32개: 위 API와 내용이 겹친다.
- 배당·매출 중 매출·발매창구·구매성향: 서비스 기능과 관계없다.
- 승마, 시설, 전자입찰, 말산업(경매·접종·센서 등): 현재 기능 범위 밖이다.

## 4. API로 해결할 수 없는 것

- **경주 전 실시간 배당:** 마사회 API는 경주 후 확정 배당만 준다. 예정 경주 베팅 화면에 보이는 배당은 지금 목업 값이다. 포인트 정산은 고정 배율(지난 1.5배, 예정 2배)이라 정산에는 필요 없지만, 화면에서 배당을 보여줄지 정해야 한다.
- **예정 경주 데이터 공개 시점:** 출전표가 경주 며칠 전에 API에 올라오는지는 신청 후 확인해야 한다. 이에 따라 수집 주기(배치 스케줄)를 정한다.

## 5. 신청 방법

공공데이터포털에서 각 API 페이지의 **활용신청**을 누른다(활용목적: 웹 사이트 개발). 개발계정은 자동승인이고 API마다 하루 3,000건이다. 기존 인증키 하나로 추가 API를 모두 쓸 수 있다. 승인 직후에는 반영까지 1~2시간 걸릴 수 있다.
