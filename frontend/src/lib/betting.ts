import type { BetCombination, BetType, Race, RaceEntry, Selection } from "../types/racing";

export interface BetTypeMeta { code: BetType; label: string; requiredCount: 1 | 2 | 3; ordered: boolean; requiresRank: boolean }
export const BET_TYPES: readonly BetTypeMeta[] = [
  { code: "WIN", label: "단승", requiredCount: 1, ordered: false, requiresRank: true },
  { code: "PLACE", label: "연승", requiredCount: 1, ordered: false, requiresRank: false },
  { code: "QUINELLA", label: "복승", requiredCount: 2, ordered: false, requiresRank: false },
  { code: "EXACTA", label: "쌍승", requiredCount: 2, ordered: true, requiresRank: true },
  { code: "QUINELLA_PLACE", label: "복연승", requiredCount: 2, ordered: false, requiresRank: false },
  { code: "TRIO", label: "삼복승", requiredCount: 3, ordered: false, requiresRank: false },
  { code: "TRIFECTA", label: "삼쌍승", requiredCount: 3, ordered: true, requiresRank: true },
];
export const MAX_COMBINATIONS = 1000;
export const MIN_STAKE = 100;
export const MAX_STAKE = 100_000;
export const MAX_PURCHASE_STAKE = 100_000;

export function getBetTypeMeta(type: BetType): BetTypeMeta {
  const meta = BET_TYPES.find((item) => item.code === type);
  if (!meta) throw new Error("알 수 없는 승식입니다.");
  return meta;
}

export function normalizeSelections(selections: readonly Selection[], type: BetType): Selection[] {
  const ordered = getBetTypeMeta(type).ordered;
  const unique = [...new Map(selections.map((item) => [item.horseNo, item])).values()];
  const sorted = ordered ? unique.sort((a, b) => (a.position ?? selections.indexOf(a) + 1) - (b.position ?? selections.indexOf(b) + 1)) : unique.sort((a, b) => a.horseNo - b.horseNo);
  return sorted.map((item, index) => ordered ? { horseNo: item.horseNo, position: index + 1 } : { horseNo: item.horseNo });
}

export function selectionKey(selections: readonly Selection[], type: BetType): string {
  return normalizeSelections(selections, type).map((item) => item.horseNo).join("-");
}

function combinations(items: readonly number[], count: number): number[][] {
  if (count === 0) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), count - 1).map((tail) => [item, ...tail]));
}
function permutations(items: readonly number[], count: number): number[][] {
  if (count === 0) return [[]];
  return items.flatMap((item, index) => permutations(items.filter((_, i) => i !== index), count - 1).map((tail) => [item, ...tail]));
}
function cartesian(groups: readonly number[][]): number[][] {
  return groups.reduce<number[][]>((result, group) => result.flatMap((prefix) => group.map((value) => [...prefix, value])), [[]]);
}

export interface GroupDraft { groups: number[][]; pattern?: "1+2" | "2+1" }

