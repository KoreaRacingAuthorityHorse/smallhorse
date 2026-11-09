import Link from "next/link";

export default function TrackonFooter() {
  return <footer className="footer"><div className="container"><div className="footer-top"><div><Link className="brand" href="/"><span><span className="brand-main">TRACK:<em>ON</em></span><small>RACE DATA × YOUR INSIGHT</small></span></Link><p>경마 정보를 더 깊이 읽고, 가상 포인트로 예측을 연습하는<br />프리미엄 경마 데이터 플랫폼.</p></div><nav className="footer-nav"><Link href="/#features">서비스 소개</Link><Link href="/tutorial">이용안내</Link><Link href="/#points">포인트 정책</Link><Link href="/#faq">FAQ</Link><Link href="/login">로그인</Link></nav></div><div className="footer-bottom"><span>© 2026 TRACK:ON · 비공식 서비스 UI 프로토타입</span><span>공공데이터 API · Google OAuth · 실제 포인트 정산은 연결되지 않았습니다. 모의베팅은 브라우저 데모 기록으로만 저장됩니다.</span></div></div></footer>;
}
