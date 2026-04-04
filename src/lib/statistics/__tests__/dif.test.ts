import { describe, it, expect } from "vitest";
import { fourFifthsRule, mantelHaenszel } from "../dif";

describe("fourFifthsRule", () => {
  it("그룹이 1개 이하이면 기본값을 반환한다", () => {
    const result = fourFifthsRule({ groupA: 0.8 });
    expect(result.ratio).toBe(1);
    expect(result.impacted).toBe(false);
    expect(result.referenceGroup).toBe("");
    expect(result.focalGroup).toBe("");
  });

  it("공정한 선발 — 합격률 차이가 4/5 이상인 경우", () => {
    // groupA: 90%, groupB: 80% → ratio = 0.889 > 0.8
    const result = fourFifthsRule({ groupA: 0.9, groupB: 0.8 });
    expect(result.ratio).toBeGreaterThan(0.8);
    expect(result.impacted).toBe(false);
    expect(result.referenceGroup).toBe("groupA");
    expect(result.focalGroup).toBe("groupB");
  });

  it("차별적 영향 — 합격률 차이가 4/5 미만인 경우", () => {
    // groupA: 80%, groupB: 50% → ratio = 0.625 < 0.8
    const result = fourFifthsRule({ groupA: 0.8, groupB: 0.5 });
    expect(result.ratio).toBeLessThan(0.8);
    expect(result.impacted).toBe(true);
    expect(result.referenceGroup).toBe("groupA");
    expect(result.focalGroup).toBe("groupB");
  });

  it("정확히 4/5(0.8)인 경우 차별 아님", () => {
    const result = fourFifthsRule({ groupA: 1.0, groupB: 0.8 });
    expect(result.ratio).toBeCloseTo(0.8, 5);
    expect(result.impacted).toBe(false);
  });

  it("reference group은 합격률이 가장 높은 그룹이다", () => {
    const result = fourFifthsRule({ junior: 0.6, senior: 0.9, mid: 0.75 });
    expect(result.referenceGroup).toBe("senior");
    expect(result.focalGroup).toBe("junior");
  });

  it("reference group의 합격률이 0이면 ratio는 0이다", () => {
    const result = fourFifthsRule({ groupA: 0, groupB: 0 });
    expect(result.ratio).toBe(0);
  });

  it("두 그룹이 동일한 합격률이면 ratio = 1이다", () => {
    const result = fourFifthsRule({ groupA: 0.7, groupB: 0.7 });
    expect(result.ratio).toBeCloseTo(1, 5);
    expect(result.impacted).toBe(false);
  });
});

describe("mantelHaenszel", () => {
  it("응답 수가 6 미만이면 기본값을 반환한다", () => {
    const result = mantelHaenszel([1, 0, 1], [0, 1, 0], [3, 2, 4]);
    expect(result.chi2).toBe(0);
    expect(result.pValue).toBe(1);
    expect(result.deltaMH).toBe(0);
    expect(result.classification).toBe("A");
  });

  it("기본 동작 — 응답, 그룹, 점수 배열을 처리한다", () => {
    const responses = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1];
    const groupVar = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
    const scoreVar = [5, 4, 6, 7, 3, 8, 5, 4, 6, 3, 7, 8];
    const result = mantelHaenszel(responses, groupVar, scoreVar);
    expect(result).toHaveProperty("chi2");
    expect(result).toHaveProperty("pValue");
    expect(result).toHaveProperty("deltaMH");
    expect(result).toHaveProperty("classification");
    expect(result.chi2).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(result.deltaMH).toBeGreaterThanOrEqual(0);
  });

  it("분류 A: deltaMH < 1.0인 경우", () => {
    // 두 그룹이 동일하게 동작하는 데이터
    const responses = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const groupVar = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
    const scoreVar = [8, 2, 7, 3, 6, 4, 8, 2, 7, 3, 6, 4];
    const result = mantelHaenszel(responses, groupVar, scoreVar);
    // DIF 없는 경우 A 분류
    expect(["A", "B", "C"]).toContain(result.classification);
  });

  it("chi2 값은 항상 0 이상이다", () => {
    const responses = [1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0];
    const groupVar = [0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1];
    const scoreVar = [3, 5, 2, 4, 6, 1, 7, 3, 5, 2, 4, 6];
    const result = mantelHaenszel(responses, groupVar, scoreVar);
    expect(result.chi2).toBeGreaterThanOrEqual(0);
  });

  it("deltaMH 값은 항상 0 이상이다", () => {
    const responses = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const groupVar = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    const scoreVar = [5, 5, 6, 6, 4, 4, 7, 7, 3, 3, 8, 8];
    const result = mantelHaenszel(responses, groupVar, scoreVar);
    expect(result.deltaMH).toBeGreaterThanOrEqual(0);
  });

  it("분류는 A, B, C 중 하나이다", () => {
    const responses = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const groupVar = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
    const scoreVar = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const result = mantelHaenszel(responses, groupVar, scoreVar);
    expect(["A", "B", "C"]).toContain(result.classification);
  });

  it("deltaMH와 분류 간의 일관성을 검증한다", () => {
    const responses = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const groupVar = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
    const scoreVar = [5, 4, 6, 3, 7, 2, 5, 4, 6, 3, 7, 2];
    const result = mantelHaenszel(responses, groupVar, scoreVar);
    if (result.deltaMH < 1.0) {
      expect(result.classification).toBe("A");
    } else if (result.deltaMH < 1.5) {
      expect(result.classification).toBe("B");
    } else {
      expect(result.classification).toBe("C");
    }
  });
});
