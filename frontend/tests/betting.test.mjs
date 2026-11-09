import test from "node:test";
import assert from "node:assert/strict";
import { BET_TYPES, buildGroupCombinations, buildIndividualCombination, calculateTotalStake, dedupeCombinations, selectionKey, validatePurchase } from "../src/lib/betting.ts";

const race = { id: "a", status: "OPEN" };
const entries = Array.from({ length: 8 }, (_, i) => ({ raceId: "a", horseNo: i + 1, scratched: i === 7 }));
const keys = (type, groups, pattern) => buildGroupCombinations(type, { groups, pattern }, entries).map((selection) => selectionKey(selection, type));
const eligibleEntries = Array.from({ length: 9 }, (_, i) => ({ raceId: "a", horseNo: i + 1, scratched: false }));
const eligibleKeys = (type, groups, pattern) => buildGroupCombinations(type, { groups, pattern }, eligibleEntries).map((selection) => selectionKey(selection, type));
const bet = (type, numbers, unitStake = 100) => ({ betType: type, selections: numbers.map((horseNo, index) => ({ horseNo, position: index + 1 })), unitStake });

test("seven bet types keep their required selection counts and ordering", () => {
  assert.deepEqual(BET_TYPES.map((item) => [item.code, item.requiredCount, item.ordered]), [
    ["WIN", 1, false], ["PLACE", 1, false], ["QUINELLA", 2, false], ["EXACTA", 2, true],
    ["QUINELLA_PLACE", 2, false], ["TRIO", 3, false], ["TRIFECTA", 3, true],
  ]);
  for (const item of BET_TYPES) {
    const numbers = [1, 2, 3].slice(0, item.requiredCount);
    assert.equal(keys(item.code, [numbers]).length, item.ordered ? [1, 2, 6][item.requiredCount - 1] : 1);
    assert.equal(buildIndividualCombination(item.code, bet(item.code, numbers).selections, entries)?.length, item.requiredCount);
  }
  assert.equal(selectionKey([{ horseNo: 2 }, { horseNo: 1 }], "QUINELLA"), "1-2");
  assert.equal(selectionKey([{ horseNo: 2, position: 1 }, { horseNo: 1, position: 2 }], "EXACTA"), "2-1");
});

test("group rows, two group patterns, scratched horses and overlaps", () => {
  assert.deepEqual(keys("QUINELLA", [[1], [2, 3]]), ["1-2", "1-3"]);
  assert.deepEqual(keys("EXACTA", [[1, 2], [1, 3]]), ["1-3", "2-1", "2-3"]);
  assert.deepEqual(keys("TRIO", [[1], [2, 3, 4]], "1+2"), ["1-2-3", "1-2-4", "1-3-4"]);
  assert.deepEqual(keys("TRIO", [[1, 2, 3], [4]], "2+1"), ["1-2-4", "1-3-4", "2-3-4"]);
  assert.deepEqual(keys("TRIFECTA", [[1], [2, 3], [4]]), ["1-2-4", "1-3-4"]);
  assert.deepEqual(eligibleKeys("TRIO", [[2], [4, 6, 8], []]), ["2-4-6", "2-4-8", "2-6-8"]);
  assert.deepEqual(eligibleKeys("TRIO", [[2, 4], [6, 8], []]), ["2-4-6", "2-4-8"]);
  assert.deepEqual(eligibleKeys("TRIO", [[2], [4, 6], [8, 9]]), ["2-4-8", "2-4-9", "2-6-8", "2-6-9"]);
  assert.deepEqual(keys("WIN", [[7, 8, 99]]), ["7"]);
  assert.equal(buildIndividualCombination("WIN", [{ horseNo: 8 }], entries), null);
  const twelveEntries = Array.from({ length: 12 }, (_, i) => ({ raceId: "a", horseNo: i + 1, scratched: false }));
  assert.throws(() => buildGroupCombinations("TRIFECTA", { groups: [twelveEntries.map((entry) => entry.horseNo)] }, twelveEntries), /1000/);
});

test("duplicates and stake validation", () => {
  const one = bet("WIN", [1], 100);
  const two = bet("PLACE", [2], 200);
  assert.deepEqual(dedupeCombinations([one, one, two]), [one, two]);
  assert.equal(calculateTotalStake([one, two]), 300);
  assert.equal(validatePurchase(race, entries, [one, two], 300), null);
  assert.match(validatePurchase(race, entries, [one, two], 299), /부족/);
  assert.match(validatePurchase(race, entries, [one, one], 300), /중복/);
  assert.match(validatePurchase(race, entries, [bet("WIN", [1], 150)], 1000), /100P 단위/);
  assert.match(validatePurchase(race, entries, [bet("WIN", [1], 0)], 1000), /100P 단위/);
  assert.match(validatePurchase(race, entries, [bet("WIN", [1], 100_100)], 200_000), /100P 단위/);
  assert.match(validatePurchase(race, entries, [bet("WIN", [1], 50_100), bet("WIN", [2], 50_000)], 200_000), /한도/);
  assert.match(validatePurchase({ ...race, status: "CANCELLED" }, entries, [one], 1000), /구매할 수 없는/);
  assert.match(validatePurchase(race, entries, [bet("WIN", [8])], 1000), /출전마/);
  assert.match(validatePurchase({ ...race, id: "b" }, entries, [bet("WIN", [1])], 1000), /출전마/);
});
