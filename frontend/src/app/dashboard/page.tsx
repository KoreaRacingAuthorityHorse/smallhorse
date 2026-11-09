"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRaces } from "@/data/races";
import { resetDemoState, setDemoTask } from "@/lib/demoPurchase";
import { useDemoState } from "@/lib/useDemoState";
import TrackonHeader from "@/components/layout/TrackonHeader";
import TrackonFooter from "@/components/layout/TrackonFooter";

type Race = { id: string; date: string; day: string; venue: string; number: number; time: string; distance: string; horses: number; level: string; image: string; status: string; past?: boolean };

const races: Race[] = getRaces().map((race) => ({
  id: race.id, date: race.raceDate,
  day: `${race.raceDate.slice(5).replace("-", ".")} (${["일", "월", "화", "수", "목", "금", "토"][new Date(`${race.raceDate}T00:00:00Z`).getUTCDay()]})`,
  venue: { SEOUL: "서울", BUSAN: "부경", JEJU: "제주" }[race.trackCode],
  number: race.raceNo, time: race.startTime, distance: `${race.distance.toLocaleString()}m`,
  horses: race.entryCount, level: race.className, image: race.image, status: race.status, past: race.status === "FINISHED",
}));
const tabs = [["2026-10-30", "10.30 (금)"], ["2026-10-31", "10.31 (토)"], ["2026-11-01", "11.01 (일)"], ["2026-11-06", "11.06 (금)"]];
const statusLabels: Record<string, string> = { SCHEDULED: "예정", OPEN: "구매 가능", CLOSED: "마감", CANCELLED: "취소", FINISHED: "종료" };

function RaceCard({ race }: { race: Race }) {
  return <article className="race-card"><div className="race-photo"><Image src={`/assets/${race.image}`} alt="경주 장면" fill sizes="(max-width: 580px) 100vw, 33vw" /><div className="race-overlay" /><div className="race-overlay-title"><small>{race.venue.toUpperCase()} RACE</small><strong>{String(race.number).padStart(2, "0")}<span>경주</span></strong></div><div className="race-overlay-footer">{race.day}　|　{race.time} · {statusLabels[race.status]}</div></div><div className="race-card-body"><div className="race-meta-name"><b>{race.venue} {String(race.number).padStart(2, "0")}경주</b><span className={`badge ${race.status === "OPEN" ? "up" : "past"}`}>{statusLabels[race.status]}</span></div><div className="race-data"><span><b>출전</b>{race.horses}두</span><span><b>거리</b>{race.distance}</span><span><b>등급</b>{race.level}</span></div><div className="race-card-actions single"><Link className="btn" href={`/races/${race.id}`}>{race.status === "OPEN" ? "모의베팅" : "경주 보기"} ↗</Link></div></div></article>;
}

