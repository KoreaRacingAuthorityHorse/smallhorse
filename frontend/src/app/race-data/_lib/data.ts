/* 경주데이터 목업: 시드 기반 가상 데이터 (서버·클라이언트 렌더 결과가 같도록 Math.random 미사용) */

export type MeetId = 1 | 2 | 3;
export const MEETS: Record<MeetId, string> = { 1: "서울", 2: "제주", 3: "부산경남" };
export const MEET_IDS: MeetId[] = [1, 2, 3];
export const MEET_NAMES = MEET_IDS.map((m) => MEETS[m]);

const seeded = (seed: number) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
const picker = (rnd: () => number) => <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];

export const HORSES = ["한강캡틴", "청룡의꿈", "새벽질주", "황금빛노을", "강철심장", "푸른초원", "불꽃승부", "은빛갈기", "천하무적", "바람의아들", "별빛기수", "폭풍전야", "행운의여신", "대지의왕", "번개발굽", "승리의함성"];
const JK = [["박태종", "080103"], ["김동현", "080211"], ["이서준", "080304"], ["최우진", "080415"], ["정하늘", "080522"], ["문세영", "080098"], ["조은별", "080617"], ["한지호", "080733"], ["유재민", "080844"], ["오태양", "080901"]] as const;
const TR = [["서인석", "070165"], ["김영관", "070101"], ["박대흥", "070188"], ["이신영", "070214"], ["최기홍", "070250"], ["안병기", "070302"], ["송문길", "070377"], ["지용철", "070410"]] as const;
const OW = [["나기두", "121008"], ["김해강", "121120"], ["박유진", "121207"], ["이도윤", "121315"]] as const;
const TOOLS = ["", "계란형큰,망사눈", "혀끈", "망사눈", "가리개"];
const NAMES = ["일반 경주", "새해맞이 기념 경주", "신마 경주", "핸디캡 경주"];

export const POOLS = { WIN: "단승", PLC: "연승", QNL: "복승", QPL: "복연승", EXA: "쌍승", TLA: "삼복승", TRI: "삼쌍승" } as const;
export type Pool = keyof typeof POOLS;

export const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/* 날짜 (YYYYMMDD 문자열) */
export const MIN = "20150103";
export const MAX = "20261011";
const RACE_DOW: Record<MeetId, number[]> = { 1: [0, 6], 2: [5, 6], 3: [5, 0] };
export const toD = (dt: Date) =>
  `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}${String(dt.getDate()).padStart(2, "0")}`;
export const fromD = (d: string) => new Date(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6));
export const dow = (d: string) => WEEK[fromD(d).getDay()];
export const fmtD = (d: string) => `${+d.slice(4, 6)}월 ${+d.slice(6)}일 (${dow(d)})`;
export const hasDay = (d: string, m: MeetId) => d >= MIN && d <= MAX && RACE_DOW[m].includes(fromD(d).getDay());

export function step(d: string, m: MeetId, dir: 1 | -1): string | null {
  const dt = fromD(d);
  for (let i = 0; i < 4400; i++) {
    dt.setDate(dt.getDate() + dir);
    const x = toD(dt);
    if (x < MIN || x > MAX) return null;
    if (hasDay(x, m)) return x;
  }
  return null;
}
export const near = (d: string, m: MeetId) => (hasDay(d, m) ? d : step(d, m, -1) || step(d, m, 1) || d);
export const latest = (m: MeetId) => near(MAX, m);

/* 경주 */
export const SEG_KEYS = ["S1F", "1C", "2C", "3C", "G3F", "4C", "G1F"] as const;
export type SegKey = (typeof SEG_KEYS)[number];

export type Entry = {
  chulNo: number; hrName: string; hrNo: string; prdCtyNm: string; sex: string; age: number;
  wgBudam: number; wgHr: number; df: number; hrRating: number; hrTool: string;
  jkName: string; trName: string; owName: string;
  stOrd: number; rcTime: string; differ: number; win: number; plc: number;
  seg: Record<SegKey, number>;
};
export type RaceCond = {
  rcName: string; rcDist: number; rank: string; stTime: string; ageCond: string; sexCond: string; budam: string;
  chaksun1: number; track: string; water: number; weather: "맑음" | "흐림" | "비";
};
export type Race = { m: MeetId; d: string; no: number; ents: Entry[]; c: RaceCond };

