import { BET_TYPES, buildGroupCombinations, buildIndividualCombination, calculateTotalStake, defaultGroupCount, getBetTypeMeta, validateStake, type TwoGroupPattern } from "@/lib/betting";
import type { BetCombination, BetType, PurchaseMode, RaceEntry } from "@/types/racing";
import { useState } from "react";
import CombinationEditor from "./CombinationEditor";
import { saddleStyle } from "@/components/past-race/saddle";
import { Check } from "lucide-react";

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

type BeginnerCount = 1 | 2 | 3;
type BeginnerStep = "count" | "goal" | "result";
type BeginnerPath = { count: BeginnerCount | null; type: BetType | null; step: BeginnerStep };

const beginnerOptions: Record<BeginnerCount, { label: string; type: BetType }[]> = {
  1: [{ label: "1등을 맞히고 싶어요", type: "WIN" }, { label: "상위권에만 들면 돼요", type: "PLACE" }],
  2: [
    { label: "1등과 2등을 순서대로 맞힐래요", type: "EXACTA" },
    { label: "1등과 2등이면 순서는 상관없어요", type: "QUINELLA" },
    { label: "두 말 모두 상위권이면 돼요", type: "QUINELLA_PLACE" },
  ],
  3: [
    { label: "1·2·3등을 순서대로 맞힐래요", type: "TRIFECTA" },
    { label: "1·2·3등이면 순서는 상관없어요", type: "TRIO" },
  ],
};

const stakePresets = [100, 500, 1_000, 5_000, 10_000, 30_000, 50_000, 100_000] as const;

function parseBeginnerPath(question: string): BeginnerPath {
  const match = /^(1|2|3)\|(WIN|PLACE|QUINELLA|EXACTA|QUINELLA_PLACE|TRIO|TRIFECTA)?\|(count|goal|result)$/.exec(question);
  if (!match) return { count: null, type: null, step: "count" };
  return { count: Number(match[1]) as BeginnerCount, type: (match[2] || null) as BetType | null, step: match[3] as BeginnerStep };
}

function serializeBeginnerPath(path: BeginnerPath): string {
  return `${path.count ?? ""}|${path.type ?? ""}|${path.step}`;
}


function HorseChoices({ entries, selected, showHorseNames, onToggle }: {
  entries: RaceEntry[];
  selected: number[];
  showHorseNames: boolean;
  onToggle: (horse: number) => void;
}) {
  return <div className="bet-horse-choices">{entries.map((entry) => {
    const index = selected.indexOf(entry.horseNo);
    return <button key={entry.horseNo} type="button" aria-pressed={index >= 0}
      className={index >= 0 ? "active" : ""} disabled={entry.scratched}
      aria-label={`${entry.horseNo}번${showHorseNames && entry.horseName ? ` ${entry.horseName}` : ""} ${index >= 0 ? "선택 해제" : "선택"}`}
      data-tooltip={showHorseNames && entry.horseName ? entry.horseName : undefined}
      onClick={() => onToggle(entry.horseNo)}>
      {index >= 0 && <span className="bet-horse-selection-tab" aria-hidden="true"><Check size={11} strokeWidth={3} /></span>}
      <span className="bet-saddle" style={saddleStyle(entry.horseNo)} aria-hidden="true">{entry.horseNo}</span>
    </button>;
  })}</div>;
}

