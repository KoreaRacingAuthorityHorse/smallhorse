// 지난 경주 모의베팅(블라인드 레이스) 도메인 타입.
// blind: 베팅 전에 보여줘도 되는 정보 / reveal: 베팅 확정 후에만 공개하는 정보.

export type Venue = "서울" | "부산경남" | "제주" | "영천";

export type PoolKey = "단승" | "연승" | "복승" | "쌍승" | "복연승" | "삼복승" | "삼쌍승";

export type RunningStyle = "초반 질주형" | "중간 추격형" | "막판 추격형" | "후방 대기형" | "기록 적음";

export interface BlindEntry {
  no: number;
  scratched: boolean;
  sex: string;
  age: number | null;
  origin: string | null;
  rating: number | null;
  carriedKg: number | null;
  jockeyAllowanceKg: number | null;
  bodyWeight: number | null;
  bodyWeightDelta: number | null;
  /** 이 경주 이전 최근 5경주 순위(최근이 앞). 숫자가 아니면 출전취소 등 상태 */
  recent: string[];
  style: RunningStyle;
  starts: number | null;
  wins: number | null;
  jockeyWinPct: number | null;
  winOdds: number | null;
  placeOdds: number | null;
  favRank: number | null;
}

export interface BlindRace {
  id: string;
  meet: Venue;
  distance: number;
  grade: string;
  weightRule: string;
  ageCond: string;
  weather: string | null;
  track: string | null;
  waterPct: number | null;
  starters: number;
  bigRace: boolean;
  entries: BlindEntry[];
}

export interface Checkpoint {
  /** 출발점부터의 거리(m). 코너처럼 위치를 알 수 없는 지점은 null */
  m: number | null;
  /** 출발부터 누적 시간(초) */
  t: number | null;
  rank: number | null;
  label: string;
}

export interface RevealEntry {
  no: number;
  horse: string;
  jockey: string;
  trainer: string;
  status: string;
  pos: number | null;
  time: number | null;
  margin: string | null;
  behind: number | null;
  s1fRank: number | null;
  last3f: number | null;
  last1f: number | null;
  checkpoints: Checkpoint[];
}

export interface Payout {
  combo: string;
  odds: number;
}

export interface RaceReveal {
  date: string;
  raceNo: number;
  raceName: string;
  entries: RevealEntry[];
  payouts: Partial<Record<PoolKey, Payout[]>>;
}

export interface Bet {
  pool: PoolKey;
  /** 출주번호. 순서가 있는 승식은 고른 순서 = 들어올 순서 */
  picks: number[];
  stake: number;
}

export type BetOutcome =
  | { kind: "hit"; payout: number; odds: number }
  | { kind: "miss"; payout: 0 }
  | { kind: "refund"; payout: number };

export interface SettledBet {
  bet: Bet;
  outcome: BetOutcome;
}

export interface Settlement {
  reveal: RaceReveal;
  bets: SettledBet[];
  totalStake: number;
  totalPayout: number;
}

export interface LearningStats {
  nRaces: number;
  favorite: Record<string, { win: number; top3: number }>;
  s1fLeaderWinPct: number;
  poolOdds: Record<string, { avg: number; median: number }>;
}
