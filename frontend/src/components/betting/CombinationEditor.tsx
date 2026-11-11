"use client";

import { useEffect, useRef } from "react";
import { buildGroupCombinations, getBetTypeMeta, type TwoGroupPattern } from "@/lib/betting";
import type { RaceEntry } from "@/types/racing";

export default function CombinationEditor({ open, type, groups, pattern, entries, stake, onGroupsChange, onPatternChange, onOpen, onClose }: {
  open: boolean;
  type: Parameters<typeof getBetTypeMeta>[0];
  groups: number[][];
  pattern: TwoGroupPattern;
  entries: RaceEntry[];
  stake: string;
  onGroupsChange: (groups: number[][]) => void;
  onPatternChange: (pattern: TwoGroupPattern) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const meta = getBetTypeMeta(type);
  const combinations = buildGroupCombinations(type, { groups, pattern }, entries);
  const total = Number(stake) * combinations.length;
  const names = new Map(entries.map((entry) => [entry.horseNo, entry.horseName]));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      const y = window.scrollY;
      const oldOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = oldOverflow;
        window.scrollTo(0, y);
        returnFocus.current?.focus({ preventScroll: true });
      };
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const toggle = (index: number, horseNo: number) => onGroupsChange(groups.map((group, groupIndex) => groupIndex !== index
    ? group
    : group.includes(horseNo) ? group.filter((value) => value !== horseNo) : [...group, horseNo]));

  return <>
    <button type="button" className="bet-button bet-combination-open" aria-haspopup="dialog" onClick={onOpen}>조합 편집 열기</button>
    <dialog ref={dialogRef} className="bet-combination-dialog" aria-labelledby="bet-combination-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="bet-combination-head"><div><p className="bet-step">COMBINATION BUILDER</p><h2 id="bet-combination-title">조합 편집</h2></div><button type="button" className="bet-horse-dialog-close" onClick={onClose}>닫기</button></div>
      <div className="bet-combination-controls">
        <label>그룹 수 <select value={groups.length} onChange={(event) => onGroupsChange(Array.from({ length: Number(event.target.value) }, (_, index) => groups[index] ?? []))}>{Array.from({ length: meta.requiredCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
        {type === "TRIO" && groups.length === 2 && <label>그룹 배분 <select value={pattern} onChange={(event) => onPatternChange(event.target.value === "2+1" ? "2+1" : "1+2")}><option value="1+2">1+2</option><option value="2+1">2+1</option></select></label>}
      </div>
      <div className="bet-combination-groups">{groups.map((group, index) => <fieldset key={index}>
        <legend>{index + 1}그룹{meta.ordered && groups.length === meta.requiredCount ? ` · ${index + 1}위` : ""}</legend>
        <div className="bet-horse-choices">{entries.map((entry) => <button key={entry.horseNo} type="button" aria-pressed={group.includes(entry.horseNo)} className={group.includes(entry.horseNo) ? "active" : ""} disabled={entry.scratched} onClick={() => toggle(index, entry.horseNo)}><strong>{entry.horseNo}</strong><small>{entry.horseName}</small></button>)}</div>
      </fieldset>)}</div>
      <section className="bet-combination-preview" aria-live="polite"><h3>조합 미리보기</h3><p>{combinations.length.toLocaleString()}개 · 총 {Number.isFinite(total) ? total.toLocaleString() : "0"}P</p>
        {combinations.length === 0 ? <p className="bet-muted">마번을 선택하면 조합이 표시됩니다.</p> : <ol>{combinations.slice(0, 24).map((combination, index) => <li key={`${combination.map(({ horseNo }) => horseNo).join("-")}-${index}`}>{combination.map(({ horseNo, position }) => `${position ? `${position}위 ` : ""}${horseNo}번 ${names.get(horseNo) ?? ""}`).join(" · ")}</li>)}</ol>}
        {combinations.length > 24 && <p className="bet-muted">외 {combinations.length - 24}개 조합</p>}
      </section>
      <button type="button" className="bet-button" onClick={onClose}>편집 완료</button>
    </dialog>
  </>;
}
