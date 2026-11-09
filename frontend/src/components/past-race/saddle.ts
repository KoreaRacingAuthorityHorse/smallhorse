// 출주번호 표시용 색. 실제 마사회 번호 색과는 다를 수 있는 화면용 팔레트.
const BG = ["#FFFFFF", "#F2D13B", "#2D5BD8", "#C8372D", "#1F8A4C", "#1A1A1A", "#F08A24", "#E978B5", "#7FD3E8", "#7B3FB8", "#9AA2A8", "#8BC34A", "#7A4A2A", "#71192B"];
const INK = ["#111", "#111", "#fff", "#fff", "#fff", "#fff", "#111", "#111", "#111", "#fff", "#111", "#111", "#fff", "#fff"];

export const saddleBg = (no: number) => BG[(no - 1) % BG.length];
export const saddleInk = (no: number) => INK[(no - 1) % INK.length];
export const saddleStyle = (no: number) => ({ background: saddleBg(no), color: saddleInk(no) });