export const RACE_NOS = [1, 2, 3, 4, 5, 6, 7, 8];

function genRace(d: string, m: MeetId, no: number): Race {
  const rnd = seeded(((+d * 31 + m * 7919 + no * 104729) % 2147483646) + 1);
  for (let i = 0; i < 6; i++) rnd();
  const pick = picker(rnd);
  const n = 8 + Math.floor(rnd() * 5);
  const hs = [...HORSES].sort(() => rnd() - 0.5).slice(0, n);
  const ents = hs.map((h, i) => {
    const jk = pick(JK), tr = pick(TR), ow = pick(OW);
    return {
      chulNo: i + 1, hrName: h, hrNo: String(46000 + Math.floor(rnd() * 900)).padStart(7, "0"),
      prdCtyNm: pick(["한국", "미국", "일본"]), sex: pick(["수", "암", "거"]), age: 3 + Math.floor(rnd() * 4),
      wgBudam: 52 + Math.floor(rnd() * 6), wgHr: 440 + Math.floor(rnd() * 90), df: Math.floor(rnd() * 13) - 6,
      hrRating: rnd() < 0.25 ? 0 : 30 + Math.floor(rnd() * 60), hrTool: pick(TOOLS),
      jkName: jk[0], trName: tr[0], owName: ow[0], _s: rnd(),
      stOrd: 0, rcTime: "", differ: 0, win: 0, plc: 0, seg: {} as Record<SegKey, number>,
    };
  });
  ents.sort((a, b) => b._s - a._s).forEach((e, i) => {
    e.stOrd = i + 1;
    const sec = 72 + i * 0.35 + rnd() * 0.3;
    e.rcTime = `1:${(sec - 60).toFixed(1).padStart(4, "0")}`;
    e.differ = i ? Math.round(i * 0.6 + rnd() * 2) : 0;
    e.win = +(1.6 + Math.pow(i + 1, 1.55) * 1.7 + rnd() * 3).toFixed(1);
    e.plc = +(1.1 + i * 0.3 + rnd() * 0.8).toFixed(1);
  });
  const SEGN: Record<SegKey, number> = { S1F: 3.4, "1C": 3.1, "2C": 2.8, "3C": 2.3, G3F: 1.9, "4C": 1.4, G1F: 0.8 };
  SEG_KEYS.forEach((k) => {
    ents
      .map((e) => [e, e.stOrd + (rnd() - 0.5) * 2 * SEGN[k] * 2] as const)
      .sort((a, b) => a[1] - b[1])
      .forEach(([e], i) => { e.seg[k] = i + 1; });
  });
  ents.sort((a, b) => a.chulNo - b.chulNo);
  return {
    m, d, no,
    ents,
    c: {
      rcName: pick(NAMES), rcDist: pick([1000, 1200, 1400, 1700, 1800]), rank: pick(["국6등급", "국5등급", "국4등급", "국3등급"]),
      stTime: `${10 + Math.floor(no / 2)}:${no % 2 ? "05" : "40"}`, ageCond: pick(["3세", "4세 이상", "연령 오픈"]),
      sexCond: pick(["오픈", "암"]), budam: pick(["별정A", "핸디캡", "마령"]), chaksun1: pick([24750000, 30000000, 40000000]),
      track: pick(["건조", "양호", "다습", "포화"]), water: 3 + Math.floor(rnd() * 9), weather: pick(["맑음", "흐림", "비"] as const),
    },
  };
}

const raceCache = new Map<string, Race>();
export function getRace(d: string, m: MeetId, no: number): Race | undefined {
  if (no < 1 || no > 8 || !hasDay(d, m)) return undefined;
  const key = `${d}-${m}-${no}`;
  let r = raceCache.get(key);
  if (!r) raceCache.set(key, (r = genRace(d, m, no)));
  return r;
}

