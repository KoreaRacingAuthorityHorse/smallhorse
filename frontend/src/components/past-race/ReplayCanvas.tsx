"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RevealEntry, Venue } from "@/lib/past-race/types";
import { drawHorse } from "./horseSprite";
import styles from "./past-race.module.css";

/**
 * 트랙 한 바퀴 길이(m). 서울·부산경남은 외주로 제원, 제주·영천은 공개 제원이 없어 화면용 근사값.
 * 시뮬레이션 화면 표현에만 쓰이며 기록 계산에는 영향이 없다.
 */
const LAP_M: Record<Venue, number> = { 서울: 1800, 부산경남: 2000, 제주: 1600, 영천: 1800 };

interface Path {
  no: number;
  pts: [number, number][]; // [출발점부터 거리(m), 시간(초)]
}

/** 지점별 누적 기록을 (거리, 시간) 점으로 만들고, 그 사이는 같은 속도로 달렸다고 보고 보간한다. */
function buildPaths(entries: RevealEntry[], distance: number): Path[] {
  return entries
    .filter((e) => e.time != null || e.checkpoints.length)
    .map((e) => {
      const pts: [number, number][] = [[0, 0]];
      e.checkpoints.forEach((c) => {
        if (c.m != null && c.t != null) pts.push([c.m, c.t]);
      });
      if (e.time != null) pts.push([distance, e.time]);
      pts.sort((a, b) => a[1] - b[1]);
      const clean = pts.filter((p, i) => i === 0 || (p[0] >= pts[i - 1][0] && p[1] > pts[i - 1][1]));
      return { no: e.no, pts: clean };
    })
    .sort((a, b) => a.no - b.no);
}

function metersAt(p: Path, t: number) {
  const last = p.pts[p.pts.length - 1];
  if (t >= last[1]) return last[0];
  for (let i = 1; i < p.pts.length; i++) {
    if (t <= p.pts[i][1]) {
      const [m0, t0] = p.pts[i - 1];
      const [m1, t1] = p.pts[i];
      return m0 + ((m1 - m0) * (t - t0)) / (t1 - t0);
    }
  }
  return 0;
}

const secLabel = (s: number) => {
  const m = Math.floor(s / 60);
  return m ? `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}` : s.toFixed(1);
};

/**
 * 경기장형 타원(직선 2 + 반원 2) 트랙.
 * 진행 좌표 s는 아래쪽 직선의 왼쪽 끝에서 시작해 반시계 방향(화면 기준 아래 직선은 왼→오)으로 증가한다.
 */
function makeOval(W: number, H: number, band: number) {
  const pad = 34; // 바깥 주로 말의 머리가 캔버스 밖으로 잘리지 않을 여백
  const R = Math.max(30, (H - pad * 2 - band) / 2);
  const L = Math.max(40, W - pad * 2 - band - 2 * R);
  const cx = W / 2;
  const cy = H / 2;
  const perimeter = 2 * L + 2 * Math.PI * R;
  const xl = cx - L / 2;
  const xr = cx + L / 2;

  /** 중심선 위 진행 좌표 s(px) → [x, y, 바깥쪽 법선 x, 바깥쪽 법선 y] */
  const at = (sRaw: number, r = R): [number, number, number, number] => {
    let s = ((sRaw % perimeter) + perimeter) % perimeter;
    if (s < L) return [xl + s, cy + r, 0, 1];
    s -= L;
    const arc = Math.PI * R;
    if (s < arc) {
      const th = Math.PI / 2 - s / R;
      return [xr + r * Math.cos(th), cy + r * Math.sin(th), Math.cos(th), Math.sin(th)];
    }
    s -= arc;
    if (s < L) return [xr - s, cy - r, 0, -1];
    s -= L;
    const th = -Math.PI / 2 - s / R;
    return [xl + r * Math.cos(th), cy + r * Math.sin(th), Math.cos(th), Math.sin(th)];
  };

  const stadium = (ctx: CanvasRenderingContext2D, r: number) => {
    ctx.beginPath();
    ctx.moveTo(xl, cy + r);
    ctx.lineTo(xr, cy + r);
    ctx.arc(xr, cy, r, Math.PI / 2, -Math.PI / 2, true);
    ctx.lineTo(xl, cy - r);
    ctx.arc(xl, cy, r, -Math.PI / 2, Math.PI / 2, true);
    ctx.closePath();
  };

  return { R, L, cx, cy, perimeter, at, stadium };
}