export default function DashboardPage() {
  const [date, setDate] = useState("2026-10-30");
  const { balance, records, tasks } = useDemoState();
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3500); };
  const upcoming = useMemo(() => races.filter((race) => race.date === date && !race.past), [date]);
  const toggleTask = (index: number) => { try { setDemoTask(index, !tasks[index]); } catch { notify("체크리스트를 저장하지 못했습니다."); } };
  const resetDemo = () => {
    if (!window.confirm("이 브라우저에 저장된 데모 기록과 포인트를 초기화하시겠습니까?")) return;
    try { resetDemoState(); notify("데모 기록을 초기화했습니다."); } catch { notify("데모 기록을 초기화하지 못했습니다."); }
  };
  const allRecords = records.slice(0, 8);
  return <div data-page="dashboard" className="app-root">
    <TrackonHeader section="dashboard" />
    <main><section className="dash-hero"><div className="container dash-hero-inner"><div><div className="eyebrow">YOUR RACING JOURNAL　/　DEMO DASHBOARD</div><h1>안녕하세요,<br /><em>오늘의 경주를 확인해보세요.</em></h1><p>경주를 살피고, 결과를 예측하며, 가상 포인트로 기록을 쌓아보세요.<br />이 화면은 샘플 계정 데이터를 사용하는 대시보드 체험판입니다.</p></div><span className="badge gold">DEMO ACCOUNT</span></div></section>
      <div className="container dashboard"><section className="kpi-grid" aria-label="대시보드 요약">{[["보유 포인트", `${balance.toLocaleString()} P`, "체험용 초기 포인트 · 실제 적립 아님", "◎"], ["이번 주 도전", `${records.length}회`, "저장된 모의베팅 기록", "▦"], ["예측 적중률", "42.1%", "샘플 기록 · 최근 10회 기준", "▥"], ["현재 랭킹", "124위", "샘플 랭킹 · 실제 순위 아님", "♕"]].map(([label, value, caption, icon]) => <article className="kpi" key={label}><div className="kpi-label">{label}<span className="kpi-icon">{icon}</span></div><div className={`kpi-value ${label === "보유 포인트" ? "" : "neutral"}`}>{value}</div><div className="kpi-caption">{caption}</div></article>)}</section>
        <div className="dashboard-layout"><div className="dashboard-main"><section className="panel" id="upcoming"><div className="panel-title"><div><h2>예정된 경주</h2><p>관심 있는 경주의 정보를 보고 나만의 예측을 선택하세요.</p></div><span className="badge up">예시 일정</span></div><div className="dash-date-tabs" role="group" aria-label="날짜 선택">{tabs.map(([value, label]) => <button key={value} className={date === value ? "active" : ""} aria-pressed={date === value} onClick={() => setDate(value)}>{label}</button>)}</div><div className="race-grid">{upcoming.length ? upcoming.map((race) => <RaceCard key={race.id} race={race} />) : <div className="empty-state">선택한 날짜의 샘플 경주가 없습니다.</div>}</div><p className="race-note">* 예정 경주 및 출전 정보는 연동되지 않은 샘플입니다. 결과가 실시간으로 갱신되지 않습니다.</p></section>
          <section className="panel" id="past"><div className="panel-title"><div><h2>지난 경주 살펴보기</h2><p>종료된 경주의 출전 정보를 다시 확인해 보세요.</p></div><span className="badge past">종료 경주</span></div><div className="past-grid">{races.filter((race) => race.past).map((race) => <article className="past-mini" key={race.id}><div className="past-mini-top"><Image src={`/assets/${race.image}`} alt="경주 장면" width={81} height={66} /><div><h4>{race.venue} {String(race.number).padStart(2, "0")}경주</h4><p>{race.day} · {race.distance}<br />{race.horses}두 · {race.level}</p></div></div><div className="past-mini-bottom"><Link className="btn border" href={`/races/${race.id}`}>경주 정보 보기 ↗</Link><span>종료</span></div></article>)}</div></section>
          <section className="panel" id="recent"><div className="panel-title"><div><h2>내 최근 예측</h2><p>브라우저에 저장한 모의베팅 기록입니다.</p></div><span className="badge">데모 기록</span></div><div className="recent-table-wrap"><table className="recent-table"><thead><tr>{["날짜", "경주", "승식", "내 선택", "결과", "포인트"].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{allRecords.length === 0 && <tr><td colSpan={6}>저장된 예측 기록이 없습니다.</td></tr>}{allRecords.map((record, index) => <tr key={record.id ?? `${record.name}-${index}`}><td>{record.day}</td><td>{record.raceId ? <Link href={`/races/${record.raceId}`}>{record.name}</Link> : record.name}</td><td>{record.kind}</td><td>{record.pick}</td><td><span className={`status ${record.result === "적중" ? "" : "gray"}`}>{record.result}</span></td><td className={`amount ${record.amount < 0 ? "negative" : ""}`}>{record.amount > 0 ? "+" : ""}{record.amount.toLocaleString()} P</td></tr>)}</tbody></table></div></section></div>
          <aside className="dashboard-aside" aria-label="대시보드 부가 정보">
            <section className="panel"><div className="panel-title"><div><h3>오늘의 체크리스트</h3><p>작은 도전부터 시작해보세요.</p></div><b style={{ color: "var(--wine)" }}>{tasks.filter(Boolean).length} / 5</b></div><div className="mini-progress"><span style={{ width: `${tasks.filter(Boolean).length * 20}%` }} /></div><div className="task-list">{["예정 경주 일정 확인하기", "이용가이드 살펴보기", "연습 조합 1개 저장하기", "지난 경주 복기해 보기", "내 예측 기록 확인하기"].map((task, index) => <label key={task}><input type="checkbox" checked={tasks[index]} onChange={() => toggleTask(index)} /><span>{task}</span></label>)}</div></section>
            <section className="panel"><div className="panel-title"><h3>이용가이드</h3><span style={{ color: "var(--gold)" }}>▧</span></div><div className="guide-panel"><div className="guide-thumb" role="img" aria-label="경주마 이미지" /><div><h4>처음이신가요?</h4><p>승식과 베팅 조합을<br />한 단계씩 배워보세요.</p><Link className="text-link" href="/tutorial">튜토리얼 보기 ↗</Link></div></div></section>
            <section className="panel"><div className="panel-title"><div><h3>랭킹 TOP 5</h3><p>샘플 순위</p></div><Link href="/#ranking" className="text-link">보기 ↗</Link></div><div className="rank-list">{["레이스마스터", "바람의질주", "트랙히어로", "데이터조련사", "페이스리더"].map((name, index) => <div className="rank-item" key={name}><span><i className="bullet">{index + 1}</i>{name}</span><b>{[24530, 18240, 15680, 14220, 12480][index].toLocaleString()} P</b></div>)}</div></section>
            <section className="panel policy-small"><div className="panel-title"><h3>포인트 지급 안내</h3><Link className="text-link" href="/#points">정책 ↗</Link></div><p>지급률은 출시 전 확정할 예정입니다. 체험 포인트는 모의베팅 구매에만 사용되며 실제 랭킹과 연결되지 않습니다.</p><dl><div><dt>예정 경주</dt><dd>기본 보상 비율</dd></div><div><dt>지난 경주</dt><dd>감액 보상 비율</dd></div><div><dt>실제 현금</dt><dd>지급 없음</dd></div></dl><button className="text-link" type="button" onClick={resetDemo}>데모 기록·포인트 초기화</button></section>
            <section className="panel"><div className="panel-title"><h3>최근 활동</h3><span className="badge">예시</span></div><div className="activity-item"><span>경주 일정 살펴보기</span><strong>데모</strong></div><div className="activity-item"><span>연습 기록 확인하기</span><strong>데모</strong></div><div className="activity-item"><span>승식 튜토리얼 확인</span><strong>데모</strong></div></section>
          </aside></div></div></main>
    <TrackonFooter />
    <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
  </div>;
}
