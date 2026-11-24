"use client";

import { useState } from "react";
import { HORSE_LIST, MEET_NAMES, pct, tier, wonBig, type Horse } from "../_lib/data";

function HorseDetail({ h, onBack }: { h: Horse; onBack: () => void }) {
  const last = h.recent[0];
  const ws = h.recent.map((x) => x.wt).reverse(), mn = Math.min(...ws), mx = Math.max(...ws);
  const pts = ws.map((v, i) => [10 + i * (280 / (ws.length - 1)), 54 - (mx === mn ? 0.5 : (v - mn) / (mx - mn)) * 44]);
  const p2y = Math.round((h.p2 * h.Y) / h.T), p3y = Math.round((h.p3 * h.Y) / h.T);
  const p26 = Math.round((h.p2 * h.s6) / h.T), p36 = Math.round((h.p3 * h.s6) / h.T), w6 = Math.round(h.y1 * 0.5);
  const stats: [string, number, number, number, number][] = [
    ["통산", h.T, h.w, h.p2, h.p3],
    ["최근 1년", h.Y, h.y1, p2y, p3y],
    ["최근 6개월", h.s6, w6, p26, p36],
  ];

  return (
    <div>
      <button type="button" className="rd-back" onClick={onBack}>‹ 목록으로</button>
      <div className="rd-hz-prof">
        <div className="top1">
          <div>
            <h2>{h.name}</h2>
            <div className="en">{h.en}</div>
            <div className="rd-hz-tags"><span>{h.meet}</span><span>{h.sex} {h.age}세</span><span>{h.rank}등급</span><span>{h.origin} 산</span></div>
          </div>
          <div className="no">마번<b className="num">{h.no}</b></div>
        </div>
        <dl className="rd-hz-info">
          <div><dt>조교사</dt><dd>{h.tr}</dd></div>
          <div><dt>마주</dt><dd>{h.ow}</dd></div>
          <div><dt>생년월일</dt><dd className="num">{h.birth}</dd></div>
          <div><dt>최근 거래가</dt><dd>{h.price}</dd></div>
          <div className="full">
            <dt>혈통</dt>
            <dd className="ped">
              <span><small>부마</small>{h.sire[0]}<small>{h.sire[1]}</small></span>
              <i>×</i>
              <span><small>모마</small>{h.dam[0]}<small>{h.dam[1]}</small></span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="rd-hz-grid">
        <div>
          <div className="rd-hz-box">
            <h3>통산 성적</h3>
            <div className="rd-scroll">
              <table className="rd-hz-st">
                <thead><tr><th></th><th>출주</th><th>1착</th><th>2착</th><th>3착</th><th>승률</th><th>3착 이내</th></tr></thead>
                <tbody>
                  {stats.map(([l, t, w, p2, p3]) => (
                    <tr key={l}>
                      <td>{l}</td><td className="num">{t}</td><td className="num"><b>{w}</b></td><td className="num">{p2}</td><td className="num">{p3}</td>
                      <td className="num">{pct(w, t)}</td><td className="num">{pct(w + p2 + p3, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rd-hz-prize"><span>통산 착순상금</span><b className="num">{wonBig(h.prize)}</b></div>
            <div className="rd-hz-prize sub"><span>최근 1년 착순상금</span><b className="num">{wonBig(h.prizeY)}</b></div>
          </div>
          <div className="rd-hz-box">
            <h3>몸 상태 <small>{+last.d.slice(4, 6)}월 {+last.d.slice(6)}일 {last.meet} {last.no}경주 기준</small></h3>
            <div className="rd-hz-row">
              <span>장구</span>
              <div>{h.bits.length ? <div className="rd-hz-chips">{h.bits.map((b) => <em key={b}>{b}</em>)}</div> : <span className="none">사용 안 함</span>}</div>
            </div>
            <div className="rd-hz-row">
              <span>폐출혈</span>
              <div>{h.bl ? <div className="warn"><b>{h.bl}회</b> · {h.bld.join(", ")}</div> : <span className="ok">기록 없음</span>}</div>
            </div>
            <div className="rd-hz-row">
              <span>최근 진료</span>
              <div>
                {h.ill.length ? (
                  <ul className="rd-hz-log">{h.ill.map((x, i) => <li key={i}><time className="num">{x.d}</time>{x.n}</li>)}</ul>
                ) : <span className="ok">기록 없음</span>}
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="rd-hz-box">
            <h3>최근 10경기 <small>{h.recent.filter((x) => x.o === 1).length}승 · 3착 이내 {h.recent.filter((x) => x.o <= 3).length}회</small></h3>
            <ul className="rd-hz-rc">
              {h.recent.map((x, i) => (
                <li key={i}>
                  <span className="d num">{+x.d.slice(4, 6)}/{+x.d.slice(6)}</span>
                  <span className="g"><b>{x.meet} {x.no}경주 · {x.dist}m</b><small>{x.jk} 기수 · {x.t}</small></span>
                  <span className="w num">{x.wt}kg<small>체중</small></span>
                  <span className={`o ${x.o <= 3 ? `r${x.o}` : ""}`}>{x.o}착</span>
                </li>
              ))}
            </ul>
            <div className="rd-hz-chart">
              <div className="lb"><span>체중 변화</span><span className="num">{mn}~{mx}kg</span></div>
              <svg viewBox="0 0 300 64" preserveAspectRatio="none" aria-label="최근 10경기 체중 변화">
                <polyline vectorEffect="non-scaling-stroke" points={pts.map((p) => p.join(",")).join(" ")} />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HorseTab() {
  const [meet, setMeet] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"rate" | "prize" | "cnt">("rate");
  const [selected, setSelected] = useState<Horse | null>(null);

  const open = (h: Horse | null) => { setSelected(h); window.scrollTo({ top: 0 }); };

  if (selected) return <section className="rd-page"><HorseDetail h={selected} onBack={() => open(null)} /></section>;

  const query = q.trim();
  const rows = HORSE_LIST
    .filter((h) => h.name.includes(query) && (!meet || h.meet === meet))
    .map((h) => ({ ...h, rate: (h.w / h.T) * 100 }))
    .sort((a, b) => (sort === "rate" ? b.rate - a.rate : sort === "prize" ? b.prize - a.prize : b.T - a.T));

  return (
    <section className="rd-page" aria-labelledby="rdHorseTitle">
      <header className="rd-ph"><h2 id="rdHorseTitle">경주마</h2><p>혈통과 성적, 몸 상태를 살펴보세요.</p></header>
      <div className="rd-bar" role="search">
        <label className="rd-find solo">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <input type="search" placeholder="마명으로 찾기" aria-label="마명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="rd-sel" aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value as "rate" | "prize" | "cnt")}>
          <option value="rate">승률 높은 순</option>
          <option value="prize">상금 많은 순</option>
          <option value="cnt">출주 많은 순</option>
        </select>
      </div>
      <div className="rd-mtabs" role="tablist" aria-label="경마장">
        {["", ...MEET_NAMES].map((m) => (
          <button type="button" role="tab" key={m || "all"} aria-selected={m === meet} onClick={() => setMeet(m)}>{m || "전체"}</button>
        ))}
      </div>
      <div className="rd-cards">
        {rows.length ? rows.map((h) => (
          <button type="button" className={`rd-pc ${tier(h.rate)}`} key={h.no} aria-label={`${h.name} 상세 보기`} onClick={() => open(h)}>
            <span className="who"><b>{h.name}</b><span>{h.meet} · {h.sex} {h.age}세</span></span>
            <span className="big-rate"><b className="num">{h.rate.toFixed(1)}%</b><span>승률</span></span>
            <span className="meter"><i style={{ width: `${Math.min((h.rate / 25) * 100, 100)}%` }} /></span>
            <span className="mini">
              <span><b className="num">{h.T}</b><span>출주</span></span>
              <span><b className="num">{h.w}</b><span>1착</span></span>
              <span><b className="num">{h.w + h.p2 + h.p3}</b><span>3착 이내</span></span>
            </span>
            <span className="peek"><span>{h.tr} 조교사 · {h.rank}</span><em>자세히 보기</em></span>
          </button>
        )) : <p className="rd-empty">찾는 말이 없어요. 다른 이름으로 검색해 보세요.</p>}
      </div>
      <p className="rd-foot">말을 누르면 혈통과 성적, 몸 상태, 최근 경주를 볼 수 있어요.</p>
    </section>
  );
}
