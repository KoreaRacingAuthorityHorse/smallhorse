import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Google 로그인 | TRACK:ON",
  description:
    "TRACK:ON 공공데이터 기반 경주 정보와 가상 포인트 모의베팅 서비스 데모",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
