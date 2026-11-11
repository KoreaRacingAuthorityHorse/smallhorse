"use client";

import type { RaceEntry } from "@/types/racing";
import { saddleStyle } from "@/components/past-race/saddle";

export default function EntryTable({ entries, selected = [], onToggle, detailed = false, showHorseNames = true }: {
  entries: RaceEntry[];
  selected?: number[];
  onToggle?: (horseNo: number) => void;
  detailed?: boolean;
  showHorseNames?: boolean;
}) {
  return <div className="bet-entry-table-wrap"><table className="bet-entry-table">
    <caption className="bet-visually-hidden">출전마 정보{detailed ? " 상세" : ""}</caption>
    <thead><tr><th scope="col">번호</th><th scope="col">마명</th><th scope="col">기수</th><th scope="col">단승 배당</th>{detailed && <><th scope="col">최근 5전</th><th scope="col">스타일</th><th scope="col">전적</th><th scope="col">부담중량</th></>}</tr></thead>
    <tbody>{entries.map((entry) => {
      return <tr key={entry.horseNo} className={`${selected.includes(entry.horseNo) ? "is-selected" : ""} ${entry.scratched ? "is-scratched" : ""}`} aria-selected={onToggle ? selected.includes(entry.horseNo) : undefined}>
        <td>{onToggle ? <button type="button" className="bet-entry-number-button" disabled={entry.scratched} aria-pressed={selected.includes(entry.horseNo)} aria-label={`${entry.horseNo}번${showHorseNames && entry.horseName ? ` ${entry.horseName}` : ""} ${selected.includes(entry.horseNo) ? "선택 해제" : "선택"}`} data-tooltip={showHorseNames && entry.horseName ? entry.horseName : undefined} onClick={() => onToggle(entry.horseNo)}><span className="bet-saddle" style={saddleStyle(entry.horseNo)} aria-hidden="true">{entry.horseNo}</span></button> : <span className="bet-saddle" style={saddleStyle(entry.horseNo)} aria-hidden="true">{entry.horseNo}</span>}<span className="bet-visually-hidden">{entry.horseNo}번</span>{entry.scratched && <span className="bet-scratched-label">출전취소</span>}</td>
        <td>{showHorseNames ? entry.horseName : "비공개"}</td><td>{entry.jockeyName}</td><td>{entry.odds.toFixed(1)}배</td>{detailed && <><td>미제공</td><td>미제공</td><td>미제공</td><td>미제공</td></>}
      </tr>;
    })}</tbody>
  </table></div>;
}
