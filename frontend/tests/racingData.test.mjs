import test from "node:test";
import assert from "node:assert/strict";
import { getEntries, getRaceById, getRaceWithEntries, getRaces } from "../src/data/races.ts";

test("race data can be filtered by track, date, and status without mutating source data", () => {
  const openBusan = getRaces({ trackCode: "BUSAN", status: "OPEN" });
  assert.ok(openBusan.length > 0);
  assert.ok(openBusan.every((race) => race.trackCode === "BUSAN" && race.status === "OPEN"));

  const dated = getRaces({ raceDate: "2026-11-06" });
  assert.ok(dated.length > 0);
  assert.ok(dated.every((race) => race.raceDate === "2026-11-06"));

  const first = getRaces()[0];
  first.raceNo = 999;
  assert.notEqual(getRaceById(first.id)?.raceNo, 999);
});

test("race detail joins entries and preserves scratched horse and odds data", () => {
  const detail = getRaceWithEntries("u1");
  assert.ok(detail);
  assert.equal(detail.race.id, "u1");
  assert.equal(detail.entries.length, detail.race.entryCount);
  assert.ok(detail.entries.every((entry) => entry.raceId === detail.race.id));
  assert.ok(detail.entries.some((entry) => entry.scratched));
  assert.ok(detail.entries.every((entry) => Number.isFinite(entry.odds) && entry.odds > 0));
  assert.deepEqual(getEntries("missing"), []);
  assert.equal(getRaceWithEntries("missing"), undefined);
});
