"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getRaces } from "@/data/races";
import type { RaceStatus } from "@/types/racing";

interface Race {
  id: string;
  type: "upcoming" | "past";
  venue: string;
  round: string;
  date: string;
  time: string;
  horses: number;
  distance: string;
  status: RaceStatus;
}

const sampleRaces: Race[] = getRaces().map((race) => ({
  id: race.id,
  type: race.status === "FINISHED" ? "past" : "upcoming",
  venue: { SEOUL: "서울", BUSAN: "부산경남", JEJU: "제주" }[race.trackCode],
  round: String(race.raceNo).padStart(2, "0"),
  date: `${race.raceDate.replaceAll("-", ".")} (${["일", "월", "화", "수", "목", "금", "토"][new Date(`${race.raceDate}T00:00:00Z`).getUTCDay()]})`,
  time: race.startTime,
  horses: race.entryCount,
  distance: `${race.distance.toLocaleString()}m`,
  status: race.status,
}));
const statusLabels: Record<RaceStatus, string> = { SCHEDULED: "예정", OPEN: "구매 가능", CLOSED: "마감", CANCELLED: "취소", FINISHED: "종료" };

export default function HomePage() {
  const [raceType, setRaceType] = useState<"upcoming" | "past">("upcoming");
  const [venue, setVenue] = useState<string>("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navShellRef = useRef<HTMLDivElement>(null);
  const trackFillRef = useRef<HTMLSpanElement>(null);
  const journeySectionRef = useRef<HTMLElement>(null);

  // Close dropdown details when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navShellRef.current && !navShellRef.current.contains(e.target as Node)) {
        const detailsList = navShellRef.current.querySelectorAll("details");
        detailsList.forEach((d) => (d.open = false));
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        if (navShellRef.current) {
          const detailsList = navShellRef.current.querySelectorAll("details");
          detailsList.forEach((d) => (d.open = false));
        }
      }
    }

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Progressive scroll reveal and journey track fill
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const revealTargets = document.querySelectorAll(
        ".section-heading, .race-card, .mode-card, .intel-feature, .journey-step, .point-card, .leaderboard, .faq-list"
      );
      revealTargets.forEach((el) => el.classList.add("reveal"));

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px 25px 0px" }
      );

      revealTargets.forEach((el) => observer.observe(el));

      const updateTrack = () => {
        if (!journeySectionRef.current || !trackFillRef.current) return;
        const rect = journeySectionRef.current.getBoundingClientRect();
        const progress = Math.max(
          0,
          Math.min(1, (window.innerHeight - rect.top) / (rect.height + window.innerHeight * 0.1))
        );
        if (window.innerWidth <= 680) {
          trackFillRef.current.style.height = `${progress * 100}%`;
          trackFillRef.current.style.width = "100%";
        } else {
          trackFillRef.current.style.width = `${progress * 100}%`;
          trackFillRef.current.style.height = "100%";
        }
      };

      updateTrack();
      window.addEventListener("scroll", updateTrack, { passive: true });
      window.addEventListener("resize", updateTrack, { passive: true });

      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", updateTrack);
        window.removeEventListener("resize", updateTrack);
      };
    }
  }, [raceType, venue]);

  const filteredRaces = sampleRaces
    .filter((r) => r.type === raceType && (venue === "all" || r.venue === venue))
    .slice(0, 3);

  const raceName = (r: Race) => `${r.venue} 제${Number(r.round)}경주`;

  const handleDropdownToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const target = e.currentTarget;
    if (target.open && navShellRef.current) {
      const allDetails = navShellRef.current.querySelectorAll("details");
      allDetails.forEach((d) => {
        if (d !== target) d.open = false;
      });
    }
  };

  const closeDropdownsAndMenu = () => {
    if (navShellRef.current) {
      const allDetails = navShellRef.current.querySelectorAll("details");
      allDetails.forEach((d) => (d.open = false));
    }
    setMobileMenuOpen(false);
  };

  const handleViewChange = (type: "upcoming" | "past") => {
    setRaceType(type);
    setVenue("all");
    closeDropdownsAndMenu();
  };

  return (
    <div data-page="home" className="landing-root">
      {/* Top Announcement */}
      <div className="announce">
        <div className="container announce-inner">
          <span className="announce-led"></span>
          <span>THE RACE STARTS HERE</span>
          <span className="announce-separator"></span>
          <span>공공데이터 기반 경마 정보 · 가상 포인트 모의베팅</span>
          <span className="announce-right">
            DESIGN PROTOTYPE <span>◆</span> SAMPLE DATA
          </span>
        </div>
      </div>

      {/* Site Header */}
      <header className="site-header" id="top">
        <div className="container nav-shell" ref={navShellRef}>
          <Link className="brand" href="/" aria-label="트랙온 홈" onClick={closeDropdownsAndMenu}>
            <span className="brand-emblem" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="brand-word">
              TRACK<span>:ON</span>
            </span>
          </Link>

          <nav aria-label="주요 메뉴">
            <ul className={`nav-menu ${mobileMenuOpen ? "open" : ""}`} id="navMenu">
              <li>
                <details className="nav-dropdown" onToggle={handleDropdownToggle}>
                  <summary>
                    경주정보 <span className="chevron"></span>
                  </summary>
                  <div className="dropdown-panel">
                    <a
                      href="#races"
                      onClick={() => {
                        handleViewChange("upcoming");
                      }}
                    >
                      예정된 경주<small>경주 일정 및 출전 정보</small>
                    </a>
                    <a
                      href="#races"
                      onClick={() => {
                        handleViewChange("past");
                      }}
                    >
                      지난 경주<small>이전 경주 기록 살펴보기</small>
                    </a>
                  </div>
                </details>
              </li>
              <li>
                <details className="nav-dropdown" onToggle={handleDropdownToggle}>
                  <summary>
                    모의베팅 <span className="chevron"></span>
                  </summary>
                  <div className="dropdown-panel">
                    <a
                      href="#races"
                      onClick={() => {
                        handleViewChange("upcoming");
                      }}
                    >
                      예정 경주 예측<small>경주 전 결과 예측하기</small>
                    </a>
                    <a
                      href="#races"
                      onClick={() => {
                        handleViewChange("past");
                      }}
                    >
                      지난 경주 보기<small>종료된 경주 살펴보기</small>
                    </a>
                  </div>
                </details>
              </li>
              <li>
                <details className="nav-dropdown" onToggle={handleDropdownToggle}>
                  <summary>
                    이용가이드 <span className="chevron"></span>
                  </summary>
                  <div className="dropdown-panel">
                    <Link href="/tutorial" onClick={closeDropdownsAndMenu}>
                      시작하기<small>모의베팅 4단계</small>
                    </Link>
                    <Link href="/tutorial#bet-types" onClick={closeDropdownsAndMenu}>
                      승식 안내<small>단승·연승·복승 등</small>
                    </Link>
                    <a href="#points" onClick={closeDropdownsAndMenu}>
                      포인트 정책<small>모의베팅 보상 안내</small>
                    </a>
                  </div>
                </details>
              </li>
              <li>
                <a href="#ranking" onClick={closeDropdownsAndMenu}>
                  랭킹
                </a>
              </li>
            </ul>
          </nav>

          <div className="nav-actions">
            <Link className="login-link" href="/login">
              Google 로그인
            </Link>
            <Link href="/login" className="button button-red button-small">
              시작하기 <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <button
            className="mobile-toggle"
            id="mobileToggle"
            aria-expanded={mobileMenuOpen}
            aria-controls="navMenu"
            aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero" aria-labelledby="heroTitle">
          <div className="hero-photo" role="img" aria-label="먼지를 일으키며 결승선을 향해 질주하는 경주마와 기수"></div>
          <div className="hero-screen"></div>
          <div className="hero-speed" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <div className="container hero-layout">
            <div className="hero-content">
              <div className="hero-kicker">
                <span className="live-dot"></span>
                <span>DATA MEETS PASSION</span>
                <span className="kicker-bar"></span>
                <span>01 / 03</span>
              </div>
              <h1 id="heroTitle">
                모든 경주에는
                <br />
                <span>당신의 예측이</span>
                <br />
                있다<span className="hero-period">.</span>
              </h1>
              <p className="hero-description">
                경주 데이터를 읽는 순간부터 결과를 예측하는 짜릿함까지.{" "}
                <br className="desktop-only" />
                실제 돈 대신 가상 포인트로, 나만의 레이스를 시작하세요.
              </p>
              <div className="hero-actions">
                <a
                  href="#races"
                  className="button button-red button-large"
                  onClick={() => handleViewChange("upcoming")}
                >
                  예정된 경주 도전 <span aria-hidden="true">↗</span>
                </a>
                <a href="#modes" className="button button-glass button-large">
                  서비스 둘러보기 <span aria-hidden="true">→</span>
                </a>
              </div>
              <div className="hero-mini">
                <span>
                  <i>01</i> 공공데이터 기반 정보
                </span>
                <span>
                  <i>02</i> 예정 · 지난 경주
                </span>
                <span>
                  <i>03</i> 가상 포인트
                </span>
              </div>
            </div>
            <div className="hero-side-note" aria-hidden="true">
              <span>RACE DATA / YOUR INSIGHT</span>
              <span>TRACK:ON EDITORIAL — 2026</span>
            </div>
          </div>
          <div className="hero-bottom">
            <div className="container hero-bottom-inner">
              <a href="#races" className="scroll-prompt">
                <span className="scroll-arrow">↓</span>
                <span>SCROLL TO EXPLORE</span>
              </a>
              <div className="hero-badge">
                <span className="badge-slash"></span>
                <span>
                  REAL RACING DATA
                  <br />
                  VIRTUAL RACING EXPERIENCE
                </span>
              </div>
              <span className="hero-watermark" aria-hidden="true">
                RACE.
              </span>
            </div>
          </div>
        </section>

        {/* Marquee Ticker */}
        <div className="race-ticker" aria-label="서비스 주요 기능">
          <div className="ticker-track" aria-hidden="true">
            <span>RACE INFORMATION</span>
            <b>✦</b>
            <span>MAKE YOUR PICK</span>
            <b>✦</b>
            <span>VIRTUAL POINTS</span>
            <b>✦</b>
            <span>YOUR RACE. YOUR CALL.</span>
            <b>✦</b>
            <span>RACE INFORMATION</span>
            <b>✦</b>
            <span>MAKE YOUR PICK</span>
            <b>✦</b>
            <span>VIRTUAL POINTS</span>
            <b>✦</b>
            <span>YOUR RACE. YOUR CALL.</span>
            <b>✦</b>
          </div>
        </div>

        {/* 01 / Race Center */}
        <section className="section race-section" id="races" aria-labelledby="racesTitle">
          <div className="container">
            <div className="section-topline">
              <span>01 / RACE CENTER</span>
              <span>YOUR NEXT MOVE STARTS HERE</span>
            </div>
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  RACE INFORMATION <span className="red-slash">/</span> SIMULATION
                </p>
                <h2 id="racesTitle">
                  경주를 살펴보고,
                  <br />
                  <strong>다음 선택을 준비하세요.</strong>
                </h2>
              </div>
              <p>
                예정된 경주와 종료된 경주의 정보를 살펴보세요. 실제 서비스에서는 공공데이터 API를 연결해 경주 일정과 출전마·결과 데이터를 제공합니다.
              </p>
            </div>
            <div className="race-toolbar">
              <div className="segmented" role="group" aria-label="경주 종류">
                <button
                  type="button"
                  id="tabUpcoming"
                  data-race-tab="upcoming"
                  className={raceType === "upcoming" ? "active" : ""}
                  aria-pressed={raceType === "upcoming"}
                  onClick={() => setRaceType("upcoming")}
                >
                  예정된 경주 <span aria-hidden="true">↗</span>
                </button>
                <button
                  type="button"
                  id="tabPast"
                  data-race-tab="past"
                  className={raceType === "past" ? "active" : ""}
                  aria-pressed={raceType === "past"}
                  onClick={() => setRaceType("past")}
                >
                  지난 경주 도전 <span aria-hidden="true">↗</span>
                </button>
              </div>
              <div className="venue-switch" role="group" aria-label="경마장">
                {(["all", "서울", "부산경남", "제주"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={venue === v ? "active" : ""}
                    aria-pressed={venue === v}
                    onClick={() => setVenue(v)}
                  >
                    {v === "all" ? "전체" : v}
                  </button>
                ))}
              </div>
            </div>

            <div className="race-grid" id="raceGrid" aria-live="polite">
              {filteredRaces.length > 0 ? (
                filteredRaces.map((r) => (
                  <article key={r.id} className="race-card">
                    <div className="race-card-head">
                      <div>
                        <div className="race-flag">{r.venue} / SAMPLE RACE</div>
                        <div className="race-number">
                          {r.round}
                          <span>R</span>
                        </div>
                      </div>
                      <span className={`race-state ${r.status === "OPEN" ? "upcoming" : "past"}`}>
                        {statusLabels[r.status]}
                      </span>
                    </div>
                    <h3>{raceName(r)}</h3>
                    <div className="race-meta">
                      <span>{r.date}</span>
                      <span>{r.time} 예정 시각 (예시)</span>
                    </div>
                    <div className="race-card-footer">
                      <div>
                        <strong>
                          {r.distance} &nbsp; / &nbsp; {r.horses}두
                        </strong>
                        <small>출전 정보는 예시 데이터입니다.</small>
                      </div>
                      <Link
                        className="race-link"
                        href={`/races/${r.id}`}
                        data-open-race={r.id}
                      >
                        {r.status === "OPEN" ? "모의베팅" : "경주 보기"} ↗
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="no-race">선택한 조건에 해당하는 샘플 경주가 없습니다.</div>
              )}
            </div>

            <div className="sample-strip">
              <span className="sample-icon">!</span>
              <p>
                경주 카드에 표시된 모든 일정·출전마·수치는 <strong>샘플 데이터</strong>입니다. 실제 경주정보와 자동 동기화되지 않습니다.
              </p>
              <span className="sample-tag">DATA / DEMO</span>
            </div>
          </div>
        </section>

        {/* 02 / Choose Your Race */}
        <section className="section modes-section" id="modes" aria-labelledby="modesTitle">
          <div className="container">
            <div className="section-topline section-topline-dark">
              <span>02 / CHOOSE YOUR RACE</span>
              <span>ONE PLATFORM. TWO CHALLENGES.</span>
            </div>
            <div className="section-heading on-dark">
              <div>
                <p className="eyebrow">
                  FIND YOUR MOMENT <span className="red-slash">/</span>
                </p>
                <h2 id="modesTitle">
                  당신의 레이스는
                  <br />
                  <strong>어디서 시작되나요?</strong>
                </h2>
              </div>
              <p>
                다가올 승부를 예측하거나, 이미 끝난 경주에 다시 도전하세요. 두 가지 방식으로 경마를 경험할 수 있습니다.
              </p>
            </div>
            <div className="mode-grid">
              <a
                className="mode-card mode-upcoming"
                href="#races"
                data-view="upcoming"
                aria-label="예정 경주 예측하기"
                onClick={() => handleViewChange("upcoming")}
              >
                <div className="mode-image mode-image-upcoming"></div>
                <div className="mode-shade"></div>
                <div className="mode-content">
                  <div className="mode-top">
                    <span className="mode-index">01 — UPCOMING</span>
                    <span className="mode-tag">기본 포인트 보상</span>
                  </div>
                  <div className="mode-bottom">
                    <span className="mode-subtitle">THE FUTURE RACE</span>
                    <h3>
                      다가올 승부에
                      <br />
                      도전하다.
                    </h3>
                    <p>경주 시작 전, 당신의 선택으로 결과를 예측해 보세요.</p>
                    <span className="mode-link">
                      예정 경주 살펴보기 <span className="circle-arrow">↗</span>
                    </span>
                  </div>
                </div>
              </a>
              <a
                className="mode-card mode-past"
                href="#races"
                data-view="past"
                aria-label="지난 경주 살펴보기"
                onClick={() => handleViewChange("past")}
              >
                <div className="mode-image mode-image-past"></div>
                <div className="mode-shade"></div>
                <div className="mode-content">
                  <div className="mode-top">
                    <span className="mode-index">02 — PAST CHALLENGE</span>
                    <span className="mode-tag">종료 경주 정보</span>
                  </div>
                  <div className="mode-bottom">
                    <span className="mode-subtitle">REPLAY THE RACE</span>
                    <h3>
                      지나간 승부에
                      <br />
                      다시 도전하다.
                    </h3>
                    <p>종료된 경주의 출전 정보를 다시 살펴보세요.</p>
                    <span className="mode-link">
                      지난 경주 살펴보기 <span className="circle-arrow">↗</span>
                    </span>
                  </div>
                </div>
              </a>
            </div>
            <p className="mode-disclaimer">
              ※ 지난 경주는 결과가 공개된 상태로, 모의베팅 구매는 제공하지 않습니다.
            </p>
          </div>
        </section>

        {/* 03 / Built For The Race */}
        <section className="section intelligence" id="features" aria-labelledby="featureTitle">
          <div className="container">
            <div className="section-topline">
              <span>03 / BUILT FOR THE RACE</span>
              <span>DATA MEETS INSTINCT</span>
            </div>
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  RACE INTELLIGENCE <span className="red-slash">/</span>
                </p>
                <h2 id="featureTitle">
                  데이터는 명확하게.
                  <br />
                  <strong>예측은 당신답게.</strong>
                </h2>
              </div>
              <p>
                복잡한 경마 정보를 보기 쉽게 정리하고, 다양한 승식과 조합을 쉽고 직관적으로 경험하도록 설계했습니다.
              </p>
            </div>
            <div className="intelligence-layout">
              <div className="analysis-mock" aria-label="경주 분석 정보 화면 샘플">
                <div className="mock-header">
                  <span>
                    <i className="mock-dot"></i> RACE SNAPSHOT
                  </span>
                  <span>SAMPLE / 07R</span>
                </div>
                <div className="mock-main">
                  <div>
                    <small>서울 · 제7경주</small>
                    <h3>
                      THE RACE
                      <br />
                      AT A GLANCE<span>.</span>
                    </h3>
                  </div>
                  <span className="mock-stamp">
                    TRACK:ON
                    <br />
                    DEMO 26
                  </span>
                </div>
                <div className="mock-metrics">
                  <div>
                    <span>DISTANCE</span>
                    <strong>
                      1,400 <i>m</i>
                    </strong>
                  </div>
                  <div>
                    <span>ENTRIES</span>
                    <strong>
                      12 <i>두</i>
                    </strong>
                  </div>
                  <div>
                    <span>RACE TYPE</span>
                    <strong className="mock-text">일반 경주</strong>
                  </div>
                </div>
                <div className="mock-sample-table">
                  <div className="mock-sample-row">
                    <span className="horse-box black">02</span>
                    <span>출전마 정보 A</span>
                    <span className="sample-bars">
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                  </div>
                  <div className="mock-sample-row">
                    <span className="horse-box red">04</span>
                    <span>출전마 정보 B</span>
                    <span className="sample-bars">
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                  </div>
                  <div className="mock-sample-row">
                    <span className="horse-box blue">08</span>
                    <span>출전마 정보 C</span>
                    <span className="sample-bars">
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                  </div>
                </div>
                <div className="mock-footer">
                  <span>ILLUSTRATIVE DATA ONLY — NOT REAL-TIME</span>
                  <span>↗</span>
                </div>
              </div>
              <div className="intelligence-features">
                <article className="intel-feature">
                  <span className="intel-no">01</span>
                  <div>
                    <h3>한곳에서 보는 경주 데이터</h3>
                    <p>경주 일정, 출전마, 과거 기록과 결과를 한눈에 살펴보도록 구성합니다.</p>
                  </div>
                  <span className="intel-icon">↗</span>
                </article>
                <article className="intel-feature">
                  <span className="intel-no">02</span>
                  <div>
                    <h3>다양한 모의베팅 조합</h3>
                    <p>단승·연승·복승 등 여러 승식과 조합 수를 선택 전에 확인할 수 있도록 설계합니다.</p>
                  </div>
                  <span className="intel-icon">↗</span>
                </article>
                <article className="intel-feature">
                  <span className="intel-no">03</span>
                  <div>
                    <h3>초보자도 쉽게 시작</h3>
                    <p>단계별 튜토리얼과 초보자용 선택 흐름으로 처음 접하는 사용자도 이해하기 쉽게.</p>
                  </div>
                  <span className="intel-icon">↗</span>
                </article>
                <Link href="/tutorial" className="text-link">
                  모의베팅 이용가이드 보러 가기 <span>↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 04 / How It Works */}
        <section
          className="section journey-section"
          id="guide"
          aria-labelledby="guideTitle"
          ref={journeySectionRef}
        >
          <div className="container">
            <div className="section-topline">
              <span>04 / HOW IT WORKS</span>
              <span>START TO FINISH</span>
            </div>
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  THREE MOVES <span className="red-slash">/</span>
                </p>
                <h2 id="guideTitle">
                  경주 선택부터
                  <br />
                  <strong>결과 확인까지.</strong>
                </h2>
              </div>
              <p>
                복잡할 필요 없습니다. 처음이라면 튜토리얼을 따라가고, 익숙해지면 원하는 승식으로 직접 조합하세요.
              </p>
            </div>
            <div className="journey-track" aria-label="모의베팅 진행 순서">
              <div className="track-rule" aria-hidden="true">
                <span id="trackFill" ref={trackFillRef}></span>
              </div>
              <article className="journey-step">
                <span className="journey-number">01</span>
                <span className="journey-label">START</span>
                <h3>경주를 고르세요.</h3>
                <p>예정된 경주 또는 지난 경주를 선택하고 정보를 살펴봅니다.</p>
                <span className="journey-symbol">↗</span>
              </article>
              <article className="journey-step">
                <span className="journey-number">02</span>
                <span className="journey-label">THE TURN</span>
                <h3>승부를 예측하세요.</h3>
                <p>승식과 출전마를 선택하고 모의베팅 조합을 확인합니다.</p>
                <span className="journey-symbol">⌁</span>
              </article>
              <article className="journey-step">
                <span className="journey-number">03</span>
                <span className="journey-label">FINISH</span>
                <h3>결과를 확인하세요.</h3>
                <p>공식 결과가 확정되면 정책에 따라 가상 포인트를 산정합니다.</p>
                <span className="journey-symbol">◎</span>
              </article>
            </div>
            <Link href="/tutorial" className="journey-cta">
              처음이라면? 4단계 튜토리얼 시작하기 <span>↗</span>
            </Link>
          </div>
        </section>

        {/* 05 / Your Points */}
        <section className="section points-section" id="points" aria-labelledby="pointsTitle">
          <div className="container">
            <div className="section-topline">
              <span>05 / YOUR POINTS</span>
              <span>NO CASH. JUST PRACTICE.</span>
            </div>
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  POINT SYSTEM <span className="red-slash">/</span>
                </p>
                <h2 id="pointsTitle">
                  실제 돈 대신,
                  <br />
                  <strong>예측의 기록을 쌓으세요.</strong>
                </h2>
              </div>
              <p>
                모의베팅 결과는 가상 포인트로 확인하도록 기획했습니다. 지급 방식과 수치는 최종 정책이 확정되면 공개합니다.
              </p>
            </div>
            <div className="point-cards">
              <article className="point-card point-primary">
                <div className="point-top">
                  <span>UPCOMING RACE</span>
                  <span className="point-badge">BASE REWARD</span>
                </div>
                <div>
                  <div className="point-giant">
                    01<span>/</span>
                  </div>
                  <h3>예정된 경주</h3>
                  <p>경주 결과가 확정된 이후 기본 보상 규칙에 따라 포인트를 산정할 예정입니다.</p>
                </div>
                <div className="point-bottom">
                  기본 보상 비율 적용 예정 <span>↗</span>
                </div>
              </article>
              <article className="point-card point-secondary">
                <div className="point-top">
                  <span>PAST CHALLENGE</span>
                  <span className="point-badge">LOWER REWARD</span>
                </div>
                <div>
                  <div className="point-giant">
                    02<span>/</span>
                  </div>
                  <h3>지난 경주 연습</h3>
                  <p>이미 결과가 공개된 경주이므로 예정 경주보다 낮은 보상 비율을 적용할 예정입니다.</p>
                </div>
                <div className="point-bottom">
                  낮은 보상 비율 적용 예정 <span>↗</span>
                </div>
              </article>
            </div>
            <p className="point-legal">
              * 현재는 가상 포인트 지급 기능이 없는 UI 프로토타입입니다. 지난 경주의 결과 조회 가능성에 따른 부정 이용 방지 및 랭킹 반영 정책은 별도로 확정해야 합니다. 포인트는 현금이나 실제 마권으로 교환되지 않습니다.
            </p>
          </div>
        </section>

        {/* 06 / Leaderboard */}
        <section className="section ranking-section" id="ranking" aria-labelledby="rankingTitle">
          <div className="container rank-layout">
            <div className="rank-intro">
              <div className="section-topline rank-topline">
                <span>06 / LEADERBOARD</span>
              </div>
              <p className="eyebrow">
                MY RECORD <span className="red-slash">/</span>
              </p>
              <h2 id="rankingTitle">
                승부는 끝나도,
                <br />
                <strong>기록은 남습니다.</strong>
              </h2>
              <p>
                예측의 흐름을 기록하고, 자신만의 실력을 확인하세요. 랭킹은 정식 회원 기능에 맞춰 제공할 예정입니다.
              </p>
              <span className="rank-coming">COMING SOON / 데모 랭킹</span>
            </div>
            <div className="leaderboard" aria-label="가상 랭킹 예시">
              <div className="leaderboard-header">
                <span>LEADERBOARD</span>
                <span>SAMPLE / TOP 03</span>
              </div>
              <div className="leaderboard-title">
                <h3>POINT RANKING</h3>
                <span>↗</span>
              </div>
              <div className="leaderboard-row">
                <span className="rank-number">01</span>
                <span className="rank-player">
                  예시 사용자 A<small>데모 계정</small>
                </span>
                <strong>
                  4,280 <small>P</small>
                </strong>
              </div>
              <div className="leaderboard-row">
                <span className="rank-number">02</span>
                <span className="rank-player">
                  예시 사용자 B<small>데모 계정</small>
                </span>
                <strong>
                  3,650 <small>P</small>
                </strong>
              </div>
              <div className="leaderboard-row">
                <span className="rank-number">03</span>
                <span className="rank-player">
                  예시 사용자 C<small>데모 계정</small>
                </span>
                <strong>
                  2,940 <small>P</small>
                </strong>
              </div>
              <div className="leaderboard-footer">
                NOT CONNECTED TO REAL USERS <span>TRACK:ON 2026</span>
              </div>
            </div>
          </div>
        </section>

        {/* 07 / FAQ */}
        <section className="section faq-section" id="faq" aria-labelledby="faqTitle">
          <div className="container faq-layout">
            <div>
              <div className="section-topline faq-topline">
                <span>07 / FAQ</span>
              </div>
              <p className="eyebrow">
                ANY QUESTIONS? <span className="red-slash">/</span>
              </p>
              <h2 id="faqTitle">
                궁금한 점이
                <br />
                있나요?
              </h2>
              <p className="faq-sub">시작하기 전 알아두면 좋은 내용을 정리했습니다.</p>
              <Link href="/tutorial" className="text-link">
                자세한 이용가이드 <span>↗</span>
              </Link>
            </div>
            <div className="faq-list">
              <details>
                <summary>
                  실제 돈을 걸거나 마권을 구매하나요?<span>+</span>
                </summary>
                <p>
                  아니요. 실제 금전 거래 없이 가상 포인트로 경주 예측을 연습하는 서비스입니다. 실제 마권 구매나 현금 지급은 제공하지 않습니다.
                </p>
              </details>
              <details>
                <summary>
                  예정된 경주와 지난 경주는 어떻게 다른가요?<span>+</span>
                </summary>
                <p>
                  예정된 경주는 결과 확정 전 예측하고, 지난 경주는 이미 종료된 경주를 연습합니다. 지난 경주는 결과를 찾아볼 수 있기 때문에 낮은 보상 비율과 별도 공정성 정책을 계획하고 있습니다.
                </p>
              </details>
              <details>
                <summary>
                  Google 계정이 꼭 필요한가요?<span>+</span>
                </summary>
                <p>
                  경주 정보와 이용가이드는 로그인 없이 볼 수 있습니다. 모의베팅을 실제 제출하고 포인트·내역을 저장하는 기능을 이용하려면 Google 로그인을 요구할 예정입니다.
                </p>
              </details>
              <details>
                <summary>
                  경주 정보는 어디서 제공되나요?<span>+</span>
                </summary>
                <p>
                  정식 서비스에서는 공공데이터 API를 활용할 계획입니다. 현재 표시된 모든 경주 정보는 레이아웃 확인용 샘플이며 공식 데이터가 아닙니다.
                </p>
              </details>
              <details>
                <summary>
                  포인트는 어떻게 지급되나요?<span>+</span>
                </summary>
                <p>
                  예정 경주에는 기본 보상 규칙, 지난 경주에는 더 낮은 비율을 적용할 계획입니다. 실제 산식·지급 제한·랭킹 반영 방식은 아직 확정되지 않았습니다.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="final-cta" aria-labelledby="finalTitle">
          <div className="final-photo"></div>
          <div className="final-overlay"></div>
          <div className="container final-inner">
            <div className="final-eyebrow">THE NEXT RACE IS YOURS / TRACK:ON</div>
            <h2 id="finalTitle">
              다음 경주,
              <br />
              당신의 선택은<span>?</span>
            </h2>
            <p>경주를 알고, 조합을 만들고, 예측을 경험하세요.</p>
            <a
              href="#races"
              className="button button-red button-large"
              onClick={() => handleViewChange("upcoming")}
            >
              지금 경주 살펴보기 <span aria-hidden="true">↗</span>
            </a>
            <div className="final-huge" aria-hidden="true">
              FINISH LINE.
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-upper">
            <div>
              <Link className="brand brand-white" href="/">
                <span className="brand-emblem">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
                <span className="brand-word">
                  TRACK<span>:ON</span>
                </span>
              </Link>
              <p>
                경주 정보를 이해하고 예측의 즐거움을 경험하는
                <br />
                가상 포인트 기반 모의베팅 플랫폼.
              </p>
            </div>
            <div className="footer-nav">
              <div>
                <span>PLATFORM</span>
                <a href="#races" onClick={() => handleViewChange("upcoming")}>
                  경주정보
                </a>
                <a href="#modes">모의베팅</a>
                <a href="#ranking">랭킹</a>
              </div>
              <div>
                <span>SUPPORT</span>
                <Link href="/tutorial">이용가이드</Link>
                <a href="#points">포인트 정책</a>
                <a href="#faq">자주 묻는 질문</a>
              </div>
            </div>
          </div>
          <div className="footer-lower">
            <p>
              © 2026 TRACK:ON. 비공식 프런트엔드 프로토타입 · API와 Google 로그인은 미연동입니다. 모의베팅 기록은 브라우저에 저장되며 실제 마권 및 현금 거래는 없습니다.
            </p>
            <span>MADE FOR THE RACE / 2026</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
