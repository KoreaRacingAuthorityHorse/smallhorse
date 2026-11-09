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
  const [combinationHorseOpen, setCombinationHorseOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [groups, setGroups] = useState<number[][]>(() => makeGroups(3));
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
    try { return { combinations: buildGroupCombinations(betType, { groups }, entries), error: "" }; }
    catch (error) { return { combinations: [] as Selection[][], error: error instanceof Error ? error.message : "조합을 만들 수 없습니다." }; }
  }, [purchaseMode, betType, groups, entries]);

  function chooseType(next: BetType) {
    setBetType(next); setSelected([]); setGroups(makeGroups(3)); setMessage("");
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
    setSelected([]); setGroups(makeGroups(3)); setMessage("베팅 용지에 조합을 담았습니다.");
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
      setLastPurchase(result.purchase); setSlips([]); setSelected([]); setGroups(makeGroups(3)); setModal("success");
    }
    setSubmitting(false);
  }
  function closeModal() { setModal(null); submitGuard.current = false; setSubmitting(false); }

  const selectedEntries = selected.map((horseNo) => entries.find((entry) => entry.horseNo === horseNo)).filter(Boolean) as RaceEntry[];
  const modalTitle = modal === "comparison" ? "승식 비교" : modal === "confirm" ? "베팅을 확정할까요?" : modal === "success" ? "베팅을 저장했습니다" : "베팅을 확인해 주세요";
  return <div className="app-root bet-page">
    <TrackonHeader section="betting" />
    <main className="bet-container bet-main">
      <Link className="bet-back" href="/dashboard#upcoming">← 대시보드로 돌아가기</Link>
      <div className="bet-heading">
        <div><span className="bet-eyebrow">MOCK BETTING · {statuses[race.status]}</span><h1>{tracks[race.trackCode]} {String(race.raceNo).padStart(2, "0")}경주</h1><p>{race.raceDate} · {race.startTime} · {race.distance}m · {race.className} · 출전 {entries.length}두</p></div>
        <span className={`bet-status ${open ? "is-open" : ""}`}>{statuses[race.status]}</span>
      </div>
      {!open && <div className="bet-alert">현재 구매할 수 없는 경주입니다. 경주 상태가 구매 가능으로 바뀐 뒤 다시 이용해 주세요.</div>}
      <div className="bet-layout">
        <div className="bet-primary">
          <section className="bet-panel bet-type-panel">
            <div className="bet-section-head"><div><span className="bet-step">STEP 01</span><h2>승식 선택</h2></div><button className="bet-text-button" type="button" onClick={() => setModal("comparison")}>승식 전체 비교</button></div>
            <div className="bet-mode-switch" aria-label="승식 안내 모드"><button type="button" className={skill === "general" ? "active" : ""} onClick={() => setSkill("general")}>일반 모드</button><button type="button" className={skill === "beginner" ? "active" : ""} onClick={() => setSkill("beginner")}>초보자 모드</button></div>
            {skill === "beginner" && <div className="bet-beginner-guide"><div><h3>몇 마리의 말을 맞혀볼까요?</h3><div className="bet-answer-row">{([1, 2, 3] as Count[]).map((value) => <button key={value} type="button" className={count === value ? "active" : ""} onClick={() => updateBeginnerFilter(value, null)}>{value}마리</button>)}</div></div>{count && <div><h3>순서까지 맞혀야 하나요?</h3><div className="bet-answer-row"><button type="button" className={order === "ANY" ? "active" : ""} onClick={() => updateBeginnerFilter(count, "ANY")}>순서 무관</button><button type="button" className={order === "EXACT" ? "active" : ""} onClick={() => updateBeginnerFilter(count, "EXACT")}>순서까지 정확히</button></div></div>}{count === 1 && <div><h3>선택한 말의 목표는?</h3><div className="bet-answer-row"><button type="button" className={oneHorseGoal === "WIN" ? "active" : ""} onClick={() => { setOneHorseGoal("WIN"); chooseType("WIN"); }}>1등</button><button type="button" className={oneHorseGoal === "PLACE" ? "active" : ""} onClick={() => { setOneHorseGoal("PLACE"); chooseType("PLACE"); }}>3등 안</button></div></div>}{count === 2 && order === "ANY" && <div><h3>두 말 모두 입상할까요?</h3><div className="bet-answer-row"><button type="button" className={twoHorseGoal === "QUINELLA" ? "active" : ""} onClick={() => { setTwoHorseGoal("QUINELLA"); chooseType("QUINELLA"); }}>두 말 순서 무관</button><button type="button" className={twoHorseGoal === "QUINELLA_PLACE" ? "active" : ""} onClick={() => { setTwoHorseGoal("QUINELLA_PLACE"); chooseType("QUINELLA_PLACE"); }}>두 말 모두 3등 안</button></div></div>}</div>}
            <div className="bet-type-grid">{suggested.map((item) => <button key={item.code} type="button" disabled={!open} className={`bet-type-card${betType === item.code ? " active" : ""}`} onClick={() => chooseType(item.code)}><strong>{item.label}</strong><span>{descriptions[item.code]}</span><small>{item.requiredCount}두 · {item.ordered ? "순서 지정" : "순서 무관"}</small></button>)}</div>
          </section>
          <section className="bet-panel bet-purchase-panel">
            <div className="bet-section-head"><div><span className="bet-step">STEP 02</span><h2>구매 방식</h2></div></div>
            <div className="bet-purchase-choice"><strong>어떻게 구매할까요?</strong><button type="button" className={purchaseMode === "individual" ? "bet-button" : "bet-button secondary"} onClick={() => { setPurchaseMode("individual"); setCombinationHorseOpen(false); }}>개별 구매</button><button type="button" className={purchaseMode === "combination" ? "bet-button" : "bet-button secondary"} onClick={() => { setPurchaseMode("combination"); setSelected([]); setGroups(makeGroups(3)); setCombinationHorseOpen(false); }}>조합 구매</button></div>
          </section>
          {purchaseMode === "individual" ? <section className="bet-panel bet-entries-panel">
            <div className="bet-section-head"><div><span className="bet-step">STEP 03</span><h2>출전마 선택</h2></div><b>{selectedCount}/{meta.requiredCount}두 선택</b></div>
            <div className="bet-table-wrap"><table className="bet-table"><thead><tr><th>선택</th><th>마번</th><th>마명</th><th>기수</th><th>배당</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.horseNo} className={entry.scratched ? "scratched" : selected.includes(entry.horseNo) ? "is-selected" : ""}><td><button type="button" className={`bet-table-select ${selected.includes(entry.horseNo) ? "active" : ""}`} disabled={!open || entry.scratched || (!selected.includes(entry.horseNo) && selected.length >= meta.requiredCount)} onClick={() => toggleSelected(entry.horseNo)}>{selected.includes(entry.horseNo) ? "선택됨" : "선택"}</button></td><td><span className="bet-horse-no">{entry.horseNo}</span></td><td>{entry.horseName}{entry.scratched && <small> 출전 취소</small>}</td><td>{entry.jockeyName}</td><td>{entry.odds.toFixed(1)}</td></tr>)}</tbody></table></div>
            {selectedEntries.length > 0 && <p className="bet-selection">현재 선택: {selectedEntries.map((entry) => `${entry.horseNo}번 ${entry.horseName}`).join(" · ")}</p>}
          </section> : <>
          <section className="bet-panel bet-entries-panel bet-combination-panel">
            <div className="bet-entries-disclosure"><button type="button" className="bet-disclosure-button" aria-expanded={combinationHorseOpen} onClick={() => setCombinationHorseOpen((value) => !value)}>{combinationHorseOpen ? "출전마 목록 닫기" : "출전마 목록 펼치기"}<span aria-hidden="true">{combinationHorseOpen ? "−" : "+"}</span></button>{combinationHorseOpen && <div className="bet-table-wrap"><table className="bet-table"><thead><tr><th>마번</th><th>마명</th><th>기수</th><th>배당</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.horseNo} className={entry.scratched ? "scratched" : ""}><td><span className="bet-horse-no">{entry.horseNo}</span></td><td>{entry.horseName}{entry.scratched && <small> 출전 취소</small>}</td><td>{entry.jockeyName}</td><td>{entry.odds.toFixed(1)}</td></tr>)}</tbody></table></div>}</div>
          </section>
          <section className="bet-panel bet-combination-panel">
            <div className="bet-section-head"><div><span className="bet-step">STEP 03</span><h2>조합 마번 선택</h2></div><b>3라인 자동 계산</b></div>
            <div className="bet-group-board">{groups.map((group, index) => <div className="bet-group" key={index}><h3>{index + 1}라인 <small>{group.length}두</small></h3><HorseChoices entries={entries} selected={group} disabled={!open || index >= getBetTypeMeta(betType).requiredCount} label={`${index + 1}라인 마번 선택`} compact onToggle={(horseNo) => toggleGroup(index, horseNo)} /></div>)}</div>
            <div className="bet-preview"><strong>자동 조합 결과 · {preview.combinations.length}개</strong><span>{validStake ? money(preview.combinations.length * stake) : "금액 확인 필요"}</span><div className="bet-preview-list">{preview.combinations.map((item) => <span key={selectionKey(item, betType)}>{selectionKey(item, betType)}</span>)}</div></div>
          </section>
          </>}
          <section className="bet-panel">
            <div className="bet-section-head"><div><span className="bet-step">STEP 04</span><h2>베팅 금액</h2></div></div>
            <div className="bet-stake"><div><label htmlFor="stake">조합당 베팅 금액</label><p>100P 단위 · 최소 100P · 최대 100,000P</p></div><div className="bet-stake-controls"><div className="bet-presets">{[100, 500, 1000, 5000, 10000, 30000, 50000, 100000].map((value) => <button key={value} type="button" className={stake === value ? "active" : ""} onClick={() => setStakeText(String(value))}>{money(value)}</button>)}</div><div className="bet-number-input"><input id="stake" type="number" value={stakeText} onChange={(event) => setStakeText(event.target.value)} min="100" max="100000" step="100" aria-invalid={!validStake} placeholder="직접 입력" /><span>P</span></div></div></div>
            {message && <p className="bet-message" role="status">{message}</p>}
            <div className="bet-action-row"><span className="bet-muted">선택 조합 {purchaseMode === "combination" ? preview.combinations.length : selectionComplete ? 1 : 0}개</span><button type="button" className="bet-button" disabled={!open || !validStake || (purchaseMode === "combination" ? !preview.combinations.length : !selectionComplete)} onClick={() => purchaseMode === "combination" ? addSlip(preview.combinations, "combination") : addIndividual()}>베팅 용지에 추가</button></div>
          </section>
        </div>
        <aside className="bet-panel bet-sidebar"><div className="bet-section-head"><div><span className="bet-step">BET SLIP</span><h2>베팅 용지</h2></div><b>{cart.length}건</b></div>{slips.length === 0 ? <p className="bet-empty">선택한 조합이 여기에 표시됩니다.</p> : slips.map((slip) => <div className="bet-slip-card" key={slip.id}><div className="bet-slip-head"><strong>{getBetTypeMeta(slip.betType).label} · {slip.mode === "individual" ? "개별" : "조합"}</strong><button type="button" onClick={() => setSlips((current) => current.filter((item) => item.id !== slip.id))}>삭제</button></div><p>{descriptions[slip.betType]}</p><div className="bet-slip-rows">{slip.combinations.map((item, index) => <label key={`${slip.id}-${index}`}><span>{selectionKey(item.selections, item.betType)}</span><input type="number" value={item.unitStake} min="100" step="100" onChange={(event) => updateAmount(slip.id, index, event.target.value)} /><small>P</small></label>)}</div></div>)}<div className="bet-totals"><div><span>총 베팅 금액</span><strong>{money(total)}</strong></div><div><span>보유 포인트</span><strong>{money(balance)}</strong></div></div><button type="button" className="bet-button bet-checkout" disabled={!cart.length} onClick={openConfirmation}>구매 확인</button><p className="bet-disclaimer">구매 완료 후 포인트가 차감되고 대시보드 기록에 저장됩니다.</p></aside>
      </div>
    </main>
    <TrackonFooter />
    <dialog ref={dialogRef} className="bet-dialog" onCancel={(event) => { event.preventDefault(); closeModal(); }}><div className="bet-dialog-head"><span>TRACK:ON BETTING</span><button type="button" aria-label="닫기" onClick={closeModal}>×</button></div><h2>{modalTitle}</h2>{modal === "comparison" && <div className="bet-compare-list">{BET_TYPES.map((item) => <button key={item.code} type="button" onClick={() => { chooseType(item.code); closeModal(); }}><strong>{item.label}</strong><span>{descriptions[item.code]}</span><small>{item.requiredCount}두 · {item.ordered ? "순서 지정" : "순서 무관"}</small></button>)}</div>}{modal === "confirm" && <><p>총 {cart.length}개 조합에 {money(total)}를 베팅합니다. 구매를 진행할까요?</p><div className="bet-dialog-actions"><button type="button" className="bet-button secondary" onClick={closeModal}>취소</button><button type="button" className="bet-button" data-initial-focus disabled={submitting} onClick={confirmPurchase}>{submitting ? "처리 중..." : "구매 완료"}</button></div></>}{modal === "success" && <><p>{lastPurchase ? `${lastPurchase.combinations.length}개 조합을 저장했습니다.` : "베팅을 저장했습니다."}</p><div className="bet-dialog-actions"><Link className="bet-button secondary" href="/dashboard#recent" onClick={closeModal}>기록 확인</Link><button type="button" className="bet-button" data-initial-focus onClick={closeModal}>닫기</button></div></>}{modal === "error" && <><p>{message || "베팅 정보를 확인해 주세요."}</p><div className="bet-dialog-actions"><button type="button" className="bet-button" data-initial-focus onClick={closeModal}>확인</button></div></>}</dialog>
  </div>;
}
function HorseChoices({ entries, selected, disabled, maxSelected, disabledNumbers = [], label = "마번 선택", compact = false, onToggle }: { entries: RaceEntry[]; selected: number[]; disabled: boolean; maxSelected?: number; disabledNumbers?: number[]; label?: string; compact?: boolean; onToggle: (horseNo: number) => void }) {
  return <div className={`bet-horse-choices ${compact ? "compact" : ""}`} role="group" aria-label={label}>{entries.map((entry) => {
    const active = selected.includes(entry.horseNo);
    const atLimit = maxSelected !== undefined && selected.length >= maxSelected && !active;
    return <button key={entry.horseNo} type="button" disabled={disabled || entry.scratched || atLimit || disabledNumbers.includes(entry.horseNo)} className={active ? "active" : ""} aria-pressed={active} title={entry.scratched ? "출전 취소" : `${entry.horseName} · ${entry.jockeyName}`} onClick={() => onToggle(entry.horseNo)}>{entry.horseNo}{!compact && <small>{entry.scratched ? "출전 취소" : entry.horseName}</small>}</button>;
  })}</div>;
}

