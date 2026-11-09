"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemoState } from "@/lib/useDemoState";

export default function TrackonHeader({ section }: { section: "dashboard" | "betting" }) {
  const router = useRouter();
  const { balance } = useDemoState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const notify = (message: string) => { setAnnouncement(message); window.setTimeout(() => setAnnouncement(""), 3500); };
  return <>
    <div className="top-notice">RACE DATA, YOUR INSIGHT　·　<strong>DESIGN PROTOTYPE / SAMPLE DATA</strong></div>
    <header className="header"><div className="container header-inner"><Link className="brand" href="/" aria-label="TRACK:ON 홈"><span><span className="brand-main">TRACK:<em>ON</em></span><small>RACE DATA × YOUR INSIGHT</small></span></Link><nav className={`nav ${menuOpen ? "open" : ""}`} id="mainNav" aria-label="주요 메뉴"><Link href="/#races" onClick={() => setMenuOpen(false)}>경주정보</Link><Link className={section === "betting" ? "active" : ""} href="/dashboard#upcoming" onClick={() => setMenuOpen(false)}>모의베팅</Link><Link href="/tutorial" onClick={() => setMenuOpen(false)}>이용가이드</Link><Link href="/#ranking" onClick={() => setMenuOpen(false)}>랭킹</Link><Link className={section === "dashboard" ? "active" : ""} href="/dashboard" onClick={() => setMenuOpen(false)}>MY DASHBOARD</Link></nav><div className="header-tools"><button className="header-icon" type="button" onClick={() => notify("알림 기능은 실제 계정 연결 후 이용할 수 있습니다.")} aria-label="알림 보기">♧<span className="notify-dot" /></button><span className="points-chip"><span className="coin">P</span>{balance.toLocaleString()} P</span><details className="user-menu"><summary aria-label="프로필 메뉴"><span className="avatar">T</span><span className="username">데모 사용자</span><span aria-hidden="true">⌄</span></summary><div className="user-drop"><Link href="/dashboard">대시보드</Link><Link href="/dashboard#recent">내 예측 기록</Link><button type="button" onClick={() => { try { sessionStorage.removeItem("trackon-demo-login"); } catch {} router.push("/"); }}>데모 로그아웃</button></div></details></div><button className="mobile-toggle" type="button" aria-controls="mainNav" aria-expanded={menuOpen} aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "×" : "☰"}</button></div></header>
    <div className={`toast ${announcement ? "show" : ""}`} role="status" aria-live="polite">{announcement}</div>
  </>;
}
