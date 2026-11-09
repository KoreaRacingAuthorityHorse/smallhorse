"use client";

import { useSyncExternalStore } from "react";
import { DEMO_STORAGE_KEY, DEMO_UPDATED_EVENT, INITIAL_BALANCE, readDemoState, type DemoState } from "./demoPurchase";

const serverSnapshot: DemoState = { balance: INITIAL_BALANCE, records: [], tasks: [true, true, false, false, false] };
let cachedRaw: string | null | undefined;
let cachedSnapshot: DemoState = serverSnapshot;

function getSnapshot(): DemoState {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    const next = readDemoState();
    cachedRaw = raw;
    cachedSnapshot = next;
    return next;
  } catch { return serverSnapshot; }
}

function subscribe(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => { if (event.key === DEMO_STORAGE_KEY || event.key === null) callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(DEMO_UPDATED_EVENT, callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DEMO_UPDATED_EVENT, callback);
    window.removeEventListener("focus", callback);
  };
}

export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
