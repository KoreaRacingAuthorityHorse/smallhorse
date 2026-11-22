import type { BetCombination, BetType, Race, RaceEntry, Selection } from "../types/racing";

export interface BetTypeMeta {
  code: BetType;
  label: string;
  requiredCount: 1 | 2 | 3;
  ordered: boolean;
  requiresRank: boolean;
  description?: string;
  help?: string;
}

export const BET_TYPES: readonly BetTypeMeta[] = [
  { code: "WIN", label: "단승", requiredCount: 1, ordered: false, requiresRank: true, description: "WIN · First place", help: "선택한 말이 1등으로 들어오면 적중합니다." },
  { code: "PLACE", label: "연승", requiredCount: 1, ordered: false, requiresRank: false, description: "PLACE · Top place", help: "선택한 말이 상위 순위 안에 들어오면 적중합니다." },
  { code: "QUINELLA", label: "복승", requiredCount: 2, ordered: false, requiresRank: false, description: "QUINELLA · Two horses", help: "두 말을 선택하며, 두 말의 순서는 상관없이 적중합니다." },
  { code: "EXACTA", label: "쌍승", requiredCount: 2, ordered: true, requiresRank: true, description: "EXACTA · Ordered two", help: "두 말을 선택하고 1등과 2등 순서까지 맞혀야 합니다." },
  { code: "QUINELLA_PLACE", label: "복연승", requiredCount: 2, ordered: false, requiresRank: false, description: "QUINELLA PLACE · Two placed", help: "두 말이 모두 상위 순위 안에 들어오면 적중합니다." },
  { code: "TRIO", label: "삼복승", requiredCount: 3, ordered: false, requiresRank: false, description: "TRIO · Three horses", help: "세 말을 선택하며, 세 말의 순서는 상관없이 적중합니다." },
  { code: "TRIFECTA", label: "삼쌍승", requiredCount: 3, ordered: true, requiresRank: true, description: "TRIFECTA · Ordered three", help: "세 말을 선택하고 1등부터 3등까지 순서를 맞혀야 합니다." },
];

export const MAX_COMBINATIONS = 1000;
export const MAX_PURCHASE_COMBINATIONS = 100;
export const MIN_STAKE = 100;
export const MAX_STAKE = 100_000;
export const MAX_PURCHASE_STAKE = 100_000;

export type TwoGroupPattern = "1+2" | "2+1";
export type GroupCount = 1 | 2 | 3;

export function defaultGroupCount(type: BetType): GroupCount {
  if (["WIN", "PLACE"].includes(type)) return 1;
  if (["QUINELLA", "EXACTA", "QUINELLA_PLACE"].includes(type)) return 2;
  return 3;
}

export function getBetTypeMeta(type: BetType): BetTypeMeta {
  const meta = BET_TYPES.find((item) => item.code === type);
  if (!meta) throw new Error("알 수 없는 승식입니다.");
  return meta;
}

export function normalizeSelections(selections: readonly Selection[], type: BetType): Selection[] {
  const meta = getBetTypeMeta(type);
  const ordered = meta.ordered;
  const unique = selections.filter((item, index, list) => list.findIndex((candidate) => candidate.horseNo === item.horseNo) === index);
  const sorted = ordered
    ? [...unique].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : [...unique].sort((a, b) => a.horseNo - b.horseNo);
  return sorted.map((item, index) => (ordered ? { horseNo: item.horseNo, position: index + 1 } : { horseNo: item.horseNo }));
}

export function selectionKey(selections: readonly Selection[], type: BetType): string {
  return normalizeSelections(selections, type).map((item) => item.horseNo).join("-");
}

export function combinations<T>(items: readonly T[], count: number): T[][] {
  if (count === 0) return [[]];
  if (items.length < count) return [];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), count - 1).map((tail) => [item, ...tail]));
}

export function permutations<T>(items: readonly T[], count: number): T[][] {
  if (count === 0) return [[]];
  return items.flatMap((item, index) => permutations(items.filter((_, i) => i !== index), count - 1).map((tail) => [item, ...tail]));
}

function cartesian(groups: readonly number[][]): number[][] {
  return groups.reduce<number[][]>((result, group) => result.flatMap((prefix) => group.map((value) => [...prefix, value])), [[]]);
}

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values)].filter(Number.isFinite);
}

/** Generates all combinations from selections for the given bet type. */
export function buildCombinations(selections: readonly Selection[], type: BetType): Selection[][] {
  const meta = getBetTypeMeta(type);
  if (meta.ordered) {
    return selections.length === meta.requiredCount ? [normalizeSelections(selections, type)] : [];
  }
  return combinations(selections, meta.requiredCount).map((items) => normalizeSelections(items, type));
}

