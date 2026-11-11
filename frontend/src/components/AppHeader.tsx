"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/demo-wallet";
import styles from "./AppHeader.module.css";

// 서비스 화면 공통 헤더. 구조와 반응형 배치는 CSS Module로 격리한다.
// "모의베팅" 메뉴는 랜딩(src/app/page.tsx)과 같은 하위 메뉴(예정 경주 예측 / 지난 경주 도전)를 쓴다.
// 기존 페이지들은 아직 각자 헤더를 복사해 쓰고 있어, 이후 이 컴포넌트로 합칠 수 있다.
type Section = "races" | "bet-upcoming" | "bet-past" | "guide" | "ranking" | "dashboard";

export default function AppHeader({ active }: { active?: Section }) {
  const [open, setOpen] = useState(false);
  const wallet = useWallet();
  const navRef = useRef<HTMLElement>(null);
  const cls = (key: Section) => (active === key ? "active" : undefined);
  const betActive = active === "bet-upcoming" || active === "bet-past";

  const closeAll = () => {
    setOpen(false);
    navRef.current?.querySelectorAll("details").forEach((d) => (d.open = false));
  };

  // 바깥을 누르거나 Esc를 누르면 하위 메뉴를 닫는다
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        navRef.current.querySelectorAll("details").forEach((d) => (d.open = false));
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navRef.current?.querySelectorAll("details").forEach((d) => (d.open = false));
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <div className={styles.notice}>
        RACE DATA, YOUR INSIGHT　·　<strong>DESIGN PROTOTYPE / SAMPLE DATA</strong>
      </div>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link className={styles.brand} href="/" aria-label="TRACK:ON 홈" onClick={closeAll}>
            <span>
              <span className={styles.brandMain}>TRACK:<em>ON</em></span>
              <small>RACE DATA × YOUR INSIGHT</small>
            </span>
          </Link>
          <nav ref={navRef} className={`${styles.nav} ${open ? styles.navOpen : ""}`} id="mainNav" aria-label="주요 메뉴">
            <Link className={`${styles.navLink} ${cls("races") ? styles.activeLink : ""}`} href="/#races" onClick={closeAll}>경주정보</Link>
            <details className={styles.dropdown}>
              <summary className={`${styles.summary} ${betActive ? styles.active : ""}`}>
                모의베팅 <span className={styles.chevron}></span>
              </summary>
              <div className={styles.panel}>
                <Link href="/#races" onClick={closeAll} aria-current={active === "bet-upcoming" ? "page" : undefined}>
                  예정 경주 예측<small>경주 전 결과 예측하기</small>
                </Link>
                <Link href="/challenge/past" onClick={closeAll} aria-current={active === "bet-past" ? "page" : undefined}>
                  지난 경주 도전<small>이전 경주로 연습하기</small>
                </Link>
              </div>
            </details>
            <Link className={`${styles.navLink} ${cls("guide") ? styles.activeLink : ""}`} href="/tutorial" onClick={closeAll}>이용가이드</Link>
            <Link className={`${styles.navLink} ${cls("ranking") ? styles.activeLink : ""}`} href="/#ranking" onClick={closeAll}>랭킹</Link>
            <Link className={`${styles.navLink} ${cls("dashboard") ? styles.activeLink : ""}`} href="/dashboard" onClick={closeAll}>MY DASHBOARD</Link>
          </nav>
          <div className={styles.tools}>
            <span className={styles.points} aria-label="보유 체험 포인트">
              <span className={styles.coin}>P</span>
              {wallet ? wallet.balance.toLocaleString("ko-KR") : "-"} P
            </span>
          </div>
          <button
            className={styles.mobileToggle}
            type="button"
            aria-controls="mainNav"
            aria-expanded={open}
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen(!open)}
          >
            {open ? "×" : "☰"}
          </button>
        </div>
      </header>
    </>
  );
}
