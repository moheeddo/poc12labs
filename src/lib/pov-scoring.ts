import type { DetectedStep, HpoToolResult, FundamentalScore } from './types';

/**
 * 절차 수행 점수 계산
 * - pass: 1점, partial: 0.5점, fail: 0점
 * - 핵심단계 이탈 1건당 -5점 감점
 */
export function calculateProcedureScore(
  steps: DetectedStep[],
  totalSteps: number,
  criticalDeviations: number
): number {
  if (totalSteps === 0) return 0;
  const passCount = steps.filter(s => s.status === 'pass').length;
  const partialCount = steps.filter(s => s.status === 'partial').length;
  const baseScore = ((passCount + partialCount * 0.5) / totalSteps) * 100;
  const penalty = criticalDeviations * 5;
  return Math.max(0, Math.round(baseScore - penalty));
}

/**
 * HPO 기법 적용 점수 계산
 * - 기본(fundamental) 70% + 조건부(conditional) 30% 가중 합산
 * - 조건부 항목이 없을 경우 기본 100%로 계산
 */
export function calculateHpoScore(results: HpoToolResult[]): number {
  const fundamentals = results.filter(r => r.category === 'fundamental');
  const conditionals = results.filter(r => r.category === 'conditional');

  const fundRate = fundamentals.length > 0
    ? fundamentals.filter(r => r.detected).length / fundamentals.length
    : 0;
  const condRate = conditionals.length > 0
    ? conditionals.filter(r => r.detected).length / conditionals.length
    : 0;

  // 조건부 항목이 없으면 기본 항목만으로 100% 산출
  if (conditionals.length === 0) return Math.round(fundRate * 100);

  return Math.round(fundRate * 100 * 0.7 + condRate * 100 * 0.3);
}

/**
 * 운전원 기본수칙 역량 점수 계산 (단순 평균)
 */
export function calculateFundamentalsScore(scores: FundamentalScore[]): number {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  return Math.round(avg);
}

/**
 * 종합 점수 계산
 * - 골드스탠다드 없음: 절차(0.44) + HPO(0.33) + 기본수칙(0.23)
 * - 골드스탠다드 있음: 절차(0.40) + HPO(0.30) + 기본수칙(0.20) + 유사도(0.10)
 */
export function calculateOverallScore(
  procedureScore: number,
  hpoScore: number,
  fundamentalsScore: number,
  similarityScore?: number
): number {
  if (similarityScore !== undefined) {
    return Math.round(
      procedureScore * 0.40 +
      hpoScore * 0.30 +
      fundamentalsScore * 0.20 +
      similarityScore * 0.10
    );
  }
  return Math.round(
    procedureScore * 0.44 +
    hpoScore * 0.33 +
    fundamentalsScore * 0.23
  );
}

/**
 * 점수 → 등급 매핑
 * S: 95+, A: 85~94, B: 70~84, C: 55~69, D: 40~54, F: 0~39
 */
export function getGrade(score: number): string {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * 핵심단계 이탈 횟수 기반 등급 강제 하향
 * - 3건 이상 이탈 시 D 이하로 고정
 */
export function applyGradeOverride(grade: string, criticalDeviations: number): string {
  if (criticalDeviations >= 3 && ['S', 'A', 'B', 'C'].includes(grade)) return 'D';
  return grade;
}
