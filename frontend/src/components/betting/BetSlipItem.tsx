"use client";

import { useState } from "react";
import { calculateTotalStake, getBetTypeMeta, selectionKey } from "@/lib/betting";
import type { BetSlipItem as SlipItem } from "@/types/racing";

export default function BetSlipItem({ item, invalid, onRemove, onExpandView }: { item: SlipItem; invalid?: boolean; onRemove: () => void; onExpandView: (trigger: HTMLButtonElement) => void }) {
  const [expanded, setExpanded] = useState(false);
  const label = getBetTypeMeta(item.betType).label;
  const itemTotal = calculateTotalStake(item.combinations);
  const modeLabel = item.mode === "individual" ? "개별" : "조합";
  const combinations = <ol className="bet-slip-lines" aria-label={`${label} ${item.combinations.length}개 조합`}>
    {item.combinations.map((line) => <li key={line.lineId}>
      <span>{selectionKey(line.selections, line.betType)}</span><strong>{line.unitStake.toLocaleString()}P</strong>
    </li>)}
  </ol>;
  return <li className="bet-slip-item">
    <div className="bet-slip-item-head"><div className="bet-slip-item-title"><strong>{label}</strong><span>{modeLabel}</span>{item.mode === "combination" && <span className="bet-slip-count-pill">{item.combinations.length.toLocaleString()}조합</span>}</div>
      <button type="button" className="bet-slip-remove" aria-label={`${label} ${item.mode === "combination" ? "그룹" : "항목"} 삭제`} onClick={onRemove}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2m3 0-.7 10H5.7L5 6m3 3v4m4-4v4" /></svg>
      </button></div>
    {item.mode === "individual" ? <div className="bet-slip-individual-lines">
      {item.combinations.map((line) => <div key={line.lineId}><span>마번 {selectionKey(line.selections, line.betType)}</span><strong>{line.unitStake.toLocaleString()}P</strong></div>)}
    </div> : <>
      <div className="bet-slip-item-detail-actions">
        <button type="button" className="bet-slip-expand" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>{expanded ? "조합 접기" : "조합 펼쳐 보기"}
        </button>
        {expanded && <button type="button" className="bet-slip-full-view-open" aria-haspopup="dialog" onClick={(event) => onExpandView(event.currentTarget)}>
          확장 보기 <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 3h6v6m0-6-8 8M15 11v5H4V5h5" /></svg>
        </button>}
        <strong className="bet-slip-item-amount">{itemTotal.toLocaleString()}P</strong>
      </div>
      {expanded && <div className="bet-slip-inline-list">{combinations}</div>}
    </>}
    {item.duplicateApproval && <p className="bet-muted">중복 추가 승인됨</p>}
    {invalid && <p role="status">출전 정보가 바뀌었습니다. 이 항목을 삭제하고 다시 작성해 주세요.</p>}
  </li>;
}
