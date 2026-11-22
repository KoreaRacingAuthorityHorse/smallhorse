"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyRound, DEFAULT_BALANCE, refillBalance, useWallet, type WalletRecord } from "@/lib/demo-wallet";
import { poolDef } from "@/lib/past-race/pools";
import { getBlindRace, getLearningStats, settleRace } from "@/lib/past-race/service";
import type { Bet, BlindRace, LearningStats, PoolKey, Settlement, Venue } from "@/lib/past-race/types";
import BetSlip from "./BetSlip";
import EntryTable from "./EntryTable";
import ResultPanel from "./ResultPanel";
import Term from "./Term";
import styles from "./past-race.module.css";

const VENUES: (Venue | "all")[] = ["all", "서울", "부산경남", "제주", "영천"];
const PLAYED_KEY = "trackon-past-race-played-v1";
const fmt = (n: number) => n.toLocaleString("ko-KR");

function readPlayed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PLAYED_KEY) || "[]");
  } catch {
    return [];
  }
}
function markPlayed(id: string) {
  try {
    localStorage.setItem(PLAYED_KEY, JSON.stringify([...readPlayed().filter((x) => x !== id), id].slice(-200)));
  } catch {
    // 저장이 막힌 환경에서는 중복 출제를 감수
  }
}

function gradeLabel(g: string) {
  const origin = g.startsWith("국") ? "국산마" : g.startsWith("혼") ? "국산·외산 혼합" : g.startsWith("제") ? "제주마" : "";
  const lvl = /OPEN/.test(g) ? "OPEN" : (g.match(/(\d)등급/)?.[1] ?? "") + "등급";
  return origin ? `${lvl} · ${origin}` : lvl;
}

const isVenue = (v: string | null): v is Venue => !!v && (VENUES as string[]).includes(v) && v !== "all";

