"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY } from "@/lib/past-race/pools";
import styles from "./past-race.module.css";

/** 밑줄 친 용어를 누르면 쉬운 설명을 띄운다. 표의 스크롤 영역에 잘리지 않도록 body에 포털로 그린다. */
export default function Term({ term, children }: { term: keyof typeof GLOSSARY | string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();
  const text = GLOSSARY[term];

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      setPos(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [pos]);

  if (!text) return <>{children}</>;

  const toggle = () => {
    if (pos) return setPos(null);
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const width = 260;
    setPos({ left: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)), top: r.bottom + 6 });
  };

  return (
    <>
      <button ref={ref} type="button" className={styles.term} onClick={toggle} aria-expanded={!!pos} aria-describedby={pos ? id : undefined}>
        {children}
      </button>
      {pos &&
        createPortal(
          <div id={id} role="tooltip" className={styles.termPop} style={{ left: pos.left, top: pos.top }}>
            <b>{children}</b>
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
