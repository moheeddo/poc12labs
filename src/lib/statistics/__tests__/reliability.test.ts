import { describe, it, expect } from "vitest";
import { cronbachAlpha, icc21, itemTotalCorrelation, alphaIfDeleted } from "../reliability";

// 테스트용 데이터: 5명 응시자 × 4문항 (높은 내적 일관성)
const highConsistencyScores: number[][] = [
  [4, 5, 4, 5], // 응시자 1
  [3, 3, 4, 3], // 응시자 2
  [5, 5, 5, 5], // 응시자 3
  [2, 2, 3, 2], // 응시자 4
  [4, 4, 4, 4], // 응시자 5
];

// 낮은 내적 일관성 데이터 (무작위에 가까운 패턴)
const lowConsistencyScores: number[][] = [
  [4, 1, 5, 2],
  [2, 5, 1, 4],
  [3, 3, 3, 3],
  [5, 2, 4, 1],
  [1, 4, 2, 5],
];

describe("cronbachAlpha", () => {
  it("응시자 수가 2 미만이면 0을 반환한다", () => {
    expect(cronbachAlpha([[1, 2, 3]])).toBe(0);
  });

  it("문항 수가 2 미만이면 0을 반환한다", () => {
    expect(cronbachAlpha([[1], [2], [3]])).toBe(0);
  });

  it("높은 내적 일관성 데이터에서 0.8 이상의 alpha를 반환한다", () => {
    const alpha = cronbachAlpha(highConsistencyScores);
    expect(alpha).toBeGreaterThan(0.8);
    expect(alpha).toBeLessThanOrEqual(1);
  });

  it("낮은 내적 일관성 데이터에서 높은 alpha를 반환하지 않는다", () => {
    const alpha = cronbachAlpha(lowConsistencyScores);
    expect(alpha).toBeLessThan(0.5);
  });

  it("모든 점수가 동일하면 0을 반환한다 (분산 없음)", () => {
    const identical = [
      [3, 3, 3],
      [3, 3, 3],
      [3, 3, 3],
    ];
    expect(cronbachAlpha(identical)).toBe(0);
  });

  it("완벽히 상관된 문항들은 alpha = 1에 가깝다", () => {
    // 모든 문항이 완벽히 동일한 패턴
    const perfectScores = [
      [1, 1, 1, 1],
      [2, 2, 2, 2],
      [3, 3, 3, 3],
      [4, 4, 4, 4],
      [5, 5, 5, 5],
    ];
    expect(cronbachAlpha(perfectScores)).toBeCloseTo(1, 5);
  });

  it("alpha 값은 항상 1 이하이다", () => {
    expect(cronbachAlpha(highConsistencyScores)).toBeLessThanOrEqual(1);
    expect(cronbachAlpha(lowConsistencyScores)).toBeLessThanOrEqual(1);
  });
});

