"use client";
import { useSyncExternalStore } from "react";

export const WALLET_KEY = "trackon-premium-demo-v1";
export const WALLET_EVENT = "trackon-demo-updated";
export const DEFAULT_BALANCE = 12480;
const defaultTasks = [true, true, false, false, false];
export interface WalletRecord { id?: string; raceId?: string; day: string; name: string; kind: string; pick: string; result: string; amount: number; purchase?: unknown }
export interface WalletState { balance: number; records: WalletRecord[]; tasks: boolean[]; [key: string]: unknown }
export interface WalletStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
const empty: WalletState = { balance: DEFAULT_BALANCE, records: [], tasks: defaultTasks };
let cachedRaw: string | null | undefined;
let cachedState: WalletState = empty;

export function readWallet(storage: WalletStorage = localStorage): WalletState {
  const raw = storage.getItem(WALLET_KEY);
  const saved = raw ? JSON.parse(raw) as Partial<WalletState> : {};
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("저장된 데모 데이터 형식이 올바르지 않습니다.");
  return { ...saved,
    balance: Number.isSafeInteger(saved.balance) && saved.balance! >= 0 ? saved.balance! : DEFAULT_BALANCE,
    records: Array.isArray(saved.records) ? saved.records : [],
    tasks: Array.isArray(saved.tasks) ? saved.tasks : [...defaultTasks],
  };
}
function notify(storage: WalletStorage) { if (typeof window !== "undefined" && storage === window.localStorage) window.dispatchEvent(new Event(WALLET_EVENT)); }
export function writeWallet(state: WalletState, storage: WalletStorage = localStorage): void { storage.setItem(WALLET_KEY, JSON.stringify(state)); notify(storage); }
export function resetWallet(storage: WalletStorage = localStorage): void {
  const state = readWallet(storage);
  const ledger = state.purchaseLedger;
  if (ledger && typeof ledger === "object" && !Array.isArray(ledger)) {
    for (const id of Object.keys(ledger)) storage.removeItem(`trackon-purchase-v1:${id}`);
  }
  storage.removeItem(WALLET_KEY); notify(storage);
}
export function setWalletTask(index: number, done: boolean, storage: WalletStorage = localStorage): WalletState {
  const current = readWallet(storage);
  const next = { ...current, tasks: Array.from({ length: 5 }, (_, i) => i === index ? done : Boolean(current.tasks[i])) };
  writeWallet(next, storage); return next;
}
function snapshot(): WalletState {
  try { const raw = localStorage.getItem(WALLET_KEY); if (raw === cachedRaw) return cachedState; cachedRaw = raw; cachedState = readWallet(); return cachedState; }
  catch { return empty; }
}
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === WALLET_KEY || event.key === null) callback(); };
  window.addEventListener("storage", onStorage); window.addEventListener(WALLET_EVENT, callback); window.addEventListener("focus", callback);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(WALLET_EVENT, callback); window.removeEventListener("focus", callback); };
}
export function useWallet(): WalletState | null { return useSyncExternalStore(subscribe, snapshot, () => null); }
/** Legacy past-race settlement remains a net-delta operation until route conversion. */
export function applyRound(delta: number, newRecords: WalletRecord[]) {
  try { const current = readWallet(); const tasks = current.tasks.map((value, index) => index === 3 ? true : value);
    writeWallet({ ...current, balance: current.balance + delta, records: [...newRecords, ...current.records].slice(0, 20), tasks }); }
  catch { /* Legacy flow tolerates unavailable browser storage. */ }
}
export function refillBalance() { try { const current = readWallet(); writeWallet({ ...current, balance: DEFAULT_BALANCE }); } catch {} }
