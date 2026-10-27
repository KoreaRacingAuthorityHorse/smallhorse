import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "나의 대시보드 | TRACK:ON",
  description:
    "TRACK:ON 공공데이터 기반 경주 정보와 가상 포인트 모의베팅 서비스 데모",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
