"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

const steps = [
  {
    title: "어떤 경주에 도전할까요?",
    text: "서울·부산경남·제주 경마장과 예정된 경주 또는 지난 경주를 선택합니다. 예정된 경주는 기본 보상, 지난 경주는 낮은 비율의 보상 정책을 적용할 예정입니다.",
    chips: ["예정된 경주", "지난 경주", "서울 경주"],
  },
  {
    title: "맞힐 조건, 승식을 선택해요.",
    text: "단승식은 선택한 말이 1등을 해야 적중합니다. 연승식은 일정 순위 안에 들어오는 말을 고르는 방식으로, 출전마 수에 따라 적중 순위가 달라집니다. 복승식은 1·2등 말 두 마리를 순서 없이 맞힙니다.",
    chips: ["단승식 · 1등", "연승식 · 상위 순위", "복승식 · 1·2등"],
  },
  {
    title: "출전마를 고르고 조합을 확인해요.",
    text: "해당 경주에 출전하는 말 번호를 선택합니다. 선택한 승식에 따라 자동으로 조합이 만들어지며, 제출 전 조합 수와 사용할 가상 포인트를 확인하도록 설계합니다.",
    chips: ["2번 출전마", "4번 출전마", "8번 출전마"],
  },
  {
    title: "예측 결과와 포인트를 확인해요.",
    text: "예정된 경주는 공식 결과가 확정된 후, 지난 경주는 별도 공정성 정책에 따라 가상 포인트를 산정할 계획입니다. 현재 체험판에서는 예측 결과를 정산하지 않으며 실제 보상도 지급하지 않습니다.",
    chips: ["예정 경주 · 기본 비율", "지난 경주 · 감액 비율", "내 기록 보기"],
  },
];

const stepLabels = ["경주 선택하기", "승식 이해하기", "출전마 선택하기", "포인트 확인하기"];

export default function TutorialPage() {
  const hash = useSyncExternalStore(
    (callback) => {
      window.addEventListener("hashchange", callback);
      return () => window.removeEventListener("hashchange", callback);
    },
    () => window.location.hash,
    () => "",
  );
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const index = selectedStep ?? (hash === "#bet-types" ? 1 : 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const setIndex = (step: number) => setSelectedStep(step);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div data-page="tutorial" className="app-root">
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
            <Link href="/#races" onClick={closeMenu}>모의베팅</Link>
            <Link href="/tutorial" aria-current="page" onClick={closeMenu}>이용가이드</Link>
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
        <section className="tutorial-hero">
          <div className="container">
            <div className="eyebrow">THE STARTING GATE</div>
            <h1>처음이라도,<br />천천히 시작하면 됩니다.</h1>
            <p>경주 선택부터 승식 이해, 조합 확인과 포인트까지.<br />한 단계씩 따라가는 모의베팅 가이드입니다.</p>
          </div>
        </section>

        <div className="container tutorial-layout">
          <nav className="step-nav" aria-label="튜토리얼 단계">
            {stepLabels.map((label, step) => (
              <button key={label} type="button" data-step={step} className={index === step ? "active" : ""} aria-current={index === step ? "step" : undefined} onClick={() => setIndex(step)}>
                {String(step + 1).padStart(2, "0")}　{label}
              </button>
            ))}
          </nav>
          <section className="tutorial-page" aria-live="polite">
            <div id="stepIndicator" className="eyebrow">STEP {String(index + 1).padStart(2, "0")} / 04</div>
            <h2 id="stepTitle">{steps[index].title}</h2>
            <p id="stepText">{steps[index].text}</p>
            <div className="chip-row" id="stepVisual">
              {steps[index].chips.map((chip, chipIndex) => <span className={`demo-chip ${chipIndex === 0 ? "active" : ""}`} key={chip}>{chip}</span>)}
            </div>
            <div className="tutorial-controls">
              <button className="btn border" type="button" id="stepPrev" disabled={index === 0} onClick={() => setIndex(Math.max(index - 1, 0))}>← 이전 단계</button>
              {index === steps.length - 1 ? (
                <Link className="btn" id="stepNext" href="/#races">경주 살펴보기 ↗</Link>
              ) : (
                <button className="btn" type="button" id="stepNext" onClick={() => setIndex(Math.min(index + 1, steps.length - 1))}>다음 단계 →</button>
              )}
            </div>
          </section>
        </div>

        <div className="container tutorial-note">
          <b>승식 기본 안내</b> · 단승식은 1등에 들어올 말을 맞히고, 복승식은 1·2등 말을 순서에 관계없이 맞힙니다. 연승식은 출전마 수에 따라 적중 순위 범위가 달라집니다. 정확한 승식 규칙과 데이터 처리는 실제 서비스 구현 단계에서 검증해야 합니다. 이 페이지는 학습용 데모입니다.
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div><Link className="brand" href="/" aria-label="TRACK:ON 홈"><span><span className="brand-main">TRACK:<em>ON</em></span><small>RACE DATA × YOUR INSIGHT</small></span></Link><p>경마 정보를 더 깊이 읽고, 가상 포인트로 예측을 연습하는<br />프리미엄 경마 데이터 플랫폼.</p></div>
            <nav className="footer-nav" aria-label="푸터 메뉴"><Link href="/#features">서비스 소개</Link><Link href="/tutorial">이용안내</Link><Link href="/#points">포인트 정책</Link><Link href="/#faq">FAQ</Link><Link href="/login">로그인</Link><Link href="/dashboard">대시보드</Link></nav>
          </div>
          <div className="footer-bottom"><span>© 2026 TRACK:ON · 비공식 서비스 UI 프로토타입</span><span>공공데이터 API · Google OAuth · 모의베팅 제출 · 포인트 정산은 연결되지 않았습니다. 실제 금전 거래는 제공하지 않습니다.</span></div>
        </div>
      </footer>
    </div>
  );
}
