// 캔버스에 그리는 2등신 말 캐릭터. 이미지 파일 없이 도형으로 그린다.
// 오른쪽을 보는 모습을 기준으로 그리고, facingLeft면 좌우를 뒤집는다.

import { saddleBg, saddleInk } from "./saddle";

/** 털색: [몸, 갈기·꼬리·다리 끝] */
const COATS: [string, string][] = [
  ["#9a6440", "#4b2e1f"], // 갈색(bay)
  ["#c27a45", "#7a3f1c"], // 밤색(chestnut)
  ["#d9d2c8", "#8d8178"], // 회색(gray)
  ["#5a4036", "#2a1d18"], // 흑갈색
  ["#e0b46a", "#f3e6c6"], // 황금색(palomino)
  ["#a8784f", "#3d2b22"],
];
const coatOf = (no: number) => COATS[(no * 7 + 3) % COATS.length];

export interface HorseDrawOptions {
  x: number;
  y: number;
  /** 몸통 가로 길이(px) */
  size: number;
  no: number;
  /** 다리 움직임 위상(라디안). 달린 거리에 비례해 커진다 */
  phase: number;
  /** 달리는 중인지(멈춘 말은 다리를 모으고 서 있다) */
  running: boolean;
  facingLeft: boolean;
}

function leg(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, w: number, angle: number, color: string, hoof: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w / 2, 0, w, len, w / 2);
  ctx.fill();
  ctx.fillStyle = hoof;
  ctx.beginPath();
  ctx.roundRect(-w / 2, len - w * 0.7, w, w * 0.7, w / 3);
  ctx.fill();
  ctx.restore();
}

export function drawHorse(ctx: CanvasRenderingContext2D, o: HorseDrawOptions) {
  const s = o.size;
  const [coat, dark] = coatOf(o.no);
  const swing = o.running ? Math.sin(o.phase) * 0.75 : 0;
  const bob = o.running ? -Math.abs(Math.sin(o.phase)) * s * 0.09 : 0;

  ctx.save();
  ctx.translate(o.x, o.y + bob);
  if (o.facingLeft) ctx.scale(-1, 1);

  // 그림자
  ctx.fillStyle = "rgba(60,40,20,.18)";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.42 - bob, s * 0.48, s * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // 꼬리 (몸 뒤)
  ctx.strokeStyle = dark;
  ctx.lineWidth = s * 0.11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.42, -s * 0.08);
  ctx.quadraticCurveTo(-s * 0.68, -s * 0.05 + Math.sin(o.phase * 1.3) * s * 0.08, -s * 0.66, s * 0.2 + (o.running ? Math.sin(o.phase) * s * 0.06 : 0));
  ctx.stroke();

  // 다리 (몸 뒤) — 앞다리 둘, 뒷다리 둘이 번갈아 움직인다
  const legLen = s * 0.34;
  const legW = s * 0.11;
  const hipY = s * 0.12;
  leg(ctx, -s * 0.24, hipY, legLen, legW, -swing * 0.8, dark, "#2b2220");
  leg(ctx, s * 0.22, hipY, legLen, legW, swing * 0.8, dark, "#2b2220");
  leg(ctx, -s * 0.16, hipY, legLen, legW, swing, coat, "#2b2220");
  leg(ctx, s * 0.3, hipY, legLen, legW, -swing, coat, "#2b2220");

  // 몸통
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.48, s * 0.27, 0, 0, Math.PI * 2);
  ctx.fill();

  // 안장 천 + 출주번호
  ctx.fillStyle = saddleBg(o.no);
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-s * 0.2, -s * 0.24, s * 0.36, s * 0.3, s * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  if (o.facingLeft) ctx.scale(-1, 1); // 숫자는 뒤집히지 않게
  ctx.fillStyle = saddleInk(o.no);
  ctx.font = `900 ${Math.round(s * 0.24)}px 'DM Sans', Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(o.no), o.facingLeft ? s * 0.02 : -s * 0.02, -s * 0.085);
  ctx.restore();

  // 목
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(s * 0.22, -s * 0.16);
  ctx.quadraticCurveTo(s * 0.38, -s * 0.5, s * 0.5, -s * 0.48);
  ctx.lineTo(s * 0.56, -s * 0.22);
  ctx.quadraticCurveTo(s * 0.46, -s * 0.02, s * 0.3, s * 0.05);
  ctx.closePath();
  ctx.fill();

  // 갈기
  ctx.strokeStyle = dark;
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(s * 0.24, -s * 0.2);
  ctx.quadraticCurveTo(s * 0.34, -s * 0.5, s * 0.46, -s * 0.62);
  ctx.stroke();

  // 머리 (크게, 동그랗게)
  const hx = s * 0.58;
  const hy = -s * 0.5;
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(hx, hy, s * 0.24, s * 0.2, -0.25, 0, Math.PI * 2);
  ctx.fill();
  // 주둥이
  ctx.fillStyle = "#f1dcc6";
  ctx.beginPath();
  ctx.ellipse(hx + s * 0.17, hy + s * 0.07, s * 0.12, s * 0.1, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b4a3a";
  ctx.beginPath();
  ctx.arc(hx + s * 0.22, hy + s * 0.05, s * 0.018, 0, Math.PI * 2);
  ctx.fill();
  // 귀
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.08, hy - s * 0.14);
  ctx.lineTo(hx - s * 0.02, hy - s * 0.33);
  ctx.lineTo(hx + s * 0.06, hy - s * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e9a3a3";
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.05, hy - s * 0.15);
  ctx.lineTo(hx - s * 0.02, hy - s * 0.27);
  ctx.lineTo(hx + s * 0.03, hy - s * 0.16);
  ctx.closePath();
  ctx.fill();
  // 앞머리
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(hx - s * 0.02, hy - s * 0.15, s * 0.08, s * 0.05, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // 눈 (크고 반짝이게)
  ctx.fillStyle = "#1f1714";
  ctx.beginPath();
  ctx.ellipse(hx + s * 0.04, hy - s * 0.02, s * 0.045, s * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(hx + s * 0.055, hy - s * 0.045, s * 0.017, 0, Math.PI * 2);
  ctx.fill();
  // 볼터치
  ctx.fillStyle = "rgba(240,128,128,.45)";
  ctx.beginPath();
  ctx.ellipse(hx + s * 0.02, hy + s * 0.08, s * 0.05, s * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
