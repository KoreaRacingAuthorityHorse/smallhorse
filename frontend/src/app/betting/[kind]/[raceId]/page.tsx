import { notFound } from "next/navigation";
import RaceBettingClient from "@/components/betting/RaceBettingClient";
import { getRaceWithEntries } from "@/data/races";
import { getBlindRaceById } from "@/lib/past-race/service";
import type { Race, RaceEntry } from "@/types/racing";
import "../../../races/[id]/racing.css";

export async function generateStaticParams() {
  const { getRaces } = await import("@/data/races");
  return getRaces({ status: "OPEN" }).filter((race) => race.id.startsWith("u")).map((race) => ({ kind: "upcoming", raceId: race.id }));
}

export default async function BettingRoute({ params }: { params: Promise<{ kind: string; raceId: string }> }) {
  const { kind, raceId } = await params;
  if (kind === "upcoming") {
    const detail = getRaceWithEntries(raceId);
    if (!detail || !detail.race.id.startsWith("u")) notFound();
    return <RaceBettingClient key={`${kind}:${raceId}`} race={detail.race} entries={detail.entries} raceKind="upcoming" />;
  }
  if (kind === "pastBlind") {
    const blind = await getBlindRaceById(raceId);
    if (!blind) notFound();
    const race: Race = { id: blind.id, trackCode: blind.meet === "서울" ? "SEOUL" : blind.meet === "제주" ? "JEJU" : "BUSAN", raceDate: "", raceNo: 1, startTime: "", distance: blind.distance, status: "OPEN", className: blind.grade, image: "race-a.jpg", entryCount: blind.starters };
    const entries: RaceEntry[] = blind.entries.map((entry) => ({ raceId: blind.id, horseNo: entry.no, horseName: `출전마 ${entry.no}번`, jockeyName: "비공개", scratched: entry.scratched, odds: entry.winOdds ?? 0 }));
    return <RaceBettingClient key={`${kind}:${raceId}`} race={race} entries={entries} raceKind="pastBlind" />;
  }
  notFound();
}
