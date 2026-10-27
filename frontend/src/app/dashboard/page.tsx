"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Race = { id: string; date: string; day: string; venue: string; number: number; time: string; distance: string; horses: number; level: string; image: string; past?: boolean };
type RecordItem = { day: string; name: string; kind: string; pick: string; result: string; amount: number };

const races: Race[] = [
  { id: "u1", date: "2026-10-30", day: "10.30 (금)", venue: "부경", number: 1, time: "11:30", distance: "1,200m", horses: 12, level: "국6등급", image: "race-a.jpg" },
  { id: "u2", date: "2026-10-30", day: "10.30 (금)", venue: "부경", number: 2, time: "12:15", distance: "1,400m", horses: 11, level: "국6등급", image: "race-b.jpg" },
  { id: "u3", date: "2026-10-30", day: "10.30 (금)", venue: "제주", number: 3, time: "13:00", distance: "1,000m", horses: 10, level: "제주마", image: "race-c.jpg" },
  { id: "u4", date: "2026-10-31", day: "10.31 (토)", venue: "서울", number: 1, time: "10:40", distance: "1,200m", horses: 11, level: "국6등급", image: "race-a.jpg" },
  { id: "u5", date: "2026-10-31", day: "10.31 (토)", venue: "서울", number: 2, time: "11:15", distance: "1,400m", horses: 12, level: "국6등급", image: "race-b.jpg" },
  { id: "u6", date: "2026-10-31", day: "10.31 (토)", venue: "제주", number: 4, time: "13:55", distance: "1,110m", horses: 9, level: "제주마", image: "race-c.jpg" },
  { id: "u7", date: "2026-11-01", day: "11.01 (일)", venue: "서울", number: 5, time: "14:15", distance: "1,600m", horses: 10, level: "국6등급", image: "race-a.jpg" },
  { id: "u8", date: "2026-11-01", day: "11.01 (일)", venue: "부경", number: 6, time: "15:25", distance: "1,200m", horses: 12, level: "국6등급", image: "race-c.jpg" },
  { id: "u9", date: "2026-11-01", day: "11.01 (일)", venue: "제주", number: 7, time: "16:05", distance: "1,110m", horses: 10, level: "제주마", image: "race-b.jpg" },
  { id: "u10", date: "2026-11-06", day: "11.06 (금)", venue: "부경", number: 1, time: "11:30", distance: "1,200m", horses: 10, level: "국6등급", image: "race-b.jpg" },
  { id: "u11", date: "2026-11-06", day: "11.06 (금)", venue: "제주", number: 2, time: "12:15", distance: "1,000m", horses: 11, level: "제주마", image: "race-a.jpg" },
  { id: "u12", date: "2026-11-06", day: "11.06 (금)", venue: "부경", number: 3, time: "13:05", distance: "1,400m", horses: 12, level: "국6등급", image: "race-c.jpg" },
  { id: "p1", date: "2026-10-25", day: "10.25 (일)", venue: "서울", number: 5, time: "14:35", distance: "1,400m", horses: 12, level: "국6등급", image: "race-c.jpg", past: true },
  { id: "p2", date: "2026-10-24", day: "10.24 (토)", venue: "부경", number: 6, time: "15:20", distance: "1,200m", horses: 11, level: "국6등급", image: "race-a.jpg", past: true },
  { id: "p3", date: "2026-10-24", day: "10.24 (토)", venue: "제주", number: 3, time: "12:40", distance: "1,000m", horses: 10, level: "제주마", image: "race-b.jpg", past: true },
];
const tabs = [["2026-10-30", "10.30 (금)"], ["2026-10-31", "10.31 (토)"], ["2026-11-01", "11.01 (일)"], ["2026-11-06", "11.06 (금)"]];
const sampleRecords: RecordItem[] = [{ day: "10.25", name: "서울 05R", kind: "복승", pick: "3 - 7", result: "적중", amount: 5000 }, { day: "10.25", name: "부경 06R", kind: "단승", pick: "1", result: "미적중", amount: -1000 }, { day: "10.24", name: "제주 03R", kind: "연승", pick: "2", result: "적중", amount: 8200 }];

