"use client";

import { useState } from "react";
import { calculateTotalStake } from "@/lib/betting";
import { currentRaceSlip, type SlipRace } from "@/lib/bet-slip";
import type { BetSlipItem as SlipItem } from "@/types/racing";
import BetSlipItem from "./BetSlipItem";
import SlipDialog from "./SlipDialog";

export default function BetSlip({ race, items, onRemove, isInvalid, onPurchase }: {
  race: SlipRace; items: SlipItem[]; onRemove: (id: string) => void; isInvalid?: (item: SlipItem) => boolean;
  onPurchase?: () => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const current = currentRaceSlip(items, race);
  const lines = current.flatMap((item) => item.combinations);
  const total = calculateTotalStake(lines);
  const content = <>
    {current.length === 0 && <p className="bet-muted">슬립에 담은 조합이 여기에 표시됩니다.</p>}
    <ul className="bet-slip-list">{current.map((item) => <BetSlipItem key={item.id} item={item} invalid={isInvalid?.(item)} onRemove={() => onRemove(item.id)} />)}</ul>
    <p className="bet-slip-total">{current.length}항목 · {lines.length}조합 · 합계 {total.toLocaleString()}P</p>
    <p className="bet-muted">금액을 바꾸려면 항목을 삭제하고 다시 추가해 주세요.</p>
    {onPurchase && <button className="bet-button" type="button" disabled={!current.length}
      onClick={() => { setDetailOpen(false); onPurchase(); }}>구매 확인</button>}
  </>;
  return <>
    <section className="bet-panel bet-slip-desktop" aria-label="베팅 슬립"><h2>베팅 슬립</h2>{content}</section>
    <button className="bet-mobile-slip" type="button" aria-haspopup="dialog" onClick={() => setDetailOpen(true)}>
      <span>{current.length}항목 · {lines.length}조합</span><strong>{total.toLocaleString()}P · 슬립 보기</strong>
    </button>
    <SlipDialog open={detailOpen} title="베팅 슬립 상세" fullScreen onClose={() => setDetailOpen(false)}>{content}</SlipDialog>
  </>;
}
