import test from "node:test";
import assert from "node:assert/strict";
import {
  BET_TYPES,
  buildCombinations,
  buildGroupCombinations,
  buildIndividualCombination,
  calculateCombinationTotal,
  calculateTotalStake,
  defaultGroupCount,
  dedupeCombinations,
  selectionKey,
  validateCombinationStakes,
  validatePurchase,
  validateStake,
} from "../src/lib/betting.ts";

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
  assert.equal(defaultGroupCount("WIN"), 1);
  assert.equal(defaultGroupCount("PLACE"), 1);
  assert.equal(defaultGroupCount("QUINELLA"), 2);
  assert.equal(defaultGroupCount("EXACTA"), 2);
  assert.equal(defaultGroupCount("QUINELLA_PLACE"), 2);
  assert.equal(defaultGroupCount("TRIO"), 3);
  assert.equal(defaultGroupCount("TRIFECTA"), 3);
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

test("trailing empty groups support length 3 drafts across all bet types", () => {
  // WIN and PLACE with 3-element array
  assert.deepEqual(keys("WIN", [[1, 2], [], []]), ["1", "2"]);
  assert.deepEqual(keys("PLACE", [[3], [], []]), ["3"]);

  // QUINELLA and EXACTA with 3-element array
  assert.deepEqual(keys("QUINELLA", [[1], [2, 3], []]), ["1-2", "1-3"]);
  assert.deepEqual(keys("EXACTA", [[1], [2, 3], []]), ["1-2", "1-3"]);

  // TRIFECTA 2-group patterns
  assert.deepEqual(keys("TRIFECTA", [[1], [2, 3]], "1+2"), ["1-2-3", "1-3-2"]);
  assert.deepEqual(keys("TRIFECTA", [[1, 2], [3]], "2+1"), ["1-2-3", "2-1-3"]);

  // Box betting from single group in combinations
  assert.deepEqual(keys("EXACTA", [[1, 2, 3]]), ["1-2", "1-3", "2-1", "2-3", "3-1", "3-2"]);
  assert.deepEqual(keys("QUINELLA", [[1, 2, 3]]), ["1-2", "1-3", "2-3"]);
  assert.deepEqual(keys("TRIO", [[1, 2, 3, 4]]), ["1-2-3", "1-2-4", "1-3-4", "2-3-4"]);
});

test("buildCombinations generates combinations for individual selections", () => {
  const selections = [{ horseNo: 1 }, { horseNo: 2 }, { horseNo: 3 }];
  const trio = buildCombinations(selections, "TRIO");
  assert.equal(trio.length, 1);
  assert.deepEqual(trio[0].map((s) => s.horseNo), [1, 2, 3]);

  const quinella = buildCombinations(selections, "QUINELLA");
  assert.equal(quinella.length, 3);
  assert.deepEqual(quinella.map((c) => selectionKey(c, "QUINELLA")), ["1-2", "1-3", "2-3"]);

  const exacta = buildCombinations(selections.slice(0, 2), "EXACTA");
  assert.equal(exacta.length, 1);
  assert.equal(selectionKey(exacta[0], "EXACTA"), "1-2");
});

test("bet math stake calculations and validations", () => {
  // calculateTotalStake with count and stake
  assert.equal(calculateTotalStake(6, 1000), 6000);
  assert.equal(calculateCombinationTotal([{ unitStake: 500 }, { unitStake: 1500 }, {}], 1000), 3000);

  // validateStake
  assert.equal(validateStake(1000, 5, 10000), null);
  assert.match(validateStake(50, 1, 10000), /기준 금액/);
  assert.match(validateStake(150, 1, 10000), /기준 금액/);
  assert.match(validateStake(1000, 0, 10000), /조합을 하나 이상/);
  assert.match(validateStake(20000, 6, 200000), /한도/);
  assert.match(validateStake(5000, 3, 10000), /부족/);

  // validateCombinationStakes
  assert.equal(validateCombinationStakes([1000, 2000], 5000), null);
  assert.match(validateCombinationStakes([50], 5000), /100P 이상/);
  assert.match(validateCombinationStakes([60000, 50000], 200000), /한도/);
  assert.match(validateCombinationStakes([3000, 3000], 5000), /부족/);
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
