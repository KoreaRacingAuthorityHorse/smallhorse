"use client";

import { useEffect, useRef, useState } from "react";
import { MEET_NAMES, PEOPLE, tier, type Person, type RecentRun } from "../_lib/data";

const topN = (rc: RecentRun[]) => rc.filter((x) => x.stOrd && x.stOrd <= 3).length;
const wins = (rc: RecentRun[]) => rc.filter((x) => x.stOrd === 1).length;

function RecordDrawer({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (person && !dlg.open) {
      dlg.showModal();
      dlg.scrollTop = 0;
      document.body.classList.add("modal-open");
    }
    if (!person && dlg.open) dlg.close();
  }, [person]);

  const rc = person?.recent ?? [];
  const run = rc.filter((x) => x.stOrd);
  const avg = run.length ? (run.reduce((s, x) => s + (x.stOrd ?? 0), 0) / run.length).toFixed(1) : "-";

  return (
    <dialog
      ref={ref}
      className="rd-drawer"
      aria-label="최근 10경기"
      onClose={() => { document.body.classList.remove("modal-open"); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
    >
      {person && (
        <>
          <div className="dh">
            <div>
              <h3>{person.name}</h3>
              <p>{person.meet} · {person.age}세 · 통산 승률 {((person.w / person.T) * 100).toFixed(1)}%</p>
            </div>
            <button type="button" className="x" aria-label="닫기" onClick={() => ref.current?.close()}>✕</button>
          </div>
          <div className="db">
            <h4>최근 10경기 요약</h4>
            <div className="rd-sum3">
              <div><b className="num">{wins(rc)}</b><span>1착</span></div>
              <div><b className="num">{topN(rc)}</b><span>3착 이내</span></div>
              <div><b className="num">{avg}</b><span>평균 착순</span></div>
            </div>
            <h4>경기별 기록</h4>
            <ul className="rd-rl">
              {rc.map((x, i) => (
                <li key={i}>
                  <span className="d num">{+x.rcDate.slice(4, 6)}/{+x.rcDate.slice(6)}</span>
                  <span className="g"><span>{x.meet} {x.rcNo}경주</span><small>기승마 {x.hrName}</small></span>
                  <span className={`o ${x.stOrd === null ? "x" : x.stOrd <= 3 ? `r${x.stOrd}` : ""}`}>{x.stOrd ? `${x.stOrd}착` : "중지"}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </dialog>
  );
}

export default function PeopleTab() {
  const [type, setType] = useState<"jk" | "tr">("jk");
  const [meet, setMeet] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"rate" | "cnt">("rate");
  const [selected, setSelected] = useState<Person | null>(null);

  const query = q.trim();
  const rows = PEOPLE[type]
    .filter((p) => p.name.includes(query) && (!meet || p.meet === meet))
    .map((p) => ({ ...p, rate: (p.w / p.T) * 100 }))
    .sort((a, b) => (sort === "rate" ? b.rate - a.rate : b.T - a.T));

  return (
    <section className="rd-page" aria-labelledby="rdPeopleTitle">
      <header className="rd-ph">
        <h2 id="rdPeopleTitle">기수·조교사</h2>
        <p>통산 성적을 한눈에 비교해 보세요.</p>
      </header>
      <div className="rd-bar" role="search">
        <div className="rd-seg" role="group" aria-label="구분">
          <button type="button" aria-pressed={type === "jk"} onClick={() => setType("jk")}>기수</button>
          <button type="button" aria-pressed={type === "tr"} onClick={() => setType("tr")}>조교사</button>
        </div>
        <label className="rd-find">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <input type="search" placeholder="이름으로 찾기" aria-label="이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="rd-sel" aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value as "rate" | "cnt")}>
          <option value="rate">승률 높은 순</option>
          <option value="cnt">출주 많은 순</option>
        </select>
      </div>
      <div className="rd-mtabs" role="tablist" aria-label="경마장">
        {["", ...MEET_NAMES].map((m) => (
          <button type="button" role="tab" key={m || "all"} aria-selected={m === meet} onClick={() => setMeet(m)}>{m || "전체"}</button>
        ))}
      </div>
      <div className="rd-cards">
        {rows.length ? rows.map((p) => (
          <button type="button" className={`rd-pc ${tier(p.rate)}`} key={p.no} aria-label={`${p.name} 최근 10경기 보기`} onClick={() => setSelected(p)}>
            <span className="who"><b>{p.name}</b><span>{p.meet} · {p.age}세</span></span>
            <span className="big-rate"><b className="num">{p.rate.toFixed(1)}%</b><span>승률</span></span>
            <span className="meter"><i style={{ width: `${Math.min((p.rate / 20) * 100, 100)}%` }} /></span>
            <span className="mini">
              <span><b className="num">{p.T.toLocaleString()}</b><span>출주</span></span>
              <span><b className="num">{p.w}</b><span>1착</span></span>
              <span><b className="num">{p.w + p.p2 + p.p3}</b><span>3착 이내</span></span>
            </span>
            <span className="peek"><span>최근 10경기 <b>{wins(p.recent)}승 · 3착 이내 {topN(p.recent)}회</b></span><em>자세히 보기</em></span>
          </button>
        )) : <p className="rd-empty">찾는 이름이 없어요. 다른 이름으로 검색해 보세요.</p>}
      </div>
      <p className="rd-foot">통산 성적은 조회한 시점까지의 누적 기록이에요. 카드를 누르면 최근 10경기를 볼 수 있어요.</p>
      <RecordDrawer person={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
