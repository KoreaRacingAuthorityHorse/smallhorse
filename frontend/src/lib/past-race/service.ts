// 지난 경주 데이터 접근 계층.
// 지금은 더미 JSON(src/data/mock/past-races.json)을 읽는다.
// 백엔드가 생기면 이 파일의 함수 내부만 API 호출로 바꾸면 된다(화면 코드는 그대로).
//   getBlindRace   → GET  /api/past-races/random?venue=...
//   settleRace     → POST /api/past-races/{id}/settle  { bets }
// 주의: 더미 단계에서는 결과 데이터가 브라우저 번들에 함께 들어간다. 결과 은닉은 백엔드 연결 후에 보장된다.

import mock from "@/data/mock/past-races.json";
import { settleBet } from "./settle";
import type { Bet, BlindRace, LearningStats, RaceReveal, Settlement, Venue } from "./types";

interface MockRace {
  id: string;
  blind: Omit<BlindRace, "id">;
  reveal: RaceReveal;
}

const RACES = mock.races as unknown as MockRace[];

export const DATA_SOURCE_NOTE = mock.source;

export async function getLearningStats(): Promise<LearningStats> {
  return mock.stats as LearningStats;
}

export async function countRaces(venue?: Venue): Promise<number> {
  return RACES.filter((r) => !venue || r.blind.meet === venue).length;
}

/** 아직 안 해본 경주 중 하나를 무작위로 고른다. 모두 해봤으면 처음부터 다시. */
export async function getBlindRace(opts: { venue?: Venue; exclude?: string[] } = {}): Promise<BlindRace | null> {
  const pool = RACES.filter((r) => !opts.venue || r.blind.meet === opts.venue);
  if (!pool.length) return null;
  const fresh = pool.filter((r) => !opts.exclude?.includes(r.id));
  const list = fresh.length ? fresh : pool;
  const race = list[Math.floor(Math.random() * list.length)];
  return { id: race.id, ...race.blind };
}

export async function getBlindRaceById(id: string): Promise<BlindRace | null> {
  const race = RACES.find((item) => item.id === id);
  return race ? { id: race.id, ...race.blind } : null;
}

export async function getRevealById(id: string): Promise<RaceReveal | null> {
  const race = RACES.find((item) => item.id === id);
  return race ? race.reveal : null;
}

export async function settleRace(raceId: string, bets: Bet[]): Promise<Settlement> {
  const race = RACES.find((r) => r.id === raceId);
  if (!race) throw new Error(`경주를 찾을 수 없어요: ${raceId}`);
  const settled = bets.map((bet) => ({ bet, outcome: settleBet(bet, race.reveal) }));
  return {
    reveal: race.reveal,
    bets: settled,
    totalStake: bets.reduce((a, b) => a + b.stake, 0),
    totalPayout: settled.reduce((a, s) => a + s.outcome.payout, 0),
  };
}