export default function ReplayCanvas({ entries, distance, meet }: { entries: RevealEntry[]; distance: number; meet: Venue }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [clock, setClock] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [remain, setRemain] = useState(distance);
  const [done, setDone] = useState(false);

  const play = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cancelAnimationFrame(rafRef.current);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const paths = buildPaths(entries, distance);
    if (!paths.length) return;
    const endT = Math.max(...paths.map((p) => p.pts[p.pts.length - 1][1]));

    const W = cv.clientWidth;
    const H = Math.round(Math.min(440, Math.max(230, W * 0.5)));
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const band = Math.min(80, Math.max(48, W * 0.06)); // 주로 폭(px)
    const oval = makeOval(W, H, band);
    const lap = LAP_M[meet] ?? 1800;
    const pxPerM = oval.perimeter / lap;
    const finishS = oval.L * 0.82; // 결승선: 홈 직선(아래쪽) 오른쪽 끝 근처
    const sOf = (m: number) => finishS - (distance - m) * pxPerM;
    const horseSize = Math.min(34, Math.max(22, W * 0.024)); // 말 캐릭터 몸통 길이(px)
    const laneGap = (band - 12) / Math.max(1, paths.length - 1);
    const laneOf = (i: number) => -band / 2 + 6 + i * laneGap; // 출주번호 순서로 안쪽→바깥쪽
    // 다리 움직임은 재생 속도와 상관없이 화면 시간 기준 일정한 박자로(한 걸음 0.45초).
    // 말마다 시작 박자를 조금씩 달리해 모두 똑같이 움직이지 않게 한다.
    const STRIDE_MS = 450;

    const css = getComputedStyle(cv);
    const col = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const C = {
      infield: col("--infield", "#7c946f"),
      infieldLine: col("--infield-line", "#6c8460"),
      track: col("--track", "#e8dcc3"),
      rail: col("--rail", "#fffdfa"),
      ink: col("--ink", "#25201e"),
      wine: col("--wine", "#71192b"),
      muted: col("--muted", "#77706b"),
    };

    const drawTrack = () => {
      // 주로(모래)와 안쪽 잔디
      oval.stadium(ctx, oval.R + band / 2);
      ctx.fillStyle = C.track;
      ctx.fill();
      oval.stadium(ctx, oval.R - band / 2);
      ctx.fillStyle = C.infield;
      ctx.fill();
      // 잔디 안쪽 무늬
      ctx.strokeStyle = C.infieldLine;
      ctx.lineWidth = 1;
      for (let k = 1; k <= 2; k++) {
        const r = oval.R - band / 2 - k * 12;
        if (r > 10) {
          oval.stadium(ctx, r);
          ctx.stroke();
        }
      }
      // 안·바깥 펜스
      ctx.strokeStyle = C.rail;
      ctx.lineWidth = 2;
      oval.stadium(ctx, oval.R + band / 2);
      ctx.stroke();
      oval.stadium(ctx, oval.R - band / 2);
      ctx.stroke();

      const mark = (s: number, color: string, label: string, dash: boolean) => {
        const [xi, yi] = oval.at(s, oval.R - band / 2);
        const [xo, yo, nx, ny] = oval.at(s, oval.R + band / 2);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = dash ? 1.5 : 3;
        ctx.setLineDash(dash ? [4, 3] : []);
        ctx.beginPath();
        ctx.moveTo(xi, yi);
        ctx.lineTo(xo, yo);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = color;
        ctx.font = "800 11px 'DM Sans', 'Noto Sans KR', sans-serif";
        ctx.textAlign = "center";
        // 라벨이 캔버스 밖으로 잘리지 않게 안쪽으로 당긴다
        const half = ctx.measureText(label).width / 2 + 4;
        const tx = Math.min(W - half, Math.max(half, xo + nx * 14));
        const ty = Math.min(H - 4, Math.max(14, yo + ny * 14 + 4));
        ctx.fillText(label, tx, ty);
      };
      mark(sOf(0), C.muted, "출발", true);
      if (distance > 600) mark(sOf(distance - 600), C.muted, "결승 600m 전", true);
      mark(sOf(distance), C.wine, "결승", false);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = Math.min(18000, Math.max(10000, endT * 130));
    const start = performance.now();

    const frame = (now: number) => {
      const t = reduce ? endT : Math.min(endT, ((now - start) / duration) * endT);
      ctx.clearRect(0, 0, W, H);
      drawTrack();
      const pos = paths.map((p, i) => ({ p, i, m: metersAt(p, t) }));
      pos
        .map(({ p, i, m }) => {
          const s = sOf(m);
          const [x, y, nx, ny] = oval.at(s);
          const [xa] = oval.at(s + 2);
          const off = laneOf(i);
          return {
            no: p.no,
            x: x + nx * off,
            y: y + ny * off,
            m,
            facingLeft: xa < x - 0.05,
            running: m < p.pts[p.pts.length - 1][0] - 0.01,
          };
        })
        // 화면 위쪽(멀리 있는) 말부터 그려서 아래쪽 말이 앞에 겹쳐 보이게
        .sort((a, b) => a.y - b.y)
        .forEach((h) =>
          drawHorse(ctx, {
            x: h.x,
            y: h.y,
            size: horseSize,
            no: h.no,
            phase: ((now - start) / STRIDE_MS) * Math.PI * 2 + h.no * 1.3,
            running: h.running,
            facingLeft: h.facingLeft,
          }),
        );
      const ranked = [...pos].sort((a, b) => b.m - a.m);
      setClock(t);
      setOrder(ranked.slice(0, 5).map((o) => o.p.no));
      setRemain(Math.max(0, Math.round(distance - ranked[0].m)));
      setDone(t >= endT);
      if (t < endT) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [entries, distance, meet]);

  useEffect(() => {
    play();
    const onResize = () => play();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [play]);

  return (
    <div className={`panel ${styles.replay}`}>
      <div className={styles.replayBar}>
        <span className={styles.fieldLabel}>경주 시뮬레이션 · 실제 구간 기록으로 재구성</span>
        <span className={styles.replayCtl}>
          <span className={styles.num}>{done ? "결승 통과" : `남은 거리 ${remain.toLocaleString("ko-KR")}m`}</span>
          <span className={styles.num}>{secLabel(clock)}초</span>
          <button type="button" className="btn border small" onClick={play}>다시 재생</button>
        </span>
      </div>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="타원형 트랙 경주 시뮬레이션" />
      <p className={styles.liveOrder} aria-live="off">
        현재 순위 {order.map((n, i) => <b key={n}>{i ? " · " : ""}{n}</b>)}
      </p>
    </div>
  );
}
