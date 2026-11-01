"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX, MEETS, MEET_IDS, MIN, POOLS, RACE_NOS, TRACK_LEN, TRACK_PATH, WEEK,
  fmtD, getRace, hasDay, isOrderedPool, latest, near, oddsRows, segPoints, step, trackPoint, wonMan,
  type Entry, type MeetId, type Pool, type Race, type SegPointKey,
} from "../_lib/data";

type SubTab = "rank" | "seg" | "odds";
const W_ICON = { 맑음: "☀️", 흐림: "☁️", 비: "🌧️" } as const;

function Chevron() {
  return (
    <svg className="rd-chev" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

function Calendar({ meet, date, onPick, onClose }: { meet: MeetId; date: string; onPick: (d: string) => void; onClose: () => void }) {
  const [y, setY] = useState(+date.slice(0, 4));
  const [mo, setMo] = useState(+date.slice(4, 6));
  const [view, setView] = useState<"day" | "month">("day");
  const minY = +MIN.slice(0, 4), maxY = +MAX.slice(0, 4), minMo = +MIN.slice(4, 6), maxMo = +MAX.slice(4, 6);

  if (view === "month") {
    return (
      <>
        <div className="rd-cal-h">
          <button type="button" aria-label="이전 해" disabled={y <= minY} onClick={() => setY(y - 1)}>‹</button>
          <button type="button" className="t" onClick={() => setView("day")}>{y}년</button>
          <button type="button" aria-label="다음 해" disabled={y >= maxY} onClick={() => setY(y + 1)}>›</button>
        </div>
        <div className="rd-cal-m">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button
              type="button"
              key={m}
              aria-pressed={y === +date.slice(0, 4) && m === +date.slice(4, 6)}
              disabled={(y === minY && m < minMo) || (y === maxY && m > maxMo)}
              onClick={() => { setMo(m); setView("day"); }}
            >
              {m}월
            </button>
          ))}
        </div>
      </>
    );
  }

  const first = new Date(y, mo - 1, 1).getDay(), days = new Date(y, mo, 0).getDate();
  const atMin = y === minY && mo <= minMo, atMax = y === maxY && mo >= maxMo;
  const moveMonth = (dir: 1 | -1) => {
    const n = mo + dir;
    if (n < 1) { setMo(12); setY(y - 1); } else if (n > 12) { setMo(1); setY(y + 1); } else setMo(n);
  };
  return (
    <>
      <div className="rd-cal-h">
        <button type="button" aria-label="이전 달" disabled={atMin} onClick={() => moveMonth(-1)}>‹</button>
        <button type="button" className="t" onClick={() => setView("month")}>{y}년 {mo}월 ▾</button>
        <button type="button" aria-label="다음 달" disabled={atMax} onClick={() => moveMonth(1)}>›</button>
      </div>
      <div className="rd-cal-w">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="rd-cal-g">
        {Array.from({ length: first }, (_, i) => <i key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const x = `${y}${String(mo).padStart(2, "0")}${String(i + 1).padStart(2, "0")}`, ok = hasDay(x, meet);
          return (
            <button type="button" key={x} className={ok ? "on" : ""} disabled={!ok} aria-pressed={x === date}
              aria-label={`${mo}월 ${i + 1}일${ok ? " 경주일" : ""}`} onClick={() => onPick(x)}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="rd-cal-f">
        <span>{MEETS[meet]} 경주일만 선택할 수 있어요</span>
        <button type="button" onClick={() => { onPick(latest(meet)); onClose(); }}>최근 경주일</button>
      </div>
    </>
  );
}

function TrackMap({ race, sel, onSelect }: { race: Race; sel: SegPointKey; onSelect: (k: SegPointKey) => void }) {
  const pts = segPoints(race.c.rcDist), d0 = pts[0].d0, cur = pts.find((x) => x.k === sel) ?? pts[0];
  return (
    <svg viewBox="0 0 780 300" role="img" aria-label="경주로 지도">
      <rect className="inf" x="130" y="73" width="520" height="154" rx="77" />
      <path className="tk-o" d={TRACK_PATH} fill="none" strokeWidth="54" />
      <path className="tk-i" d={TRACK_PATH} fill="none" strokeWidth="48" />
      <path className="prog" d={TRACK_PATH} strokeWidth="6" strokeDasharray={`0 ${d0 + 90} ${Math.max(cur.d - d0 - 90, 0.01)} ${TRACK_LEN * 2}`} />
      <rect className="goal" x="309" y="226" width="6" height="48" rx="2" />
      <text className="ctr" x="390" y="150">{race.c.rcDist.toLocaleString()}m</text>
      <text className="ctr2" x="390" y="178">{MEETS[race.m]} · 시계 방향</text>
      {pts.map((x) => {
        const [px, py] = trackPoint(x.k === "FIN" ? TRACK_LEN - 0.01 : x.d), on = x.k === sel;
        return (
          <g key={x.k} role="button" tabIndex={0} aria-pressed={on} aria-label={x.n} onClick={() => onSelect(x.k)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(x.k); } }}>
            <circle className="dot" cx={px} cy={py} r={on ? 15 : 12} />
            {on && <text className="lb" x={px} y={py + (py < 150 ? -26 : 34)}>{x.l}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function SegSection({ race }: { race: Race }) {
  const [sel, setSel] = useState<SegPointKey>("S1F");
  const pts = segPoints(race.c.rcDist);
  const cur: SegPointKey = pts.some((x) => x.k === sel) ? sel : "S1F";
  const i = pts.findIndex((x) => x.k === cur), prev = i > 0 ? pts[i - 1].k : null;
  const ordAt = (e: Entry, k: SegPointKey) => (k === "FIN" ? e.stOrd : e.seg[k]);
  const rows = [...race.ents].sort((a, b) => ordAt(a, cur) - ordAt(b, cur));
  return (
    <div className="rd-segbox">
      <div className="rd-segmap"><TrackMap race={race} sel={cur} onSelect={setSel} /></div>
      <p className="rd-hint">지점을 누르면 그 지점을 지날 때의 순위를 볼 수 있어요.</p>
      <div className="rd-segchips" role="tablist" aria-label="구간">
        {pts.map((x) => (
          <button type="button" key={x.k} className="rd-pill" aria-pressed={x.k === cur} onClick={() => setSel(x.k)}>{x.n}</button>
        ))}
      </div>
      <ol className="rd-segrank">
        {rows.map((e) => {
          const dlt = prev ? ordAt(e, prev) - ordAt(e, cur) : 0;
          return (
            <li key={e.chulNo}>
              <span className="r num">{ordAt(e, cur)}</span>
              <span className="g num">{e.chulNo}</span>
              <span className="n">{e.hrName}</span>
              <span className="c num">{dlt ? <span className={dlt > 0 ? "up" : "down"}>{dlt > 0 ? "▲" : "▼"}{Math.abs(dlt)}</span> : null}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function OddsSection({ race }: { race: Race }) {
  const [pool, setPool] = useState<Pool>("WIN");
  const rows = oddsRows(race, pool);
  return (
    <>
      <div className="rd-row">
        {(Object.keys(POOLS) as Pool[]).map((p) => (
          <button type="button" key={p} className="rd-pill" aria-pressed={p === pool} onClick={() => setPool(p)}>{POOLS[p]}</button>
        ))}
      </div>
      <div className="rd-combos">
        {rows.map(([c, o]) => (
          <div className="rd-combo" key={c.join("-")}>
            <div className="balls">
              {c.map((n, i) => (
                <span key={n} className="balls-item">
                  {i > 0 && isOrderedPool(pool) && <span aria-hidden="true">›</span>}
                  <span className="ball num">{n}</span>
                </span>
              ))}
            </div>
            <b className="num">{o}<small> 배</small></b>
          </div>
        ))}
      </div>
    </>
  );
}

export default function RaceTab() {
  const [meet, setMeet] = useState<MeetId>(1);
  const [date, setDate] = useState(() => latest(1));
  const [no, setNo] = useState(1);
  const [result, setResult] = useState(false);
  const [sub, setSub] = useState<SubTab>("rank");
  const [calOpen, setCalOpen] = useState(false);
  const [openHorse, setOpenHorse] = useState<number | null>(null);
  const calWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calOpen) return;
    const onDown = (e: MouseEvent) => { if (!calWrapRef.current?.contains(e.target as Node)) setCalOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCalOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [calOpen]);

  const goDate = (d: string) => { setDate(d); setNo(1); setOpenHorse(null); setCalOpen(false); };
  const race = getRace(date, meet, no)!;
  const c = race.c;
  const pv = step(date, meet, -1), nx = step(date, meet, 1);
  const races = RACE_NOS.map((n) => getRace(date, meet, n)).filter((r): r is Race => !!r);
  const byOrd = [...race.ents].sort((a, b) => a.stOrd - b.stOrd);
  const hasOdds = +date >= 20230107;
  const curSub: SubTab = sub === "odds" && !hasOdds ? "rank" : sub;
  const rows = result ? byOrd : race.ents;

  return (
    <section className="rd-page" aria-labelledby="rdRaceTitle">
      <div className="rd-mtabs m3" role="tablist" aria-label="경마장">
        {MEET_IDS.map((m) => (
          <button type="button" role="tab" key={m} aria-selected={m === meet}
            onClick={() => { if (m === meet) return; setMeet(m); goDate(near(date, m)); }}>
            {MEETS[m]}
          </button>
        ))}
      </div>

      <div className="rd-dwrap" ref={calWrapRef}>
        <div className="rd-datebar">
          <button type="button" aria-label="이전 경주일" disabled={!pv} onClick={() => pv && goDate(pv)}>‹</button>
          <button type="button" className="dl" aria-haspopup="dialog" aria-expanded={calOpen} aria-label="달력에서 날짜 선택" onClick={() => setCalOpen(!calOpen)}>
            <b>
              {date.slice(0, 4)}년 {fmtD(date)}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
            </b>
            <span>{MEETS[meet]} · {races.length}경주</span>
          </button>
          <button type="button" aria-label="다음 경주일" disabled={!nx} onClick={() => nx && goDate(nx)}>›</button>
        </div>
        {calOpen && (
          <div className="rd-cal" role="dialog" aria-label="날짜 선택">
            <Calendar key={`${meet}-${date}`} meet={meet} date={date} onPick={goDate} onClose={() => setCalOpen(false)} />
          </div>
        )}
      </div>

      <div className="rd-rtabs" role="tablist" aria-label="경주 번호">
        {races.map((r) => (
          <button type="button" role="tab" key={r.no} aria-selected={r.no === no} onClick={() => { setNo(r.no); setOpenHorse(null); }}>
            <b>{r.no}경주</b><span>{r.c.stTime}</span>
          </button>
        ))}
      </div>

      <div className="rd-layout">
        <div>
          <div className="rd-head">
            <div>
              <h2 id="rdRaceTitle">{MEETS[meet]} {race.no}경주 · {c.rcName}</h2>
              <p>{c.stTime} 출발 · {c.rcDist}m · {c.rank} · {race.ents.length}두 출전</p>
            </div>
            <div className="rd-seg" role="group" aria-label="보기">
              <button type="button" aria-pressed={!result} onClick={() => setResult(false)}>출전표</button>
              <button type="button" aria-pressed={result} onClick={() => setResult(true)}>결과</button>
            </div>
          </div>

          {result && (
            <>
              <div className="rd-podium">
                {byOrd.slice(0, 3).map((e, i) => (
                  <div className={`pd r${i + 1}`} key={e.chulNo}>
                    <div className="medal" aria-label={`${i + 1}착`}>{i + 1}</div>
                    <div className="tx">
                      <b>{e.hrName}</b>
                      <span className="num">{e.chulNo}번 · {e.rcTime}</span>
                      <span>단승 {e.win}배</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rd-stabs" role="tablist" aria-label="결과 보기">
                {([["rank", "순위"], ["seg", "구간별 순위"], ...(hasOdds ? [["odds", "배당률"]] : [])] as [SubTab, string][]).map(([k, l]) => (
                  <button type="button" role="tab" key={k} aria-selected={curSub === k} onClick={() => setSub(k)}>{l}</button>
                ))}
              </div>
            </>
          )}

          {(!result || curSub === "rank") && (
            <div className={`rd-list ${result ? "rk3" : "ent"}`}>
              <div className="rd-rhead" aria-hidden="true">
                {result ? (
                  <><span>착순</span><span>마번</span><span>마명</span></>
                ) : (
                  <><span>마번</span><span>마명</span><span className="jk">기수</span><span className="tr">조교사</span><span className="rt">레이팅</span></>
                )}
                <span />
              </div>
              {rows.map((e) => (
                <details
                  key={e.chulNo}
                  className={`rd-horse${result && e.stOrd <= 3 ? ` t${e.stOrd}` : ""}`}
                  open={openHorse === e.chulNo}
                  onToggle={(ev) => {
                    const isOpen = (ev.currentTarget as HTMLDetailsElement).open;
                    if (isOpen) setOpenHorse(e.chulNo);
                    else if (openHorse === e.chulNo) setOpenHorse(null);
                  }}
                >
                  {result ? (
                    <summary className="rs">
                      <b className="rk num">{e.stOrd}</b>
                      <span className="gate num" title="출주번호">{e.chulNo}</span>
                      <span className="nm">{e.hrName}{e.stOrd === 1 && <span className="tagr">우승</span>}</span>
                      <Chevron />
                    </summary>
                  ) : (
                    <summary className="rs">
                      <span className="gate num" title="출주번호">{e.chulNo}</span>
                      <span className="nm">{e.hrName}</span>
                      <span className="jk">{e.jkName}</span>
                      <span className="tr">{e.trName}</span>
                      <span className={`rt num${e.hrRating ? "" : " no"}`}>{e.hrRating || "미산정"}</span>
                      <Chevron />
                    </summary>
                  )}
                  <dl className="rd-more">
                    <div><dt>성별 · 나이</dt><dd>{e.sex} {e.age}세</dd></div>
                    <div><dt>부담중량</dt><dd>{e.wgBudam}kg</dd></div>
                    <div><dt>마주</dt><dd>{e.owName}</dd></div>
                    <div><dt>산지</dt><dd>{e.prdCtyNm}</dd></div>
                    <div><dt>장구</dt><dd>{e.hrTool || "없음"}</dd></div>
                    <div><dt>마번</dt><dd className="num">{e.hrNo}</dd></div>
                    {result ? (
                      <>
                        <div><dt>기수</dt><dd>{e.jkName}</dd></div>
                        <div><dt>기록</dt><dd className="num">{e.rcTime}</dd></div>
                        <div><dt>도착차</dt><dd>{e.differ ? `${e.differ}마신` : "-"}</dd></div>
                        <div><dt>단승 · 연승</dt><dd className="num">{e.win}배 · {e.plc}배</dd></div>
                      </>
                    ) : (
                      <div><dt>레이팅</dt><dd>{e.hrRating || "미산정"}</dd></div>
                    )}
                  </dl>
                </details>
              ))}
            </div>
          )}

          {result && curSub === "seg" && <SegSection key={`${date}-${meet}-${no}`} race={race} />}
          {result && curSub === "odds" && <OddsSection race={race} />}
        </div>

        <aside className="rd-side">
          <div className="rd-box">
            <h3>경주 조건</h3>
            <dl className="rd-facts">
              {[["거리", `${c.rcDist.toLocaleString()}m`], ["등급", c.rank], ["출전", `${race.ents.length}두`], ["연령", c.ageCond], ["성별", c.sexCond], ["부담", c.budam], ["1착 상금", wonMan(c.chaksun1)], ["출발", c.stTime]].map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rd-box">
            <h3>주로 상태</h3>
            <div className="rd-track">
              <span className="big" aria-hidden="true">{W_ICON[c.weather]}</span>
              <div><b>{c.track} · 함수율 {c.water}%</b><span>{c.weather}</span></div>
            </div>
          </div>
          <p className="rd-src-note">
            {result ? "출처: 출전표, 경주로정보, 경주별 상세성적표, 확정배당율종합 (한국마사회)" : "출처: 출전표, 경주로정보 (한국마사회) · 결과는 숨겨져 있어요"}
          </p>
        </aside>
      </div>
    </section>
  );
}