export interface GroupDraft {
  groups: number[][];
  pattern?: TwoGroupPattern;
}

export type GroupCombinationDraft = GroupDraft;

/** Generates the valid combinations represented by the paper-ticket group layout. */
export function buildGroupCombinations(type: BetType, draft: GroupDraft, entries?: readonly RaceEntry[]): Selection[][] {
  const meta = getBetTypeMeta(type);
  const eligible = entries ? new Set(entries.filter((entry) => !entry.scratched).map((entry) => entry.horseNo)) : null;

  // Filter out scratched horses and duplicates within each group, sorting numbers ascending
  const rawGroups = draft.groups.map((group) => {
    const filtered = eligible ? group.filter((horseNo) => eligible.has(horseNo)) : group;
    return uniqueNumbers(filtered).sort((a, b) => a - b);
  });

  // Bound groups by required count and handle trailing empty groups
  const relevantGroups = rawGroups.slice(0, meta.requiredCount);
  const nonEmptyGroups = relevantGroups.filter((group) => group.length > 0);
  if (nonEmptyGroups.length === 0) return [];

  let candidates: number[][];

  if (!meta.ordered && meta.requiredCount === 3 && nonEmptyGroups.length === 2) {
    // TRIO (unordered, 3 horses) with 2 groups:
    // Anchor in group 1, remaining in group 2.
    // If pattern is specified, respect it; otherwise 1st group supplies 1 if it has 1 horse, else 2.
    const firstCount = draft.pattern === "2+1" ? 2 : draft.pattern === "1+2" ? 1 : nonEmptyGroups[0].length === 1 ? 1 : 2;
    const secondCount = 3 - firstCount;
    candidates = combinations(nonEmptyGroups[0], firstCount).flatMap((left) =>
      combinations(nonEmptyGroups[1], secondCount).map((right) => [...left, ...right])
    );
  } else if (!meta.ordered && relevantGroups.length === meta.requiredCount && nonEmptyGroups.length === meta.requiredCount) {
    // When every required group is populated for unordered bets (e.g. QUINELLA [1]x[2,3], TRIO [1]x[2]x[3])
    candidates = cartesian(relevantGroups);
  } else if (!meta.ordered) {
    // Unordered bets with a single populated group (box betting) or general unordered combinations
    candidates = combinations(uniqueNumbers(nonEmptyGroups.flat()), meta.requiredCount);
  } else if (nonEmptyGroups.length === 1) {
    // Ordered bets with candidate pool in one group (box betting: e.g. EXACTA [1,2,3] => 6 permutations)
    candidates = permutations(nonEmptyGroups[0], meta.requiredCount);
  } else if (meta.requiredCount === 2 && relevantGroups.length === 2 && nonEmptyGroups.length === 2) {
    // EXACTA with 2 groups (1st place x 2nd place)
    candidates = cartesian(relevantGroups);
  } else if (meta.requiredCount === 3 && nonEmptyGroups.length === 2) {
    // TRIFECTA with 2 groups (anchor in group 1 + remaining in group 2)
    const firstCount = draft.pattern === "2+1" ? 2 : draft.pattern === "1+2" ? 1 : nonEmptyGroups[0].length === 1 ? 1 : 2;
    const secondCount = 3 - firstCount;
    const left = permutations(nonEmptyGroups[0], firstCount);
    const right = permutations(nonEmptyGroups[1], secondCount);
    candidates = left.flatMap((a) => right.map((b) => [...a, ...b]));
  } else if (meta.requiredCount === 3 && relevantGroups.length === 3 && nonEmptyGroups.length === 3) {
    // TRIFECTA with 3 groups (1st place x 2nd place x 3rd place)
    candidates = cartesian(relevantGroups);
  } else {
    return [];
  }

  if (candidates.length > MAX_COMBINATIONS * 10) throw new Error("조합 수가 너무 많습니다.");

  const seen = new Set<string>();
  const result: Selection[][] = [];

  for (const numbers of candidates) {
    // A single combination cannot contain duplicate horses
    if (new Set(numbers).size !== meta.requiredCount) continue;

    const selections = normalizeSelections(
      numbers.map((horseNo, index) => ({ horseNo, position: meta.ordered ? index + 1 : undefined })),
      type
    );
    const key = selectionKey(selections, type);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(selections);

    if (result.length > MAX_COMBINATIONS) throw new Error(`조합은 ${MAX_COMBINATIONS}개까지 만들 수 있습니다.`);
  }

  return result;
}

