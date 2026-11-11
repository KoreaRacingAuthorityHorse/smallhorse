import { poolDef } from "./pools";
import type { Bet, BetOutcome, RaceReveal } from "./types";
import type { ResultAvailability } from "./types";

/** 출전취소·경주제외·출발제외된 말이 들어간 베팅은 환불한다. */
export const REFUND_STATUSES = ["출전취소", "경주제외", "출발제외"];

export function checkResultAvailability(reveal: RaceReveal, pools: readonly Bet["pool"][]): ResultAvailability {
  const reasons: string[] = [];
  const entries = new Map(reveal.entries.map((entry) => [entry.no, entry]));
  if (entries.size !== reveal.entries.length) reasons.push("duplicate entry numbers");
  const placed = reveal.entries.filter((entry) => entry.pos !== null);
  const starterCount = reveal.entries.filter((entry) => !REFUND_STATUSES.includes(entry.status)).length;
  const positions = new Set(placed.map((entry) => entry.pos));
  if (positions.size !== placed.length) reasons.push("tied finishing positions are unsupported");
  if (![1, 2, 3].every((position) => positions.has(position))) reasons.push("confirmed first three positions are incomplete");
  for (const pool of new Set(pools)) {
    const payouts = reveal.payouts[pool];
    if (!payouts?.length) { reasons.push(`${pool}: missing payouts`); continue; }
    for (const payout of payouts) {
      const picks = payout.combo.split("-").map(Number);
      if (picks.length !== poolDef(pool).picks || picks.some((n) => !Number.isInteger(n) || !entries.has(n)) || new Set(picks).size !== picks.length || !Number.isFinite(payout.odds) || payout.odds <= 0) reasons.push(`${pool}: invalid combo ${payout.combo}`);
    }
    const winners = placed.filter((entry) => pool === "연승"
      ? entry.pos! <= (starterCount <= 7 ? 2 : 3)
      : pool === "복연승" ? entry.pos! <= 3 : entry.pos! <= poolDef(pool).picks)
      .map((entry) => entry.no);
    const ordered = poolDef(pool).ordered;
    const normalize = (numbers: number[]) => (ordered ? numbers : [...numbers].sort((a, b) => a - b)).join("-");
    let winningCombos: string[];
    if (pool === "단승" || pool === "연승") winningCombos = winners.map(String);
    else if (pool === "복연승") winningCombos = winners.flatMap((a, i) => winners.slice(i + 1).map((b) => normalize([a, b])));
    else winningCombos = [normalize(placed.filter((entry) => entry.pos! <= poolDef(pool).picks).sort((a, b) => a.pos! - b.pos!).map((entry) => entry.no))];
    const resultCombos = payouts.map((payout) => normalize(payout.combo.split("-").map(Number)));
    if (resultCombos.length !== new Set(resultCombos).size || winningCombos.length !== resultCombos.length || winningCombos.some((combo) => !resultCombos.includes(combo))) {
      reasons.push(`${pool}: payout combos do not match confirmed positions`);
    }
  }
  if (reasons.length) return { status: "unavailable", reasons };
  return { status: "available", reveal };
}

const normalize = (nums: number[], ordered: boolean) =>
  (ordered ? nums : [...nums].sort((a, b) => a - b)).join("-");

/**
 * 확정 배당표의 적중 조합과 비교해 베팅 1건을 정산한다.
 * 연승 2착/3착 기준, 복연승 적중 조합 수 같은 규칙은 배당표에 이미 반영되어 있어 따로 계산하지 않는다.
 * 동착 경주는 배당표에 조합이 하나만 나와 정산할 수 없으므로 데이터 단계에서 제외한다.
 */
export function settleBet(bet: Bet, reveal: RaceReveal): BetOutcome {
  const result = classifyOutcome(bet, reveal);
  if (result.kind === "refund") return { kind: "refund", payout: bet.stake };
  if (result.kind === "miss") return { kind: "miss", payout: 0 };
  return { kind: "hit", payout: Math.floor(bet.stake * result.odds), odds: result.odds };
}

/** Outcome classification for the new fixed-return path; validate result availability first. */
export function classifyOutcome(bet: Bet, reveal: RaceReveal): { kind: "hit"; odds: number } | { kind: "miss" } | { kind: "refund" } {
  const statusOf = (no: number) => reveal.entries.find((e) => e.no === no)?.status;
  if (bet.picks.some((no) => REFUND_STATUSES.includes(statusOf(no) ?? ""))) {
    return { kind: "refund" };
  }
  const { ordered } = poolDef(bet.pool);
  const key = normalize(bet.picks, ordered);
  const hit = (reveal.payouts[bet.pool] ?? []).find(
    (p) => normalize(p.combo.split("-").map(Number), ordered) === key,
  );
  if (!hit) return { kind: "miss" };
  return { kind: "hit", odds: hit.odds };
}
