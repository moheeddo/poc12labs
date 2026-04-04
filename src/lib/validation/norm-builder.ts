import { percentiles } from "@/lib/statistics";
import type { NormGroupStats, NormTable } from "./types";

// 노름 테이블 구축: 그룹별 역량 백분위수 통계 계산
export interface NormDatasetItem {
  participantId: string;
  competencyScores: Record<string, number>;
  group: string;
}

export function buildNormTable(dataset: NormDatasetItem[], groupBy: string): NormTable {
  // 그룹 키 기준으로 참가자 분류
  const groupMap = new Map<string, NormDatasetItem[]>();
  for (const item of dataset) {
    const groupKey = item.group;
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(item);
  }

  // 역량 키 목록 추출 (첫 번째 참가자 기준)
  const competencyKeys = dataset.length > 0 ? Object.keys(dataset[0].competencyScores) : [];

  // 각 그룹별 통계 계산
  const groups: NormGroupStats[] = Array.from(groupMap.entries()).map(([groupName, members]) => {
    const percentilesPerCompetency: NormGroupStats["percentiles"] = {};

    for (const key of competencyKeys) {
      // 해당 역량의 모든 점수 수집
      const scores = members.map((m) => m.competencyScores[key] ?? 0);
      percentilesPerCompetency[key] = percentiles(scores);
    }

    return {
      groupName,
      n: members.length,
      percentiles: percentilesPerCompetency,
    };
  });

  return {
    groupBy,
    groups,
    lastUpdated: new Date().toISOString(),
  };
}

// 단일 점수의 백분위 순위 계산 (0-100)
export function getPercentileRank(score: number, allScores: number[]): number {
  if (allScores.length === 0) return 0;

  // 현재 점수보다 낮은 값의 개수 + 같은 값의 절반 (미드포인트 방법)
  const below = allScores.filter((s) => s < score).length;
  const equal = allScores.filter((s) => s === score).length;

  return ((below + equal * 0.5) / allScores.length) * 100;
}
