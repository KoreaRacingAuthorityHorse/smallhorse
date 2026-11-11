import type { BetCombination, BetSlipItem, PurchaseMode } from "../types/racing";
import { calculateTotalStake, selectionKey, validateCombinationStakes } from "./betting";

export type SlipRace = { raceKind: BetSlipItem["raceKind"]; raceId: string };
export const currentRaceSlip = (slip: BetSlipItem[], race: SlipRace) =>
  slip.filter((item) => item.raceKind === race.raceKind && item.raceId === race.raceId);

/** Snapshot picks and amounts before asking for approval; Draft edits cannot change them. */
export function createSlipItem(race: SlipRace, mode: PurchaseMode, combinations: BetCombination[]): BetSlipItem {
  if (!combinations.length || combinations.some((line) => line.betType !== combinations[0].betType)) {
    throw new Error("하나의 슬립 항목에는 같은 승식의 조합이 필요합니다.");
  }
  const id = crypto.randomUUID();
  const base = { ...race, id, betType: combinations[0].betType,
    combinations: combinations.map((line) => ({ ...line, lineId: crypto.randomUUID(), selections: line.selections.map((pick) => ({ ...pick })) })) };
  return mode === "individual" ? { ...base, mode, groupId: null } : { ...base, mode, groupId: id };
}

export function inspectSlipAddition(slip: BetSlipItem[], item: BetSlipItem, balance: number) {
  const existing = currentRaceSlip(slip, item).flatMap((entry) => entry.combinations);
  const keys = new Set(existing.map((line) => `${line.betType}:${selectionKey(line.selections, line.betType)}`));
  const duplicates = item.combinations.filter((line) => keys.has(`${line.betType}:${selectionKey(line.selections, line.betType)}`));
  const lines = [...existing, ...item.combinations];
  return { duplicates, duplicateStake: calculateTotalStake(duplicates), addedStake: calculateTotalStake(item.combinations),
    totalStake: calculateTotalStake(lines), error: validateCombinationStakes(lines.map((line) => line.unitStake), balance) };
}

/** Cancellation leaves the slip untouched. Approved overlaps remain separate purchase lines. */
export function appendSlipItem(slip: BetSlipItem[], item: BetSlipItem, balance: number, approveDuplicates = false): BetSlipItem[] {
  const inspection = inspectSlipAddition(slip, item, balance);
  if (inspection.error) throw new Error(inspection.error);
  if (inspection.duplicates.length && !approveDuplicates) return slip;
  return [...slip, inspection.duplicates.length ? { ...item, duplicateApproval: {
    approvedAt: new Date().toISOString(), duplicateLineIds: inspection.duplicates.map((line) => line.lineId),
  } } : item];
}
