"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  const handleGoogleLogin = () => {
    showToast(
      "Google 인증은 아직 연결되지 않았습니다. 아래 데모 계정 버튼으로 대시보드 화면을 확인할 수 있습니다."
    );
  };

  const handleDemoLogin = () => {
    try {
      sessionStorage.setItem("trackon-demo-login", "1");
    } catch {
      // sessionStorage might be restricted in some environments
    }
    router.push("/dashboard");
  };

  return (
    <div data-page="login" className="app-root">
      {/* Top Notice */}
      <div className="top-notice">
        RACE DATA, YOUR INSIGHT &nbsp; · &nbsp;{" "}
        <strong>DESIGN PROTOTYPE / SAMPLE DATA</strong>
      </div>

      {/* Header */}
      <header className="header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="TRACK:ON 홈">
            <span>
              <span className="brand-main">
                TRACK:<em>ON</em>
              </span>
              <small>RACE DATA × YOUR INSIGHT</small>
            </span>
          </Link>
          <nav
            className={`nav ${menuOpen ? "open" : ""}`}
            id="mainNav"
            aria-label="주요 메뉴"
          >
            <Link href="/#races" onClick={() => setMenuOpen(false)}>
              경주정보
            </Link>
            <Link href="/#races" onClick={() => setMenuOpen(false)}>
              모의베팅
            </Link>
            <Link href="/tutorial" onClick={() => setMenuOpen(false)}>
              이용가이드
            </Link>
            <Link href="/#ranking" onClick={() => setMenuOpen(false)}>
              랭킹
            </Link>
          </nav>
          <div className="header-tools">
            <Link className="header-login" href="/login">
              Google 로그인
            </Link>
            <Link className="btn small" href="/login">
              시작하기 <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <button
            className="mobile-toggle"
            id="menuToggle"
            type="button"
            aria-controls="mainNav"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Main Auth Section */}
      <main className="auth-wrap">
        <section className="auth-art">
          <div>
            <div className="eyebrow">MEMBERS ONLY / TRACK:ON</div>
            <h1>
              경주의 순간을,
              <br />
              <em>당신의 기록으로.</em>
            </h1>
            <p>
              더 깊은 정보, 더 나은 예측.
              <br />
              모의베팅과 포인트 기록을 하나로 연결합니다.
            </p>
          </div>
          <div className="auth-art-foot">
            <span>RACE INFORMATION</span>
            <span>VIRTUAL POINTS</span>
            <span>YOUR HISTORY</span>
          </div>
        </section>

        <section className="auth-main">
          <div className="auth-card">
            <div className="eyebrow">WELCOME BACK</div>
            <h2>
              TRACK:ON에서
              <br />
              당신의 경주를 시작하세요.
            </h2>
            <p>
              서비스는 Google 계정 로그인 방식을 사용할 예정입니다. 지금은 계정
              연결 없이 화면을 미리 살펴볼 수 있습니다.
            </p>
            <button
              type="button"
              id="googleLogin"
              className="google-button"
              onClick={handleGoogleLogin}
            >
              <span className="google-g" aria-hidden="true">
                G
              </span>{" "}
              Google 계정으로 계속하기
            </button>
            <div className="auth-separator">또는</div>
            <button
              type="button"
              className="btn block"
              id="demoLogin"
              onClick={handleDemoLogin}
            >
              샘플 계정으로 대시보드 체험하기 ↗
            </button>
            <div className="auth-info">
              <b style={{ color: "var(--wine)" }}>프로토타입 안내</b>
              <br />
              Google 버튼은 실제 계정 로그인 기능이 아닙니다. 데모 계정은
              브라우저에만 일부 체험 기록을 보관하며, 서버·금전·실제 포인트
              데이터와 연결되지 않습니다.
            </div>
            <Link href="/#races" className="back-link">
              ← 로그인 없이 경주정보 보기
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <Link className="brand" href="/" aria-label="TRACK:ON 홈">
                <span>
                  <span className="brand-main">
                    TRACK:<em>ON</em>
                  </span>
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
              <Link href="/#features">서비스 소개</Link>
              <Link href="/tutorial">이용안내</Link>
              <Link href="/#points">포인트 정책</Link>
              <Link href="/#faq">FAQ</Link>
              <Link href="/login">로그인</Link>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>© 2026 TRACK:ON · 비공식 서비스 UI 프로토타입</span>
            <span>
              공공데이터 API · Google OAuth · 모의베팅 제출 · 포인트 정산은
              연결되지 않았습니다. 실제 금전 거래는 제공하지 않습니다.
            </span>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      <div
        id="toast"
        className={`toast ${toastVisible ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </div>
  );
}