export function buildIndividualCombination(type: BetType, selections: readonly Selection[], entries: readonly RaceEntry[]): Selection[] | null {
  const meta = getBetTypeMeta(type);
  const eligible = new Set(entries.filter((entry) => !entry.scratched).map((entry) => entry.horseNo));
  if (selections.length !== meta.requiredCount || new Set(selections.map((item) => item.horseNo)).size !== meta.requiredCount || selections.some((item) => !eligible.has(item.horseNo))) {
    return null;
  }
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

export function calculateTotalStake(combinations: readonly BetCombination[]): number;
export function calculateTotalStake(combinationCount: number, unitStake: number): number;
export function calculateTotalStake(first: readonly BetCombination[] | number, second?: number): number {
  if (typeof first === "number") {
    return first * (second ?? 0);
  }
  return first.reduce((sum, combination) => sum + combination.unitStake, 0);
}

export function calculateCombinationTotal(combinations: readonly { unitStake?: number }[], fallbackStake: number): number {
  return combinations.reduce((total, combination) => total + (combination.unitStake ?? fallbackStake), 0);
}

export function validateCombinationStakes(stakes: readonly number[], points: number): string | null {
  if (stakes.some((stake) => !Number.isSafeInteger(stake) || stake < MIN_STAKE || stake > MAX_STAKE || stake % MIN_STAKE !== 0)) {
    return "조합별 금액은 100P 이상 100,000P 이하로 입력해 주세요.";
  }
  const total = stakes.reduce((sum, stake) => sum + stake, 0);
  if (total > MAX_PURCHASE_STAKE) return "경주당 구매 한도는 100,000P입니다.";
  if (total > points) return "보유 포인트가 부족합니다.";
  return null;
}

export function validateStake(unitStake: number, combinationCount: number, points: number): string | null {
  if (!Number.isSafeInteger(unitStake) || unitStake < MIN_STAKE || unitStake > MAX_STAKE || unitStake % MIN_STAKE !== 0) {
    return "기준 금액은 100P 이상 100,000P 이하로 입력해 주세요.";
  }
  if (combinationCount < 1) return "조합을 하나 이상 선택해 주세요.";
  const total = calculateTotalStake(combinationCount, unitStake);
  if (total > MAX_PURCHASE_STAKE) return "경주당 구매 한도는 100,000P입니다.";
  if (total > points) return "보유 포인트가 부족합니다.";
  return null;
}

export function validatePurchase(race: Pick<Race, "id" | "status">, entries: readonly RaceEntry[], combinations: readonly BetCombination[], balance: number, approvedDuplicateLineIds: ReadonlySet<string> = new Set()): string | null {
  if (race.status !== "OPEN") return "현재 구매할 수 없는 경주입니다.";
  if (!combinations.length) return "조합을 하나 이상 선택해 주세요.";
  if (combinations.length > MAX_COMBINATIONS) return `조합은 ${MAX_COMBINATIONS}개까지 만들 수 있습니다.`;
  const seen = new Set<string>();
  for (const item of combinations) {
    if (!BET_TYPES.some(({ code }) => code === item.betType)) return "승식을 확인해 주세요.";
    const key = `${item.betType}:${selectionKey(item.selections, item.betType)}`;
    const lineId = "lineId" in item && typeof item.lineId === "string" ? item.lineId : "";
    if (seen.has(key) && (!lineId || !approvedDuplicateLineIds.has(lineId))) return "중복된 조합이 있습니다. 중복 추가 승인을 확인해 주세요.";
    seen.add(key);
  }
  if (combinations.some((item) => !buildIndividualCombination(item.betType, item.selections, entries.filter((entry) => entry.raceId === race.id)))) {
    return "출전마와 선택 순서를 확인해 주세요.";
  }
  if (combinations.some((item) => !Number.isSafeInteger(item.unitStake) || item.unitStake < MIN_STAKE || item.unitStake > MAX_STAKE || item.unitStake % MIN_STAKE !== 0)) {
    return "조합별 금액은 100P 단위로 100P 이상 100,000P 이하로 입력해 주세요.";
  }
  const total = calculateTotalStake(combinations);
  if (total > MAX_PURCHASE_STAKE) return "경주당 구매 한도는 100,000P입니다.";
  if (!Number.isSafeInteger(balance) || balance < total) return "보유 포인트가 부족합니다.";
  return null;
}
