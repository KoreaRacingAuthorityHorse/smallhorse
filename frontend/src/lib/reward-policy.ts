export type RaceKind = "pastBlind" | "upcoming";

/** The payout is a return including the original stake, not a profit multiplier. */
export type RewardOutcome = "hit" | "miss" | "refund";
export interface RewardResult { outcome: RewardOutcome; stake: number; returnAmount: number; netChange: number }

export function calculateReward(kind: RaceKind, outcome: RewardOutcome, stake: number): RewardResult {
  if (!Number.isSafeInteger(stake) || stake < 0 || stake % 100 !== 0) throw new Error("베팅 금액은 100P 단위의 음이 아닌 정수여야 합니다.");
  const returnAmount = outcome === "refund" ? stake : outcome === "miss" ? 0 : stake * (kind === "pastBlind" ? 1.5 : 2);
  if (!Number.isSafeInteger(returnAmount)) throw new Error("반환액 범위를 초과했습니다.");
  return { outcome, stake, returnAmount, netChange: returnAmount - stake };
}