export default function PastRaceGame() {
  const router = useRouter();
  const wallet = useWallet();
  // 랜딩의 경마장별 "도전하기"에서 넘어오면 ?venue=서울 처럼 경마장이 미리 선택된다
  const searchParams = useSearchParams();
  const venueParam = searchParams.get("venue");
  const legacyMode = searchParams.get("legacy") === "1";
  const [venue, setVenueState] = useState<Venue | "all">(isVenue(venueParam) ? venueParam : "all");
  const setVenue = (v: Venue | "all") => {
    setVenueState(v);
    const url = v === "all" ? window.location.pathname : `${window.location.pathname}?venue=${encodeURIComponent(v)}`;
    window.history.replaceState(null, "", url);
  };
  const [reload, setReload] = useState(0);
  const [race, setRace] = useState<BlindRace | null>(null);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [pool, setPool] = useState<PoolKey>("단승");
  const [picks, setPicks] = useState<number[]>([]);
  const [stake, setStake] = useState(1000);
  const [bets, setBets] = useState<Bet[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [round, setRound] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // 경주 불러오기 (경마장 변경·다음 경주)
  useEffect(() => {
    let alive = true;
    (async () => {
      const [r, s] = await Promise.all([
        getBlindRace({ venue: venue === "all" ? undefined : venue, exclude: readPlayed() }),
        getLearningStats(),
      ]);
      if (!alive) return;
      setRace(r);
      if (r && !legacyMode) router.replace(`/betting/pastBlind/${r.id}`);
      setStats(s);
      setPicks([]);
      setBets([]);
      setError("");
      setSettlement(null);
    })();
    return () => {
      alive = false;
    };
  }, [venue, reload, router, legacyMode]);

  // 결과 화면이 그려진 뒤 그 위치로 이동
  useEffect(() => {
    if (settlement) resultRef.current?.scrollIntoView({ block: "start" });
  }, [settlement]);

  const committed = bets.reduce((a, b) => a + b.stake, 0);
  const available = wallet ? wallet.balance - committed : null;
  const def = poolDef(pool);

  const togglePick = (no: number) => {
    const entry = race?.entries.find((e) => e.no === no);
    if (!entry || entry.scratched || settlement) return;
    if (picks.includes(no)) {
      setPicks(picks.filter((x) => x !== no));
    } else if (picks.length < def.picks) {
      setPicks([...picks, no]);
    } else if (def.picks === 1) {
      setPicks([no]);
    } else {
      return setError(`${pool}은 ${def.picks}마리까지 고를 수 있어요. 다른 말을 빼고 골라 주세요.`);
    }
    setError("");
  };

  const changePool = (p: PoolKey) => {
    setPool(p);
    setPicks([]);
    setError("");
  };

  const addBet = () => {
    const amount = Math.floor(stake / 100) * 100;
    if (picks.length !== def.picks) return setError(`${pool}은 말 ${def.picks}마리를 골라야 해요.`);
    if (amount < 100) return setError("금액은 100P 이상, 100P 단위로 정해 주세요.");
    if (available == null || amount > available) return setError(`포인트가 부족해요. 남은 포인트는 ${fmt(available ?? 0)}P예요.`);
    setBets((b) => [...b, { pool, picks, stake: amount }]);
    setPicks([]);
    setError("");
  };

  const confirm = async () => {
    if (!race || !bets.length) return;
    setBusy(true);
    try {
      const s = await settleRace(race.id, bets);
      const day = new Date().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }).replace(/\.\s?/g, ".").replace(/\.$/, "");
      const name = `${race.meet} ${String(s.reveal.raceNo).padStart(2, "0")}R`;
      const records: WalletRecord[] = s.bets.map(({ bet, outcome }) => ({
        day,
        name,
        kind: bet.pool,
        pick: bet.picks.join(poolDef(bet.pool).ordered ? " → " : " - "),
        result: outcome.kind === "hit" ? "적중" : outcome.kind === "refund" ? "환불" : "미적중",
        amount: outcome.payout - bet.stake,
      }));
      applyRound(s.totalPayout - s.totalStake, records);
      markPlayed(race.id);
      setSettlement(s);
      setRound((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "결과를 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const nextRace = () => {
    setReload((n) => n + 1);
    topRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div className={`container ${styles.page}`} ref={topRef}>
      <div className={styles.toolbar}>
        <div className={styles.venues} role="group" aria-label="경마장">
          {VENUES.map((v) => (
            <button key={v} type="button" aria-pressed={venue === v} onClick={() => setVenue(v)}>
              {v === "all" ? "전체" : v}
            </button>
          ))}
        </div>
        <div className={styles.toolbarRight}>
          {wallet && wallet.balance < 100 && (
            <button type="button" className="btn border small" onClick={refillBalance}>
              체험 포인트 {fmt(DEFAULT_BALANCE)}P 다시 받기
            </button>
          )}
          <button type="button" className="btn border small" onClick={nextRace} disabled={busy}>
            다른 경주 보기
          </button>
        </div>
      </div>

      {!race ? (
        <div className={`panel ${styles.empty}`}>경주를 불러오는 중이에요…</div>
      ) : (
        <>
          <section className={`panel ${styles.raceHead}`} aria-labelledby="race-title">
            <div>
              <div className="eyebrow">BLIND RACE / 날짜·마명 비공개</div>
              <h2 id="race-title" className={styles.raceTitle}>
                {race.meet} · {fmt(race.distance)}m{race.bigRace && <span className="badge gold">큰 경주</span>}
              </h2>
            </div>
            <ul className={styles.conds}>
              <li><Term term="등급">{gradeLabel(race.grade)}</Term></li>
              <li><Term term="부담방식">{race.weightRule}</Term></li>
              <li>
                <Term term="주로">주로 {race.track ?? "-"}</Term>
                {race.waterPct != null && <small> 함수율 {race.waterPct}%</small>}
              </li>
              <li>{race.weather ?? "날씨 정보 없음"}</li>
              <li>{race.ageCond}</li>
              <li>출전 {race.starters}마리</li>
            </ul>
          </section>

          <div className={settlement ? styles.layoutSingle : styles.layout}>
            <section className="panel" aria-labelledby="entries-title">
              <div className={styles.panelHead}>
                <h3 id="entries-title" className={styles.panelTitle}>출전표</h3>
                <span className={styles.muted}>행을 누르면 베팅 슬립에서 그 말이 선택돼요</span>
              </div>
              <EntryTable entries={race.entries} selected={picks} onToggle={togglePick} />
            </section>
            {!settlement && (
              <BetSlip
                entries={race.entries}
                pool={pool}
                picks={picks}
                stake={stake}
                bets={bets}
                available={available}
                stats={stats}
                error={error}
                busy={busy}
                onPool={changePool}
                onPick={togglePick}
                onStake={(v) => setStake(Number.isFinite(v) ? Math.max(0, v) : 0)}
                onAdd={addBet}
                onRemove={(i) => setBets((b) => b.filter((_, j) => j !== i))}
                onConfirm={confirm}
              />
            )}
          </div>

          <div ref={resultRef}>
            {settlement && <ResultPanel race={race} settlement={settlement} stats={stats} round={round} onNext={nextRace} />}
          </div>
        </>
      )}
    </div>
  );
}
