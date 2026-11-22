import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./betting") return nextResolve(new URL("../src/lib/betting.ts", import.meta.url).href, context);
    if (specifier === "./demo-wallet") return nextResolve(new URL("../src/lib/demo-wallet.ts", import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});

const { DEMO_STORAGE_KEY, INITIAL_BALANCE, completeDemoPurchase, completeSlipPurchase, validateSlipPurchase, creditPurchase, readDemoState, readPurchaseSnapshot, savePurchaseSettlement, resetDemoState, setDemoTask } = await import("../src/lib/demoPurchase.ts");
const { createSlipItem, appendSlipItem } = await import("../src/lib/bet-slip.ts");

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

test("purchase retry and result retry each change the balance once", () => {
  const storage = memoryStorage();
  const buy = () => completeDemoPurchase(race, entries, [combos[0]], "individual", storage, () => "same-id");
  assert.equal(buy().balance, INITIAL_BALANCE - 100);
  assert.equal(buy().balance, INITIAL_BALANCE - 100);
  assert.equal(readDemoState(storage).records.length, 1);
  assert.equal(creditPurchase("same-id", "result-1", 150, storage).credited, true);
  assert.equal(creditPurchase("same-id", "result-1", 150, storage).credited, false);
  assert.equal(readDemoState(storage).balance, INITIAL_BALANCE + 50);
  assert.equal(readPurchaseSnapshot("same-id", storage).settled, true);
});

test("purchase snapshots survive 21 summaries and storage failure cancels purchase", () => {
  const storage = memoryStorage();
  for (let i = 0; i < 21; i++) completeDemoPurchase(race, entries, [combos[0]], "individual", storage, () => `purchase-${i}`);
  assert.equal(readDemoState(storage).records.length, 20);
  assert.equal(readPurchaseSnapshot("purchase-0", storage).purchase.id, "purchase-0");
  storage.removeItem("trackon-purchase-v1:purchase-0");
  assert.equal(readPurchaseSnapshot("purchase-0", storage), null);
  const failing = { ...storage, setItem(key, value) { if (key === DEMO_STORAGE_KEY) throw new Error("quota"); storage.setItem(key, value); } };
  const before = readDemoState(storage).balance;
  assert.match(completeDemoPurchase(race, entries, [combos[0]], "individual", failing, () => "failed").error, /저장/);
  assert.equal(readDemoState(storage).balance, before);
  assert.equal(readPurchaseSnapshot("failed", storage), null);
});

const purchaseRace = { ...race, raceKind: "upcoming" };
const context = { raceId: race.id, raceKind: "upcoming" };
function mixedSlip() {
  const one = createSlipItem(context, "individual", [combos[0]]);
  const group = createSlipItem(context, "combination", [combos[0], { ...combos[0], selections: [{ horseNo: 2 }], unitStake: 500 }]);
  return appendSlipItem([one], group, 10000, true);
}

test("mixed approved lines preserve IDs, modes, groups, approval and principal in durable snapshot", () => {
  const storage = memoryStorage({ balance: 700, records: [], tasks: [] });
  const items = mixedSlip();
  const expected = structuredClone(items);
  const result = completeSlipPurchase(purchaseRace, entries, items, "mixed", storage);
  assert.equal(result.balance, 0);
  assert.equal(result.purchase.mode, "mixed");
  assert.equal(result.purchase.resultStatus, "pending");
  assert.equal(result.purchase.lines.length, 3);
  assert.deepEqual(result.purchase.lines.map((line) => [line.lineId, line.raceId, line.mode, line.groupId]), expected.flatMap((item) => item.combinations.map((line) => [line.lineId, item.raceId, item.mode, item.groupId])));
  items[0].combinations[0].unitStake = 300;
  assert.deepEqual(readPurchaseSnapshot("mixed", storage).purchase.items, expected);
  assert.equal(readDemoState(storage).records[0].amount, -700);
  // Fresh read, spent balance, closed race, and a new request ID after a failed Draft clear.
  assert.equal(completeSlipPurchase({ ...purchaseRace, status: "CLOSED" }, entries, expected, "mixed", storage).balance, 0);
  assert.equal(completeSlipPurchase(purchaseRace, entries, expected, "after-reload", storage).purchase.id, "mixed");
  assert.equal(readDemoState(storage).records.length, 1);
  creditPurchase("mixed", "settled", 200, storage);
  assert.equal(completeSlipPurchase(purchaseRace, entries, expected, "after-settled", storage).purchase.id, "mixed");
  assert.equal(readDemoState(storage).balance, 200);
});

