import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./betting") return nextResolve(new URL("../src/lib/betting.ts", import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});

const { DEMO_STORAGE_KEY, INITIAL_BALANCE, completeDemoPurchase, readDemoState, resetDemoState, setDemoTask } = await import("../src/lib/demoPurchase.ts");

function memoryStorage(initial = null) {
  const values = new Map(initial === null ? [] : [[DEMO_STORAGE_KEY, JSON.stringify(initial)]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const race = { id: "u1", status: "OPEN", trackCode: "BUSAN", raceNo: 1 };
const entries = [1, 2, 3].map((horseNo) => ({ raceId: "u1", horseNo, scratched: false }));
const combos = [
  { betType: "WIN", selections: [{ horseNo: 1 }], unitStake: 100 },
  { betType: "QUINELLA", selections: [{ horseNo: 2 }, { horseNo: 3 }], unitStake: 500 },
];

test("one purchase deducts once, creates one record, and preserves existing demo fields", () => {
  const oldRecord = { day: "10.01", name: "예전 경주", kind: "단승", pick: "2", result: "예측", amount: -100 };
  const storage = memoryStorage({ balance: 900, records: [oldRecord], tasks: [true, false, false, false, false], preference: "keep" });
  const result = completeDemoPurchase(race, entries, combos, "combination", storage, () => "purchase-1", () => new Date("2026-11-02T05:00:00Z"));
  assert.equal(result.error, undefined);
  assert.equal(result.balance, 300);
  const saved = readDemoState(storage);
  assert.equal(saved.balance, 300);
  assert.equal(saved.preference, "keep");
  assert.equal(saved.records.length, 2);
  assert.equal(saved.records[0].id, "purchase-1");
  assert.equal(saved.records[0].raceId, "u1");
  assert.equal(saved.records[0].amount, -600);
  assert.equal(saved.records[0].purchase.combinations.length, 2);
  assert.deepEqual(saved.records[1], oldRecord);
  assert.deepEqual(saved.tasks, [true, false, true, false, false]);
  setDemoTask(1, true, storage);
  assert.equal(readDemoState(storage).balance, 300);
  assert.equal(readDemoState(storage).records.length, 2);
  assert.deepEqual(readDemoState(storage).tasks, [true, true, true, false, false]);
  resetDemoState(storage);
  assert.equal(readDemoState(storage).balance, INITIAL_BALANCE);
  assert.deepEqual(readDemoState(storage).records, []);
});

test("rejected purchases do not alter stored balance or records", () => {
  const storage = memoryStorage({ balance: 500, records: [], tasks: [true, true, false, false, false] });
  const before = storage.getItem(DEMO_STORAGE_KEY);
  assert.match(completeDemoPurchase(race, entries, combos, "individual", storage).error, /부족/);
  assert.equal(storage.getItem(DEMO_STORAGE_KEY), before);
  assert.match(completeDemoPurchase({ ...race, status: "CANCELLED" }, entries, [combos[0]], "individual", storage).error, /구매할 수 없는/);
  assert.equal(storage.getItem(DEMO_STORAGE_KEY), before);
  assert.match(completeDemoPurchase(race, entries, [combos[0], combos[0]], "individual", storage).error, /중복/);
  assert.equal(storage.getItem(DEMO_STORAGE_KEY), before);
});

test("saved state survives a new read after purchase", () => {
  const storage = memoryStorage();
  const result = completeDemoPurchase(race, entries, [combos[0]], "individual", storage, () => "purchase-2");
  assert.equal(result.balance, INITIAL_BALANCE - 100);
  const reloaded = readDemoState(storage);
  assert.equal(reloaded.records.length, 1);
  assert.equal(reloaded.records[0].purchase.id, "purchase-2");
  assert.equal(reloaded.balance, INITIAL_BALANCE - 100);
});
