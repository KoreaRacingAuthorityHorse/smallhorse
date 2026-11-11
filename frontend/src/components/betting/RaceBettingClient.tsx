"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Race, RaceEntry } from "@/types/racing";
import AppHeader from "@/components/AppHeader";

import BetDraftEditor, { initialDraft, type Draft } from "./BetDraftEditor";
import { BET_TYPES } from "@/lib/betting";
import { appendSlipItem, createSlipItem, inspectSlipAddition } from "@/lib/bet-slip";
import PurchaseController from "./PurchaseController";
import SlipDialog from "./SlipDialog";
import { useWallet, DEFAULT_BALANCE } from "@/lib/demo-wallet";
import type { BetCombination, BetSlipItem } from "@/types/racing";
import EntryTable from "@/components/race/EntryTable";
import HorseInfoDialog from "@/components/race/HorseInfoDialog";

function restore(key: string, entries: RaceEntry[], raceKind: "upcoming" | "pastBlind"): { draft: Draft; slip: BetSlipItem[] } {
  const fallback = { draft: initialDraft, slip: [] };
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (saved?.version !== 1) return fallback;
    const draft = saved.draft as Draft;
    const meta = BET_TYPES.find(({ code }) => code === draft.type);
    if (!meta || !["general", "beginner"].includes(draft.skill) ||
      !["individual", "combination"].includes(draft.mode) ||
      typeof draft.question !== "string" || typeof draft.stake !== "string" ||
      !["1+2", "2+1"].includes(draft.pattern) ||
      !Array.isArray(draft.selected) || !Array.isArray(draft.groups) ||
      draft.groups.length < 1 || draft.groups.length > meta.requiredCount ||
      !draft.groups.every(Array.isArray)) return fallback;
    const eligible = new Set(entries.filter((entry) => !entry.scratched).map((entry) => entry.horseNo));
    const clean = (picks: number[]) => [...new Set(picks)].filter((horse) => eligible.has(horse));
    const slip = Array.isArray(saved.slip) ? (saved.slip as BetSlipItem[]).filter((item) =>
      item?.raceKind === raceKind && key === `trackon:bet-draft:${raceKind}:${item.raceId}` &&
      BET_TYPES.some(({ code }) => code === item.betType) &&
      Array.isArray(item.combinations) && item.combinations.length > 0 &&
      item.combinations.every((line) => line?.betType === item.betType &&
        Number.isSafeInteger(line.unitStake) && line.unitStake >= 100 && line.unitStake % 100 === 0 &&
        Array.isArray(line.selections) && line.selections.every((pick) => Number.isInteger(pick?.horseNo)))) : [];
    // Upgrade pre-T09 drafts in place, preserving every saved combination and amount.
    const restoredSlip = slip.filter((item) => typeof item.id === "string" &&
      ["individual", "combination"].includes(item.mode)).map((item) => ({ ...item,
        combinations: item.combinations.map((line) => ({ ...line, lineId: line.lineId || crypto.randomUUID() })),
      }));
    return { draft: { ...draft, selected: clean(draft.selected).slice(0, meta.requiredCount), groups: draft.groups.map(clean) }, slip: restoredSlip };
  } catch { return fallback; }
}

const tracks = { SEOUL: "서울", BUSAN: "부산경남", JEJU: "제주" };
const status = { SCHEDULED: "예정", OPEN: "구매 가능", CLOSED: "마감", CANCELLED: "취소", FINISHED: "종료" };

