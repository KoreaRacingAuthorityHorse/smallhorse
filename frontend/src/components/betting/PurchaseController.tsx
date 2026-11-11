"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { currentRaceSlip } from "@/lib/bet-slip";
import { calculateTotalStake, getBetTypeMeta } from "@/lib/betting";
import { completeSlipPurchase, validateSlipPurchase, type PurchaseRace } from "@/lib/demoPurchase";
import { DEFAULT_BALANCE, useWallet } from "@/lib/demo-wallet";
import type { BetPurchase, BetSlipItem, RaceEntry } from "@/types/racing";
import BetSlip from "./BetSlip";
import SlipDialog from "./SlipDialog";

const points = (value: number) => `${value.toLocaleString()}P`;

export default function PurchaseController({ race, entries, items, onRemove, onPurchased }: {
  race: PurchaseRace; entries: RaceEntry[]; items: BetSlipItem[];
  onRemove: (id: string) => void; onPurchased: (purchase: BetPurchase) => void;
}) {
  const router = useRouter();
  const wallet = useWallet();
  const [request, setRequest] = useState<{ id: string; items: BetSlipItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<BetPurchase | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const slipRace = { raceKind: race.raceKind, raceId: race.id };
  const current = currentRaceSlip(items, slipRace);
  const validation = request ? validateSlipPurchase(race, entries, request.items, wallet?.balance ?? DEFAULT_BALANCE) : null;
  const totalStake = request ? calculateTotalStake(request.items.flatMap((item) => item.combinations)) : 0;
  const totalCombinations = request?.items.reduce((count, item) => count + item.combinations.length, 0) ?? 0;
  const hasDuplicates = request ? new Set(request.items.flatMap((item) => item.combinations.map((line) => `${line.betType}:${line.selections.map((selection) => selection.horseNo).join("-")}`))).size < totalCombinations : false;

  function confirm() {
    if (!request || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const result = completeSlipPurchase(race, entries, request.items, request.id);
    if ("error" in result) setError(result.error);
    else {
      setCompleted(result.purchase);
      setRequest(null);
      setError(null);
      onPurchased(result.purchase);
      router.push(`/betting/${race.raceKind}/${race.id}/result/${result.purchase.id}`);
    }
    submittingRef.current = false;
    setSubmitting(false);
  }

  return <>
    <BetSlip race={slipRace} items={current} onRemove={onRemove}
      onPurchase={() => { setError(null); setRequest({ id: crypto.randomUUID(), items: structuredClone(current) }); }}
      isInvalid={(item) => !!validateSlipPurchase(race, entries, [item], wallet?.balance ?? DEFAULT_BALANCE)} />
    {completed && <p className="bet-purchase-complete" role="status">구매 접수 완료 · {points(completed.totalStake)} · {completed.raceKind === "upcoming" ? "결과 대기" : "결과 확인 준비"}<br />구매 ID: {completed.id}</p>}
    <SlipDialog open={!!request} title="구매 확인" onClose={() => { if (!submittingRef.current) setRequest(null); }} className="bet-purchase-dialog">
      {request && <>
        <section className="bet-purchase-summary" aria-label="구매 요약">
          <p>{request.items.length}개 항목 <span>·</span> {totalCombinations}조합</p>
          <strong>{points(totalStake)}</strong>
        </section>
        <div className="bet-purchase-items" aria-label="구매 항목 목록">
          {request.items.map((item) => {
            const itemTotal = calculateTotalStake(item.combinations);
            return <article className="bet-purchase-item" key={item.id}>
              <div className="bet-purchase-item-info">
                <h3>{getBetTypeMeta(item.betType).label} <span>·</span> {item.mode === "combination" ? "조합" : "개별"}</h3>
                <p>{item.combinations.length}조합 <span>·</span> 조합당 {points(item.combinations[0]?.unitStake ?? 0)}</p>
                <div className="bet-purchase-combinations" aria-label="구매 조합">{item.combinations.map((line) => <span className="bet-purchase-combination-chip" key={line.lineId}>{line.selections.map(({ horseNo }) => horseNo).join("-")}</span>)}</div>
              </div>
              <strong className="bet-purchase-item-total">{points(itemTotal)}</strong>
            </article>;
          })}
        </div>
        <div className="bet-purchase-notices">
          <p>{race.raceKind === "pastBlind"
            ? "맞힌 조합은 베팅 금액의 1.5배를 돌려받아요(원금 포함). 구매 후 바로 결과를 확인할 수 있어요."
            : "맞힌 조합은 베팅 금액의 2배를 돌려받아요(원금 포함). 경주 결과가 확정되면 확인할 수 있어요."}</p>
          <p>맞히지 못한 조합은 포인트를 돌려받지 못해요. 출전취소 등으로 환불되는 조합은 베팅 금액을 그대로 돌려받아요.</p>
          {hasDuplicates && <p>같은 조합을 여러 번 담았다면 각각 별도로 구매돼요.</p>}
        </div>
        {(error || validation) && <p role="alert" className="bet-purchase-error">{error || validation}</p>}
        <div className="bet-slip-actions bet-purchase-actions"><button className="bet-horse-dialog-close" type="button" disabled={submitting} onClick={() => setRequest(null)}>취소</button>
          <button className="bet-button" type="button" disabled={submitting || !!validation} onClick={confirm}>{submitting ? "저장 중…" : `${points(totalStake)} 구매 확정`}</button></div>
      </>}
    </SlipDialog>
  </>;
}
