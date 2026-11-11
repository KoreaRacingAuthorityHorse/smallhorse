import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === "./betting" ? new URL("../src/lib/betting.ts", import.meta.url).href : specifier, context);
} });
const { createSlipItem, inspectSlipAddition, appendSlipItem, currentRaceSlip } = await import("../src/lib/bet-slip.ts");
const race = { raceKind: "upcoming", raceId: "a" };
const bet = (betType, horses, unitStake = 1000) => ({ betType, selections: horses.map((horseNo) => ({ horseNo })), unitStake });

test("mixed slip snapshots, duplicate cancel/approval, amounts and deletion", () => {
  const draft = [bet("QUINELLA", [1, 2])];
  const individual = createSlipItem(race, "individual", draft);
  draft[0].selections[0].horseNo = 8;
  draft[0].unitStake = 500;
  assert.equal(individual.combinations[0].selections[0].horseNo, 1);
  assert.equal(individual.combinations[0].unitStake, 1000);
  const group = createSlipItem(race, "combination", [bet("QUINELLA", [2, 1], 2000), bet("QUINELLA", [2, 3], 2000)]);
  const slip = [individual];
  const inspection = inspectSlipAddition(slip, group, 10000);
  assert.equal(inspection.duplicates.length, 1);
  assert.equal(inspection.duplicateStake, 2000);
  assert.equal(inspection.addedStake, 4000);
  assert.equal(inspection.totalStake, 5000);
  assert.equal(appendSlipItem(slip, group, 10000), slip);
  const approved = appendSlipItem(slip, group, 10000, true);
  assert.equal(approved.length, 2);
  assert.equal(new Set(approved.flatMap((item) => item.combinations.map((line) => line.lineId))).size, 3);
  assert.deepEqual(approved[1].duplicateApproval.duplicateLineIds, [group.combinations[0].lineId]);
  const mixed = appendSlipItem(approved, createSlipItem(race, "individual", [bet("PLACE", [1])]), 10000);
  assert.equal(mixed.length, 3);
  assert.equal(inspectSlipAddition([], mixed[1], 10000).totalStake, 4000);
  assert.equal(mixed.filter((item) => item.id !== group.id).flatMap((item) => item.combinations).reduce((sum, line) => sum + line.unitStake, 0), 2000);
});

test("current race and kind isolate overlap checks and repeated principal limits", () => {
  const first = createSlipItem(race, "individual", [bet("WIN", [1], 50000)]);
  const second = createSlipItem(race, "individual", [bet("WIN", [1], 50000)]);
  const approved = appendSlipItem([first], second, 200000, true);
  assert.equal(inspectSlipAddition([first], second, 200000).totalStake, 100000);
  assert.throws(() => appendSlipItem(approved, createSlipItem(race, "individual", [bet("WIN", [2], 100)]), 200000), /한도/);
  assert.throws(() => appendSlipItem([first], second, 99999, true), /부족/);
  const other = createSlipItem({ ...race, raceId: "b" }, "individual", [bet("WIN", [1])]);
  const past = createSlipItem({ ...race, raceKind: "pastBlind" }, "individual", [bet("WIN", [1])]);
  const all = appendSlipItem(appendSlipItem(approved, other, 1000), past, 1000);
  assert.equal(inspectSlipAddition(approved, other, 1000).duplicates.length, 0);
  const restored = JSON.parse(JSON.stringify(all));
  assert.deepEqual(currentRaceSlip(restored, race), approved);
  assert.deepEqual(currentRaceSlip(restored, other), [other]);
  assert.deepEqual(currentRaceSlip(restored, past), [past]);
});

test("ordered overlap respects rank, stakes stay in 100P units", () => {
  const first = createSlipItem(race, "individual", [bet("EXACTA", [1, 2])]);
  const reverse = createSlipItem(race, "combination", [bet("EXACTA", [2, 1])]);
  assert.equal(inspectSlipAddition([first], reverse, 10000).duplicates.length, 0);
  assert.throws(() => appendSlipItem([], createSlipItem(race, "individual", [bet("WIN", [1], 150)]), 10000), /100P/);
});
