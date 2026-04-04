import { describe, it, expect } from "vitest";
import {
  mean,
  standardDeviation,
  sampleStandardDeviation,
  percentile,
  percentiles,
  cohenD,
  pearsonR,
} from "../descriptive";

describe("mean", () => {
  it("빈 배열에서 0을 반환한다", () => {
    expect(mean([])).toBe(0);
  });

  it("단일 요소 배열에서 해당 값을 반환한다", () => {
    expect(mean([5])).toBe(5);
  });

  it("양수 값들의 평균을 계산한다", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it("음수를 포함한 배열의 평균을 계산한다", () => {
    expect(mean([-2, -1, 0, 1, 2])).toBe(0);
  });

  it("소수점 값들의 평균을 계산한다", () => {
    expect(mean([1.5, 2.5, 3.0])).toBeCloseTo(2.333, 3);
  });
});

describe("standardDeviation (모집단)", () => {
  it("빈 배열에서 0을 반환한다", () => {
    expect(standardDeviation([])).toBe(0);
  });

  it("동일한 값들의 표준편차는 0이다", () => {
    expect(standardDeviation([3, 3, 3, 3])).toBe(0);
  });

  it("알려진 값들의 표준편차를 계산한다", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → 모집단 SD = 2
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
  });

  it("단일 요소 배열에서 0을 반환한다", () => {
    expect(standardDeviation([7])).toBe(0);
  });
});

describe("sampleStandardDeviation (표본)", () => {
  it("빈 배열에서 0을 반환한다", () => {
    expect(sampleStandardDeviation([])).toBe(0);
  });

  it("단일 요소 배열에서 0을 반환한다", () => {
    expect(sampleStandardDeviation([5])).toBe(0);
  });

  it("두 요소 배열의 표본 표준편차를 계산한다", () => {
    // [2, 4] → 표본 SD = sqrt(((2-3)^2 + (4-3)^2) / 1) = sqrt(2)
    expect(sampleStandardDeviation([2, 4])).toBeCloseTo(Math.sqrt(2), 5);
  });

  it("알려진 값들의 표본 표준편차를 계산한다", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → n=8, 표본 SD ≈ 2.138
    expect(sampleStandardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });
});

describe("percentile", () => {
  it("빈 배열에서 0을 반환한다", () => {
    expect(percentile([], 50)).toBe(0);
  });

  it("단일 요소 배열에서 해당 값을 반환한다", () => {
    expect(percentile([7], 50)).toBe(7);
    expect(percentile([7], 0)).toBe(7);
    expect(percentile([7], 100)).toBe(7);
  });

  it("중앙값(p50)을 계산한다", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it("p0은 최솟값, p100은 최댓값이다", () => {
    expect(percentile([3, 1, 4, 1, 5, 9, 2, 6], 0)).toBe(1);
    expect(percentile([3, 1, 4, 1, 5, 9, 2, 6], 100)).toBe(9);
  });

  it("정렬되지 않은 배열에서도 올바르게 동작한다", () => {
    // [9, 3, 7, 1, 5] 정렬 → [1, 3, 5, 7, 9], p25 index = 1, value = 3
    expect(percentile([9, 3, 7, 1, 5], 25)).toBeCloseTo(3, 0);
  });

  it("보간을 올바르게 수행한다", () => {
    // [1, 2, 3, 4] → p50 = (2+3)/2 = 2.5
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
  });
});

describe("percentiles", () => {
  it("모든 백분위수와 기술통계를 반환한다", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = percentiles(values);
    expect(result.p10).toBeCloseTo(1.9, 1);
    expect(result.p25).toBeCloseTo(3.25, 1);
    expect(result.p50).toBeCloseTo(5.5, 1);
    expect(result.p75).toBeCloseTo(7.75, 1);
    expect(result.p90).toBeCloseTo(9.1, 1);
    expect(result.mean).toBe(5.5);
    expect(result.sd).toBeGreaterThan(0);
  });

  it("p10 < p25 < p50 < p75 < p90 순서를 보장한다", () => {
    const values = [5, 2, 8, 1, 9, 3, 7, 4, 6, 10, 11, 12];
    const result = percentiles(values);
    expect(result.p10).toBeLessThan(result.p25);
    expect(result.p25).toBeLessThan(result.p50);
    expect(result.p50).toBeLessThan(result.p75);
    expect(result.p75).toBeLessThan(result.p90);
  });
});

describe("cohenD", () => {
  it("동일한 두 그룹의 효과 크기는 0이다", () => {
    expect(cohenD([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBe(0);
  });

  it("표준편차가 0인 경우 0을 반환한다", () => {
    expect(cohenD([3, 3, 3], [3, 3, 3])).toBe(0);
  });

  it("절댓값을 반환한다 (순서 무관)", () => {
    const d1 = cohenD([1, 2, 3], [7, 8, 9]);
    const d2 = cohenD([7, 8, 9], [1, 2, 3]);
    expect(d1).toBe(d2);
  });

  it("큰 효과 크기를 올바르게 계산한다", () => {
    // 두 그룹이 명확히 구분될 때 d > 0.8 (large effect)
    const group1 = [1, 2, 3, 4, 5];
    const group2 = [8, 9, 10, 11, 12];
    expect(cohenD(group1, group2)).toBeGreaterThan(0.8);
  });

  it("소규모 효과 크기는 작다", () => {
    // 평균 차이가 작고 분산이 넓을 때 d < 1.0
    const group1 = [1, 3, 5, 7, 9, 11, 13];
    const group2 = [2, 4, 6, 8, 10, 12, 14];
    expect(cohenD(group1, group2)).toBeLessThan(1.0);
  });
});

describe("pearsonR", () => {
  it("길이가 다른 배열에서 0을 반환한다", () => {
    expect(pearsonR([1, 2, 3], [1, 2])).toBe(0);
  });

  it("단일 요소 배열에서 0을 반환한다", () => {
    expect(pearsonR([5], [5])).toBe(0);
  });

  it("완벽한 양의 상관관계는 1이다", () => {
    expect(pearsonR([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBeCloseTo(1, 5);
  });

  it("완벽한 음의 상관관계는 -1이다", () => {
    expect(pearsonR([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 5);
  });

  it("상관없는 변수들의 상관계수는 0에 가깝다", () => {
    // 상수 배열과의 상관계수
    expect(pearsonR([1, 2, 3, 4, 5], [3, 3, 3, 3, 3])).toBe(0);
  });

  it("알려진 상관계수를 계산한다", () => {
    // x=[1,2,3], y=[2,4,5] → r ≈ 0.9819
    expect(pearsonR([1, 2, 3], [2, 4, 5])).toBeCloseTo(0.9819, 3);
  });

  it("범위는 -1에서 1 사이이다", () => {
    const x = [3, 7, 1, 8, 4, 2, 9, 6, 5, 10];
    const y = [2, 5, 3, 7, 1, 4, 8, 6, 9, 2];
    const r = pearsonR(x, y);
    expect(r).toBeGreaterThanOrEqual(-1);
    expect(r).toBeLessThanOrEqual(1);
  });
});
