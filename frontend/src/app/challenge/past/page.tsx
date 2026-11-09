import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AppHeader from "@/components/AppHeader";
import PastRaceGame from "@/components/past-race/PastRaceGame";

export const metadata: Metadata = {
  title: "지난 경주 도전 | TRACK:ON",
  description: "실제로 열렸던 경주를 날짜와 마명을 가린 채 다시 보고, 가상 포인트로 모의베팅해 보는 연습 모드입니다.",
};

export default function PastChallengePage() {
  return (
    <div data-page="dashboard" className="app-root">
      <AppHeader active="bet-past" />
      <main>
        <section className="dash-hero">
          <div className="container dash-hero-inner">
            <div>
              <div className="eyebrow">PAST CHALLENGE　/　BLIND RACE</div>
              <h1>
                지나간 승부에,
                <br />
                <em>다시 도전하다.</em>
              </h1>
              <p>
                실제로 열렸던 경주를 날짜와 마명을 가린 채 보여드려요.
                <br />
                출전표를 읽고 가상 포인트로 베팅하면, 실제 기록으로 경주를 다시 달리고 확정 배당으로 정산해요.
              </p>
            </div>
            <span className="badge gold">SAMPLE DATA · 20경주</span>
          </div>
        </section>
        {/* PastRaceGame은 URL의 ?venue를 읽으므로 Suspense 안에 둔다(Cache Components 규칙) */}
        <Suspense fallback={<div className="container" style={{ padding: "60px 0", color: "var(--muted)" }}>경주를 불러오는 중이에요…</div>}>
          <PastRaceGame />
        </Suspense>
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <Link className="brand" href="/">
                <span>
                  <span className="brand-main">TRACK:<em>ON</em></span>
                  <small>RACE DATA × YOUR INSIGHT</small>
                </span>
              </Link>
              <p>
                경마 정보를 더 깊이 읽고, 가상 포인트로 예측을 연습하는
                <br />
                프리미엄 경마 데이터 플랫폼.
              </p>
            </div>
            <nav className="footer-nav" aria-label="푸터 메뉴">
              <Link href="/tutorial">이용안내</Link>
              <Link href="/#points">포인트 정책</Link>
              <Link href="/#faq">FAQ</Link>
              <Link href="/dashboard">대시보드</Link>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>데이터: 한국마사회 공공데이터 OpenAPI · 2023~2026년 실제 경주 중 표본 20개</span>
            <span>가상 포인트는 현금이나 상품으로 바꿀 수 없고, 실제 마권 구매와 관계없습니다.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
