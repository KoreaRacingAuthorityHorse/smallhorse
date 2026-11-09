export type TrackCode = "SEOUL" | "BUSAN" | "JEJU";
export type RaceStatus = "SCHEDULED" | "OPEN" | "CLOSED" | "CANCELLED" | "FINISHED";
export type BetType = "WIN" | "PLACE" | "QUINELLA" | "EXACTA" | "QUINELLA_PLACE" | "TRIO" | "TRIFECTA";
export type PurchaseMode = "individual" | "combination";

export interface Race {
  id: string;
  trackCode: TrackCode;
  raceDate: string;
  raceNo: number;
  startTime: string;
  distance: number;
  status: RaceStatus;
  className: string;
  image: string;
  entryCount: number;
  result?: number[];
}

export interface RaceEntry {
  raceId: Race["id"];
  horseNo: number;
  horseName: string;
  jockeyName: string;
  scratched: boolean;
  odds: number;
}

export interface Selection {
  horseNo: number;
  position?: number;
}

export interface BetCombination {
  betType: BetType;
  selections: Selection[];
  unitStake: number;
}

export interface BetPurchase {
  id: string;
  raceId: Race["id"];
  mode: PurchaseMode;
  combinations: BetCombination[];
  totalStake: number;
  confirmedAt: string;
}
