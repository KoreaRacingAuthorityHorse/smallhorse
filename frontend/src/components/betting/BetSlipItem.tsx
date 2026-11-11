"use client";

import { calculateTotalStake, getBetTypeMeta, selectionKey } from "@/lib/betting";
import type { BetSlipItem as SlipItem } from "@/types/racing";

export default function BetSlipItem({ item, invalid, onRemove }: { item: SlipItem; invalid?: boolean; onRemove: () => void }) {
  const label = getBetTypeMeta(item.betType).label;
  return <li className="bet-slip-item">
    <div className="bet-slip-item-head"><strong>{label} · {item.mode === "individual" ? "개별" : "조합 그룹"}</strong>
      <button type="button" className="bet-slip-remove" aria-label={`${label} ${item.mode === "combination" ? "그룹" : "항목"} 삭제`} onClick={onRemove}>삭제</button></div>
    <p>{item.combinations.length}조합 · {calculateTotalStake(item.combinations).toLocaleString()}P</p>
    {item.mode === "combination" ? <details><summary>그룹 조합 펼치기</summary><ol>{item.combinations.map((line) =>
      <li key={line.lineId}>{selectionKey(line.selections, line.betType)} · {line.unitStake.toLocaleString()}P</li>)}</ol></details> :
      <p>마번 {selectionKey(item.combinations[0].selections, item.betType)} · {item.combinations[0].unitStake.toLocaleString()}P</p>}
    {item.duplicateApproval && <p className="bet-muted">중복 추가 승인됨</p>}
    {invalid && <p role="status">출전 정보가 바뀌었습니다. 이 항목을 삭제하고 다시 작성해 주세요.</p>}
  </li>;
}
