"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type RaceView = "upcoming" | "past";

interface SiteHeaderProps {
  /** 랜딩에서 경주 목록 탭(예정/지난)을 함께 바꿀 때 사용 */
  onRaceViewChange?: (type: RaceView) => void;
}

/* landing.css 스타일을 쓰므로 `.landing-root` 안에서 렌더링해야 함 */
export default function SiteHeader({ onRaceViewChange }: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navShellRef = useRef<HTMLDivElement>(null);

  // 랜딩이 아니면 섹션 앵커를 랜딩 기준으로 연결
  const home = pathname === "/" ? "" : "/";

  const closeAllDropdowns = () => {
    navShellRef.current?.querySelectorAll("details").forEach((d) => (d.open = false));
  };

  // Close dropdown details when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navShellRef.current && !navShellRef.current.contains(e.target as Node)) {
        navShellRef.current.querySelectorAll("details").forEach((d) => (d.open = false));
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        navShellRef.current?.querySelectorAll("details").forEach((d) => (d.open = false));
      }
    }

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleDropdownToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const target = e.currentTarget;
    if (target.open && navShellRef.current) {
      navShellRef.current.querySelectorAll("details").forEach((d) => {
        if (d !== target) d.open = false;
      });
    }
  };

  const closeDropdownsAndMenu = () => {
    closeAllDropdowns();
    setMobileMenuOpen(false);
  };

  const handleViewChange = (type: RaceView) => {
    onRaceViewChange?.(type);
    closeDropdownsAndMenu();
  };

  return (
    <>
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
                      href={`${home}#races`}
                      onClick={() => {
                        handleViewChange("upcoming");
                      }}
                    >
                      예정된 경주<small>경주 일정 및 출전 정보</small>
                    </a>
                    <a
                      href={`${home}#races`}
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
                  <summary aria-current={pathname.startsWith("/race-data") ? "page" : undefined}>
                    경주데이터 <span className="chevron"></span>
                  </summary>
                  <div className="dropdown-panel">
                    <a href="/race-data#race" onClick={closeDropdownsAndMenu}>
                      경주<small>출전표·결과·구간별 순위·배당률</small>
                    </a>
                    <a href="/race-data#people" onClick={closeDropdownsAndMenu}>
                      기수·조교사<small>통산 성적과 최근 10경기</small>
                    </a>
                    <a href="/race-data#horse" onClick={closeDropdownsAndMenu}>
                      경주마<small>혈통·성적·몸 상태</small>
                    </a>
                    <a href="/race-data#data" onClick={closeDropdownsAndMenu}>
                      데이터 소개<small>제공 데이터와 API 안내</small>
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
                      href={`${home}#races`}
                      onClick={() => {
                        handleViewChange("upcoming");
                      }}
                    >
                      예정 경주 예측<small>경주 전 결과 예측하기</small>
                    </a>
                    <a
                      href={`${home}#races`}
                      onClick={() => {
                        handleViewChange("past");
                      }}
                    >
                      지난 경주 도전<small>이전 경주로 연습하기</small>
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
                    <a href={`${home}#points`} onClick={closeDropdownsAndMenu}>
                      포인트 정책<small>모의베팅 보상 안내</small>
                    </a>
                  </div>
                </details>
              </li>
              <li>
                <a href={`${home}#ranking`} onClick={closeDropdownsAndMenu}>
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
    </>
  );
}
