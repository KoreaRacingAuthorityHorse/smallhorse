import type { BetCombination, BetPurchase, Race, RaceEntry, PurchaseMode } from "../types/racing";
import type { BetSlipItem, PurchaseLine } from "../types/racing";
import { BET_TYPES, calculateTotalStake, getBetTypeMeta, selectionKey, validatePurchase } from "./betting";
import { DEFAULT_BALANCE, WALLET_EVENT, WALLET_KEY, readWallet, writeWallet, resetWallet, setWalletTask, type WalletRecord, type WalletState, type WalletStorage } from "./demo-wallet";

export const DEMO_STORAGE_KEY = WALLET_KEY;
export const DEMO_UPDATED_EVENT = WALLET_EVENT;
export const INITIAL_BALANCE = DEFAULT_BALANCE;

export interface DemoRecord extends WalletRecord { purchase?: BetPurchase }

export interface DemoState extends WalletState { records: DemoRecord[] }

export type DemoStorage = WalletStorage;

export function readDemoState(storage: DemoStorage = localStorage): DemoState { return readWallet(storage) as DemoState; }

export function writeDemoState(state: DemoState, storage: DemoStorage = localStorage): void {
  writeWallet(state, storage);
}

export function setDemoTask(index: number, done: boolean, storage: DemoStorage = localStorage): DemoState {
  return setWalletTask(index, done, storage) as DemoState;
}

export function resetDemoState(storage: DemoStorage = localStorage): void {
  resetWallet(storage);
}

export type PurchaseResult = { purchase: BetPurchase; balance: number } | { error: string };
export const PURCHASE_KEY_PREFIX = "trackon-purchase-v1:";
export interface PurchaseSnapshot { purchase: BetPurchase; debited: true; settled: boolean; resultId?: string }
export interface StoredPurchaseSnapshot extends PurchaseSnapshot { settlement?: import("./past-race/settle-purchase").PurchaseSettlement }
export interface PurchaseLedgerEntry { debited: true; settled: boolean; resultId?: string; lineIds?: string[] }
function ledger(state: DemoState): Record<string, PurchaseLedgerEntry> {
  return state.purchaseLedger && typeof state.purchaseLedger === "object" && !Array.isArray(state.purchaseLedger)
    ? state.purchaseLedger as Record<string, PurchaseLedgerEntry> : {};
}
export function creditPurchase(id: string, resultId: string, returnAmount: number, storage: DemoStorage = localStorage): { balance: number; credited: boolean } {
  if (!Number.isSafeInteger(returnAmount) || returnAmount < 0 || !resultId) throw new Error("정산 금액 또는 결과 ID가 올바르지 않습니다.");
  const current = readDemoState(storage);
  const entry = ledger(current)[id];
  if (!entry?.debited) throw new Error("구매 원장 기록이 없습니다.");
  if (entry.settled) return { balance: current.balance, credited: false };
  const nextBalance = current.balance + returnAmount;
  if (!Number.isSafeInteger(nextBalance)) throw new Error("잔액 범위를 초과했습니다.");
  writeDemoState({ ...current, balance: nextBalance, purchaseLedger: { ...ledger(current), [id]: { ...entry, debited: true, settled: true, resultId } } }, storage);
  const snapshot = readPurchaseSnapshot(id, storage);
  if (snapshot) { try { storage.setItem(PURCHASE_KEY_PREFIX + id, JSON.stringify({ ...snapshot, settled: true, resultId })); } catch {} }
  return { balance: nextBalance, credited: true };
}
export function readPurchaseSnapshot(id: string, storage: DemoStorage = localStorage): PurchaseSnapshot | null {
  try { const raw = storage.getItem(PURCHASE_KEY_PREFIX + id); if (!raw) return null;
    const value = JSON.parse(raw) as PurchaseSnapshot;
    const entry = ledger(readDemoState(storage))[id];
    return entry?.debited && value?.purchase?.id === id && value.debited === true && typeof value.settled === "boolean" &&
      Array.isArray(value.purchase.combinations) && value.purchase.combinations.length > 0 &&
      Number.isSafeInteger(value.purchase.totalStake) && value.purchase.totalStake > 0 &&
      value.purchase.totalStake === calculateTotalStake(value.purchase.combinations) && validSlipSnapshot(value.purchase, entry)
      ? { ...value, settled: entry.settled, resultId: entry.resultId } : null;
  } catch { return null; }
}

