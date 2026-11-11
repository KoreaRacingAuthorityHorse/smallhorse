"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function SlipDialog({ open, title, onClose, children, fullScreen = false, className = "" }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode; fullScreen?: boolean; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);
  return <dialog ref={ref} className={`bet-slip-dialog ${fullScreen ? "bet-slip-fullscreen" : ""} ${className}`}
    aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="bet-horse-dialog-head"><h2>{title}</h2><button className="bet-horse-dialog-close" type="button" onClick={onClose}>닫기</button></div>
    {children}
  </dialog>;
}
