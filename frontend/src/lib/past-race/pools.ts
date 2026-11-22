import type { PoolKey } from "./types";

export interface PoolDef {
  key: PoolKey;
  /** 골라야 하는 말 수 */
  picks: number;
  /** 순서까지 맞혀야 하는지 */
  ordered: boolean;
  description: string;
}

export const POOLS: PoolDef[] = [
  { key: "단승", picks: 1, ordered: false, description: "1위로 들어올 말 1마리를 맞혀요." },
  { key: "연승", picks: 1, ordered: false, description: "3위 안에 들 말 1마리를 맞혀요. 출전마가 7마리 이하면 2위 안이에요." },
  { key: "복승", picks: 2, ordered: false, description: "1·2위 말 2마리를 순서와 상관없이 맞혀요." },
  { key: "쌍승", picks: 2, ordered: true, description: "1위와 2위를 순서까지 맞혀요. 고른 순서대로 1위, 2위예요." },
  { key: "복연승", picks: 2, ordered: false, description: "3위 안에 들 말 2마리를 순서와 상관없이 맞혀요." },
  { key: "삼복승", picks: 3, ordered: false, description: "1~3위 말 3마리를 순서와 상관없이 맞혀요." },
  { key: "삼쌍승", picks: 3, ordered: true, description: "1·2·3위를 순서까지 맞혀요. 가장 어렵고 배당이 커요." },
];

export const poolDef = (key: PoolKey): PoolDef => POOLS.find((p) => p.key === key) ?? POOLS[0];

/** 화면에 쓰는 용어 설명. 출처: 마사회 경마시행계획·레이팅 안내 */
export const GLOSSARY: Record<string, string> = {
  인기: "단승 배당이 낮은 순서예요. 1위가 가장 많은 사람이 이길 거라고 고른 말이에요.",
  단승배당: "이 말이 1위로 들어오면 받는 배수예요. 1,000P × 5.0 = 5,000P. 경주 후 확정된 값이에요.",
  연승배당: "이 말이 3위 안에 들면 받는 배수예요. 단승보다 맞히기 쉬워서 배당이 낮아요.",
  레이팅: "말의 실력 점수(1~140)예요. 높을수록 강한 말. 비어 있으면 아직 점수가 없는 신인급이에요.",
  부담중량: "말이 등에 지는 무게(기수+안장+납)예요. 잘하는 말일수록 무겁게 해서 실력 차를 줄여요.",
  마체중: "경주 직전 잰 말 몸무게예요. 괄호는 지난 경주보다 늘거나 준 양이에요.",
  최근5전: "이 경주 전 마지막 5경주의 순위예요. 왼쪽이 가장 최근이에요.",
  스타일: "최근 경주에서 출발 직후 어디에 있었는지로 붙인 별명이에요.",
  기수승률: "이 경주 시점까지 최근 1년 동안 기수가 1위를 한 비율이에요.",
  등급: "말의 실력별 리그예요. 1등급이 최상위, 6등급은 아직 우승 못 한 신인급이에요.",
  부담방식: "핸디캡은 레이팅 차이만큼 무게를 다르게(1점 = 0.5kg), 별정은 경주별 규칙으로, 마령은 나이·성별로만 무게를 정해요.",
  주로: "말이 달리는 모래 길이에요. 함수율은 모래 속 물의 비율이고, 물기가 많을수록 기록이 빨라져요.",
  착차: "바로 앞 말과의 거리 차이예요. 단위는 말 몸길이(마신, 약 2.4m). 코·머리·목은 1마신보다 훨씬 작은 차이예요.",
};
