import type { BetPurchase, PurchaseLine } from "@/types/racing";
import { calculateReward, type RaceKind, type RewardResult } from "@/lib/reward-policy";
import { BET_TYPE_TO_POOL_KEY } from "@/lib/race-adapters";
import { creditPurchase, type DemoStorage } from "@/lib/demoPurchase";
import { checkResultAvailability, classifyOutcome } from "./settle";
import type { Bet, RaceReveal, ResultAvailability } from "./types";

export type PurchaseSettlement =
  | { status: "pending" | "unavailable"; reasons: string[]; purchaseId: string }
  | { status: "settled"; purchaseId: string; raceKind: RaceKind; lines: SettledPurchaseLine[]; groups: SettledPurchaseGroup[]; totalStake: number; totalReturn: number; netChange: number };

export interface SettledPurchaseLine { lineId: string; slipItemId: string; groupId: string | null; mode: "individual" | "combination"; bet: Bet; reward: RewardResult }
export interface SettledPurchaseGroup { groupId: string | null; lineIds: string[]; totalStake: number; totalReturn: number; netChange: number }

function linesOf(purchase: BetPurchase): PurchaseLine[] {
  if (purchase.lines?.length) return purchase.lines;
  return purchase.combinations.map((line, index) => ({ ...line, lineId: `legacy-${index}`, raceId: purchase.raceId, raceKind: purchase.raceKind ?? "upcoming", slipItemId: purchase.id, mode: purchase.mode === "mixed" ? "individual" : purchase.mode, groupId: null }));
}

export function settlePurchase(purchase: BetPurchase, reveal: RaceReveal | null): PurchaseSettlement {
  const raceKind = purchase.raceKind;
  if (!raceKind) return { status: "unavailable", purchaseId: purchase.id, reasons: ["구매 경주 유형이 없습니다."] };
  if (!reveal) return { status: "pending", purchaseId: purchase.id, reasons: ["결과가 아직 확정되지 않았습니다."] };
  const lines = linesOf(purchase);
  if (!lines.length || lines.some((line) => line.raceId !== purchase.raceId || line.raceKind !== raceKind ||
    !line.lineId || !line.slipItemId || !Number.isSafeInteger(line.unitStake) || line.unitStake <= 0 || line.unitStake % 100 !== 0)) {
    return { status: "unavailable", purchaseId: purchase.id, reasons: ["구매 라인 정보가 올바르지 않습니다."] };
  }
  if (lines.reduce((sum, line) => sum + line.unitStake, 0) !== purchase.totalStake) {
    return { status: "unavailable", purchaseId: purchase.id, reasons: ["구매 금액과 라인 금액이 일치하지 않습니다."] };
  }
  const pools = lines.map((line) => BET_TYPE_TO_POOL_KEY[line.betType]);
  const availability: ResultAvailability = checkResultAvailability(reveal, pools);
  if (availability.status !== "available") return { status: "unavailable", purchaseId: purchase.id, reasons: availability.reasons };
  const settled = lines.map((line) => {
    const bet: Bet = { pool: BET_TYPE_TO_POOL_KEY[line.betType], picks: line.selections.map((pick) => pick.horseNo), stake: line.unitStake };
    const classified = classifyOutcome(bet, reveal);
    const outcome = classified.kind === "refund" ? "refund" : classified.kind === "hit" ? "hit" : "miss";
    return { lineId: line.lineId, slipItemId: line.slipItemId, groupId: line.groupId, mode: line.mode, bet, reward: calculateReward(raceKind, outcome, line.unitStake) };
  });
  const groups = [...new Set(settled.map((line) => line.groupId))].map((groupId) => {
    const group = settled.filter((line) => line.groupId === groupId);
    const totalStake = group.reduce((sum, line) => sum + line.reward.stake, 0);
    const totalReturn = group.reduce((sum, line) => sum + line.reward.returnAmount, 0);
    return { groupId, lineIds: group.map((line) => line.lineId), totalStake, totalReturn, netChange: totalReturn - totalStake };
  });
  const totalStake = settled.reduce((sum, line) => sum + line.reward.stake, 0);
  const totalReturn = settled.reduce((sum, line) => sum + line.reward.returnAmount, 0);
  return { status: "settled", purchaseId: purchase.id, raceKind, lines: settled, groups, totalStake, totalReturn, netChange: totalReturn - totalStake };
}

export function settleAndCreditPurchase(purchase: BetPurchase, reveal: RaceReveal | null, resultId: string, storage?: DemoStorage) {
  const settlement = settlePurchase(purchase, reveal);
  if (settlement.status !== "settled") return { settlement, credited: false as const };
  const credit = creditPurchase(purchase.id, resultId, settlement.totalReturn, storage);
  return { settlement, ...credit };
}
