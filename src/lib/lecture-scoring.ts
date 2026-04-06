// src/lib/lecture-scoring.ts
import type {
  ContentFidelityResult,
  DeliveryResult,
  PedagogyIndicator,
  SlideCoverage,
  ConceptMatch,
  DeliveryQuality,
} from "./lecture-types";

// 내용 충실도 점수 계산 (50점 만점)
// Layer 1: 슬라이드 커버리지 (15점)
// Layer 2: 핵심 개념 매칭 (20점)
// Layer 3: 전달 품질 (15점)
export function scoreContentFidelity(
  coverages: SlideCoverage[],
  concepts: ConceptMatch[],
  qualities: DeliveryQuality[]
): ContentFidelityResult {
  // Layer 1: 슬라이드 커버리지 → 15점
  const avgCoverage =
    coverages.length > 0
      ? coverages.reduce((sum, c) => sum + c.coveragePercent, 0) / coverages.length
      : 0;
  const coverageScore = Math.round((avgCoverage / 100) * 15 * 10) / 10;

  // Layer 2: 핵심 개념 매칭 → 20점
  const totalConcepts = concepts.length || 1;
  const found = concepts.filter((c) => c.status === "found").length;
  const partial = concepts.filter((c) => c.status === "partial").length;
  const matchRate = (found + partial * 0.5) / totalConcepts;
  const conceptScore = Math.round(matchRate * 20 * 10) / 10;

  // Layer 3: 전달 품질 → 15점
  const avgQuality =
    qualities.length > 0
      ? qualities.reduce((sum, q) => sum + q.totalScore, 0) / qualities.length
      : 0;
  const qualityScore = Math.round((avgQuality / 12) * 15 * 10) / 10;

  return {
    slideCoverages: coverages,
    conceptMatches: concepts,
    deliveryQualities: qualities,
    overallCoveragePercent: Math.round(avgCoverage),
    conceptMatchRate: Math.round(matchRate * 100),
    deliveryQualityAvg: Math.round(avgQuality * 10) / 10,
    score: Math.round((coverageScore + conceptScore + qualityScore) * 10) / 10,
  };
}

// 전달력 점수 계산 (50점 만점)
// 멀티모달 5채널 (35점) + 교수법 3지표 (15점)
export function scoreDelivery(
  multimodalRaw: number, // 0-9 (기존 멀티모달 총점)
  pedagogyIndicators: PedagogyIndicator[]
): DeliveryResult {
  // 멀티모달 → 35점 (0-9 스케일을 35점으로 변환)
  const multimodalScore = Math.round((multimodalRaw / 9) * 35 * 10) / 10;

  // 교수법 → 15점 (3개 지표 각각 0-5)
  const pedagogyScore = pedagogyIndicators.reduce((sum, p) => sum + p.score, 0);

  return {
    multimodalScore,
    multimodalRaw,
    pedagogyIndicators,
    pedagogyScore: Math.min(15, pedagogyScore),
    score: Math.round((multimodalScore + Math.min(15, pedagogyScore)) * 10) / 10,
  };
}

// 등급 판정
export function getLectureGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "탁월", color: "text-teal-600" };
  if (score >= 75) return { grade: "우수", color: "text-emerald-600" };
  if (score >= 60) return { grade: "보통", color: "text-amber-600" };
  return { grade: "미흡", color: "text-red-600" };
}

// 통합 점수 계산
// PPT 첨부: 전달력(50) + 내용 충실도(50) = 100점
// PPT 미첨부: 전달력만 100점으로 환산
export function computeTotalScore(
  delivery: DeliveryResult,
  contentFidelity: ContentFidelityResult | null
): number {
  if (!contentFidelity) {
    // PPT 미첨부: 전달력만 100점 환산
    return Math.round((delivery.score / 50) * 100 * 10) / 10;
  }
  return Math.round((delivery.score + contentFidelity.score) * 10) / 10;
}
