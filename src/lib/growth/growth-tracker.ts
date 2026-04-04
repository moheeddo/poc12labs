// 역량 성장 추이 추적기 — 선형 회귀 기반 트렌드 분석

import { mean } from "@/lib/statistics";
import type { GrowthDataPoint, CompetencyTrend, GrowthTimeline } from "./types";

/**
 * 점수 배열에 대해 선형 회귀를 수행하여 추이를 계산한다.
 * x 좌표는 인덱스(0, 1, 2, ...)로 단순화한다.
 *
 * @returns direction: 추이 방향, changeRate: 세션당 평균 기울기, projectedScore: 다음 세션 예측값
 */
export function calculateTrend(scores: number[]): {
  direction: "improving" | "stable" | "declining";
  changeRate: number;
  projectedScore: number;
} {
  const n = scores.length;

  // 데이터 포인트가 1개 이하인 경우 추이 계산 불가
  if (n <= 1) {
    const last = scores[0] ?? 5;
    return { direction: "stable", changeRate: 0, projectedScore: last };
  }

  // 선형 회귀: y = a * x + b (최소제곱법)
  const xs = scores.map((_, i) => i);
  const ys = scores;

  const mx = mean(xs);
  const my = mean(ys);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - mx) * (ys[i] - my);
    denominator += (xs[i] - mx) ** 2;
  }

  // 기울기(slope): 세션당 평균 점수 변화율
  const slope = denominator === 0 ? 0 : numerator / denominator;
  // 절편(intercept)
  const intercept = my - slope * mx;

  // 다음 세션 예측 점수 (x = n)
  const rawProjected = slope * n + intercept;
  // 점수 범위 1-10 내로 클램프
  const projectedScore = Math.min(10, Math.max(1, rawProjected));

  // 방향 판정: |기울기| < 0.1이면 stable
  let direction: "improving" | "stable" | "declining";
  if (slope > 0.1) {
    direction = "improving";
  } else if (slope < -0.1) {
    direction = "declining";
  } else {
    direction = "stable";
  }

  return {
    direction,
    changeRate: Math.round(slope * 1000) / 1000, // 소수점 3자리
    projectedScore: Math.round(projectedScore * 10) / 10,
  };
}

/**
 * 연속 3회 이상 변화가 0.5 미만인 역량 → 정체(plateau) 판정
 */
function detectPlateau(scores: number[]): boolean {
  if (scores.length < 3) return false;

  let consecutiveSmallChanges = 0;
  for (let i = scores.length - 1; i >= 1; i--) {
    const change = Math.abs(scores[i] - scores[i - 1]);
    if (change < 0.5) {
      consecutiveSmallChanges++;
    } else {
      break; // 연속성이 끊기면 중단
    }
  }
  return consecutiveSmallChanges >= 2; // 직전 2개 간격이 모두 작으면 3회 연속 정체
}

/**
 * 마지막 세션에서 1점 이상 향상된 역량 → 돌파(breakthrough) 판정
 */
function detectBreakthrough(scores: number[]): boolean {
  if (scores.length < 2) return false;
  const lastChange = scores[scores.length - 1] - scores[scores.length - 2];
  return lastChange >= 1;
}

/**
 * 직원의 전체 성장 타임라인을 구축한다.
 *
 * @param employeeId - 직원 식별자
 * @param employeeName - 직원 이름
 * @param dataPoints - 세션별 역량 평가 데이터 (순서 무관)
 * @returns 날짜 오름차순 정렬 + 역량별 추이 + 정체/돌파 역량 목록
 */
export function buildGrowthTimeline(
  employeeId: string,
  employeeName: string,
  dataPoints: GrowthDataPoint[]
): GrowthTimeline {
  // 날짜 오름차순 정렬
  const sorted = [...dataPoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 모든 역량 키 수집 (유니온)
  const allCompetencyKeys = Array.from(
    new Set(sorted.flatMap((dp) => Object.keys(dp.competencyScores)))
  );

  // 역량별 추이 계산
  const trends: CompetencyTrend[] = allCompetencyKeys.map((key) => {
    const scores = sorted.map((dp) => dp.competencyScores[key] ?? 0);
    const { direction, changeRate, projectedScore } = calculateTrend(scores);
    return { competencyKey: key, direction, changeRate, projectedScore };
  });

  // 정체 역량 탐지
  const plateauCompetencies = allCompetencyKeys.filter((key) => {
    const scores = sorted.map((dp) => dp.competencyScores[key] ?? 0);
    return detectPlateau(scores);
  });

  // 돌파 역량 탐지
  const breakthroughCompetencies = allCompetencyKeys.filter((key) => {
    const scores = sorted.map((dp) => dp.competencyScores[key] ?? 0);
    return detectBreakthrough(scores);
  });

  return {
    employeeId,
    employeeName,
    dataPoints: sorted,
    trends,
    plateauCompetencies,
    breakthroughCompetencies,
  };
}
