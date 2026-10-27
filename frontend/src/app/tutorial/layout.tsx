import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "모의베팅 이용가이드 | TRACK:ON",
  description: "경주 선택부터 승식 이해, 조합 확인과 포인트까지 단계별로 안내하는 TRACK:ON 모의베팅 가이드입니다.",
};

export default function TutorialLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
