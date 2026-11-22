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
  mode: PurchaseMode | "mixed";
  combinations: BetCombination[];
  totalStake: number;
  confirmedAt: string;
  raceKind?: BetSlipItem["raceKind"];
  items?: BetSlipItem[];
  lines?: PurchaseLine[];
  resultStatus?: "pending";
}

/** One immutable slip entry; a combination group keeps its own identity. */
export interface BetSlipLine extends BetCombination {
  lineId: string;
}

export interface PurchaseLine extends BetSlipLine {
  raceId: string;
  raceKind: "upcoming" | "pastBlind";
  slipItemId: string;
  mode: PurchaseMode;
  groupId: string | null;
}

interface BetSlipItemBase {
  id: string;
  raceKind: "upcoming" | "pastBlind";
  raceId: string;
  betType: BetType;
  combinations: BetSlipLine[];
  duplicateApproval?: { approvedAt: string; duplicateLineIds: string[] };
}

export type BetSlipItem = BetSlipItemBase & (
  | { mode: "individual"; groupId: null }
  | { mode: "combination"; groupId: string }
);

/** Upcoming purchases have no result source until a real result is supplied. */
export type PurchaseResultState =
  | { raceKind: "upcoming" | "pastBlind"; status: "pending"; reveal?: never }
  | { raceKind: "pastBlind"; status: "settled"; reveal: import("@/lib/past-race/types").RaceReveal };
