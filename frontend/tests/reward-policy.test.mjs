import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "./pools") return nextResolve(new URL("../src/lib/past-race/pools.ts", import.meta.url).href, context);
  return nextResolve(specifier, context);
} });
const { calculateReward } = await import("../src/lib/reward-policy.ts");
const { classifyOutcome, settleBet, checkResultAvailability } = await import("../src/lib/past-race/settle.ts");
const { races } = JSON.parse(readFileSync(new URL("../src/data/mock/past-races.json", import.meta.url), "utf8"));

test("fixed returns include stake and keep refunds at 100%", () => {
  assert.deepEqual(calculateReward("pastBlind", "hit", 1000), { outcome: "hit", stake: 1000, returnAmount: 1500, netChange: 500 });
  assert.deepEqual(calculateReward("upcoming", "hit", 1000), { outcome: "hit", stake: 1000, returnAmount: 2000, netChange: 1000 });
  for (const kind of ["pastBlind", "upcoming"]) {
    assert.equal(calculateReward(kind, "miss", 1000).returnAmount, 0);
    assert.equal(calculateReward(kind, "refund", 1000).returnAmount, 1000);
    assert.equal(calculateReward(kind, "refund", 1000).netChange, 0);
  }
  assert.throws(() => calculateReward("pastBlind", "hit", 150), /100P/);
});

test("legacy past-race odds settlement remains unchanged while new classifier is separate", () => {
  const race = races[0];
  const reveal = race.reveal;
  const win = reveal.payouts.단승[0];
  const hit = { pool: "단승", picks: [Number(win.combo)], stake: 1000 };
  assert.equal(checkResultAvailability(reveal, ["단승"]).status, "available");
  assert.deepEqual(classifyOutcome(hit, reveal), { kind: "hit", odds: win.odds });
  assert.deepEqual(settleBet(hit, reveal), { kind: "hit", payout: Math.floor(1000 * win.odds), odds: win.odds });
  const missNo = reveal.entries.find((entry) => entry.pos !== 1 && entry.status === "완주").no;
  assert.deepEqual(settleBet({ ...hit, picks: [missNo] }, reveal), { kind: "miss", payout: 0 });
  for (const status of ["출전취소", "경주제외", "출발제외"]) {
    const refundReveal = { ...reveal, entries: reveal.entries.map((entry) => entry.no === missNo ? { ...entry, status } : entry) };
    assert.deepEqual(classifyOutcome({ ...hit, picks: [missNo] }, refundReveal), { kind: "refund" });
    assert.deepEqual(settleBet({ ...hit, picks: [missNo] }, refundReveal), { kind: "refund", payout: 1000 });
  }
});