function RaceCard({ race, onBet, onInfo }: { race: Race; onBet: () => void; onInfo: () => void }) {
  return <article className="race-card"><div className="race-photo"><Image src={`/assets/${race.image}`} alt="경주 장면" fill sizes="(max-width: 580px) 100vw, 33vw" /><div className="race-overlay" /><div className="race-overlay-title"><small>{race.venue.toUpperCase()} RACE</small><strong>{String(race.number).padStart(2, "0")}<span>경주</span></strong></div><div className="race-overlay-footer">{race.day}　|　{race.time} {race.past ? "종료" : "출발 예정"}</div></div><div className="race-card-body"><div className="race-meta-name"><b>{race.venue} {String(race.number).padStart(2, "0")}경주</b><span className={`badge ${race.past ? "past" : "up"}`}>{race.past ? "지난 경주" : "예정 경주"}</span></div><div className="race-data"><span><b>출전</b>{race.horses}두</span><span><b>거리</b>{race.distance}</span><span><b>등급</b>{race.level}</span></div><div className="race-card-actions"><button className="btn border" onClick={onInfo}>상세보기</button><button className="btn" onClick={onBet}>{race.past ? "복기 연습" : "예측하기"} ↗</button></div></div></article>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [date, setDate] = useState("2026-10-30");
  const [balance, setBalance] = useState(12480);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [tasks, setTasks] = useState([true, true, false, false, false]);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeRace, setActiveRace] = useState<Race | null>(null);
  const [dialogMode, setDialogMode] = useState<"info" | "bet">("info");
  const [selectedHorse, setSelectedHorse] = useState(2);
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [selectedKind, setSelectedKind] = useState("단승");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3500); };
  // Restore the browser-only demo session after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("trackon-premium-demo-v1") || "null"); if (saved) { setBalance(saved.balance ?? 12480); setRecords(saved.records ?? []); setTasks(saved.tasks ?? [true, true, false, false, false]); } } catch {} }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeRace && !dialog.open) dialog.showModal();
    if (!activeRace && dialog.open) dialog.close();
  }, [activeRace, dialogMode]);
  const save = (nextBalance = balance, nextRecords = records, nextTasks = tasks) => { try { localStorage.setItem("trackon-premium-demo-v1", JSON.stringify({ balance: nextBalance, records: nextRecords, tasks: nextTasks })); } catch {} };
  const upcoming = useMemo(() => races.filter((race) => race.date === date && !race.past), [date]);
  const toggleTask = (index: number) => { const next = tasks.map((value, i) => i === index ? !value : value); setTasks(next); save(balance, records, next); };
  const openInfo = (race: Race) => { setActiveRace(race); setDialogMode("info"); };
  const openBet = (race: Race) => { setActiveRace(race); setSelectedHorse(2); setSelectedAmount(500); setSelectedKind("단승"); setDialogMode("bet"); };
  const saveBet = () => {
    if (!activeRace) return;
    if (balance < selectedAmount) return notify("체험 포인트가 부족합니다.");
    const nextBalance = balance - selectedAmount;
    const nextRecords = [{ day: "10.27", name: `${activeRace.venue} ${String(activeRace.number).padStart(2, "0")}R`, kind: selectedKind, pick: String(selectedHorse), result: "예측", amount: -selectedAmount }, ...records].slice(0, 20);
    const nextTasks = tasks.map((value, i) => i === (activeRace.past ? 3 : 2) ? true : value);
    setBalance(nextBalance); setRecords(nextRecords); setTasks(nextTasks); save(nextBalance, nextRecords, nextTasks);
    setActiveRace(null); notify("연습 조합이 브라우저에 저장되었습니다. 실제 베팅·보상은 제공되지 않습니다.");
  };
  const resetDemo = () => {
    if (!window.confirm("이 브라우저에 저장된 데모 기록과 포인트를 초기화하시겠습니까?")) return;
    setBalance(12480); setRecords([]); setTasks([true, true, false, false, false]);
    try { localStorage.removeItem("trackon-premium-demo-v1"); } catch {}
    notify("데모 기록을 초기화했습니다.");
  };
  const allRecords = [...records, ...sampleRecords].slice(0, 8);
  return <div data-page="dashboard" className="app-root">
    <div className="top-notice">RACE DATA, YOUR INSIGHT　·　<strong>DESIGN PROTOTYPE / SAMPLE DATA</strong></div>
    <header className="header"><div className="container header-inner"><Link className="brand" href="/" aria-label="TRACK:ON 홈"><span><span className="brand-main">TRACK:<em>ON</em></span><small>RACE DATA × YOUR INSIGHT</small></span></Link><nav className={`nav ${menuOpen ? "open" : ""}`} id="mainNav" aria-label="주요 메뉴"><Link href="/#races" onClick={() => setMenuOpen(false)}>경주정보</Link><Link href="#upcoming" onClick={() => setMenuOpen(false)}>모의베팅</Link><Link href="/tutorial" onClick={() => setMenuOpen(false)}>이용가이드</Link><Link href="/#ranking" onClick={() => setMenuOpen(false)}>랭킹</Link><Link className="active" href="/dashboard" onClick={() => setMenuOpen(false)}>MY DASHBOARD</Link></nav><div className="header-tools"><button className="header-icon" onClick={() => notify("알림 기능은 실제 계정 연결 후 이용할 수 있습니다.")} aria-label="알림 보기">♧<span className="notify-dot"></span></button><span className="points-chip"><span className="coin">P</span>{balance.toLocaleString()} P</span><details className="user-menu"><summary aria-label="프로필 메뉴"><span className="avatar">T</span><span className="username">데모 사용자</span><span aria-hidden="true">⌄</span></summary><div className="user-drop"><Link href="/dashboard">대시보드</Link><Link href="#recent">내 예측 기록</Link><button onClick={() => { try { sessionStorage.removeItem("trackon-demo-login"); } catch {} router.push("/"); }}>데모 로그아웃</button></div></details></div><button className="mobile-toggle" type="button" aria-controls="mainNav" aria-expanded={menuOpen} aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "×" : "☰"}</button></div></header>
    <main><section className="dash-hero"><div className="container dash-hero-inner"><div><div className="eyebrow">YOUR RACING JOURNAL　/　DEMO DASHBOARD</div><h1>안녕하세요,<br /><em>오늘의 경주를 확인해보세요.</em></h1><p>경주를 살피고, 결과를 예측하며, 가상 포인트로 기록을 쌓아보세요.<br />이 화면은 샘플 계정 데이터를 사용하는 대시보드 체험판입니다.</p></div><span className="badge gold">DEMO ACCOUNT</span></div></section>
      <div className="container dashboard"><section className="kpi-grid" aria-label="대시보드 요약">{[["보유 포인트", `${balance.toLocaleString()} P`, "체험용 초기 포인트 · 실제 적립 아님", "◎"], ["이번 주 도전", `${3 + records.length} / 5`, "샘플 예측 기록 기준", "▦"], ["예측 적중률", "42.1%", "샘플 기록 · 최근 10회 기준", "▥"], ["현재 랭킹", "124위", "샘플 랭킹 · 실제 순위 아님", "♕"]].map(([label, value, caption, icon]) => <article className="kpi" key={label}><div className="kpi-label">{label}<span className="kpi-icon">{icon}</span></div><div className={`kpi-value ${label === "보유 포인트" ? "" : "neutral"}`}>{value}</div><div className="kpi-caption">{caption}</div></article>)}</section>
        <div className="dashboard-layout"><div className="dashboard-main"><section className="panel" id="upcoming"><div className="panel-title"><div><h2>예정된 경주</h2><p>관심 있는 경주의 정보를 보고 나만의 예측을 선택하세요.</p></div><span className="badge up">예시 일정</span></div><div className="dash-date-tabs" role="group" aria-label="날짜 선택">{tabs.map(([value, label]) => <button key={value} className={date === value ? "active" : ""} aria-pressed={date === value} onClick={() => setDate(value)}>{label}</button>)}</div><div className="race-grid">{upcoming.length ? upcoming.map((race) => <RaceCard key={race.id} race={race} onBet={() => openBet(race)} onInfo={() => openInfo(race)} />) : <div className="empty-state">선택한 날짜의 샘플 경주가 없습니다.</div>}</div><p className="race-note">* 예정 경주 및 출전 정보는 연동되지 않은 샘플입니다. 결과가 실시간으로 갱신되지 않습니다.</p></section>
          <section className="panel" id="past"><div className="panel-title"><div><h2>지난 경주 연습</h2><p>종료된 경주의 데이터를 복기해 보세요. 보상은 예정 경주보다 낮은 비율로 설계됩니다.</p></div><span className="badge past">복기 모드</span></div><div className="past-grid">{races.filter((race) => race.past).map((race) => <article className="past-mini" key={race.id}><div className="past-mini-top"><Image src={`/assets/${race.image}`} alt="경주 장면" width={81} height={66} /><div><h4>{race.venue} {String(race.number).padStart(2, "0")}경주</h4><p>{race.day} · {race.distance}<br />{race.horses}두 · {race.level}</p></div></div><div className="past-mini-bottom"><button type="button" className="btn border" onClick={() => openBet(race)}>복기 연습하기 ↗</button><span>감액 보상 정책</span></div></article>)}</div></section>
          <section className="panel" id="recent"><div className="panel-title"><div><h2>내 최근 예측</h2><p>이용 흐름을 확인하기 위한 샘플 결과와 브라우저에 저장한 연습 기록입니다.</p></div><span className="badge">데모 기록</span></div><div className="recent-table-wrap"><table className="recent-table"><thead><tr>{["날짜", "경주", "승식", "내 선택", "결과", "포인트"].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{allRecords.map((record, index) => <tr key={`${record.name}-${index}`}><td>{record.day}</td><td>{record.name}</td><td>{record.kind}</td><td>{record.pick}</td><td><span className={`status ${record.result === "적중" ? "" : "gray"}`}>{record.result}</span></td><td className={`amount ${record.amount < 0 ? "negative" : ""}`}>{record.amount > 0 ? "+" : ""}{record.amount.toLocaleString()} P</td></tr>)}</tbody></table></div></section></div>
          <aside className="dashboard-aside" aria-label="대시보드 부가 정보">
            <section className="panel"><div className="panel-title"><div><h3>오늘의 체크리스트</h3><p>작은 도전부터 시작해보세요.</p></div><b style={{ color: "var(--wine)" }}>{tasks.filter(Boolean).length} / 5</b></div><div className="mini-progress"><span style={{ width: `${tasks.filter(Boolean).length * 20}%` }} /></div><div className="task-list">{["예정 경주 일정 확인하기", "이용가이드 살펴보기", "연습 조합 1개 저장하기", "지난 경주 복기해 보기", "내 예측 기록 확인하기"].map((task, index) => <label key={task}><input type="checkbox" checked={tasks[index]} onChange={() => toggleTask(index)} /><span>{task}</span></label>)}</div></section>
            <section className="panel"><div className="panel-title"><h3>이용가이드</h3><span style={{ color: "var(--gold)" }}>▧</span></div><div className="guide-panel"><div className="guide-thumb" role="img" aria-label="경주마 이미지" /><div><h4>처음이신가요?</h4><p>승식과 베팅 조합을<br />한 단계씩 배워보세요.</p><Link className="text-link" href="/tutorial">튜토리얼 보기 ↗</Link></div></div></section>
            <section className="panel"><div className="panel-title"><div><h3>랭킹 TOP 5</h3><p>샘플 순위</p></div><Link href="/#ranking" className="text-link">보기 ↗</Link></div><div className="rank-list">{["레이스마스터", "바람의질주", "트랙히어로", "데이터조련사", "페이스리더"].map((name, index) => <div className="rank-item" key={name}><span><i className="bullet">{index + 1}</i>{name}</span><b>{[24530, 18240, 15680, 14220, 12480][index].toLocaleString()} P</b></div>)}</div></section>
            <section className="panel policy-small"><div className="panel-title"><h3>포인트 지급 안내</h3><Link className="text-link" href="/#points">정책 ↗</Link></div><p>지급률은 출시 전 확정할 예정입니다. 체험판에서는 실제 잔액이나 랭킹이 변하지 않습니다.</p><dl><div><dt>예정 경주</dt><dd>기본 보상 비율</dd></div><div><dt>지난 경주</dt><dd>감액 보상 비율</dd></div><div><dt>실제 현금</dt><dd>지급 없음</dd></div></dl><button className="text-link" type="button" onClick={resetDemo}>데모 기록·포인트 초기화</button></section>
            <section className="panel"><div className="panel-title"><h3>최근 활동</h3><span className="badge">예시</span></div><div className="activity-item"><span>경주 일정 살펴보기</span><strong>데모</strong></div><div className="activity-item"><span>연습 기록 확인하기</span><strong>데모</strong></div><div className="activity-item"><span>승식 튜토리얼 확인</span><strong>데모</strong></div></section>
          </aside></div></div></main>
    <footer className="footer"><div className="container"><div className="footer-top"><div><Link className="brand" href="/"><span><span className="brand-main">TRACK:<em>ON</em></span><small>RACE DATA × YOUR INSIGHT</small></span></Link><p>경마 정보를 더 깊이 읽고, 가상 포인트로 예측을 연습하는<br />프리미엄 경마 데이터 플랫폼.</p></div><nav className="footer-nav"><Link href="/#features">서비스 소개</Link><Link href="/tutorial">이용안내</Link><Link href="/#points">포인트 정책</Link><Link href="/#faq">FAQ</Link><Link href="/login">로그인</Link></nav></div><div className="footer-bottom"><span>© 2026 TRACK:ON · 비공식 서비스 UI 프로토타입</span><span>공공데이터 API · Google OAuth · 모의베팅 제출 · 포인트 정산은 연결되지 않았습니다. 실제 금전 거래는 제공하지 않습니다.</span></div></div></footer>
    <dialog ref={dialogRef} aria-labelledby="dialogTitle" onClose={() => setActiveRace(null)} onClick={(event) => { if (event.target === dialogRef.current) setActiveRace(null); }}>
      {activeRace && <div className="dialog-content">
        <div className="dialog-head"><div><div className="eyebrow">{dialogMode === "bet" ? "LOCAL DEMO / NO REAL BETTING" : "RACE PREVIEW / SAMPLE DATA"}</div><h2 id="dialogTitle">{dialogMode === "bet" ? "연습 조합 만들기" : `${activeRace.venue} ${String(activeRace.number).padStart(2, "0")}경주`}</h2></div><button type="button" className="dialog-close" aria-label="닫기" onClick={() => setActiveRace(null)}>×</button></div>
        {dialogMode === "info" ? <><p>{activeRace.past ? "이미 결과가 공개된 경주를 연습하는 방식입니다. 실제 포인트 지급은 이루어지지 않습니다." : "아직 시작하지 않은 경주의 결과를 예측하는 방식입니다. 실제 경주 일정과 출전 정보는 API 연동 후 제공됩니다."}</p><div className="dialog-detail"><strong>{activeRace.day} · {activeRace.time}</strong><span>{activeRace.venue} · {activeRace.distance} · {activeRace.horses}두 · {activeRace.level}</span><span>이 경주 정보는 예시이며 실제 경주가 아닙니다.</span></div><div className="dialog-actions"><Link className="btn border" href="/tutorial">승식 가이드 보기</Link><button className="btn" type="button" onClick={() => { setSelectedHorse(2); setSelectedAmount(500); setSelectedKind("단승"); setDialogMode("bet"); }}>연습 조합 만들기 ↗</button></div></> : <><p>{activeRace.venue} {String(activeRace.number).padStart(2, "0")}R · {activeRace.past ? "지난 경주 복기" : "예정 경주 예측"}<br />선택한 연습 조합은 이 브라우저에만 저장됩니다. 실제 베팅이나 포인트 지급은 없습니다.</p><div className="field-title">승식 선택</div><select className="select" aria-label="승식 선택" value={selectedKind} onChange={(event) => setSelectedKind(event.target.value)}><option value="단승">단승 · 1등 말 선택</option><option value="연승">연승 · 상위 순위 말 선택</option><option value="복승">복승 · 상위 두 말 선택</option></select><div className="field-title">출전마 번호 선택</div><div className="horse-selector" role="group" aria-label="출전마 번호 선택">{Array.from({ length: activeRace.horses }, (_, index) => index + 1).map((horse) => <button type="button" key={horse} className={selectedHorse === horse ? "active" : ""} aria-pressed={selectedHorse === horse} onClick={() => setSelectedHorse(horse)}>{horse}</button>)}</div><div className="field-title">사용할 체험 포인트</div><div className="amount-selector" role="group" aria-label="사용할 체험 포인트">{[100, 500, 1000].map((amount) => <button type="button" key={amount} className={selectedAmount === amount ? "active" : ""} aria-pressed={selectedAmount === amount} onClick={() => setSelectedAmount(amount)}>{amount.toLocaleString()} P</button>)}</div><div className="dialog-detail"><strong>보유 체험 포인트 {balance.toLocaleString()} P</strong><span>선택한 포인트는 브라우저 데모 기록에만 반영됩니다. 실제 정산·보상은 없습니다.</span></div><div className="dialog-actions"><button type="button" className="btn border" onClick={() => setDialogMode("info")}>취소</button><button type="button" className="btn" onClick={saveBet}>연습 조합 저장</button></div></>}
      </div>}
    </dialog>
    <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
  </div>;
}
