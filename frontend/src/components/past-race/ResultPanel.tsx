"use client";

import { POOLS, poolDef } from "@/lib/past-race/pools";
import type { BlindRace, LearningStats, Settlement } from "@/lib/past-race/types";
import ReplayCanvas from "./ReplayCanvas";
import { saddleStyle } from "./saddle";
import Term from "./Term";
import styles from "./past-race.module.css";

const fmt = (n: number) => n.toLocaleString("ko-KR");
const secLabel = (s: number) => {
  const m = Math.floor(s / 60);
  return m ? `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}` : s.toFixed(1);
};
const CLOSE_MARGINS = ["코", "머리", "목"];

/** 결과 데이터로 입문자용 해설 문장을 만든다. */
function commentary(race: BlindRace, s: Settlement): string[] {
  const fin = s.reveal.entries.filter((e) => e.pos != null);
  const out: string[] = [];
  const w = fin.find((e) => e.pos === 1);
  const second = fin.find((e) => e.pos === 2);
  if (w) {
    const r = w.s1fRank ?? 0;
    const path =
      r === 1
        ? "출발부터 선두로 나서 끝까지 지켰어요"
        : r >= 5
          ? `출발 200m에서는 ${r}위였는데 뒤에서 치고 올라와 역전했어요`
          : `출발 200m ${r}위로 앞쪽에서 따라가다 마지막에 앞섰어요`;
    out.push(`${w.no}번 ${w.horse} 우승. ${path}.`);
  }
  if (second?.margin) {
    const close = CLOSE_MARGINS.some((t) => second.margin!.includes(t));
    out.push(
      close
        ? `2위와의 차이는 ${second.margin}. 말 몸길이보다도 작은 아주 근소한 차이예요.`
        : `2위와의 차이는 ${second.margin}마신이에요.`,
    );
  }
  const fastest = fin.filter((e) => e.last3f != null).sort((a, b) => a.last3f! - b.last3f!)[0];
  if (fastest) out.push(`마지막 600m를 가장 빨리 달린 말은 ${fastest.no}번(${fastest.last3f!.toFixed(1)}초), 최종 ${fastest.pos}위예요.`);
  const fav = race.entries.find((e) => e.favRank === 1);
  if (fav) {
    const r = s.reveal.entries.find((e) => e.no === fav.no);
    out.push(`인기 1위였던 ${fav.no}번은 ${r?.pos ? `${r.pos}위` : r?.status}로 들어왔어요.`);
  }
  if (race.waterPct != null && race.waterPct >= 10) {
    out.push(`함수율 ${race.waterPct}%로 모래가 젖은 날이었어요. 젖은 모래는 단단해져서 기록이 빨라지는 편이에요.`);
  }
  return out;
}

function tip(stats: LearningStats, round: number): string {
  const f = stats.favorite;
  const tips = [
    `인기 1위 말이 실제로 우승하는 경우는 ${f["1"].win}%뿐이에요. 3위 안에 드는 경우는 ${f["1"].top3}%예요.`,
    `출발 200m에서 선두였던 말의 우승 확률은 ${stats.s1fLeaderWinPct}%예요. 초반 자리 싸움이 꽤 중요해요.`,
    `삼쌍승 적중 배당의 중간값은 ${stats.poolOdds["삼쌍승"].median.toFixed(0)}배, 연승은 ${stats.poolOdds["연승"].median.toFixed(1)}배예요. 어려울수록 배당이 커져요.`,
    `인기 2위 말의 우승 확률은 ${f["2"].win}%, 3위 말은 ${f["3"].win}%예요. 인기 순위가 정답은 아니에요.`,
  ];
  return `${tips[round % tips.length]} (확정 경주 ${fmt(stats.nRaces)}개 기준)`;
}

