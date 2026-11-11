import { BET_TYPES, buildGroupCombinations, buildIndividualCombination, defaultGroupCount, getBetTypeMeta, validateStake, type TwoGroupPattern } from "@/lib/betting";
import type { BetCombination, BetType, PurchaseMode, RaceEntry } from "@/types/racing";
import { useState } from "react";
import CombinationEditor from "./CombinationEditor";

export interface Draft {
  skill: "general" | "beginner";
  mode: PurchaseMode;
  type: BetType;
  question: string;
  selected: number[];
  groups: number[][];
  pattern: TwoGroupPattern;
  stake: string;
}

export const initialDraft: Draft = {
  skill: "general", mode: "individual", type: "WIN", question: "",
  selected: [], groups: [[]], pattern: "1+2", stake: "1000",
};

const questions = [
  ["1두", ["WIN", "PLACE"]],
  ["2두 · 순서 무관", ["QUINELLA", "QUINELLA_PLACE"]],
  ["2두 · 순서 지정", ["EXACTA"]],
  ["3두 · 순서 무관", ["TRIO"]],
  ["3두 · 순서 지정", ["TRIFECTA"]],
] as const;

function HorseChoices({ entries, selected, ordered, onToggle }: {
  entries: RaceEntry[];
  selected: number[];
  ordered?: boolean;
  onToggle: (horse: number) => void;
}) {
  return <div className="bet-horse-choices">{entries.map((entry) => {
    const index = selected.indexOf(entry.horseNo);
    return <button key={entry.horseNo} type="button" aria-pressed={index >= 0}
      className={index >= 0 ? "active" : ""} disabled={entry.scratched} onClick={() => onToggle(entry.horseNo)}>
      <strong>{entry.horseNo}</strong>
      <small>{ordered && index >= 0 ? `${index + 1}위` : entry.horseName}</small>
    </button>;
  })}</div>;
}

export default function BetDraftEditor({ draft, entries, open, balance, onChange, onAdd }: {
  draft: Draft;
  entries: RaceEntry[];
  open: boolean;
  balance: number;
  onChange: (draft: Draft) => void;
  onAdd: (combinations: BetCombination[]) => void;
}) {
  const [combinationOpen, setCombinationOpen] = useState(false);
  const meta = getBetTypeMeta(draft.type);
  const recommended: readonly string[] | undefined = questions.find(([label]) => label === draft.question)?.[1];
  const visible = draft.skill === "beginner" && recommended ? BET_TYPES.filter(({ code }) => recommended.includes(code)) : BET_TYPES;
  const mismatch = !visible.includes(meta);
  const update = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  // Only changing the bet type clears picks. Each purchase mode keeps its own picks.
  const chooseType = (type: BetType) => {
    if (type !== draft.type) update({ type, selected: [], groups: Array.from({ length: defaultGroupCount(type) }, () => []), pattern: "1+2" });
  };
  const toggle = (picks: number[], horse: number, limit = Infinity) =>
    picks.includes(horse) ? picks.filter((n) => n !== horse) : picks.length < limit ? [...picks, horse] : picks;
  const individual = draft.mode === "individual"
    ? buildIndividualCombination(draft.type, draft.selected.map((horseNo, i) => ({ horseNo, position: i + 1 })), entries)
    : null;
  const selections = draft.mode === "combination"
    ? buildGroupCombinations(draft.type, { groups: draft.groups, pattern: draft.pattern }, entries)
    : individual ? [individual] : [];
  const unitStake = Number(draft.stake);
  const error = validateStake(unitStake, selections.length, balance);

  return <section className="bet-panel bet-draft">
    <h2>베팅 입력</h2>
    <div role="group" aria-label="안내 모드">
      <button type="button" aria-pressed={draft.skill === "beginner"} onClick={() => update({ skill: "beginner" })}>초보자</button>
      <button type="button" aria-pressed={draft.skill === "general"} onClick={() => update({ skill: "general" })}>일반</button>
    </div>
    <div role="group" aria-label="구매 방식">
      <button type="button" aria-pressed={draft.mode === "individual"} onClick={() => update({ mode: "individual" })}>개별</button>
      <button type="button" aria-pressed={draft.mode === "combination"} onClick={() => update({ mode: "combination" })}>조합</button>
    </div>
    {draft.skill === "beginner" && <label>몇 두를 어떤 순서로 맞힐까요?
      <select value={draft.question} onChange={(e) => update({ question: e.target.value })}>
        <option value="">전체 승식</option>
        {questions.map(([label]) => <option key={label}>{label}</option>)}
      </select>
    </label>}
    <div role="group" aria-label="승식">{visible.map(({ code, label }) =>
      <button key={code} type="button" aria-pressed={draft.type === code} onClick={() => chooseType(code)}>{label}</button>
    )}</div>
    {mismatch && <p role="status">현재 {meta.label} 선택을 보관했습니다. 추천 승식을 선택하거나 전체 승식으로 돌아가세요.</p>}
    <p className="bet-muted">{meta.help}</p>
    {draft.mode === "individual" ? <HorseChoices entries={entries} selected={draft.selected} ordered={meta.ordered}
      onToggle={(horse) => update({ selected: toggle(draft.selected, horse, meta.requiredCount) })} /> :
      <CombinationEditor open={combinationOpen} type={draft.type} groups={draft.groups} pattern={draft.pattern} entries={entries} stake={draft.stake}
        onOpen={() => setCombinationOpen(true)} onClose={() => setCombinationOpen(false)}
        onGroupsChange={(groups) => update({ groups })} onPatternChange={(pattern: TwoGroupPattern) => update({ pattern })} />}
    <label>조합당 금액(P) <input inputMode="numeric" value={draft.stake} onChange={(e) => update({ stake: e.target.value })} /></label>
    {selections.length > 0 && error && <p role="status">{error}</p>}
    {!open && <p className="bet-muted">현재 구매할 수 없는 경주입니다.</p>}
    <button className="bet-button" type="button" disabled={!open || mismatch || !!error}
      onClick={() => onAdd(selections.map((picks) => ({ betType: draft.type, selections: picks, unitStake })))}>
      슬립에 추가 ({selections.length}조합)
    </button>
  </section>;
}