test("purchase rejects unapproved overlaps, duplicate IDs and duplicate combinations within a group", () => {
  const storage = memoryStorage();
  const approved = mixedSlip();
  const unapproved = structuredClone(approved);
  delete unapproved[1].duplicateApproval;
  assert.match(completeSlipPurchase(purchaseRace, entries, unapproved, "unapproved", storage).error, /중복/);
  const forged = structuredClone(approved);
  forged[1].duplicateApproval.duplicateLineIds = ["another-line"];
  assert.match(validateSlipPurchase(purchaseRace, entries, forged, 10000), /승인/);
  const duplicateId = structuredClone(approved);
  duplicateId[1].combinations[0].lineId = duplicateId[0].combinations[0].lineId;
  assert.match(validateSlipPurchase(purchaseRace, entries, duplicateId, 10000), /라인/);
  const inner = createSlipItem(context, "combination", [combos[0], combos[0]]);
  inner.duplicateApproval = { approvedAt: new Date().toISOString(), duplicateLineIds: inner.combinations.map((line) => line.lineId) };
  assert.match(validateSlipPurchase(purchaseRace, entries, [inner], 10000), /그룹 내부/);
  assert.equal(readDemoState(storage).records.length, 0);
});

test("single-race boundary and latest status, scratches, amounts, limit and balance are checked", () => {
  const items = mixedSlip();
  for (const foreign of [{ ...items[0], raceId: "other" }, { ...items[0], raceKind: "pastBlind" }]) {
    assert.match(validateSlipPurchase(purchaseRace, entries, [items[0], foreign], 10000), /현재 경주/);
  }
  const foreignLine = structuredClone(items);
  foreignLine[0].combinations[0].raceId = "other";
  assert.match(validateSlipPurchase(purchaseRace, entries, foreignLine, 10000), /현재 경주/);
  assert.match(validateSlipPurchase({ ...purchaseRace, status: "CLOSED" }, entries, items, 10000), /구매할 수 없는/);
  assert.match(validateSlipPurchase(purchaseRace, entries.map((entry) => ({ ...entry, scratched: entry.horseNo === 1 })), items, 10000), /출전마/);
  assert.match(validateSlipPurchase(purchaseRace, entries, items, 699), /부족/);
  const huge = createSlipItem(context, "combination", [1, 2].map((horseNo) => ({ ...combos[0], selections: [{ horseNo }], unitStake: 60000 })));
  assert.match(validateSlipPurchase(purchaseRace, entries, [huge], 200000), /한도/);
  huge.combinations[0].unitStake = 150;
  assert.match(validateSlipPurchase(purchaseRace, entries, [huge], 200000), /100P/);
  const storage = memoryStorage();
  storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ balance: 699, records: [], tasks: [] }));
  assert.match(completeSlipPurchase(purchaseRace, entries, items, "latest-balance", storage).error, /부족/);
  assert.equal(readDemoState(storage).balance, 699);
});

