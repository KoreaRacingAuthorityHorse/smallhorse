"use client";

import { useState } from "react";
import Link from "next/link";
import RaceTab from "./_components/RaceTab";
import PeopleTab from "./_components/PeopleTab";
import HorseTab from "./_components/HorseTab";
import DataTab from "./_components/DataTab";

const tabs = [
  { key: "race", label: "경주" },
  { key: "people", label: "기수·조교사" },
  { key: "horse", label: "경주마" },
  { key: "data", label: "데이터 소개" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function RaceDataPage() {
  const [tab, setTab] = useState<TabKey>("race");
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div data-page="race-data" className="app-root">
      <div className="top-notice">
        RACE DATA, YOUR INSIGHT　·　<strong>DESIGN PROTOTYPE / SAMPLE DATA</strong>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="TRACK:ON 홈" onClick={closeMenu}>
            <span><span className="brand-main">TRACK:<em>ON</em></span><small>RACE DATA × YOUR INSIGHT</small></span>
          </Link>
          <nav className={`nav ${menuOpen ? "open" : ""}`} id="mainNav" aria-label="주요 메뉴">
            <Link href="/#races" onClick={closeMenu}>경주정보</Link>
            <Link href="/race-data" aria-current="page" className="active" onClick={closeMenu}>경주데이터</Link>
            <Link href="/#races" onClick={closeMenu}>모의베팅</Link>
            <Link href="/tutorial" onClick={closeMenu}>이용가이드</Link>
            <Link href="/#ranking" onClick={closeMenu}>랭킹</Link>
          </nav>
          <div className="header-tools">
            <Link className="header-login" href="/login">Google 로그인</Link>
            <Link className="btn small" href="/login">시작하기 <span aria-hidden="true">↗</span></Link>
          </div>
          <button className="mobile-toggle" id="menuToggle" type="button" aria-controls="mainNav" aria-expanded={menuOpen} aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </header>

      <main>
        <section className="rd-hero">
          <div className="container">
            <div className="eyebrow">RACE DATA ARCHIVE</div>
            <h1>숫자 속에 숨은<br />경주의 흐름을 읽어보세요.</h1>
            <p>출전표와 결과, 구간별 순위와 배당률부터 기수·경주마 성적까지.<br />한국마사회 공개 데이터를 한곳에 정리했습니다.</p>
          </div>
        </section>

        <div className="container rd-body">
          <nav className="rd-subnav" aria-label="경주데이터 보기">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-current={tab === t.key ? "page" : undefined}
                onClick={() => { setTab(t.key); window.scrollTo({ top: 0 }); }}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "race" && <RaceTab />}
          {tab === "people" && <PeopleTab />}
          {tab === "horse" && <HorseTab />}
          {tab === "data" && <DataTab />}

          <p className="rd-demo">데모 화면 · 말과 사람 이름, 수치는 모두 가상 데이터예요</p>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div><Link className="brand" href="/" aria-label="TRACK:ON 홈"><span><span className="brand-main">TRACK:<em>ON</em></span><small>RACE DATA × YOUR INSIGHT</small></span></Link><p>경마 정보를 더 깊이 읽고, 가상 포인트로 예측을 연습하는<br />프리미엄 경마 데이터 플랫폼.</p></div>
            <nav className="footer-nav" aria-label="푸터 메뉴"><Link href="/#features">서비스 소개</Link><Link href="/race-data">경주데이터</Link><Link href="/tutorial">이용안내</Link><Link href="/#points">포인트 정책</Link><Link href="/#faq">FAQ</Link><Link href="/login">로그인</Link></nav>
          </div>
          <div className="footer-bottom"><span>© 2026 TRACK:ON · 비공식 서비스 UI 프로토타입</span><span>공공데이터 API · Google OAuth · 모의베팅 제출 · 포인트 정산은 연결되지 않았습니다. 실제 금전 거래는 제공하지 않습니다.</span></div>
        </div>
      </footer>
    </div>
  );
}
