import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <Link className="brand" href="/" aria-label="TRACK:ON 홈">
            <span>
              <span className="brand-main">TRACK:<em>ON</em></span>
              <small>RACE DATA × YOUR INSIGHT</small>
            </span>
          </Link>
          <nav className="footer-nav" aria-label="푸터 메뉴">
            <Link href="/tutorial">이용가이드</Link>
            <Link href="/race-data">경주 데이터</Link>
            <Link href="/login">로그인</Link>
          </nav>
        </div>
        <div className="footer-bottom">© 2026 TRACK:ON · 공개 데이터 기반 경주 정보 서비스</div>
      </div>
    </footer>
  );
}
