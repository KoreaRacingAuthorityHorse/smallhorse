"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SiteFooterProps {
  /** 랜딩에서 '경주정보' 클릭 시 예정 경주 탭으로 전환 */
  onRacesClick?: () => void;
}

/* landing.css 스타일을 쓰므로 `.landing-root` 안에서 렌더링해야 함 */
export default function SiteFooter({ onRacesClick }: SiteFooterProps) {
  const home = usePathname() === "/" ? "" : "/";

  return (
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
              <a href={`${home}#races`} onClick={onRacesClick}>
                경주정보
              </a>
              <Link href="/race-data">경주데이터</Link>
              <a href={`${home}#modes`}>모의베팅</a>
              <a href={`${home}#ranking`}>랭킹</a>
            </div>
            <div>
              <span>SUPPORT</span>
              <Link href="/tutorial">이용가이드</Link>
              <a href={`${home}#points`}>포인트 정책</a>
              <a href={`${home}#faq`}>자주 묻는 질문</a>
            </div>
          </div>
        </div>
        <div className="footer-lower">
          <p>
            © 2026 TRACK:ON. 비공식 프런트엔드 프로토타입 · API, Google 로그인, 베팅 제출, 포인트 적립 미연동. 실제 마권 및 현금 거래 없음.
          </p>
          <span>MADE FOR THE RACE / 2026</span>
        </div>
      </div>
    </footer>
  );
}
