"use client";

import type { BlindEntry } from "@/lib/past-race/types";
import { saddleStyle } from "./saddle";
import Term from "./Term";
import styles from "./past-race.module.css";

function Form({ recent }: { recent: string[] }) {
  if (!recent.length) return <span className={styles.muted}>첫 출전</span>;
  return (
    <span className={styles.form}>
      {recent.map((r, i) => {
        const n = Number.parseInt(r, 10);
        if (Number.isNaN(n)) return <b key={i} title={r}>{r[0]}</b>;
        return <b key={i} className={n === 1 ? styles.p1 : n <= 3 ? styles.p23 : undefined}>{n}</b>;
      })}
    </span>
  );
}

export default function EntryTable({
  entries,
  selected,
  onToggle,
}: {
  entries: BlindEntry[];
  selected: number[];
  onToggle: (no: number) => void;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>번호</th>
            <th><Term term="인기">인기</Term></th>
            <th className={styles.r}><Term term="단승배당">단승</Term></th>
            <th className={styles.r}><Term term="연승배당">연승</Term></th>
            <th>성별·나이</th>
            <th className={styles.r}><Term term="레이팅">레이팅</Term></th>
            <th className={styles.r}><Term term="부담중량">부담중량</Term></th>
            <th className={styles.r}><Term term="마체중">마체중</Term></th>
            <th><Term term="최근5전">최근 5전</Term></th>
            <th><Term term="스타일">스타일</Term></th>
            <th className={styles.r}><Term term="기수승률">기수 승률</Term></th>
            <th className={styles.r}>통산</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isSel = selected.includes(e.no);
            const d = e.bodyWeightDelta;
            return (
              <tr
                key={e.no}
                className={`${e.scratched ? styles.scratched : ""} ${isSel ? styles.selectedRow : ""}`}
                onClick={() => !e.scratched && onToggle(e.no)}
                onKeyDown={(ev) => {
                  if (!e.scratched && (ev.key === "Enter" || ev.key === " ")) {
                    ev.preventDefault();
                    onToggle(e.no);
                  }
                }}
                tabIndex={e.scratched ? -1 : 0}
                aria-selected={isSel}
              >
                <td><span className={styles.saddle} style={saddleStyle(e.no)}>{e.no}</span></td>
                <td>
                  {e.scratched ? (
                    <span className={styles.bad}>출전취소</span>
                  ) : (
                    <span className={e.favRank === 1 ? styles.fav1 : styles.muted}>{e.favRank}위</span>
                  )}
                </td>
                <td className={`${styles.r} ${styles.num}`}>{e.winOdds?.toFixed(1) ?? "-"}</td>
                <td className={`${styles.r} ${styles.num}`}>{e.placeOdds?.toFixed(1) ?? "-"}</td>
                <td>
                  {e.sex} {e.age ?? ""}세 <span className={styles.muted}>{e.origin}</span>
                </td>
                <td className={`${styles.r} ${styles.num}`}>{e.rating ?? "-"}</td>
                <td className={`${styles.r} ${styles.num}`}>
                  {e.carriedKg ?? "-"}
                  {e.jockeyAllowanceKg ? <span className={styles.muted}> (-{e.jockeyAllowanceKg})</span> : null}
                </td>
                <td className={`${styles.r} ${styles.num}`}>
                  {e.bodyWeight ?? "-"}
                  {d != null && (
                    <span className={d > 0 ? styles.up : d < 0 ? styles.down : styles.muted}> ({d > 0 ? "+" : ""}{d})</span>
                  )}
                </td>
                <td><Form recent={e.recent} /></td>
                <td><span className={styles.style}>{e.style}</span></td>
                <td className={`${styles.r} ${styles.num}`}>{e.jockeyWinPct != null ? `${e.jockeyWinPct}%` : "-"}</td>
                <td className={`${styles.r} ${styles.num}`}>{e.starts != null ? `${e.starts}전 ${e.wins}승` : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
