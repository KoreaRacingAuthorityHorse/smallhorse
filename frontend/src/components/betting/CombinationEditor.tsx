"use client";

import { useEffect, useRef } from "react";
import { buildGroupCombinations, getBetTypeMeta, type TwoGroupPattern } from "@/lib/betting";
import type { RaceEntry } from "@/types/racing";
import { saddleStyle } from "@/components/past-race/saddle";
import { Check } from "lucide-react";

export default function CombinationEditor({ open, type, groups, pattern, entries, stake, showHorseNames, onGroupsChange, onPatternChange, onClose }: {
  open: boolean;
  type: Parameters<typeof getBetTypeMeta>[0];
  groups: number[][];
  pattern: TwoGroupPattern;
  entries: RaceEntry[];
  stake: string;
  showHorseNames: boolean;
  onGroupsChange: (groups: number[][]) => void;
  onPatternChange: (pattern: TwoGroupPattern) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const combinations = buildGroupCombinations(type, { groups, pattern }, entries);
  const total = Number(stake) * combinations.length;

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

  const toggle = (index: number, horseNo: number) => {
    if (!groups[index]?.includes(horseNo) && groups.some((group, groupIndex) => groupIndex !== index && group.includes(horseNo))) return;
    onGroupsChange(groups.map((group, groupIndex) => groupIndex !== index
      ? group
      : group.includes(horseNo) ? group.filter((value) => value !== horseNo) : [...group, horseNo]));
  };

  return <>
    <dialog ref={dialogRef} className="bet-combination-dialog" aria-labelledby="bet-combination-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="bet-combination-head"><div><p className="bet-step">COMBINATION BUILDER</p><h2 id="bet-combination-title">조합 편집</h2></div><button type="button" className="bet-horse-dialog-close" onClick={onClose}>닫기</button></div>
      {type === "TRIO" && groups.length === 2 && <div className="bet-combination-controls">
        <label>조합 배치 <select value={pattern} onChange={(event) => onPatternChange(event.target.value === "2+1" ? "2+1" : "1+2")}><option value="1+2">1+2</option><option value="2+1">2+1</option></select></label>
      </div>}
      <div className="bet-combination-groups">{groups.map((group, index) => <div key={index} className="bet-combination-group-row" role="group" aria-label={`마번 선택 줄 ${index + 1}`}>
        <div className="bet-horse-choices">{entries.map((entry) => {
          const selected = group.includes(entry.horseNo);
          const selectedInOtherGroup = groups.some((otherGroup, groupIndex) => groupIndex !== index && otherGroup.includes(entry.horseNo));
          return <button key={entry.horseNo} type="button" aria-pressed={selected} className={selected ? "active" : ""} disabled={entry.scratched || (!selected && selectedInOtherGroup)} aria-label={`${entry.horseNo}번${showHorseNames && entry.horseName ? ` ${entry.horseName}` : ""} ${selected ? "선택 해제" : selectedInOtherGroup ? "다른 라인에서 선택됨" : "선택"}`} data-tooltip={showHorseNames && entry.horseName ? entry.horseName : undefined} onClick={() => toggle(index, entry.horseNo)}>{selected && <span className="bet-horse-selection-tab" aria-hidden="true"><Check size={11} strokeWidth={3} /></span>}<span className="bet-saddle bet-combination-saddle" style={saddleStyle(entry.horseNo)} aria-hidden="true">{entry.horseNo}</span></button>;
        })}</div>
      </div>)}</div>
      <section className="bet-combination-preview" aria-live="polite"><h3>조합 미리보기</h3><p>{combinations.length.toLocaleString()}개 · 총 {Number.isFinite(total) ? total.toLocaleString() : "0"}P</p>
        {combinations.length === 0 ? <p className="bet-muted">마번을 선택하면 조합이 표시됩니다.</p> : <ol>{combinations.slice(0, 24).map((combination, index) => <li key={`${combination.map(({ horseNo }) => horseNo).join("-")}-${index}`}>{combination.map(({ horseNo, position }) => `${position ? `${position}위 ` : ""}${horseNo}번`).join(" · ")}</li>)}</ol>}
        {combinations.length > 24 && <p className="bet-muted">외 {combinations.length - 24}개 조합</p>}
      </section>
      <button type="button" className="bet-button" onClick={onClose}>편집 완료</button>
    </dialog>
  </>;
}
