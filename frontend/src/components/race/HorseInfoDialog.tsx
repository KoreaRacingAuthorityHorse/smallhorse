"use client";

import { useEffect, useRef } from "react";
import type { RaceEntry } from "@/types/racing";
import EntryTable from "./EntryTable";

export default function HorseInfoDialog({ open, entries, selected, onToggle, onClose }: {
  open: boolean;
  entries: RaceEntry[];
  selected: number[];
  onToggle: (horseNo: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
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

  return <dialog ref={dialogRef} className="bet-horse-dialog" aria-labelledby="bet-horse-dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="bet-horse-dialog-head"><div><p className="bet-step">RACE ENTRIES</p><h2 id="bet-horse-dialog-title">출전마 정보</h2></div><button type="button" className="bet-horse-dialog-close" onClick={onClose}>닫기</button></div>
    <p className="bet-muted">번호를 누르면 베팅 선택에 반영됩니다. 제공되지 않은 경주 자료는 미제공으로 표시합니다.</p>
    <EntryTable entries={entries} selected={selected} onToggle={onToggle} detailed />
  </dialog>;
}
