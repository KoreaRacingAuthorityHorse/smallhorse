"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ReplayCanvas from "@/components/past-race/ReplayCanvas";
import { readPurchaseSnapshot, savePurchaseSettlement, type StoredPurchaseSnapshot } from "@/lib/demoPurchase";
import { settleAndCreditPurchase, type PurchaseSettlement } from "@/lib/past-race/settle-purchase";
import type { RaceReveal } from "@/lib/past-race/types";
import type { BetPurchase } from "@/types/racing";
import "../../../../../races/[id]/racing.css";

type ViewState = { status: "loading" } | { status: "missing" } | { status: "pending"; purchase: BetPurchase } |
  { status: "settled"; purchase: BetPurchase; reveal: RaceReveal; distance: number; meet: import("@/lib/past-race/types").Venue; settlement: Extract<PurchaseSettlement, { status: "settled" }> } |
  { status: "unavailable"; purchase: BetPurchase; reasons: string[] };

const formatPoints = (amount: number) => amount.toLocaleString("ko-KR");

export default function PurchaseResultPage({ params }: { params: Promise<{ kind: string; raceId: string; purchaseId: string }> }) {
  const [view, setView] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const { kind, raceId, purchaseId } = await params;
        if (kind !== "upcoming" && kind !== "pastBlind") { if (active) setView({ status: "missing" }); return; }
        const snapshot = readPurchaseSnapshot(purchaseId) as StoredPurchaseSnapshot | null;
        const purchase = snapshot?.purchase;
        if (!snapshot || !purchase || purchase.raceId !== raceId || purchase.raceKind !== kind) {
          if (active) setView({ status: "missing" });
          return;
        }
        if (kind === "upcoming") {
          if (active) setView({ status: "pending", purchase });
          return;
        }
        const { getBlindRaceById, getRevealById } = await import("@/lib/past-race/service");
        const [reveal, race] = await Promise.all([getRevealById(raceId), getBlindRaceById(raceId)]);
        if (!reveal || !race) {
          if (active) setView({ status: "unavailable", purchase, reasons: ["확정 결과 자료를 찾을 수 없습니다."] });
          return;
        }
        let settlement = snapshot.settlement;
        if (!settlement || settlement.status !== "settled" || settlement.purchaseId !== purchaseId) {
          const result = settleAndCreditPurchase(purchase, reveal, `result:${raceId}`, localStorage);
          if (result.settlement.status !== "settled") {
            if (active) setView({ status: "unavailable", purchase, reasons: result.settlement.reasons });
            return;
          }
          settlement = result.settlement;
          savePurchaseSettlement(purchaseId, settlement);
        }
        if (active) setView({ status: "settled", purchase, reveal, distance: race.distance, meet: race.meet, settlement });
      } catch {
        if (active) setView({ status: "missing" });
      }
    }
    void restore();
    return () => { active = false; };
  }, [params]);

  return <div className="bet-page"><AppHeader active="bet-upcoming" /><main className="bet-main"><div className="bet-container">
    <Link className="bet-back" href="/dashboard">← 대시보드</Link>
    {view.status === "loading" && <p role="status">구매 결과를 불러오는 중입니다.</p>}
    {view.status === "missing" && <section className="bet-panel"><h1>구매 기록을 복원할 수 없습니다</h1><p>구매 스냅샷이 없거나 손상되었습니다. 포인트를 다시 차감하거나 정산하지 않았습니다.</p></section>}
    {view.status === "pending" && <section className="bet-panel"><p className="bet-eyebrow">PURCHASE RECEIPT</p><h1>결과 대기</h1><p>구매가 접수되었습니다. 실제 결과가 확정되기 전까지 순위와 정산은 표시되지 않습니다.</p><p>구매 ID: {view.purchase.id} · 구매액 {formatPoints(view.purchase.totalStake)}P</p></section>}
    {view.status === "unavailable" && <section className="bet-panel"><h1>결과를 확인할 수 없습니다</h1><p>결과 자료가 완전하지 않아 정산을 보류했습니다.</p><ul>{view.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p>구매 ID: {view.purchase.id}</p></section>}
    {view.status === "settled" && <section className="bet-panel" aria-labelledby="purchase-result-title">
      <div className="bet-result-head">
        <div><p className="bet-eyebrow">RESULT / 결과 공개</p><h1 id="purchase-result-title">{view.reveal.date.replaceAll("-", ".")} {view.meet} {view.reveal.raceNo}경주 <span>· {view.reveal.raceName}</span></h1></div>
        <Link className="bet-info-open" href="/challenge/past">다음 경주 보기</Link>
      </div>
      <p>{view.reveal.raceNo}경주 · 구매 {formatPoints(view.settlement.totalStake)}P · 반환 {formatPoints(view.settlement.totalReturn)}P · 순손익 {view.settlement.netChange >= 0 ? "+" : ""}{formatPoints(view.settlement.netChange)}P</p>
      <ReplayCanvas entries={view.reveal.entries} distance={view.distance} meet={view.meet} />
      <div className="bet-primary"><h2>확정 도착 순위</h2><div className="bet-entry-table-wrap"><table className="bet-entry-table"><thead><tr><th>순위</th><th>번호</th><th>마명</th><th>기수</th><th>기록</th><th>착차</th></tr></thead>
        <tbody>{[...view.reveal.entries].sort((a,b)=>(a.pos??Infinity)-(b.pos??Infinity)||a.no-b.no).map((entry)=><tr key={entry.no}><td>{entry.pos ?? entry.status}</td><td>{entry.no}</td><td>{entry.horse}</td><td>{entry.jockey}</td><td>{entry.time == null ? "-" : entry.time.toFixed(1)}</td><td>{entry.pos && entry.pos > 1 ? entry.margin ?? "-" : "-"}</td></tr>)}</tbody></table></div></div>
      <h2>그룹별 정산</h2>{view.settlement.groups.map((group,index)=><section className="bet-panel" key={`${group.groupId ?? "individual"}-${index}`}><h3>{group.groupId ? `조합 그룹 ${group.groupId}` : "개별 베팅"}</h3><p>원금 {formatPoints(group.totalStake)}P · 반환 {formatPoints(group.totalReturn)}P · 순손익 {group.netChange >= 0 ? "+" : ""}{formatPoints(group.netChange)}P</p>
        <ul>{view.settlement.lines.filter((line)=>line.groupId===group.groupId).map((line)=><li key={line.lineId}>{line.bet.pool} {line.bet.picks.join("·")} · {formatPoints(line.reward.stake)}P · {line.reward.outcome === "hit" ? "적중" : line.reward.outcome === "refund" ? "환불" : "미적중"} · 반환 {formatPoints(line.reward.returnAmount)}P</li>)}</ul></section>)}
      <details><summary>확정 배당표 보기</summary><div className="bet-entry-table-wrap"><table className="bet-entry-table"><thead><tr><th>승식</th><th>조합</th><th>확정 배당</th></tr></thead><tbody>{Object.entries(view.reveal.payouts).flatMap(([pool,payouts])=>(payouts??[]).map((payout,index)=><tr key={`${pool}-${index}`}><td>{pool}</td><td>{payout.combo}</td><td>{payout.odds.toFixed(1)}</td></tr>))}</tbody></table></div></details>
    </section>}
  </div></main></div>;
}
