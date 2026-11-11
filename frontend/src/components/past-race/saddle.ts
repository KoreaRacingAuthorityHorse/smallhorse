// 출주번호 표시용 색. 실제 마사회 번호 색과는 다를 수 있는 화면용 팔레트.
const BG = ["#F1EFEA", "#D9B74D", "#496BA9", "#B95853", "#367959", "#303034", "#C37B47", "#C77FA2", "#72AFBD", "#7856A0", "#838B90", "#ACCA91", "#7A4A2A", "#71192B"];
const INK = ["#292421", "#28221A", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#251E1A", "#241A1F", "#182528", "#FFFFFF", "#FFFFFF", "#243020", "#FFFFFF", "#FFFFFF"];

export const saddleBg = (no: number) => BG[(no - 1) % BG.length];
export const saddleInk = (no: number) => INK[(no - 1) % INK.length];
export const saddleStyle = (no: number) => ({ background: saddleBg(no), color: saddleInk(no) });