export function savePurchaseSettlement(id: string, settlement: import("./past-race/settle-purchase").PurchaseSettlement, storage: DemoStorage = localStorage): boolean {
  if (settlement.status !== "settled" || settlement.purchaseId !== id) return false;
  try {
    const snapshot = readPurchaseSnapshot(id, storage);
    if (!snapshot || !snapshot.settled) return false;
    storage.setItem(PURCHASE_KEY_PREFIX + id, JSON.stringify({ ...snapshot, settlement } satisfies StoredPurchaseSnapshot));
    return true;
  } catch { return false; }
}

function validSlipSnapshot(purchase: BetPurchase, entry: PurchaseLedgerEntry): boolean {
  // Legacy purchases predate per-line metadata and remain readable.
  if (!purchase.raceKind) return !purchase.items && !purchase.lines;
  if (!["upcoming", "pastBlind"].includes(purchase.raceKind) || !purchase.items?.length || !purchase.lines?.length) return false;
  const expected = purchase.items.flatMap((item) => {
    if (item.raceId !== purchase.raceId || item.raceKind !== purchase.raceKind) throw new Error("구매 경주 정보 불일치");
    return item.combinations.map((line) => ({ ...line, raceId: item.raceId, raceKind: item.raceKind,
      slipItemId: item.id, mode: item.mode, groupId: item.groupId }));
  });
  return JSON.stringify(expected) === JSON.stringify(purchase.lines) &&
    JSON.stringify(purchase.lines) === JSON.stringify(purchase.combinations) &&
    JSON.stringify(expected.map((line) => line.lineId)) === JSON.stringify(entry.lineIds);
}

export function completeDemoPurchase(race: Race, entries: readonly RaceEntry[], combinations: readonly BetCombination[], mode: PurchaseMode, storage: DemoStorage | undefined = undefined, createId: () => string = () => crypto.randomUUID(), now: () => Date = () => new Date()): PurchaseResult {
  try {
    storage ??= localStorage;
    const saved = readDemoState(storage);
    const id = createId();
    // Resolve committed retries before revalidating an already spent balance or closed race.
    if (ledger(saved)[id]) {
      const existing = readPurchaseSnapshot(id, storage);
      return existing && existing.purchase.raceId === race.id
        ? { purchase: existing.purchase, balance: saved.balance } : { error: "구매 기록이 손상되어 복원할 수 없습니다." };
    }
    const error = validatePurchase(race, entries, combinations, saved.balance);
    if (error) return { error };
    const totalStake = calculateTotalStake(combinations);
    const confirmedAt = now().toISOString();
    const purchase: BetPurchase = {
      id, raceId: race.id, mode,
      combinations: combinations.map((item) => ({ ...item, selections: item.selections.map((selection) => ({ ...selection })) })),
      totalStake, confirmedAt,
    };
    return persistPurchase(race, saved, purchase, storage);
  } catch {
    return { error: "브라우저에 구매 기록을 저장하지 못했습니다. 저장 공간을 확인해 주세요." };
  }
}

function persistPurchase(race: Pick<Race, "trackCode" | "raceNo" | "id">, saved: DemoState, purchase: BetPurchase, storage: DemoStorage): PurchaseResult {
    if (storage.getItem(PURCHASE_KEY_PREFIX + purchase.id) !== null) return { error: "구매 기록이 손상되어 복원할 수 없습니다." };
    const { combinations, totalStake, confirmedAt } = purchase;
    const track = { SEOUL: "서울", BUSAN: "부경", JEJU: "제주" }[race.trackCode];
    const kinds = [...new Set(combinations.map((item) => getBetTypeMeta(item.betType).label))].join(", ");
    const next: DemoState = {
      ...saved,
      balance: saved.balance - totalStake,
      records: [{
        id: purchase.id,
        raceId: race.id,
        day: confirmedAt.slice(5, 10).replace("-", "."),
        name: `${track} ${String(race.raceNo).padStart(2, "0")}R`,
        kind: kinds,
        pick: combinations.map((item) => item.selections.map((selection) => selection.horseNo).join("-")).join(", "),
        result: "예측",
        amount: -totalStake,
        purchase,
      }, ...saved.records].slice(0, 20),
      tasks: saved.tasks.map((done, index) => index === 2 ? true : done),
      purchaseLedger: { ...ledger(saved), [purchase.id]: { debited: true, settled: false, ...(purchase.lines ? { lineIds: purchase.lines.map((line) => line.lineId) } : {}) } },
    };
    // Stage the snapshot first; readers require a committed wallet ledger entry.
    // localStorage read-modify-write is not atomic across tabs; this is a demo guard only.
    storage.setItem(PURCHASE_KEY_PREFIX + purchase.id, JSON.stringify({ purchase, debited: true, settled: false } satisfies PurchaseSnapshot));
    try { writeDemoState(next, storage); }
    catch (error) { storage.removeItem(PURCHASE_KEY_PREFIX + purchase.id); throw error; }
    return { purchase, balance: next.balance };
}