describe("icc21 (ICC 2-way, Agreement)", () => {
  it("응시자 수가 3 미만이면 기본값을 반환한다", () => {
    const result = icc21([1, 2], [1, 2]);
    expect(result.value).toBe(0);
    expect(result.ci95).toEqual([0, 0]);
  });

  it("완벽히 일치하는 평가자들의 ICC는 1에 가깝다", () => {
    const ratings = [3, 5, 2, 4, 1, 3, 5, 4];
    const result = icc21(ratings, ratings);
    expect(result.value).toBeCloseTo(1, 2);
  });

  it("AI 대 인간 평가자 시나리오 — 적당한 ICC를 계산한다", () => {
    // AI와 인간 평가자가 비슷하게 평가한 케이스
    const humanRater = [4, 3, 5, 2, 4, 3, 5, 2, 4, 3];
    const aiRater = [4, 3, 5, 2, 4, 3, 5, 2, 4, 3];
    const result = icc21(humanRater, aiRater);
    expect(result.value).toBeGreaterThan(0.9);
  });

  it("평가자 간 불일치가 클 때 낮은 ICC를 반환한다", () => {
    // 한 평가자가 높게, 다른 평가자가 낮게 평가
    const rater1 = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    const rater2 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const result = icc21(rater1, rater2);
    expect(result.value).toBeLessThan(0.5);
  });

  it("ICC 값은 0~1 범위 내에 있다", () => {
    const rater1 = [4, 3, 5, 2, 3, 4];
    const rater2 = [3, 4, 4, 3, 3, 5];
    const result = icc21(rater1, rater2);
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(1);
  });

  it("95% CI를 반환하며 lower <= value <= upper이다", () => {
    const rater1 = [4, 3, 5, 2, 3, 4, 5, 2];
    const rater2 = [4, 3, 5, 2, 4, 3, 5, 3];
    const result = icc21(rater1, rater2);
    expect(result.ci95[0]).toBeLessThanOrEqual(result.value);
    expect(result.ci95[1]).toBeGreaterThanOrEqual(result.value);
  });

  it("CI 범위는 [0, 1] 내에 있다", () => {
    const rater1 = [1, 2, 3, 4, 5, 3, 2, 4];
    const rater2 = [2, 2, 4, 3, 5, 3, 2, 4];
    const result = icc21(rater1, rater2);
    expect(result.ci95[0]).toBeGreaterThanOrEqual(0);
    expect(result.ci95[1]).toBeLessThanOrEqual(1);
  });
});

describe("itemTotalCorrelation", () => {
  it("n < 3이면 0을 반환한다", () => {
    expect(itemTotalCorrelation([[1, 2, 3], [4, 5, 6]], 0)).toBe(0);
  });

  it("문항 수가 2 미만이면 0을 반환한다", () => {
    expect(itemTotalCorrelation([[1], [2], [3]], 0)).toBe(0);
  });

  it("높은 내적 일관성 데이터에서 양의 상관계수를 반환한다", () => {
    const corr = itemTotalCorrelation(highConsistencyScores, 0);
    expect(corr).toBeGreaterThan(0);
  });

  it("각 문항 인덱스에 대해 올바르게 동작한다", () => {
    for (let i = 0; i < 4; i++) {
      const corr = itemTotalCorrelation(highConsistencyScores, i);
      expect(corr).toBeGreaterThan(0.5); // 높은 일관성 데이터이므로
    }
  });

  it("상관계수는 -1에서 1 사이이다", () => {
    const corr = itemTotalCorrelation(lowConsistencyScores, 0);
    expect(corr).toBeGreaterThanOrEqual(-1);
    expect(corr).toBeLessThanOrEqual(1);
  });
});

describe("alphaIfDeleted", () => {
  it("문항 삭제 후 남은 문항들의 alpha를 계산한다", () => {
    for (let i = 0; i < 4; i++) {
      const alpha = alphaIfDeleted(highConsistencyScores, i);
      // 문항 수가 줄어도 여전히 신뢰도가 유지되어야 함
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });

  it("낮은 상관의 문항을 삭제하면 alpha가 올라갈 수 있다", () => {
    // 첫 3문항은 일관되고 마지막 문항이 노이즈인 경우
    const mixedScores: number[][] = [
      [4, 5, 4, 1],
      [3, 3, 3, 5],
      [5, 5, 5, 2],
      [2, 2, 2, 4],
      [4, 4, 4, 3],
    ];
    const alphaFull = cronbachAlpha(mixedScores);
    const alphaWithoutNoise = alphaIfDeleted(mixedScores, 3); // 마지막 문항 삭제
    expect(alphaWithoutNoise).toBeGreaterThan(alphaFull);
  });

  it("삭제 인덱스가 올바르게 처리된다 (경계값)", () => {
    const firstAlpha = alphaIfDeleted(highConsistencyScores, 0);
    const lastAlpha = alphaIfDeleted(highConsistencyScores, 3);
    expect(firstAlpha).toBeGreaterThan(0);
    expect(lastAlpha).toBeGreaterThan(0);
  });
});