test("new snapshots survive 21 transactions; deleted or corrupt snapshots cannot be bought again", () => {
  const storage = memoryStorage();
  const first = [createSlipItem(context, "individual", [combos[0]])];
  completeSlipPurchase(purchaseRace, entries, first, "first", storage);
  for (let i = 0; i < 20; i++) {
    const next = [createSlipItem(context, "individual", [combos[0]])];
    assert.equal(completeSlipPurchase(purchaseRace, entries, next, `new-${i}`, storage).error, undefined);
  }
  assert.equal(readDemoState(storage).records.length, 20);
  assert.deepEqual(readPurchaseSnapshot("first", storage).purchase.items, first);
  const balance = readDemoState(storage).balance;
  const brokenLines = JSON.parse(storage.getItem("trackon-purchase-v1:first"));
  brokenLines.purchase.lines[0].raceId = "other";
  for (const raw of [null, "{broken", JSON.stringify(brokenLines), JSON.stringify({ purchase: { id: "first" }, debited: true, settled: false })]) {
    if (raw === null) storage.removeItem("trackon-purchase-v1:first");
    else storage.setItem("trackon-purchase-v1:first", raw);
    assert.equal(readPurchaseSnapshot("first", storage), null);
    assert.match(completeSlipPurchase(purchaseRace, entries, first, "first", storage).error, /복원/);
    assert.match(completeSlipPurchase(purchaseRace, entries, first, "retry-new-id", storage).error, /복원/);
    assert.equal(readDemoState(storage).balance, balance);
  }
});

test("settled result snapshots survive later transactions and snapshot write failure is reported", () => {
  const storage = memoryStorage();
  const items = [createSlipItem(context, "individual", [combos[0]])];
  completeSlipPurchase(purchaseRace, entries, items, "result-snapshot", storage);
  creditPurchase("result-snapshot", "result:u1", 150, storage);
  const settlement = { status: "settled", purchaseId: "result-snapshot", raceKind: "upcoming", lines: [], groups: [], totalStake: 100, totalReturn: 150, netChange: 50 };
  assert.equal(savePurchaseSettlement("result-snapshot", settlement, storage), true);
  assert.deepEqual(readPurchaseSnapshot("result-snapshot", storage).settlement, settlement);
  for (let index = 0; index < 20; index++) {
    const next = [createSlipItem(context, "individual", [combos[0]])];
    completeSlipPurchase(purchaseRace, entries, next, `result-later-${index}`, storage);
  }
  assert.deepEqual(readPurchaseSnapshot("result-snapshot", storage).settlement, settlement);
  const failing = { ...storage, setItem(key, value) { if (key === "trackon-purchase-v1:result-snapshot") throw new Error("quota"); storage.setItem(key, value); } };
  assert.equal(savePurchaseSettlement("result-snapshot", settlement, failing), false);
});

test("snapshot or wallet write failure never commits; staged orphan cannot masquerade as a debit", () => {
  for (const failure of ["snapshot", "wallet", "wallet-and-cleanup"]) {
    const storage = memoryStorage();
    const items = mixedSlip();
    const failing = { ...storage,
      setItem(key, value) {
        if (failure === "snapshot" ? key.startsWith("trackon-purchase-v1:") : key === DEMO_STORAGE_KEY) throw new Error("quota");
        storage.setItem(key, value);
      },
      removeItem(key) { if (failure === "wallet-and-cleanup") throw new Error("blocked"); storage.removeItem(key); },
    };
    assert.match(completeSlipPurchase(purchaseRace, entries, items, "failed", failing).error, /저장/);
    assert.equal(readDemoState(storage).balance, INITIAL_BALANCE);
    assert.equal(readDemoState(storage).records.length, 0);
    assert.equal(readPurchaseSnapshot("failed", storage), null);
    if (failure === "wallet-and-cleanup") {
      assert.match(completeSlipPurchase(purchaseRace, entries, items, "failed", storage).error, /손상/);
      assert.equal(readDemoState(storage).balance, INITIAL_BALANCE);
    } else assert.equal(completeSlipPurchase(purchaseRace, entries, items, "failed", storage).balance, INITIAL_BALANCE - 700);
  }
});

test("blocked localStorage access returns an error instead of throwing during submission", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
  try {
    assert.match(completeSlipPurchase(purchaseRace, entries, mixedSlip(), "blocked").error, /저장/);
    assert.match(completeDemoPurchase(race, entries, combos, "individual").error, /저장/);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
});
