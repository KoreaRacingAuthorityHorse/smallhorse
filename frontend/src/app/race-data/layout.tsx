import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "경주데이터 | TRACK:ON",
  description: "경주 출전표와 결과, 구간별 순위, 배당률, 기수·조교사와 경주마 성적을 한곳에서 살펴보는 TRACK:ON 경주데이터입니다.",
};

export default function RaceDataLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
