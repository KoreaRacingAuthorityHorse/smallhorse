"use client";

import { POOLS, poolDef } from "@/lib/past-race/pools";
import type { Bet, BlindEntry, LearningStats, PoolKey } from "@/lib/past-race/types";
import { saddleStyle } from "./saddle";
import styles from "./past-race.module.css";

const fmt = (n: number) => n.toLocaleString("ko-KR");
const QUICK = [500, 1000, 5000];

export default function BetSlip(props: {
  entries: BlindEntry[];
  pool: PoolKey;
  picks: number[];
  stake: number;
  bets: Bet[];
  available: number | null;
  stats: LearningStats | null;
  error: string;
  busy: boolean;
  onPool: (p: PoolKey) => void;
  onPick: (no: number) => void;
  onStake: (v: number) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onConfirm: () => void;
}) {
  const def = poolDef(props.pool);
  const median = props.stats?.poolOdds[props.pool]?.median;
  const combo = props.pool !== "단승" && props.pool !== "연승";

  return (
    <aside className={`panel ${styles.slip}`} aria-label="베팅 슬립">
      <div className={styles.slipHead}>
        <h2>베팅 슬립</h2>
        <span className={styles.muted}>남은 {props.available == null ? "-" : fmt(props.available)} P</span>
      </div>

      <div className={styles.fieldLabel}>승식</div>
      <div className={styles.pools} role="group" aria-label="승식 선택">
        {POOLS.map((p) => (
          <button key={p.key} type="button" aria-pressed={p.key === props.pool} onClick={() => props.onPool(p.key)}>
            {p.key}
          </button>
        ))}
      </div>
      <p className={styles.poolDesc}>
        {def.description}
        {median != null && (
          <>
            {" "}
            지금까지 {fmt(props.stats!.nRaces)}경주에서 적중 배당 중간값은 <b>{median.toFixed(1)}배</b>예요.
          </>
        )}
        {combo && " 조합 배당은 경주가 끝난 뒤 확정돼요."}
      </p>

      <div className={styles.fieldLabel}>
        말 선택 ({def.picks}마리{def.ordered ? ", 고른 순서 = 들어올 순서" : ""})
      </div>
      <div className={styles.picks}>
        {props.entries.map((e) => {
          const i = props.picks.indexOf(e.no);
          return (
            <button
              key={e.no}
              type="button"
              disabled={e.scratched}
              aria-pressed={i >= 0}
              aria-label={`${e.no}번${e.scratched ? " 출전취소" : ""}`}
              style={saddleStyle(e.no)}
              onClick={() => props.onPick(e.no)}
            >
              {e.no}
              {i >= 0 && def.ordered && <sup>{i + 1}위</sup>}
            </button>
          );
        })}
      </div>

      <label className={styles.fieldLabel} htmlFor="stake">금액 (100P 단위)</label>
      <div className={styles.stake}>
        <input
          id="stake"
          type="number"
          min={100}
          step={100}
          inputMode="numeric"
          value={props.stake}
          onChange={(e) => props.onStake(Number(e.target.value))}
        />
        {QUICK.map((q) => (
          <button key={q} type="button" className="btn border small" onClick={() => props.onStake(props.stake + q)}>
            +{fmt(q)}
          </button>
        ))}
      </div>

      <button type="button" className={`btn border block ${styles.addBtn}`} onClick={props.onAdd}>
        슬립에 담기
      </button>
      <p className={styles.error} role="status">{props.error}</p>

      {props.bets.length > 0 && (
        <ul className={styles.bets}>
          {props.bets.map((b, i) => (
            <li key={i}>
              <span>
                <b>{b.pool}</b> <span className={styles.num}>{b.picks.join(poolDef(b.pool).ordered ? "→" : "·")}</span>
              </span>
              <span className={styles.num}>
                {fmt(b.stake)} P
                <button type="button" aria-label="이 베팅 빼기" onClick={() => props.onRemove(i)}>×</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn block" disabled={!props.bets.length || props.busy} onClick={props.onConfirm}>
        {props.busy ? "결과 불러오는 중…" : "베팅 확정하고 결과 보기 ↗"}
      </button>
      <p className={styles.hint}>
        한 경주에 여러 장 담을 수 있어요. 출전취소된 말은 고를 수 없고, 출발 직전 경주제외된 말이 들어간 베팅은 환불돼요.
      </p>
    </aside>
  );
}