export type PurchaseRace = Pick<Race, "id" | "status" | "trackCode" | "raceNo"> & { raceKind: BetSlipItem["raceKind"] };

export function validateSlipPurchase(race: PurchaseRace, entries: readonly RaceEntry[], items: readonly BetSlipItem[], balance: number): string | null {
  if (!items.length) return "슬립에 항목을 하나 이상 추가해 주세요.";
  const itemIds = new Set<string>();
  const lineIds = new Set<string>();
  const approvals = new Set<string>();
  for (const item of items) {
    if (item.raceId !== race.id || item.raceKind !== race.raceKind) return "현재 경주의 슬립만 구매할 수 있습니다.";
    if (!item.id || itemIds.has(item.id) || !["individual", "combination"].includes(item.mode) ||
      (item.mode === "individual" ? item.groupId !== null || item.combinations.length !== 1 : !item.groupId)) return "슬립 항목 정보를 확인해 주세요. 삭제 후 다시 작성해 주세요.";
    itemIds.add(item.id);
    const groupKeys = new Set<string>();
    for (const line of item.combinations) {
      if ("raceId" in line && line.raceId !== race.id) return "현재 경주의 라인만 구매할 수 있습니다.";
      if (typeof line.lineId !== "string" || !line.lineId || lineIds.has(line.lineId) || line.betType !== item.betType ||
        !BET_TYPES.some(({ code }) => code === line.betType)) return "슬립 라인 정보를 확인해 주세요. 삭제 후 다시 작성해 주세요.";
      lineIds.add(line.lineId);
      const key = `${line.betType}:${selectionKey(line.selections, line.betType)}`;
      if (groupKeys.has(key)) return "그룹 내부에 중복된 조합이 있습니다.";
      groupKeys.add(key);
      if (item.duplicateApproval && Array.isArray(item.duplicateApproval.duplicateLineIds) && Number.isFinite(Date.parse(item.duplicateApproval.approvedAt)) &&
        item.duplicateApproval.duplicateLineIds.includes(line.lineId)) approvals.add(line.lineId);
    }
    if (!item.combinations.length) return "조합을 하나 이상 선택해 주세요.";
  }
  return validatePurchase(race, entries, items.flatMap((item) => item.combinations), balance, approvals);
}

export function completeSlipPurchase(race: PurchaseRace, entries: readonly RaceEntry[], items: readonly BetSlipItem[], purchaseId: string, storage: DemoStorage | undefined = undefined, now: () => Date = () => new Date()): PurchaseResult {
  try {
    storage ??= localStorage;
    if (!purchaseId) return { error: "구매 ID가 필요합니다." };
    const saved = readDemoState(storage);
    if (items.some((item) => item.raceId !== race.id || item.raceKind !== race.raceKind)) return { error: "현재 경주의 슬립만 구매할 수 있습니다." };
    const ids = items.flatMap((item) => item.combinations.map((line) => line.lineId));
    const priorId = Object.keys(ledger(saved)).find((id) => id === purchaseId || ledger(saved)[id].lineIds?.some((lineId) => ids.includes(lineId)));
    if (priorId) {
      const existing = readPurchaseSnapshot(priorId, storage);
      if (!existing) return { error: "구매 기록이 삭제되었거나 손상되어 복원할 수 없습니다." };
      if (existing.purchase.raceId !== race.id || existing.purchase.raceKind !== race.raceKind ||
        JSON.stringify(existing.purchase.items) !== JSON.stringify(items)) return { error: "이미 구매한 라인이 포함되어 있습니다. 슬립을 확인해 주세요." };
      return { purchase: existing.purchase, balance: saved.balance };
    }
    const error = validateSlipPurchase(race, entries, items, saved.balance);
    if (error) return { error };
    const snapshotItems: BetSlipItem[] = structuredClone([...items]);
    const lines: PurchaseLine[] = snapshotItems.flatMap((item) => item.combinations.map((line) => ({ ...line,
      raceId: item.raceId, raceKind: item.raceKind, slipItemId: item.id, mode: item.mode, groupId: item.groupId })));
    const modes = new Set(items.map((item) => item.mode));
    return persistPurchase(race, saved, { id: purchaseId, raceId: race.id, raceKind: race.raceKind,
      mode: modes.size > 1 ? "mixed" : items[0].mode, items: snapshotItems, lines, combinations: lines,
      totalStake: calculateTotalStake(lines), confirmedAt: now().toISOString(), resultStatus: "pending" }, storage);
  } catch {
    return { error: "브라우저에 구매 기록을 저장하지 못했습니다. 저장 공간을 확인해 주세요." };
  }
}
