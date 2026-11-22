import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adaptPastBlindRace, adaptUpcomingRace, BET_TYPE_TO_POOL_KEY, POOL_KEY_TO_BET_TYPE, VENUE_TO_TRACK } from "../src/lib/race-adapters.ts";

const sample = JSON.parse(readFileSync(new URL("../src/data/mock/past-races.json", import.meta.url), "utf8")).races[0];

test("the seven betting codes round trip explicitly", () => {
  assert.equal(Object.keys(BET_TYPE_TO_POOL_KEY).length, 7);
  for (const [betType, pool] of Object.entries(BET_TYPE_TO_POOL_KEY)) {
    assert.equal(POOL_KEY_TO_BET_TYPE[pool], betType);
  }
  assert.equal(VENUE_TO_TRACK.영천, null);
});

test("historical adapter exposes blind fields and preserves independent ID", () => {
  const blind = { id: sample.id, ...sample.blind };
  blind.entries[0] = { ...blind.entries[0], horse: "hidden", jockey: "hidden" };
  const view = adaptPastBlindRace(blind);
  assert.equal(view.kind, "pastBlind");
  assert.equal(view.id, sample.id);
  assert.equal(view.venue, sample.blind.meet);
  assert.equal(view.detailsAvailability, "blind");
  assert.equal(view.selectableEntries.length, sample.blind.entries.length);
  assert.equal("horse" in view.selectableEntries[0], false);
  assert.equal("jockey" in view.selectableEntries[0], false);
  assert.equal("reveal" in view, false);
  assert.equal("payouts" in view, false);
  assert.equal("raceDate" in view.display, false);
});

test("synthetic race keeps its own ID and only matching entries", () => {
  const race = { id: "u1", trackCode: "BUSAN", raceDate: "2026-10-30", raceNo: 1,
    startTime: "11:30", distance: 1200, status: "OPEN", className: "국6등급", image: "race-a.jpg", entryCount: 1 };
  const view = adaptUpcomingRace(race, [
    { raceId: "u1", horseNo: 1, horseName: "천둥", jockeyName: "김도윤", scratched: false, odds: 2.1 },
    { raceId: "p1", horseNo: 2, horseName: "other", jockeyName: "other", scratched: false, odds: 3 },
  ]);
  assert.equal(view.kind, "upcoming");
  assert.equal(view.id, "u1");
  assert.equal(view.venue, "부산경남");
  assert.equal(view.detailsAvailability, "named");
  assert.equal(view.selectableEntries.length, 1);
  assert.equal(view.selectableEntries[0].horseName, "천둥");
  assert.equal("result" in view, false);
});