export const isOrderedPool = (p: Pool) => p === "EXA" || p === "TRI";
export function oddsRows(r: Race, p: Pool): [number[], number][] {
  const es = r.ents, rows: [number[], number][] = [];
  if (p === "WIN" || p === "PLC") es.forEach((e) => rows.push([[e.chulNo], p === "WIN" ? e.win : e.plc]));
  else {
    const k = p === "TLA" || p === "TRI" ? 3 : 2;
    const top = [...es].sort((a, b) => a.stOrd - b.stOrd).slice(0, 5).map((e) => e.chulNo);
    const gen = (arr: number[], k: number): number[][] =>
      k === 1 ? arr.map((x) => [x]) : arr.flatMap((x, i) => gen(isOrderedPool(p) ? arr.filter((y) => y !== x) : arr.slice(i + 1), k - 1).map((t) => [x, ...t]));
    const mul = { QNL: 0.9, QPL: 0.35, EXA: 1.8, TLA: 2.4, TRI: 9 }[p];
    gen(top, k).forEach((c) => rows.push([c, +(c.reduce((s, n) => s + es.find((e) => e.chulNo === n)!.win, 0) * mul).toFixed(1)]));
  }
  return rows.sort((a, b) => a[1] - b[1]).slice(0, 8);
}

/* 구간별 순위: 경주로 지도 (트랙 둘레 1668) */
export const SEGS = [["S1F", "출발", "출발"], ["1C", "1코너", "1C"], ["2C", "2코너", "2C"], ["3C", "3코너", "3C"], ["G3F", "도착 600m 전", "600m"], ["4C", "4코너", "4C"], ["G1F", "도착 200m 전", "200m"], ["FIN", "결승", "결승"]] as const;
export type SegPointKey = SegKey | "FIN";
const SEGD: Partial<Record<SegPointKey, number>> = { "1C": 240, "2C": 440, "3C": 1060, G3F: 1150, "4C": 1290, G1F: 1483 };
export const TRACK_LEN = 1668;
export const TRACK_PATH = "M312 250H130A100 100 0 0 1 130 50H650A100 100 0 0 1 650 250H312";

export type SegPoint = { k: SegPointKey; n: string; l: string; d: number; d0: number };
export function segPoints(dist: number): SegPoint[] {
  const d0 = (TRACK_LEN - (dist * TRACK_LEN) / 1800) % TRACK_LEN;
  return SEGS.filter(([k]) => k === "S1F" || k === "FIN" || SEGD[k]! > d0 + 110).map(([k, n, l]) => ({
    k, n, l, d0, d: k === "S1F" ? d0 + 90 : k === "FIN" ? TRACK_LEN : SEGD[k]!,
  }));
}

/* TRACK_PATH 위 거리 s 지점의 좌표 (직선 182 → 반원 → 직선 520 → 반원 → 직선 338) */
export function trackPoint(s: number): [number, number] {
  const arc = Math.PI * 100;
  let t = ((s % TRACK_LEN) + TRACK_LEN) % TRACK_LEN;
  if (t < 182) return [312 - t, 250];
  t -= 182;
  if (t < arc) { const a = Math.PI / 2 + t / 100; return [130 + 100 * Math.cos(a), 150 + 100 * Math.sin(a)]; }
  t -= arc;
  if (t < 520) return [130 + t, 50];
  t -= 520;
  if (t < arc) { const a = -Math.PI / 2 + t / 100; return [650 + 100 * Math.cos(a), 150 + 100 * Math.sin(a)]; }
  t -= arc;
  return [650 - t, 250];
}

/* 기수·조교사 */
export type RecentRun = { rcDate: string; meet: string; rcNo: number; hrName: string; stOrd: number | null };
export type Person = { name: string; no: string; meet: string; age: number; T: number; w: number; p2: number; p3: number; recent: RecentRun[] };
const RACEDAYS = ["20261011", "20261010", "20261004", "20261003", "20260920", "20260919", "20260913", "20260912", "20260906", "20260905"];

