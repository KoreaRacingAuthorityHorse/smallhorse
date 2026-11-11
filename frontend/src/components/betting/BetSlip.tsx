"use client";

import { useEffect, useRef, useState } from "react";
import { calculateTotalStake, getBetTypeMeta, selectionKey } from "@/lib/betting";
import { currentRaceSlip, type SlipRace } from "@/lib/bet-slip";
import type { BetSlipItem as SlipItem } from "@/types/racing";
import BetSlipItem from "./BetSlipItem";
import SlipDialog from "./SlipDialog";

export default function BetSlip({ race, items, onRemove, isInvalid, onPurchase }: {
  race: SlipRace; items: SlipItem[]; onRemove: (id: string) => void; isInvalid?: (item: SlipItem) => boolean;
  onPurchase?: () => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [fullViewItem, setFullViewItem] = useState<SlipItem | null>(null);
  const [returnToMobileDetail, setReturnToMobileDetail] = useState(false);
  const mobileFullViewTrigger = useRef<HTMLButtonElement | null>(null);
  const current = currentRaceSlip(items, race);
  const lines = current.flatMap((item) => item.combinations);
  const total = calculateTotalStake(lines);
  useEffect(() => {
    if (!detailOpen || !mobileFullViewTrigger.current) return;
    const frame = requestAnimationFrame(() => mobileFullViewTrigger.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [detailOpen]);

  const openFullView = (item: SlipItem, fromMobileDetail: boolean, trigger: HTMLButtonElement) => {
    if (fromMobileDetail) {
      setReturnToMobileDetail(true);
      mobileFullViewTrigger.current = trigger;
      setDetailOpen(false);
    }
    setFullViewItem(item);
  };
  const closeFullView = () => {
    setFullViewItem(null);
    if (returnToMobileDetail) {
      setReturnToMobileDetail(false);
      setDetailOpen(true);
    }
  };
  const content = (fromMobileDetail: boolean) => <>
    {current.length === 0 && <p className="bet-muted">슬립에 담은 조합이 여기에 표시됩니다.</p>}
    <ul className="bet-slip-list">{current.map((item) => <BetSlipItem key={item.id} item={item} invalid={isInvalid?.(item)} onRemove={() => onRemove(item.id)} onExpandView={(trigger) => openFullView(item, fromMobileDetail, trigger)} />)}</ul>
    <div className="bet-slip-total" aria-label={`전체 ${lines.length.toLocaleString()}조합, 총 ${total.toLocaleString()}포인트`}><span>전체 {lines.length.toLocaleString()}조합</span><strong>{total.toLocaleString()}P</strong></div>
    {onPurchase && <button className="bet-button" type="button" disabled={!current.length}
      onClick={() => { setDetailOpen(false); onPurchase(); }}>구매 확정</button>}
  </>;
  return <>
    <section className="bet-panel bet-slip-desktop" aria-label="베팅 슬립"><h2>베팅 슬립</h2>{content(false)}</section>
    <button className="bet-mobile-slip" type="button" aria-haspopup="dialog" onClick={() => setDetailOpen(true)}>
      <span>{current.length}항목 · {lines.length}조합</span><strong>{total.toLocaleString()}P · 슬립 보기</strong>
    </button>
    <SlipDialog open={detailOpen} title="베팅 슬립 상세" fullScreen onClose={() => setDetailOpen(false)}>{content(true)}</SlipDialog>
    {fullViewItem && <SlipDialog open={!detailOpen} title="조합 전체 보기" className="bet-slip-combination-dialog" fullScreen onClose={closeFullView}>
      <div className="bet-slip-combination-body">
        <div className="bet-slip-combination-summary"><strong>{getBetTypeMeta(fullViewItem.betType).label} · {fullViewItem.mode === "individual" ? "개별" : "조합"}</strong><span>{fullViewItem.combinations.length.toLocaleString()}조합</span><b>{calculateTotalStake(fullViewItem.combinations).toLocaleString()}P</b></div>
        <ol className="bet-slip-lines" aria-label={`${getBetTypeMeta(fullViewItem.betType).label} ${fullViewItem.combinations.length}개 조합`}>
          {fullViewItem.combinations.map((line) => <li key={line.lineId}><span>{selectionKey(line.selections, line.betType)}</span><strong>{line.unitStake.toLocaleString()}P</strong></li>)}
        </ol>
      </div>
    </SlipDialog>}
  </>;
}
