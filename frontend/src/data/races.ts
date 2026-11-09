import type { Race, RaceEntry, RaceStatus, TrackCode } from "@/types/racing";

const race = (id: string, trackCode: TrackCode, raceDate: string, raceNo: number, startTime: string, distance: number, status: RaceStatus, count: number, image: string, className: string): Race => ({ id, trackCode, raceDate, raceNo, startTime, distance, status, entryCount: count, image, className });

const races = [
  race("u1", "BUSAN", "2026-10-30", 1, "11:30", 1200, "OPEN", 12, "race-a.jpg", "국6등급"),
  race("u2", "BUSAN", "2026-10-30", 2, "12:15", 1400, "SCHEDULED", 11, "race-b.jpg", "국6등급"),
  race("u3", "JEJU", "2026-10-30", 3, "13:00", 1000, "CLOSED", 10, "race-c.jpg", "제주마"),
  race("u4", "SEOUL", "2026-10-31", 1, "10:40", 1200, "OPEN", 11, "race-a.jpg", "국6등급"),
  race("u5", "SEOUL", "2026-10-31", 2, "11:15", 1400, "SCHEDULED", 12, "race-b.jpg", "국6등급"),
  race("u6", "JEJU", "2026-10-31", 4, "13:55", 1110, "CANCELLED", 9, "race-c.jpg", "제주마"),
  race("u7", "SEOUL", "2026-11-01", 5, "14:15", 1600, "OPEN", 10, "race-a.jpg", "국6등급"),
  race("u8", "BUSAN", "2026-11-01", 6, "15:25", 1200, "SCHEDULED", 12, "race-c.jpg", "국6등급"),
  race("u9", "JEJU", "2026-11-01", 7, "16:05", 1110, "OPEN", 10, "race-b.jpg", "제주마"),
  race("u10", "BUSAN", "2026-11-06", 1, "11:30", 1200, "SCHEDULED", 10, "race-b.jpg", "국6등급"),
  race("u11", "JEJU", "2026-11-06", 2, "12:15", 1000, "OPEN", 11, "race-a.jpg", "제주마"),
  race("u12", "BUSAN", "2026-11-06", 3, "13:05", 1400, "OPEN", 12, "race-c.jpg", "국6등급"),
  race("p1", "SEOUL", "2026-10-25", 5, "14:35", 1400, "FINISHED", 12, "race-c.jpg", "국6등급"),
  race("p2", "BUSAN", "2026-10-24", 6, "15:20", 1200, "FINISHED", 11, "race-a.jpg", "국6등급"),
  race("p3", "JEJU", "2026-10-24", 3, "12:40", 1000, "FINISHED", 10, "race-b.jpg", "제주마"),
];

const horseNames = ["천둥", "은빛질주", "로켓", "승리의별", "혜성", "바람", "번개", "폭풍", "청룡", "한라", "태양", "도약"];
const jockeyNames = ["김도윤", "이현우", "박지민", "최민석", "정서윤", "한태준", "강준호", "윤하린", "조성민", "오지훈", "문재윤", "신다은"];
const entries: RaceEntry[] = races.flatMap((item, raceIndex) => Array.from({ length: item.entryCount }, (_, index) => ({
  raceId: item.id,
  horseNo: index + 1,
  horseName: `${horseNames[(index + raceIndex) % horseNames.length]} ${raceIndex + 1}`,
  jockeyName: jockeyNames[(index + raceIndex * 2) % jockeyNames.length],
  scratched: index === item.entryCount - 1 && raceIndex % 4 === 0,
  odds: Number((2.1 + index * 0.85 + raceIndex * 0.12).toFixed(1)),
})));

export interface RaceFilter { trackCode?: TrackCode; raceDate?: string; status?: RaceStatus }
export function getRaces(filter: RaceFilter = {}): Race[] {
  return races.filter((item) => (!filter.trackCode || item.trackCode === filter.trackCode) && (!filter.raceDate || item.raceDate === filter.raceDate) && (!filter.status || item.status === filter.status)).map((item) => ({ ...item }));
}
export function getRaceById(id: string): Race | undefined {
  return getRaces().find((item) => item.id === id);
}
export function getEntries(raceId: string): RaceEntry[] {
  return entries.filter((entry) => entry.raceId === raceId).map((entry) => ({ ...entry }));
}
export function getRaceWithEntries(id: string): { race: Race; entries: RaceEntry[] } | undefined {
  const race = getRaceById(id);
  return race ? { race, entries: getEntries(id) } : undefined;
}
