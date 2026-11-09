import { notFound } from "next/navigation";
import { getRaceWithEntries, getRaces } from "@/data/races";
import RaceBettingClient from "@/components/betting/RaceBettingClient";
import "./racing.css";

export function generateStaticParams() {
  return getRaces().map((race) => ({ id: race.id }));
}

export default async function RacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getRaceWithEntries(id);
  if (!detail) notFound();
  return <RaceBettingClient key={detail.race.id} race={detail.race} entries={detail.entries} />;
}
