// 임베딩 유사도 비교 — 코사인 유사도 기반 숙련자 vs 비숙련자 분석

import type { SimilarityReport } from "./types";

/**
 * 두 임베딩 벡터의 코사인 유사도를 계산한다.
 * 코사인 유사도 = (a · b) / (|a| * |b|), 범위: 0~1
 *
 * @param a - 임베딩 벡터 1
 * @param b - 임베딩 벡터 2
 * @returns 유사도 (0: 완전 상이, 1: 완전 동일)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) {
    // 길이가 다를 경우 짧은 쪽에 맞춰 자름
    const minLen = Math.min(a.length, b.length);
    a = a.slice(0, minLen);
    b = b.slice(0, minLen);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  // 부동소수점 오차로 1을 초과할 수 있어 클램프 처리
  return Math.min(1, Math.max(0, dot / denom));
}

/**
 * 코사인 유사도 값을 한국어로 해석한다.
 *
 * @param sim - 코사인 유사도 (0~1)
 * @returns 한국어 해석 문자열
 */
export function interpretSimilarity(sim: number): string {
  if (sim >= 0.9) return "매우 유사 — 숙련도 수준이 거의 동일합니다";
  if (sim >= 0.7) return "유사 — 핵심 조작 패턴이 대체로 일치합니다";
  if (sim >= 0.5) return "보통 — 일부 절차에서 차이가 관찰됩니다";
  if (sim >= 0.3) return "상이 — 조작 순서 및 대응 방식에 명확한 차이가 있습니다";
  return "매우 상이 — 숙련도 격차가 크며 집중 훈련이 필요합니다";
}

/**
 * 두 영상 임베딩을 비교하여 유사도 보고서를 생성한다.
 *
 * @param embedding1 - 첫 번째 영상의 임베딩 벡터
 * @param embedding2 - 두 번째 영상의 임베딩 벡터
 * @param videoId1 - 첫 번째 영상 ID
 * @param videoId2 - 두 번째 영상 ID
 * @returns SimilarityReport
 */
export function compareEmbeddings(
  embedding1: number[],
  embedding2: number[],
  videoId1: string,
  videoId2: string
): SimilarityReport {
  const overallSimilarity = cosineSimilarity(embedding1, embedding2);
  const rounded = Math.round(overallSimilarity * 1000) / 1000; // 소수점 3자리
  const interpretation = interpretSimilarity(rounded);

  return {
    videoId1,
    videoId2,
    overallSimilarity: rounded,
    interpretation,
  };
}