function genPeople() {
  const rnd = seeded(11), pick = picker(rnd);
  const P: Record<"jk" | "tr", Person[]> = { jk: [], tr: [] };
  const mk = (list: readonly (readonly [string, string])[], T0: number, key: "jk" | "tr", extra: number) =>
    list.forEach(([name, no], i) => {
      const T = T0 + Math.floor(rnd() * 2200), w = Math.floor(T * (0.05 + rnd() * 0.1));
      const meet = MEET_NAMES[i % 3], r = w / T;
      const recent = RACEDAYS.map((d) => {
        const u = rnd();
        const stOrd = u < 0.03 ? null : u < r * 1.3 ? 1 : u < r * 2.6 ? 2 + Math.floor(rnd() * 2) : 4 + Math.floor(rnd() * 8);
        return { rcDate: d, meet, rcNo: 1 + Math.floor(rnd() * 10), hrName: pick(HORSES), stOrd };
      });
      P[key].push({ name, no, meet, age: extra + Math.floor(rnd() * 20), T, w, p2: Math.floor(w * 1.1), p3: Math.floor(w * 1.2), recent });
    });
  mk(JK, 300, "jk", 24);
  mk(TR, 800, "tr", 40);
  return P;
}
export const PEOPLE = genPeople();

/* 경주마 */
export type HorseRun = { d: string; meet: string; no: number; dist: number; o: number; jk: string; t: string; wt: number };
export type Horse = {
  name: string; en: string; no: string; meet: string; sex: string; age: number; birth: string; rank: string; origin: string;
  tr: string; ow: string; sire: readonly [string, string]; dam: readonly [string, string];
  T: number; w: number; p2: number; p3: number; Y: number; y1: number; s6: number; prize: number; prizeY: number; price: string;
  bits: string[]; ill: { d: string; n: string }[]; bl: number; bld: string[]; recent: HorseRun[];
};

