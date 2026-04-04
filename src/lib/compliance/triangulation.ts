// 삼각측정(Triangulation) — AI 점수와 인간 평가자 점수를 ISO 10667 방식으로 융합
import type { TriangulationConfig, TriangulatedScore } from "./types";
import { DEFAULT_TRIANGULATION_CONFIG } from "./types";

/**
 * AI 점수와 인간 점수를 삼각측정하여 최종 점수 배열 반환
 *
 * 동의 수준 판정:
 *  - diff <= 1 → "agree" (두 평가자가 사실상 일치)
 *  - diff <= config.minimumAgreement → "minor_diff" (허용 범위 내 차이)
 *  - diff >  config.minimumAgreement → "major_diff" (유의미한 불일치)
 *
 * 최종 점수 결정:
 *  - "weighted": AI·인간 가중 평균
 *  - "human_override" + major_diff: 인간 점수 우선
 *  - "flag_for_review" + major_diff: 가중 평균이지만 검토 필요 표시
 */
export function triangulate(
  aiScores: Record<string, number>,
  humanScores: Record<string, number>,
  config: TriangulationConfig = DEFAULT_TRIANGULATION_CONFIG,
): TriangulatedScore[] {
  // AI 점수에 있는 역량 키 기준으로 병합 (인간 점수에만 있는 키는 무시)
  const competencyKeys = Object.keys(aiScores);

  return competencyKeys.map((key) => {
    const aiScore = aiScores[key] ?? 0;
    const humanScore = humanScores[key] ?? aiScore; // 인간 점수 없으면 AI 점수 그대로 사용
    const diff = Math.abs(aiScore - humanScore);

    // 동의 수준 분류
    let agreement: TriangulatedScore["agreement"];
    if (diff <= 1) {
      agreement = "agree";
    } else if (diff <= config.minimumAgreement) {
      agreement = "minor_diff";
    } else {
      agreement = "major_diff";
    }

    // 최종 점수 및 방법 결정
    let finalScore: number;
    let method: string;

    if (
      agreement === "major_diff" &&
      config.conflictResolution === "human_override"
    ) {
      // 큰 불일치 시 인간 평가자 점수 우선 적용
      finalScore = humanScore;
      method = `인간 평가자 우선 적용 (불일치 차이: ${diff.toFixed(1)})`;
    } else {
      // 가중 평균: AI * w_ai + 인간 * w_human
      finalScore =
        aiScore * config.weights.ai + humanScore * config.weights.human;

      if (
        agreement === "major_diff" &&
        config.conflictResolution === "flag_for_review"
      ) {
        method = `가중 평균 (AI ${config.weights.ai} / 인간 ${config.weights.human}) — 검토 필요 플래그 설정됨`;
      } else {
        method = `가중 평균 (AI ${config.weights.ai} / 인간 ${config.weights.human})`;
      }
    }

    // 점수를 소수 첫째 자리로 반올림 (1–10 스케일 유지)
    finalScore = Math.round(finalScore * 10) / 10;

    return {
      competencyKey: key,
      aiScore,
      humanScore,
      finalScore,
      agreement,
      method,
    };
  });
}
