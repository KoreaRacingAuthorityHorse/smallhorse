"use client";

import { useSyncExternalStore } from "react";
import AppHeader from "@/components/AppHeader";
import SiteFooter from "@/components/SiteFooter";
import RaceTab from "./_components/RaceTab";
import PeopleTab from "./_components/PeopleTab";
import HorseTab from "./_components/HorseTab";
import DataTab from "./_components/DataTab";

const tabs = [
  { key: "race", label: "경주" },
  { key: "people", label: "기수·조교사" },
  { key: "horse", label: "경주마" },
  { key: "data", label: "데이터 소개" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const isTabKey = (v: string): v is TabKey => tabs.some((t) => t.key === v);

export default function RaceDataPage() {
  // 헤더 드롭다운(/race-data#people 등)과 탭 선택을 URL 해시로 맞춤
  const hash = useSyncExternalStore(
    (callback) => {
      const onHashChange = () => {
        window.scrollTo({ top: 0 });
        callback();
      };
      window.addEventListener("hashchange", onHashChange);
      return () => window.removeEventListener("hashchange", onHashChange);
    },
    () => window.location.hash.slice(1),
    () => "",
  );
  const tab: TabKey = isTabKey(hash) ? hash : "race";

  return (
    <div data-page="race-data" className="landing-root">
      <AppHeader active="race-data" />

      <main>
        <section className="rd-hero">
          <div className="container">
            <div className="eyebrow">RACE DATA ARCHIVE</div>
            <h1>숫자 속에 숨은<br />경주의 흐름을 읽어보세요.</h1>
            <p>출전표와 결과, 구간별 순위와 배당률부터 기수·경주마 성적까지.<br />한국마사회 공개 데이터를 한곳에 정리했습니다.</p>
          </div>
        </section>

        <div className="container rd-body">
          <nav className="rd-subnav" aria-label="경주데이터 보기">
            {tabs.map((t) => (
              <a key={t.key} href={`#${t.key}`} aria-current={tab === t.key ? "page" : undefined}>
                {t.label}
              </a>
            ))}
          </nav>

          {tab === "race" && <RaceTab />}
          {tab === "people" && <PeopleTab />}
          {tab === "horse" && <HorseTab />}
          {tab === "data" && <DataTab />}

          <p className="rd-demo">데모 화면 · 말과 사람 이름, 수치는 모두 가상 데이터예요</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

