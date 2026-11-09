"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BetCombination, BetPurchase, BetType, PurchaseMode, Race, RaceEntry, Selection } from "@/types/racing";
import { BET_TYPES, buildGroupCombinations, buildIndividualCombination, calculateTotalStake, getBetTypeMeta, selectionKey, validatePurchase } from "@/lib/betting";
import { completeDemoPurchase } from "@/lib/demoPurchase";
import { useDemoState } from "@/lib/useDemoState";
import TrackonHeader from "@/components/layout/TrackonHeader";
import TrackonFooter from "@/components/layout/TrackonFooter";

type Modal = "comparison" | "confirm" | "success" | "error" | null;
type Slip = { id: string; mode: PurchaseMode; betType: BetType; combinations: BetCombination[] };
type Count = 1 | 2 | 3;
type Order = "ANY" | "EXACT";
const suggestedTypes: Record<Count, Record<Order, BetType[]>> = {
  1: { ANY: ["WIN", "PLACE"], EXACT: ["WIN", "PLACE"] },
  2: { ANY: ["QUINELLA", "QUINELLA_PLACE"], EXACT: ["EXACTA"] },
  3: { ANY: ["TRIO"], EXACT: ["TRIFECTA"] },
};
const defaultGroupCount = (type: BetType) => getBetTypeMeta(type).requiredCount;
const tracks = { SEOUL: "서울", BUSAN: "부산", JEJU: "제주" };
const statuses = { SCHEDULED: "예정", OPEN: "구매 가능", CLOSED: "마감", CANCELLED: "취소", FINISHED: "종료" };
const descriptions: Record<BetType, string> = { WIN: "선택한 말이 1등", PLACE: "선택한 말이 입상", QUINELLA: "두 말 순서 무관", EXACTA: "두 말 순서 지정", QUINELLA_PLACE: "두 말 모두 입상", TRIO: "세 말 순서 무관", TRIFECTA: "세 말 순서 지정" };
const makeGroups = (count: number) => Array.from({ length: count }, () => [] as number[]);
const money = (value: number) => `${value.toLocaleString()} P`;