export default function RaceBettingClient({ race, entries, raceKind = "upcoming", testOnly = false }: { race: Race; entries: RaceEntry[]; raceKind?: "upcoming" | "pastBlind"; testOnly?: boolean }) {
  const key = `trackon:bet-draft:${raceKind}:${race.id}`;
  const [draft, setDraft] = useState(initialDraft);
  const [slip, setSlip] = useState<BetSlipItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [horseInfoOpen, setHorseInfoOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<BetSlipItem | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const wallet = useWallet();

  useEffect(() => {
    const saved = restore(key, entries, raceKind);
    // Browser storage is read after hydration to keep the initial render deterministic.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(saved.draft);
    setSlip(saved.slip);
    setLoaded(true);
  }, [key, entries, raceKind]);

  function save(nextDraft: Draft, nextSlip: BetSlipItem[]) {
    setDraft(nextDraft);
    setSlip(nextSlip);
    try {
      sessionStorage.setItem(key, JSON.stringify({ version: 1, draft: nextDraft, slip: nextSlip }));
      setStorageError(false);
    } catch { setStorageError(true); }
  }

  function addSlip(combinations: BetCombination[]) {
    const item = createSlipItem({ raceKind, raceId: race.id }, draft.mode, combinations);
    const inspection = inspectSlipAddition(slip, item, wallet?.balance ?? DEFAULT_BALANCE);
    setSlipError(inspection.error);
    if (inspection.error) return;
    if (inspection.duplicates.length) { setPendingItem(item); return; }
    save(draft, appendSlipItem(slip, item, wallet?.balance ?? DEFAULT_BALANCE));
  }

  function approveDuplicate() {
    if (!pendingItem) return;
    try {
      save(draft, appendSlipItem(slip, pendingItem, wallet?.balance ?? DEFAULT_BALANCE, true));
      setSlipError(null);
    } catch (error) { setSlipError((error as Error).message); }
    setPendingItem(null);
  }

  function toggleHorse(horseNo: number) {
    if (draft.mode === "individual") {
      const limit = BET_TYPES.find(({ code }) => code === draft.type)?.requiredCount ?? 1;
      const selected = draft.selected.includes(horseNo)
        ? draft.selected.filter((no) => no !== horseNo)
        : draft.selected.length < limit ? [...draft.selected, horseNo] : draft.selected;
      save({ ...draft, selected }, slip);
      return;
    }
    const existingGroupIndex = draft.groups.findIndex((group) => group.includes(horseNo));
    const groupIndex = existingGroupIndex >= 0
      ? existingGroupIndex
      : Math.max(0, draft.groups.findIndex((group) => group.length === 0));
    const groups = draft.groups.map((items, index) => index === groupIndex
      ? existingGroupIndex >= 0 ? items.filter((no) => no !== horseNo) : [...items, horseNo]
      : items);
    save({ ...draft, groups }, slip);
  }

  const selectedHorses = draft.mode === "individual" ? draft.selected : [...new Set(draft.groups.flat())];
  const pending = pendingItem ? inspectSlipAddition(slip, pendingItem, wallet?.balance ?? DEFAULT_BALANCE) : null;

  return <div className="bet-page"><AppHeader active="bet-upcoming" /><main className="bet-main"><div className="bet-container">
    <Link className="bet-back" href="/dashboard">← 경주 목록으로</Link>
    <header className="bet-heading"><div><div className="bet-eyebrow">{race.status === "FINISHED" ? "PAST RACE" : "UPCOMING RACE"}　/　RACE DETAIL</div><h1>{tracks[race.trackCode]} {String(race.raceNo).padStart(2, "0")}R</h1><p>{race.raceDate} · {race.startTime} · {race.distance.toLocaleString()}m · {race.entryCount}두 · {race.className}</p></div><span className={`bet-status ${race.status === "OPEN" ? "is-open" : ""}`}>{status[race.status]}</span></header>
    <div className="bet-layout">
      <div className="bet-primary">
        <section className="bet-panel bet-entries" aria-labelledby="bet-entries-title">
          <div className="bet-section-head"><div><p className="bet-step">HORSE INFORMATION</p><h2 id="bet-entries-title">출전마 정보</h2></div><button className="bet-info-open" type="button" onClick={() => setHorseInfoOpen(true)}>전체 정보 보기</button></div>
          <EntryTable entries={entries} selected={selectedHorses} onToggle={toggleHorse} detailed showHorseNames={raceKind !== "pastBlind"} />
        </section>
      </div>
      <aside className="bet-sidebar">
        {loaded && <BetDraftEditor draft={draft} entries={entries} open={race.status === "OPEN"} showHorseNames={raceKind !== "pastBlind"}
          balance={wallet?.balance ?? DEFAULT_BALANCE} onChange={(next) => save(next, slip)} onAdd={addSlip} />}
        {storageError && <p role="status">이 탭에 초안을 저장할 수 없습니다.</p>}
        {slipError && <p role="alert">{slipError}</p>}
        {!testOnly && <PurchaseController race={{ ...race, raceKind }} entries={entries} items={slip}
          onRemove={(id) => save(draft, slip.filter((item) => item.id !== id))}
          onPurchased={(purchase) => {
            const purchasedIds = new Set(purchase.items?.map((item) => item.id));
            save(draft, slip.filter((item) => !purchasedIds.has(item.id)));
          }} />}
        {testOnly && <p className="bet-muted" role="status">테스트 입력 경로입니다. 구매·포인트 차감은 비활성화되어 있습니다.</p>}
      </aside>
    </div>
  </div></main>
    <button className="bet-mobile-info" type="button" onClick={() => setHorseInfoOpen(true)} aria-haspopup="dialog">출전마 정보</button>
    <HorseInfoDialog open={horseInfoOpen} entries={entries} selected={selectedHorses} showHorseNames={raceKind !== "pastBlind"} onToggle={toggleHorse} onClose={() => setHorseInfoOpen(false)} />
    <SlipDialog open={!!pendingItem} title="중복 조합 추가 확인" onClose={() => setPendingItem(null)}>
      {pending && <><p>기존 슬립과 겹치는 {pending.duplicates.length}조합 · 추가 중복 금액 {pending.duplicateStake.toLocaleString()}P</p>
        <p>이번 추가 {pending.addedStake.toLocaleString()}P · 추가 후 총액 {pending.totalStake.toLocaleString()}P</p>
        <p className="bet-muted">승인하면 중복 조합도 별도 항목으로 담고 원금을 각각 합산합니다.</p>
        {pending.error && <p role="alert">{pending.error}</p>}
        <div className="bet-slip-actions"><button className="bet-horse-dialog-close" type="button" onClick={() => setPendingItem(null)}>취소</button>
          <button className="bet-button" type="button" disabled={!!pending.error} onClick={approveDuplicate}>중복 추가 승인</button></div></>}
    </SlipDialog>
  </div>;
}
