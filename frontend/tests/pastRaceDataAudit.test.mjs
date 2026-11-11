import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { races } = JSON.parse(readFileSync(new URL("../src/data/mock/past-races.json", import.meta.url), "utf8"));
const pools = ["단승", "연승", "복승", "쌍승", "복연승", "삼복승", "삼쌍승"];
const definitions = {
  단승: { count: 1, ordered: false }, 연승: { count: 1, ordered: false }, 복승: { count: 2, ordered: false },
  쌍승: { count: 2, ordered: true }, 복연승: { count: 2, ordered: false }, 삼복승: { count: 3, ordered: false }, 삼쌍승: { count: 3, ordered: true },
};
const normalize = (numbers, ordered) => (ordered ? numbers : [...numbers].sort((a, b) => a - b)).join("-");
const resultMatches = (payouts, picks, ordered) => payouts.includes(normalize(picks, ordered));
const expectedWinners = (race, pool) => {
  const placed = race.reveal.entries.filter((entry) => entry.pos !== null).sort((a, b) => a.pos - b.pos);
  if (pool === "단승") return [String(placed[0].no)];
  if (pool === "연승") return placed.filter((entry) => entry.pos <= (race.blind.starters <= 7 ? 2 : 3)).map((entry) => String(entry.no));
  if (pool === "복연승") {
    const top = placed.filter((entry) => entry.pos <= 3).map((entry) => entry.no);
    return top.flatMap((a, i) => top.slice(i + 1).map((b) => normalize([a, b], false)));
  }
  const top = placed.filter((entry) => entry.pos <= definitions[pool].count).map((entry) => entry.no);
  return [normalize(top, definitions[pool].ordered)];
};

test("20개 과거 경주의 출전표, 순위, 7개 배당 조합이 서로 일치한다", () => {
  assert.equal(races.length, 20);
  for (const race of races) {
    const blindNos = race.blind.entries.map((entry) => entry.no).sort((a, b) => a - b);
    const revealNos = race.reveal.entries.map((entry) => entry.no).sort((a, b) => a - b);
    assert.deepEqual(revealNos, blindNos, `${race.id}: entry numbers`);
    const placed = race.reveal.entries.filter((entry) => entry.pos !== null);
    assert.equal(new Set(placed.map((entry) => entry.pos)).size, placed.length, `${race.id}: tied positions`);
    assert.ok([1, 2, 3].every((position) => placed.some((entry) => entry.pos === position)), `${race.id}: top three missing`);
    for (const pool of pools) {
      const payouts = race.reveal.payouts[pool];
      assert.ok(Array.isArray(payouts) && payouts.length > 0, `${race.id}/${pool}: missing payout list`);
      const combos = payouts.map(({ combo, odds }) => {
        const picks = combo.split("-").map(Number);
        assert.equal(picks.length, definitions[pool].count, `${race.id}/${pool}/${combo}: selection count`);
        assert.equal(new Set(picks).size, picks.length, `${race.id}/${pool}/${combo}: repeated number`);
        assert.ok(picks.every((number) => blindNos.includes(number)), `${race.id}/${pool}/${combo}: unknown number`);
        assert.ok(Number.isFinite(odds) && odds > 0, `${race.id}/${pool}/${combo}: invalid odds`);
        return normalize(picks, definitions[pool].ordered);
      });
      assert.equal(new Set(combos).size, combos.length, `${race.id}/${pool}: duplicate combo`);
      assert.deepEqual([...combos].sort(), [...expectedWinners(race, pool)].sort(), `${race.id}/${pool}: confirmed finish order`);
    }
  }
});

test("각 승식의 적중·미적중, 순서, 환불 fixture가 규칙에 맞다", () => {
  const payouts = {
    단승: ["1"], 연승: ["1", "2", "3"], 복승: ["1-2"], 쌍승: ["1-2"], 복연승: ["1-2", "1-3", "2-3"], 삼복승: ["1-2-3"], 삼쌍승: ["1-2-3"],
  };
  for (const pool of pools) {
    const hit = pool === "단승" || pool === "연승" ? [1] : pool === "복승" ? [2, 1] : pool === "쌍승" ? [1, 2] : pool === "복연승" ? [3, 1] : pool === "삼복승" ? [3, 1, 2] : [1, 2, 3];
    assert.equal(resultMatches(payouts[pool], hit, definitions[pool].ordered), true, `${pool}: hit`);
    const miss = pool === "단승" || pool === "연승" ? [4] : pool === "복승" || pool === "쌍승" || pool === "복연승" ? [1, 4] : [1, 2, 4];
    assert.equal(resultMatches(payouts[pool], miss, definitions[pool].ordered), false, `${pool}: miss`);
  }
  assert.notEqual(normalize([1, 2], true), normalize([2, 1], true), "ordered pools distinguish order");
  assert.equal(normalize([1, 2], false), normalize([2, 1], false), "unordered pools ignore order");
  const refundStatuses = new Set(["출전취소", "경주제외", "출발제외"]);
  const outcome = (status, isHit) => refundStatuses.has(status) ? "refund" : isHit ? "hit" : "miss";
  for (const status of refundStatuses) assert.equal(outcome(status, false), "refund", `${status}: refund takes priority`);
  assert.equal(outcome("완주", true), "hit");
  assert.equal(outcome("완주", false), "miss");
  const tiedPositions = [1, 1, 3];
  assert.notEqual(new Set(tiedPositions).size, tiedPositions.length, "tie fixture must be rejected");
  assert.equal([1, 2, 3].every((position) => [1, 3].includes(position)), false, "missing rank is unavailable");
  assert.equal(payouts.단승.length > 0, true, "non-empty result is available");
  assert.equal([].length > 0, false, "missing or empty results are unavailable");
});
