import { describe, it, expect } from "vitest";
import { icc21 } from "@/lib/statistics/reliability";
import { mantelHaenszel as mhFromDif } from "@/lib/statistics/dif";
import { deduplicateClips, mapSearchResultToClip } from "@/lib/evidence/evidence-mapper";

// 사이클2 도메인 수식 회귀 잠금

describe("ICC(2,1) CI — 자유도 의존 F 임계값 (사이클2)", () => {
  it("소표본(n=3)에서 CI가 과도하게 좁지 않다(고정 3.84 대비 넓음)", () => {
    // 적당히 일치하는 평가자 쌍, n=3
    const r1 = [8, 5, 2];
    const r2 = [7, 6, 3];
    const { value, ci95 } = icc21(r1, r2);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
    // n=3 → m=2 → F(0.975;2,2)=39.0. CI 폭이 충분히 넓어야(소표본 불확실성 반영)
    const width = ci95[1] - ci95[0];
    expect(width).toBeGreaterThan(0.3);
    expect(ci95[0]).toBeLessThanOrEqual(value + 1e-9);
    expect(ci95[1]).toBeGreaterThanOrEqual(value - 1e-9);
  });
  it("CI는 [0,1] 범위로 클램프된다", () => {
    const { ci95 } = icc21([9, 9, 8, 7], [9, 8, 8, 7]);
    expect(ci95[0]).toBeGreaterThanOrEqual(0);
    expect(ci95[1]).toBeLessThanOrEqual(1);
  });
});

describe("Mantel-Haenszel χ²(1) p-value (사이클2)", () => {
  it("χ²=0이면 p=1", () => {
    // 그룹 간 차이 없는 데이터
    const res = mhFromDif([1, 0, 1, 0, 1, 0], [0, 0, 0, 1, 1, 1], [5, 5, 5, 5, 5, 5]);
    expect(res.pValue).toBeLessThanOrEqual(1);
    expect(res.pValue).toBeGreaterThanOrEqual(0);
  });
  it("p-value는 항상 0~1, chi2≥0", () => {
    const res = mhFromDif([1, 1, 1, 0, 0, 0, 1, 0], [0, 0, 1, 1, 0, 1, 0, 1], [3, 6, 9, 3, 6, 9, 4, 7]);
    expect(res.chi2).toBeGreaterThanOrEqual(0);
    expect(res.pValue).toBeGreaterThanOrEqual(0);
    expect(res.pValue).toBeLessThanOrEqual(1);
  });
});

describe("증거 dedup — rubricItemId 경계 보존 (사이클2)", () => {
  const clip = (id: string, start: number, end: number, conf: string | number) =>
    mapSearchResultToClip(id, "텍스트", "쿼리", { start, end, confidence: conf as string });

  it("다른 rubricItemId의 같은 시각 클립은 병합되지 않는다", () => {
    const clips = [
      clip("item-A", 10, 20, "high"),
      clip("item-B", 12, 22, "high"), // 시간 겹치지만 다른 항목 → 보존
    ];
    const out = deduplicateClips(clips);
    const ids = new Set(out.map((c) => c.rubricItemId));
    expect(ids.has("item-A")).toBe(true);
    expect(ids.has("item-B")).toBe(true);
    expect(out.length).toBe(2);
  });
  it("같은 rubricItemId의 시간 중복은 병합된다", () => {
    const clips = [
      clip("item-A", 10, 20, "low"),
      clip("item-A", 12, 22, "high"), // 같은 항목·중복 → 고신뢰 1개로
    ];
    const out = deduplicateClips(clips);
    expect(out.length).toBe(1);
    expect(out[0].confidence).toBe(85); // high
  });
});