function genHorses(): Horse[] {
  const r = seeded(77), pk = picker(r);
  const EN: Record<string, string> = { "한강캡틴": "HANGANG CAPTAIN", "청룡의꿈": "CHEONGRYONG DREAM", "새벽질주": "SAEBYEOK SPRINT", "황금빛노을": "GOLDEN SUNSET", "강철심장": "STEEL HEART", "푸른초원": "BLUE MEADOW", "불꽃승부": "FIRE DUEL", "은빛갈기": "SILVER MANE", "천하무적": "INVINCIBLE", "바람의아들": "SON OF WIND", "별빛기수": "STARLIGHT RIDER", "폭풍전야": "BEFORE STORM", "행운의여신": "LADY FORTUNE", "대지의왕": "KING OF EARTH", "번개발굽": "LIGHTNING HOOF", "승리의함성": "VICTORY CRY" };
  const SIRE = [["메니피", "MENIFEE"], ["캡틴스티브", "CAPTAIN STEVE"], ["더웨이", "THE WAY"], ["스마트스트라이크", "SMART STRIKE"], ["애니기븐새터데이", "ANY GIVEN SATURDAY"]] as const;
  const DAM = [["스마트어트랙션", "SMART ATTRACTION"], ["그레이렌", "GREY WREN"], ["달리자", "DALLIJA"], ["별의노래", "STAR SONG"], ["하늘정원", "SKY GARDEN"]] as const;
  const BITS = ["계란형큰고리재갈", "망사눈가면", "혀보정끈", "망사가면", "반가지큰고리재갈", "양털코굴레"];
  const ILL = ["운동기인성 피로회복", "좌전구절찰과상", "인푸렌자예방접종", "교돌상", "양전지 근육통", "감기"];
  const fmtT = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(1).padStart(4, "0")}`;
  return HORSES.map((name, i) => {
    const meet = MEET_NAMES[i % 3], T = 8 + Math.floor(r() * 50), rate = 0.04 + r() * 0.2;
    const w = Math.round(T * rate), p2 = Math.round(T * (0.08 + r() * 0.1)), p3 = Math.round(T * (0.08 + r() * 0.1));
    const Y = Math.max(2, Math.round(T * (0.3 + r() * 0.4))), y1 = Math.round((w * Y) / T), s6 = Math.max(1, Math.round(Y * 0.5));
    let wt = 440 + Math.floor(r() * 60);
    const recent = RACEDAYS.map((d) => {
      wt += Math.floor(r() * 13) - 6;
      const u = r(), o = u < rate * 1.4 ? 1 : u < rate * 3 ? 2 + Math.floor(r() * 2) : 4 + Math.floor(r() * 8), dist = pk([1000, 1200, 1400, 1700, 1800]);
      return { d, meet, no: 1 + Math.floor(r() * 10), dist, o, jk: pk(JK)[0], t: fmtT(dist / 16.4 + r() * 3), wt };
    });
    const bl = r() < 0.25 ? 1 + Math.floor(r() * 2) : 0;
    return {
      name, en: EN[name], no: String(43000 + i * 517).padStart(7, "0"), meet, sex: pk(["수", "암", "거"]), age: 3 + Math.floor(r() * 4),
      birth: `20${19 + Math.floor(r() * 4)}.0${2 + Math.floor(r() * 3)}.${10 + Math.floor(r() * 18)}`,
      rank: pk(["국6", "국5", "국4", "국3"]), origin: pk(["한국", "한국", "미국", "일본"]), tr: pk(TR)[0], ow: pk(OW)[0], sire: pk(SIRE), dam: pk(DAM),
      T, w, p2, p3, Y, y1, s6, prize: Math.round(((T * 6 + w * 40) * 1e6) / 4 + r() * 5e7), prizeY: Math.round(Y * 7e6),
      price: pk(["50,000천원(개별)", "자가생산", "수증", "12,000천원(경매)"]),
      bits: r() < 0.15 ? [] : Array.from({ length: 1 + Math.floor(r() * 3) }, () => pk(BITS)).filter((x, i, a) => a.indexOf(x) === i),
      ill: Array.from({ length: Math.floor(r() * 3) }, (_, k) => ({ d: `2026.0${9 - k}.${10 + Math.floor(r() * 18)}`, n: pk(ILL) })),
      bl, bld: ["2025.12.20", "2026.03.08"].slice(0, bl), recent,
    };
  });
}
export const HORSE_LIST = genHorses();

/* 데이터 소개 */
export const SOURCES = [
  ["경주 출전표", "경주 조건과 출전마, 기수, 조교사, 마주를 보여줘요.", "2024-01 ~", "사전"],
  ["경주 결과", "착순, 주파 기록, 도착차, 확정 단승·연승 배당을 담아요.", "2015-01 ~", "결과"],
  ["주로 상태", "경주마다 주로 상태, 함수율, 날씨를 기록해요.", "2014-01 ~", "사전"],
  ["구간별 순위", "출발·코너·결승 직전 등 구간을 지날 때의 순위와 누적 기록이에요.", "2015-01 ~", "결과"],
  ["확정 배당률", "단승부터 삼쌍승까지 7개 승식의 모든 조합 배당이에요.", "2023-01 ~", "결과"],
  ["기수 변경", "경주 전에 바뀐 기수와 변경 사유를 알려줘요.", "수시 갱신", "사전"],
  ["기수·조교사·마주", "소속, 데뷔일, 통산·최근 1년 성적이에요.", "현재 기준", "누적"],
] as const;
export const FIELDS = [
  ["chulNo · hrName · hrNo", "출주번호, 마명, 마번", "경주 전"],
  ["sex · age · wgBudam · wgHr · df", "성별, 연령, 부담중량, 마체중, 증감", "경주 전"],
  ["jkName · trName · owName", "기수, 조교사, 마주", "경주 전"],
  ["rcDist · rank · stTime · chaksun1~5", "거리, 등급, 출발시각, 착순별 상금", "경주 전"],
  ["track · waterPercent · weather", "주로 상태, 함수율, 날씨", "경주 전"],
  ["stOrd · rcTime · differ · win · plc", "착순, 기록, 도착차, 단승·연승", "경주 후"],
  ["sjS1fOrd · sj_3cOrd · sj_4cOrd · sjG1fOrd", "구간별 통과 순위 (서울 기준)", "경주 후"],
  ["seS1fAccTime · se_3cAccTime · seG1fAccTime", "구간별 누적 기록 (서울)", "경주 후"],
  ["pool · chulNo~chulNo3 · odds", "승식별 확정 배당률", "경주 후"],
] as const;

/* 공통 포맷 */
export const wonMan = (n: number) => (n / 10000).toLocaleString() + "만원";
export const wonBig = (v: number) =>
  v >= 1e8 ? (v / 1e8).toFixed(2).replace(/\.?0+$/, "") + "억원" : Math.round(v / 1e4).toLocaleString() + "만원";
export const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) + "%" : "-");
export const tier = (rate: number) => (rate >= 12 ? "hi" : rate >= 8 ? "mid" : "");