export default function BetDraftEditor({ draft, entries, open, balance, showHorseNames, onChange, onAdd }: {
  draft: Draft;
  entries: RaceEntry[];
  open: boolean;
  balance: number;
  showHorseNames: boolean;
  onChange: (draft: Draft) => void;
  onAdd: (combinations: BetCombination[]) => void;
}) {
  const [combinationOpen, setCombinationOpen] = useState(false);
  const meta = getBetTypeMeta(draft.type);
  const beginnerPath = parseBeginnerPath(draft.question);
  const beginnerReady = beginnerPath.step === "result" && beginnerPath.type === draft.type;
  const mismatch = draft.skill === "beginner" && !beginnerReady;
  const update = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  // Changing questions preserves picks; changing the bet type uses the existing reset rule.
  const chooseType = (type: BetType) => {
    if (type !== draft.type) update({ type, selected: [], groups: Array.from({ length: defaultGroupCount(type) }, () => []), pattern: "1+2" });
  };
  const chooseBeginnerType = (type: BetType) => {
    const question = serializeBeginnerPath({ ...beginnerPath, type, step: "result" });
    if (type === draft.type) update({ question });
    else update({ type, question, selected: [], groups: Array.from({ length: defaultGroupCount(type) }, () => []), pattern: "1+2" });
  };
  const toggleGroupHorse = (groupIndex: number, horseNo: number) => {
    if (!draft.groups[groupIndex]?.includes(horseNo) && draft.groups.some((group, index) => index !== groupIndex && group.includes(horseNo))) return;
    const groups = draft.groups.map((group, index) => index !== groupIndex
      ? group
      : group.includes(horseNo) ? group.filter((value) => value !== horseNo) : [...group, horseNo]);
    update({ groups });
  };
  const toggle = (picks: number[], horse: number, limit = Infinity) =>
    picks.includes(horse) ? picks.filter((n) => n !== horse) : picks.length < limit ? [...picks, horse] : picks;
  const individual = draft.mode === "individual"
    ? buildIndividualCombination(draft.type, draft.selected.map((horseNo, i) => ({ horseNo, position: i + 1 })), entries)
    : null;
  const selections = draft.mode === "combination"
    ? buildGroupCombinations(draft.type, { groups: draft.groups, pattern: draft.pattern }, entries)
    : individual ? [individual] : [];
  const quickGroupIndices = Array.from({ length: meta.requiredCount }, (_, rowIndex) => {
    if (draft.groups.length === meta.requiredCount) return rowIndex;
    if (draft.groups.length === 1) return 0;
    if (meta.requiredCount === 3 && draft.groups.length === 2) {
      return draft.pattern === "2+1" ? (rowIndex < 2 ? 0 : 1) : (rowIndex === 0 ? 0 : 1);
    }
    return Math.min(rowIndex, draft.groups.length - 1);
  });
  const unitStake = Number(draft.stake);
  const estimatedTotal = calculateTotalStake(selections.length, unitStake);
  const error = validateStake(unitStake, selections.length, balance);

  return <section className="bet-panel bet-draft">
    <h2>베팅 입력</h2>
    <div className="bet-preferences">
      <label className="bet-preference bet-skill-preference">사용 모드
        <select aria-label="사용 모드" value={draft.skill} onChange={(event) => update({ skill: event.target.value as Draft["skill"] })}>
          <option value="beginner">초보자 모드</option>
          <option value="general">일반 모드</option>
        </select>
      </label>
      <div className="bet-preference bet-purchase-preference">
        <span className="bet-preference-label">구매 방식</span>
        <div className="bet-purchase-segments" role="group" aria-label="구매 방식">
          <button type="button" aria-pressed={draft.mode === "individual"} onClick={() => update({ mode: "individual" })}>개별</button>
          <button type="button" aria-pressed={draft.mode === "combination"} onClick={() => update({ mode: "combination" })}>조합</button>
        </div>
      </div>
    </div>
    {draft.skill === "beginner" && <div className="bet-beginner-flow" aria-live="polite">
      {beginnerPath.step === "count" && <fieldset className="bet-beginner-question">
        <legend>몇 마리의 순위를 맞히고 싶으세요?</legend>
        <div className="bet-beginner-options" role="group" aria-label="맞힐 말의 수">
          {([1, 2, 3] as const).map((count) => <button key={count} type="button" aria-pressed={beginnerPath.count === count} onClick={() => update({ question: serializeBeginnerPath({ count, type: beginnerPath.count === count ? beginnerPath.type : null, step: "goal" }) })}>{count}마리</button>)}
        </div>
      </fieldset>}
      {beginnerPath.step === "goal" && beginnerPath.count && <fieldset className="bet-beginner-question">
        <legend>{beginnerPath.count}마리의 순위를 어떻게 맞히고 싶으세요?</legend>
        <div className="bet-beginner-options" role="group" aria-label="승식 선택 질문">
          {beginnerOptions[beginnerPath.count].map(({ label, type }) => <button key={type} type="button" aria-pressed={beginnerPath.type === type} onClick={() => chooseBeginnerType(type)}>{label}</button>)}
        </div>
        <button className="bet-beginner-back" type="button" onClick={() => update({ question: serializeBeginnerPath({ ...beginnerPath, step: "count" }) })}>이전 질문</button>
      </fieldset>}
      {beginnerPath.step === "result" && beginnerPath.type && <div className="bet-beginner-result">
        <p>선택한 승식</p><strong>{getBetTypeMeta(beginnerPath.type).label}</strong><span>{getBetTypeMeta(beginnerPath.type).help}</span>
        <button className="bet-beginner-back" type="button" onClick={() => update({ question: serializeBeginnerPath({ ...beginnerPath, step: "goal" }) })}>이전 질문</button>
      </div>}
    </div>}
    {draft.skill === "general" && <div className="bet-type-options" role="group" aria-label="승식">{BET_TYPES.map(({ code, label }) =>
      <button key={code} type="button" aria-pressed={draft.type === code} onClick={() => chooseType(code)}>{label}</button>
    )}</div>}
    {draft.mode === "individual" ? <section className="bet-individual-picker" aria-labelledby="bet-individual-picker-title">
      <h3 id="bet-individual-picker-title">마번 선택</h3>
      <HorseChoices entries={entries} selected={draft.selected} showHorseNames={showHorseNames}
        onToggle={(horse) => update({ selected: toggle(draft.selected, horse, meta.requiredCount) })} />
    </section> : <section className="bet-combination-quick" aria-labelledby="bet-combination-quick-title">
      <div className="bet-combination-quick-head">
        <h3 id="bet-combination-quick-title">마번 선택</h3>
        <button type="button" className="bet-combination-edit-open" aria-haspopup="dialog" onClick={() => setCombinationOpen(true)}>조합 편집 열기</button>
      </div>
      <div className="bet-combination-quick-rows">
        {quickGroupIndices.map((groupIndex, rowIndex) => <div className="bet-horse-choices bet-combination-quick-choices" key={rowIndex}>
          {entries.map((entry) => {
            const group = draft.groups[groupIndex] ?? [];
            const selected = group.includes(entry.horseNo);
            const selectedInOtherGroup = draft.groups.some((otherGroup, index) => index !== groupIndex && otherGroup.includes(entry.horseNo));
            return <button key={entry.horseNo} type="button" aria-pressed={selected} className={selected ? "active" : ""}
              disabled={entry.scratched || (!selected && selectedInOtherGroup)} aria-label={`${entry.horseNo}번${showHorseNames && entry.horseName ? ` ${entry.horseName}` : ""} ${selected ? "선택 해제" : selectedInOtherGroup ? "다른 라인에서 선택됨" : "선택"}`}
              data-tooltip={showHorseNames && entry.horseName ? entry.horseName : undefined}
              onClick={() => toggleGroupHorse(groupIndex, entry.horseNo)}>
              <span className="bet-saddle bet-combination-saddle" aria-hidden="true">{entry.horseNo}</span>
            </button>;
          })}
        </div>)}
      </div>
      <section className="bet-combination-quick-results" aria-live="polite">
        <h4>선택된 마번 조합</h4>
        {selections.length > 0 && <ol>{selections.slice(0, 12).map((combination, index) => <li key={`${combination.map(({ horseNo }) => horseNo).join("-")}-${index}`}>{combination.map(({ horseNo }) => horseNo).join("-")}</li>)}</ol>}
        {selections.length > 12 && <p className="bet-combination-more">외 {selections.length - 12}개 조합</p>}
      </section>
      <CombinationEditor open={combinationOpen} type={draft.type} groups={draft.groups} pattern={draft.pattern} entries={entries} stake={draft.stake} showHorseNames={showHorseNames}
        onClose={() => setCombinationOpen(false)}
        onGroupsChange={(groups) => update({ groups })} onPatternChange={(pattern: TwoGroupPattern) => update({ pattern })} />
    </section>}
    <section className="bet-stake-picker" aria-labelledby="bet-stake-title">
      <h3 id="bet-stake-title">조합당 금액 (P)</h3>
      <div className="bet-stake-presets" role="group" aria-label="조합당 금액 선택">
        {stakePresets.map((amount) => <button key={amount} type="button" aria-pressed={unitStake === amount}
          aria-label={`${amount.toLocaleString()} 포인트`} onClick={() => update({ stake: String(amount) })}>{amount.toLocaleString()}</button>)}
      </div>
      <div className="bet-stake-estimate">
        <p>예상 조합 <strong>{selections.length}개</strong></p>
        <p>예상 총액 <strong>{estimatedTotal.toLocaleString()}P</strong></p>
      </div>
    </section>
    {selections.length > 0 && error && <p role="status">{error}</p>}
    {!open && <p className="bet-muted">현재 구매할 수 없는 경주입니다.</p>}
    <button className="bet-button" type="button" disabled={!open || mismatch || !!error}
      onClick={() => onAdd(selections.map((picks) => ({ betType: draft.type, selections: picks, unitStake })))}>
      슬립에 추가 ({selections.length}조합)
    </button>
  </section>;
}