export default function ResultPanel({
  race,
  settlement,
  stats,
  round,
  onNext,
}: {
  race: BlindRace;
  settlement: Settlement;
  stats: LearningStats | null;
  round: number;
  onNext: () => void;
}) {
  const { reveal } = settlement;
  const net = settlement.totalPayout - settlement.totalStake;
  const mine = new Set(settlement.bets.flatMap((b) => b.bet.picks));
  const favOf = (no: number) => race.entries.find((e) => e.no === no)?.favRank;
  const rows = [...reveal.entries].sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99) || a.no - b.no);

  return (
    <section className={styles.result} aria-labelledby="result-title">
      <div className={styles.resultHead}>
        <div>
          <div className="eyebrow">RESULT / 이름 공개</div>
          <h2 id="result-title" className={styles.resultTitle}>
            {reveal.date.replaceAll("-", ".")} {race.meet} {reveal.raceNo}경주
            <span> · {reveal.raceName}</span>
          </h2>
        </div>
        <button type="button" className="btn" onClick={onNext}>다음 경주 ↗</button>
      </div>

      <ReplayCanvas entries={reveal.entries} distance={race.distance} meet={race.meet} />

      <div className={styles.resultGrid}>
        <div className="panel">
          <h3 className={styles.panelTitle}>경주 결과</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>순위</th><th>번호</th><th>마명</th><th>기수</th>
                  <th className={styles.r}>기록</th><th><Term term="착차">착차</Term></th>
                  <th className={styles.r}>출발 200m</th><th className={styles.r}>막판 600m</th><th className={styles.r}>인기</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.no} className={mine.has(e.no) ? styles.selectedRow : undefined}>
                    <td>{e.pos ? <b className={e.pos === 1 ? styles.fav1 : styles.num}>{e.pos}</b> : <span className={styles.bad}>{e.status}</span>}</td>
                    <td><span className={styles.saddle} style={saddleStyle(e.no)}>{e.no}</span></td>
                    <td>{e.horse}</td>
                    <td>{e.jockey}</td>
                    <td className={`${styles.r} ${styles.num}`}>{e.time != null ? secLabel(e.time) : "-"}</td>
                    <td>{e.pos && e.pos > 1 ? e.margin : ""}</td>
                    <td className={`${styles.r} ${styles.num}`}>{e.s1fRank ? `${e.s1fRank}위` : "-"}</td>
                    <td className={`${styles.r} ${styles.num}`}>{e.last3f != null ? `${e.last3f.toFixed(1)}초` : "-"}</td>
                    <td className={`${styles.r} ${styles.num}`}>{favOf(e.no) ? `${favOf(e.no)}위` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.resultSide}>
          <div className="panel">
            <h3 className={styles.panelTitle}>내 베팅 정산</h3>
            <ul className={styles.settle}>
              {settlement.bets.map(({ bet, outcome }, i) => (
                <li key={i} className={styles[outcome.kind]}>
                  <span>
                    <b>{bet.pool}</b> {bet.picks.join(poolDef(bet.pool).ordered ? "→" : "·")} · {fmt(bet.stake)}P
                  </span>
                  <b className={styles.num}>
                    {outcome.kind === "hit"
                      ? `적중 ×${outcome.odds} = +${fmt(outcome.payout)}P`
                      : outcome.kind === "refund"
                        ? `환불 ${fmt(outcome.payout)}P`
                        : `-${fmt(bet.stake)}P`}
                  </b>
                </li>
              ))}
            </ul>
            <div className={styles.total}>
              <span>이번 경주 손익</span>
              <b className={`${styles.num} ${net >= 0 ? styles.plus : styles.minus}`}>{net >= 0 ? "+" : ""}{fmt(net)} P</b>
            </div>
          </div>

          <div className="panel">
            <h3 className={styles.panelTitle}>확정 배당</h3>
            <table className={styles.table}>
              <thead><tr><th>승식</th><th>적중 번호</th><th className={styles.r}>배당</th></tr></thead>
              <tbody>
                {POOLS.flatMap((p) =>
                  (reveal.payouts[p.key] ?? []).map((po, i) => (
                    <tr key={`${p.key}-${i}`}>
                      <td>{i === 0 ? p.key : ""}</td>
                      <td className={styles.num}>{po.combo.split("-").join(p.ordered ? "→" : "·")}</td>
                      <td className={`${styles.r} ${styles.num}`}>{po.odds.toFixed(1)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3 className={styles.panelTitle}>이 경주 읽기</h3>
        <ul className={styles.notes}>
          {commentary(race, settlement).map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>
      {stats && (
        <p className={styles.tip}>
          <b>알고 보면</b> {tip(stats, round)}
        </p>
      )}
    </section>
  );
}
