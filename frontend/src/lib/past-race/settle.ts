import { poolDef } from "./pools";
import type { Bet, BetOutcome, RaceReveal } from "./types";

/** 출전취소·경주제외·출발제외된 말이 들어간 베팅은 환불한다. */
export const REFUND_STATUSES = ["출전취소", "경주제외", "출발제외"];

const normalize = (nums: number[], ordered: boolean) =>
  (ordered ? nums : [...nums].sort((a, b) => a - b)).join("-");

/**
 * 확정 배당표의 적중 조합과 비교해 베팅 1건을 정산한다.
 * 연승 2착/3착 기준, 복연승 적중 조합 수 같은 규칙은 배당표에 이미 반영되어 있어 따로 계산하지 않는다.
 * 동착 경주는 배당표에 조합이 하나만 나와 정산할 수 없으므로 데이터 단계에서 제외한다.
 */
export function settleBet(bet: Bet, reveal: RaceReveal): BetOutcome {
  const statusOf = (no: number) => reveal.entries.find((e) => e.no === no)?.status;
  if (bet.picks.some((no) => REFUND_STATUSES.includes(statusOf(no) ?? ""))) {
    return { kind: "refund", payout: bet.stake };
  }
  const { ordered } = poolDef(bet.pool);
  const key = normalize(bet.picks, ordered);
  const hit = (reveal.payouts[bet.pool] ?? []).find(
    (p) => normalize(p.combo.split("-").map(Number), ordered) === key,
  );
  if (!hit) return { kind: "miss", payout: 0 };
  return { kind: "hit", payout: Math.floor(bet.stake * hit.odds), odds: hit.odds };
}
