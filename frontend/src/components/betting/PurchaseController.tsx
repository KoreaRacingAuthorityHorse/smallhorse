"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { currentRaceSlip } from "@/lib/bet-slip";
import { calculateTotalStake } from "@/lib/betting";
import { completeSlipPurchase, validateSlipPurchase, type PurchaseRace } from "@/lib/demoPurchase";
import { DEFAULT_BALANCE, useWallet } from "@/lib/demo-wallet";
import type { BetPurchase, BetSlipItem, RaceEntry } from "@/types/racing";
import BetSlip from "./BetSlip";
import SlipDialog from "./SlipDialog";

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
    {completed && <p className="bet-purchase-complete" role="status">구매 접수 완료 · {completed.totalStake.toLocaleString()}P · {completed.raceKind === "upcoming" ? "결과 대기" : "결과 확인 준비"}<br />구매 ID: {completed.id}</p>}
    <SlipDialog open={!!request} title="구매 확인" onClose={() => { if (!submittingRef.current) setRequest(null); }}>
      {request && <>
        <p>{request.items.length}항목 · {request.items.reduce((count, item) => count + item.combinations.length, 0)}조합</p>
        <p className="bet-slip-total">구매 원금 {calculateTotalStake(request.items.flatMap((item) => item.combinations)).toLocaleString()}P</p>
        <p>{race.raceKind === "pastBlind"
          ? "적중 라인은 원금 포함 총 150%를 반환합니다. 구매 후 결과 화면에서 결과를 확인합니다."
          : "적중 라인은 원금 포함 총 200%를 반환합니다. 실제 결과가 확정될 때까지 결과 대기 상태로 접수합니다."}</p>
        <p className="bet-muted">미적중은 0P, 출전취소·경주제외·출발제외는 해당 라인 원금 100%를 반환합니다. 중복 승인한 라인의 원금도 각각 차감합니다.</p>
        <p className="bet-muted">여러 탭의 동시 구매는 완전한 원자성을 보장하지 않습니다. 한 탭에서 구매해 주세요.</p>
        {(error || validation) && <p role="alert">{error || validation}</p>}
        <div className="bet-slip-actions"><button className="bet-horse-dialog-close" type="button" disabled={submitting} onClick={() => setRequest(null)}>취소</button>
          <button className="bet-button" type="button" disabled={submitting || !!validation} onClick={confirm}>{submitting ? "저장 중…" : "구매 확정"}</button></div>
      </>}
    </SlipDialog>
  </>;
}
