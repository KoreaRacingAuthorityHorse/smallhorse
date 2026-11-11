import type { BlindEntry, BlindRace, PoolKey, Venue } from "./past-race/types";
import type { BetType, Race, RaceEntry, TrackCode } from "../types/racing";

export const BET_TYPE_TO_POOL_KEY = {
  WIN: "단승",
  PLACE: "연승",
  QUINELLA: "복승",
  EXACTA: "쌍승",
  QUINELLA_PLACE: "복연승",
  TRIO: "삼복승",
  TRIFECTA: "삼쌍승",
} as const satisfies Record<BetType, PoolKey>;

export const POOL_KEY_TO_BET_TYPE = {
  단승: "WIN",
  연승: "PLACE",
  복승: "QUINELLA",
  쌍승: "EXACTA",
  복연승: "QUINELLA_PLACE",
  삼복승: "TRIO",
  삼쌍승: "TRIFECTA",
} as const satisfies Record<PoolKey, BetType>;

export const TRACK_TO_VENUE = {
  SEOUL: "서울",
  BUSAN: "부산경남",
  JEJU: "제주",
} as const satisfies Record<TrackCode, Venue>;

/** 영천 has no synthetic TrackCode; callers must handle that absence. */
export const VENUE_TO_TRACK: Record<Venue, TrackCode | null> = {
  서울: "SEOUL",
  부산경남: "BUSAN",
  제주: "JEJU",
  영천: null,
};

export type UpcomingEntryView = Pick<RaceEntry, "horseNo" | "horseName" | "jockeyName" | "scratched" | "odds">;
export type PastBlindEntryView = Pick<BlindEntry,
  "no" | "scratched" | "sex" | "age" | "origin" | "rating" | "carriedKg" |
  "jockeyAllowanceKg" | "bodyWeight" | "bodyWeightDelta" | "recent" | "style" |
  "starts" | "wins" | "jockeyWinPct" | "winOdds" | "placeOdds" | "favRank">;

export type RaceView =
  | {
      kind: "upcoming";
      id: string;
      venue: Venue;
      display: Pick<Race, "raceDate" | "raceNo" | "startTime" | "distance" | "status" | "className" | "entryCount">;
      selectableEntries: UpcomingEntryView[];
      detailsAvailability: "named";
    }
  | {
      kind: "pastBlind";
      id: string;
      venue: Venue;
      display: Pick<BlindRace, "distance" | "grade" | "weightRule" | "ageCond" | "weather" | "track" | "waterPct" | "starters" | "bigRace">;
      selectableEntries: PastBlindEntryView[];
      detailsAvailability: "blind";
    };

/** Preserve source IDs within their kind; synthetic IDs do not join historical IDs. */
export function adaptUpcomingRace(race: Race, entries: RaceEntry[]): RaceView {
  return {
    kind: "upcoming",
    id: race.id,
    venue: TRACK_TO_VENUE[race.trackCode],
    display: { raceDate: race.raceDate, raceNo: race.raceNo, startTime: race.startTime,
      distance: race.distance, status: race.status, className: race.className, entryCount: race.entryCount },
    selectableEntries: entries.filter((entry) => entry.raceId === race.id).map((entry) => ({
      horseNo: entry.horseNo, horseName: entry.horseName, jockeyName: entry.jockeyName,
      scratched: entry.scratched, odds: entry.odds,
    })),
    detailsAvailability: "named",
  };
}

/** Only BlindRace is accepted here; RaceReveal cannot cross this pre-purchase boundary. */
export function adaptPastBlindRace(race: BlindRace): RaceView {
  return {
    kind: "pastBlind",
    id: race.id,
    venue: race.meet,
    display: { distance: race.distance, grade: race.grade, weightRule: race.weightRule,
      ageCond: race.ageCond, weather: race.weather, track: race.track,
      waterPct: race.waterPct, starters: race.starters, bigRace: race.bigRace },
    selectableEntries: race.entries.map((entry) => ({
      no: entry.no, scratched: entry.scratched, sex: entry.sex, age: entry.age,
      origin: entry.origin, rating: entry.rating, carriedKg: entry.carriedKg,
      jockeyAllowanceKg: entry.jockeyAllowanceKg, bodyWeight: entry.bodyWeight,
      bodyWeightDelta: entry.bodyWeightDelta, recent: [...entry.recent], style: entry.style,
      starts: entry.starts, wins: entry.wins, jockeyWinPct: entry.jockeyWinPct,
      winOdds: entry.winOdds, placeOdds: entry.placeOdds, favRank: entry.favRank,
    })),
    detailsAvailability: "blind",
  };
}
