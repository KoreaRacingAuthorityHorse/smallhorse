import type { BetCombination, BetPurchase, Race, RaceEntry, PurchaseMode } from "../types/racing";
import { calculateTotalStake, getBetTypeMeta, validatePurchase } from "./betting";

export const DEMO_STORAGE_KEY = "trackon-premium-demo-v1";
export const DEMO_UPDATED_EVENT = "trackon-demo-updated";
export const INITIAL_BALANCE = 12_480;

export interface DemoRecord {
  id?: string;
  raceId?: string;
  day: string;
  name: string;
  kind: string;
  pick: string;
  result: string;
  amount: number;
  purchase?: BetPurchase;
}

export interface DemoState {
  balance: number;
  records: DemoRecord[];
  tasks: boolean[];
  [key: string]: unknown;
}

export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readDemoState(storage: DemoStorage = localStorage): DemoState {
  const raw = storage.getItem(DEMO_STORAGE_KEY);
  const saved = raw ? JSON.parse(raw) as Partial<DemoState> : {};
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("저장된 데모 데이터 형식이 올바르지 않습니다.");
  return {
    ...saved,
    balance: Number.isSafeInteger(saved.balance) && saved.balance! >= 0 ? saved.balance! : INITIAL_BALANCE,
    records: Array.isArray(saved.records) ? saved.records : [],
    tasks: Array.isArray(saved.tasks) ? saved.tasks : [true, true, false, false, false],
  };
}

function notifyDemoUpdated(storage: DemoStorage) {
  if (typeof window !== "undefined" && storage === window.localStorage) window.dispatchEvent(new Event(DEMO_UPDATED_EVENT));
}

export function writeDemoState(state: DemoState, storage: DemoStorage = localStorage): void {
  storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  notifyDemoUpdated(storage);
}

export function setDemoTask(index: number, done: boolean, storage: DemoStorage = localStorage): DemoState {
  const current = readDemoState(storage);
  const next = { ...current, tasks: Array.from({ length: 5 }, (_, i) => i === index ? done : Boolean(current.tasks[i])) };
  writeDemoState(next, storage);
  return next;
}

export function resetDemoState(storage: DemoStorage = localStorage): void {
  storage.removeItem(DEMO_STORAGE_KEY);
  notifyDemoUpdated(storage);
}

export type PurchaseResult = { purchase: BetPurchase; balance: number } | { error: string };

export function completeDemoPurchase(race: Race, entries: readonly RaceEntry[], combinations: readonly BetCombination[], mode: PurchaseMode, storage: DemoStorage = localStorage, createId: () => string = () => crypto.randomUUID(), now: () => Date = () => new Date()): PurchaseResult {
  try {
    const saved = readDemoState(storage);
    const error = validatePurchase(race, entries, combinations, saved.balance);
    if (error) return { error };
    const totalStake = calculateTotalStake(combinations);
    const confirmedAt = now().toISOString();
    const purchase: BetPurchase = {
      id: createId(), raceId: race.id, mode,
      combinations: combinations.map((item) => ({ ...item, selections: item.selections.map((selection) => ({ ...selection })) })),
      totalStake, confirmedAt,
    };
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
    };
    writeDemoState(next, storage);
    return { purchase, balance: next.balance };
  } catch {
    return { error: "브라우저에 구매 기록을 저장하지 못했습니다. 저장 공간을 확인해 주세요." };
  }
}