/** Group rows follow paper ticket layout. Scratched and unknown horses are excluded. */
export function buildGroupCombinations(type: BetType, draft: GroupDraft, entries: readonly RaceEntry[]): Selection[][] {
  const meta = getBetTypeMeta(type);
  if (draft.groups.length < 1 || draft.groups.length > meta.requiredCount) return [];
  const eligible = new Set(entries.filter((entry) => !entry.scratched).map((entry) => entry.horseNo));
  const groups = draft.groups.map((group) => [...new Set(group.filter((horseNo) => eligible.has(horseNo)))].sort((a, b) => a - b));
  const nonEmpty = groups.filter((group) => group.length);
  if (!nonEmpty.length) return [];
  let candidates: number[][];
  if (nonEmpty.length === 1) {
    candidates = meta.ordered ? permutations(nonEmpty[0], meta.requiredCount) : combinations(nonEmpty[0], meta.requiredCount);
  } else if (meta.requiredCount === 3 && groups.length === 2 && nonEmpty.length === 2) {
    const leftCount = draft.pattern === "2+1" ? 2 : 1;
    const make = meta.ordered ? permutations : combinations;
    candidates = make(groups[0], leftCount).flatMap((left) => make(groups[1], 3 - leftCount).map((right) => [...left, ...right]));
  } else if (meta.requiredCount === 3 && groups.length >= 3 && !groups[2].length && groups[0].length && groups[1].length) {
    // The paper slip always has three rows. When the third row is empty,
    // interpret the first two rows using the existing two-row distribution
    // rules. A single first-row horse is the 1-head trifecta combination;
    // otherwise the first row supplies two fixed horses.
    const leftCount = groups[0].length === 1 ? 1 : 2;
    const make = meta.ordered ? permutations : combinations;
    candidates = make(groups[0], leftCount).flatMap((left) => make(groups[1], 3 - leftCount).map((right) => [...left, ...right]));
  } else if (groups.length === meta.requiredCount && nonEmpty.length === meta.requiredCount) {
    candidates = cartesian(groups);
  } else {
    return [];
  }
  if (candidates.length > MAX_COMBINATIONS * 10) throw new Error("조합 수가 너무 많습니다.");
  const result = new Map<string, Selection[]>();
  for (const numbers of candidates) {
    if (new Set(numbers).size !== meta.requiredCount) continue;
    const selections = normalizeSelections(numbers.map((horseNo, index) => ({ horseNo, position: index + 1 })), type);
    result.set(selectionKey(selections, type), selections);
    if (result.size > MAX_COMBINATIONS) throw new Error(`조합은 ${MAX_COMBINATIONS}개까지 만들 수 있습니다.`);
  }
  return [...result.values()];
}

export function buildIndividualCombination(type: BetType, selections: readonly Selection[], entries: readonly RaceEntry[]): Selection[] | null {
  const meta = getBetTypeMeta(type);
  const eligible = new Set(entries.filter((entry) => !entry.scratched).map((entry) => entry.horseNo));
  if (selections.length !== meta.requiredCount || new Set(selections.map((item) => item.horseNo)).size !== meta.requiredCount || selections.some((item) => !eligible.has(item.horseNo))) return null;
  return normalizeSelections(selections, type);
}

export function dedupeCombinations(combinations: readonly BetCombination[]): BetCombination[] {
  const seen = new Set<string>();
  return combinations.filter((combination) => {
    const key = `${combination.betType}:${selectionKey(combination.selections, combination.betType)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function calculateTotalStake(combinations: readonly BetCombination[]): number {
  return combinations.reduce((sum, combination) => sum + combination.unitStake, 0);
}

export function validatePurchase(race: Race, entries: readonly RaceEntry[], combinations: readonly BetCombination[], balance: number): string | null {
  if (race.status !== "OPEN") return "현재 구매할 수 없는 경주입니다.";
  if (!combinations.length) return "조합을 하나 이상 선택해 주세요.";
  if (combinations.length > MAX_COMBINATIONS) return `조합은 ${MAX_COMBINATIONS}개까지 만들 수 있습니다.`;
  if (dedupeCombinations(combinations).length !== combinations.length) return "중복된 조합이 있습니다.";
  if (combinations.some((item) => !buildIndividualCombination(item.betType, item.selections, entries.filter((entry) => entry.raceId === race.id)))) return "출전마와 선택 순서를 확인해 주세요.";
  if (combinations.some((item) => !Number.isSafeInteger(item.unitStake) || item.unitStake < MIN_STAKE || item.unitStake > MAX_STAKE || item.unitStake % MIN_STAKE !== 0)) return "조합별 금액은 100P 단위로 100P 이상 100,000P 이하로 입력해 주세요.";
  const total = calculateTotalStake(combinations);
  if (total > MAX_PURCHASE_STAKE) return "경주당 구매 한도는 100,000P입니다.";
  if (!Number.isSafeInteger(balance) || balance < total) return "보유 포인트가 부족합니다.";
  return null;
}