export default function RaceBettingClient({ race, entries }: { race: Race; entries: RaceEntry[] }) {
  const [skill, setSkill] = useState<"beginner" | "general">("general");
  const [count, setCount] = useState<Count | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [oneHorseGoal, setOneHorseGoal] = useState<"WIN" | "PLACE" | null>(null);
  const [twoHorseGoal, setTwoHorseGoal] = useState<"QUINELLA" | "QUINELLA_PLACE" | null>(null);
  const [betType, setBetType] = useState<BetType>("WIN");
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("individual");
  const [selected, setSelected] = useState<number[]>([]);
  const [groupCount, setGroupCount] = useState(1);
  const [groups, setGroups] = useState<number[][]>(() => makeGroups(1));
  const [pattern, setPattern] = useState<"1+2" | "2+1">("1+2");
  const [stakeText, setStakeText] = useState("100");
  const [slips, setSlips] = useState<Slip[]>([]);
  const { balance } = useDemoState();
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [lastPurchase, setLastPurchase] = useState<BetPurchase | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitGuard = useRef(false);
  const meta = getBetTypeMeta(betType);
  const open = race.status === "OPEN";
  const stake = Number(stakeText);
  const cart = useMemo(() => slips.flatMap((slip) => slip.combinations), [slips]);
  const total = calculateTotalStake(cart);
  const validStake = Number.isSafeInteger(stake) && stake >= 100 && stake <= 100_000 && stake % 100 === 0;
  const selectedCount = selected.filter((horseNo) => horseNo > 0).length;
  const selectionComplete = selectedCount === meta.requiredCount && (!meta.ordered || selected.every((horseNo) => horseNo > 0));
  const suggested = useMemo(() => {
    if (skill === "general" || count === null) return BET_TYPES;
    if (count === 1 && oneHorseGoal) return BET_TYPES.filter((item) => item.code === oneHorseGoal);
    if (count === 2 && order === "ANY" && twoHorseGoal) return BET_TYPES.filter((item) => item.code === twoHorseGoal);
    const codes = order ? suggestedTypes[count][order] : [...suggestedTypes[count].ANY, ...suggestedTypes[count].EXACT];
    return BET_TYPES.filter((item) => codes.includes(item.code));
  }, [skill, count, order, oneHorseGoal, twoHorseGoal]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modal) {
      if (!dialog.open) dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    } else if (dialog.open) dialog.close();
  }, [modal]);

  const preview = useMemo(() => {
    if (purchaseMode !== "combination") return { combinations: [] as Selection[][], error: "" };
    try { return { combinations: buildGroupCombinations(betType, { groups, pattern }, entries), error: "" }; }
    catch (error) { return { combinations: [] as Selection[][], error: error instanceof Error ? error.message : "조합을 만들 수 없습니다." }; }
  }, [purchaseMode, betType, groups, pattern, entries]);

  function chooseType(next: BetType) {
    setBetType(next); setSelected([]); setGroupCount(defaultGroupCount(next)); setGroups(makeGroups(defaultGroupCount(next))); setPattern("1+2"); setMessage("");
  }
  function updateBeginnerFilter(nextCount: Count | null, nextOrder: Order | null) {
    setCount(nextCount); setOrder(nextOrder);
    setOneHorseGoal(null); setTwoHorseGoal(null);
    if (nextCount === null) return;
    const codes = nextOrder ? suggestedTypes[nextCount][nextOrder] : [...suggestedTypes[nextCount].ANY, ...suggestedTypes[nextCount].EXACT];
    if (!codes.includes(betType)) chooseType(codes[0]);
  }
  function toggleSelected(horseNo: number) {
    setSelected((current) => current.includes(horseNo) ? current.filter((value) => value !== horseNo) : current.length < meta.requiredCount ? [...current, horseNo] : current);
    setMessage("");
  }
  function toggleGroup(groupIndex: number, horseNo: number) {
    setGroups((current) => current.map((group, index) => index === groupIndex ? group.includes(horseNo) ? group.filter((value) => value !== horseNo) : [...group, horseNo] : group));
    setMessage("");
  }
  function addSlip(selections: Selection[][], mode: PurchaseMode) {
    if (!open) return setMessage("현재 구매할 수 없는 경주입니다.");
    if (!validStake) return setMessage("금액은 100P 단위로 입력해 주세요.");
    if (!selections.length) return setMessage("말을 선택해 조합을 완성해 주세요.");
    const incoming = selections.map((items) => ({ betType, selections: items, unitStake: stake }));
    const existing = new Set(cart.map((item) => `${item.betType}:${selectionKey(item.selections, item.betType)}`));
    if (incoming.some((item) => existing.has(`${item.betType}:${selectionKey(item.selections, item.betType)}`))) return setMessage("이미 담긴 조합입니다.");
    const error = validatePurchase(race, entries, [...cart, ...incoming], balance);
    if (error) return setMessage(error);
    setSlips((current) => [...current, { id: crypto.randomUUID(), mode, betType, combinations: incoming }]);
    setSelected([]); setGroups(makeGroups(groupCount)); setMessage("베팅 용지에 조합을 담았습니다.");
  }
  function addIndividual() {
    const selections = buildIndividualCombination(betType, selected.map((horseNo, index) => ({ horseNo, position: index + 1 })), entries);
    addSlip(selections ? [selections] : [], "individual");
  }
  function updateAmount(slipId: string, index: number, value: string) {
    const amount = value === "" ? 0 : Number(value);
    setSlips((current) => current.map((slip) => slip.id === slipId ? { ...slip, combinations: slip.combinations.map((item, i) => i === index ? { ...item, unitStake: amount } : item) } : slip));
    setMessage("");
  }
  function openConfirmation() {
    const error = validatePurchase(race, entries, cart, balance);
    if (error) { setMessage(error); setModal("error"); return; }
    setMessage(""); setModal("confirm");
  }
  function confirmPurchase() {
    if (submitGuard.current) return;
    submitGuard.current = true; setSubmitting(true);
    const result = completeDemoPurchase(race, entries, cart, slips.some((slip) => slip.mode === "combination") ? "combination" : "individual");
    if ("error" in result) { setMessage(result.error); setModal("error"); }
    else {
      setLastPurchase(result.purchase); setSlips([]); setSelected([]); setGroups(makeGroups(groupCount)); setModal("success");
    }
    setSubmitting(false);
  }
  function closeModal() { setModal(null); submitGuard.current = false; setSubmitting(false); }

  return <div className="app-root bet-page">
    <main className="bet-container bet-main">
      <div className="bet-heading"><h1>{tracks[race.trackCode]} {race.raceNo}경주</h1><p>{race.raceDate} · {race.startTime} · {race.distance}m · {race.className}</p></div>
      <section className="bet-panel">
        <h2>승식 선택</h2>
        <div className="bet-type-grid">{BET_TYPES.map((item) => <button key={item.code} type="button" disabled={!open} className={betType === item.code ? "active" : ""} onClick={() => chooseType(item.code)}>{item.label}</button>)}</div>
        <div className="bet-purchase-choice"><button type="button" onClick={() => setPurchaseMode("individual")}>개별 구매</button><button type="button" onClick={() => setPurchaseMode("combination")}>조합 구매</button></div>
        {purchaseMode === "individual" ? <div className="bet-selection-board"><HorseChoices entries={entries} selected={selected} disabled={!open} maxSelected={meta.requiredCount} onToggle={toggleSelected} /></div> : <>
          <div className="bet-group-board">{groups.map((group, index) => <div className="bet-group" key={index}><h3>{index + 1}라인 ({group.length}두)</h3><HorseChoices entries={entries} selected={group} disabled={!open} label={`${index + 1}라인 마번 선택`} compact onToggle={(horseNo) => toggleGroup(index, horseNo)} /></div>)}</div>
          <div className="bet-preview"><strong>최종 조합 결과 · {preview.combinations.length}개</strong><span>{validStake ? money(preview.combinations.length * stake) : "금액 확인 필요"}</span>{preview.combinations.map((item) => <span key={selectionKey(item, betType)}>{selectionKey(item, betType)}</span>)}</div>
        </>}
        <input type="number" value={stakeText} onChange={(e) => setStakeText(e.target.value)} min="100" step="100" />
        <button type="button" disabled={!open || !validStake || (purchaseMode === "combination" ? !preview.combinations.length : !selectionComplete)} onClick={() => purchaseMode === "combination" ? addSlip(preview.combinations, "combination") : addIndividual()}>베팅 용지에 추가</button>
      </section>
    </main>
  </div>;
}
function HorseChoices({ entries, selected, disabled, maxSelected, disabledNumbers = [], label = "마번 선택", compact = false, onToggle }: { entries: RaceEntry[]; selected: number[]; disabled: boolean; maxSelected?: number; disabledNumbers?: number[]; label?: string; compact?: boolean; onToggle: (horseNo: number) => void }) {
  return <div className={`bet-horse-choices ${compact ? "compact" : ""}`} role="group" aria-label={label}>{entries.map((entry) => {
    const active = selected.includes(entry.horseNo);
    const atLimit = maxSelected !== undefined && selected.length >= maxSelected && !active;
    return <button key={entry.horseNo} type="button" disabled={disabled || entry.scratched || atLimit || disabledNumbers.includes(entry.horseNo)} className={active ? "active" : ""} aria-pressed={active} title={entry.scratched ? "출전 취소" : `${entry.horseName} · ${entry.jockeyName}`} onClick={() => onToggle(entry.horseNo)}>{entry.horseNo}{!compact && <small>{entry.scratched ? "출전 취소" : entry.horseName}</small>}</button>;
  })}</div>;
}

