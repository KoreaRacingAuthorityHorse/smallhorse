// 데모 체험 포인트 저장소. 대시보드(src/app/dashboard/page.tsx)와 같은 localStorage 키를 써서
// 지난 경주 모의베팅 결과가 대시보드 잔액·기록에도 보이게 한다.
// 서버 계정이 생기면 이 모듈을 API 호출로 바꾼다.

import { useSyncExternalStore } from "react";

export const WALLET_KEY = "trackon-premium-demo-v1";
export const DEFAULT_BALANCE = 12480;
const DEFAULT_TASKS = [true, true, false, false, false];
/** 대시보드 체크리스트에서 "지난 경주 복기해 보기" 항목 위치 */
const TASK_PAST_RACE = 3;

export interface WalletRecord {
  day: string;
  name: string;
  kind: string;
  pick: string;
  result: string;
  amount: number;
}

export interface WalletState {
  balance: number;
  records: WalletRecord[];
  tasks: boolean[];
}

let cache: WalletState | null = null;
const listeners = new Set<() => void>();

function read(): WalletState {
  if (cache) return cache;
  let saved: Partial<WalletState> | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(WALLET_KEY) || "null");
  } catch {
    saved = null;
  }
  cache = {
    balance: saved?.balance ?? DEFAULT_BALANCE,
    records: saved?.records ?? [],
    tasks: saved?.tasks ?? DEFAULT_TASKS,
  };
  return cache;
}

function write(next: WalletState) {
  cache = next;
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(next));
  } catch {
    // 저장이 막힌 환경(시크릿 창 등)에서는 이번 방문 동안만 유지
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === WALLET_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** 서버 렌더링 중에는 null(잔액을 아직 모름)을 돌려준다. */
export function useWallet(): WalletState | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** 베팅 결과를 반영한다. records는 대시보드 표 형식에 맞춰 최근 20개만 보관. */
export function applyRound(delta: number, newRecords: WalletRecord[]) {
  const cur = read();
  const tasks = cur.tasks.map((v, i) => (i === TASK_PAST_RACE ? true : v));
  write({ balance: cur.balance + delta, records: [...newRecords, ...cur.records].slice(0, 20), tasks });
}

export function refillBalance() {
  const cur = read();
  write({ ...cur, balance: DEFAULT_BALANCE });
}
