import { describe, it, expect } from "vitest";
import { aggregateRuns } from "../multimodal-aggregate";
import type { MultimodalScoreResult, ItemScore } from "../multimodal-scoring";

// 최소 MultimodalScoreResult 스텁 (aggregate가 읽는 필드만)
function run(total: number | null, itemScores: Record<string, number | null>): MultimodalScoreResult {
  const items: ItemScore[] = Object.entries(itemScores).map(([id, s]) => ({
    id, name: `항목 ${id}`, aiLabel: id, channel: id.toUpperCase(),
    totalReflected: id !== "m5", indicators: [], itemScore: s, naCount: 0, observation: "",
  }));
  return {
    competencyKey: "trustBuilding", competencyLabel: "신뢰형성",
    items, totalScore: total, totalScore100: total === null ? null : Math.round((total / 9) * 100),
    interpretation: "보통 이상", scorableItemCount: 4, coreItemCount: 4, naItems: [], naSummary: {},
  };
}

describe("aggregateRuns — N차수 반복 진단 집계 (보고서: 객관성 확보)", () => {
  it("B부장 케이스: 7.9/7.7/7.8 → 평균 7.8, 일관성 높음", () => {
    const agg = aggregateRuns([
      run(7.9, { m1: 8, m2: 8, m3: 7, m4: 8, m5: null }),
      run(7.7, { m1: 8, m2: 7, m3: 8, m4: 8, m5: null }),
      run(7.8, { m1: 8, m2: 8, m3: 8, m4: 7, m5: null }),
    ]);
    expect(agg.runCount).toBe(3);
    expect(agg.total?.mean).toBe(7.8);
    expect(agg.total?.median).toBe(7.8);
    expect(agg.consistency.level).toBe("높음");
    expect(agg.consistency.requiresReview).toBe(false);
    expect(agg.interpretation).toBe("매우 우수");
  });

  it("변동 큰 케이스: 8/6/4 → 일관성 낮음 + 전문가 검토 권고", () => {
    const agg = aggregateRuns([
      run(8, { m1: 8, m2: 8, m3: 8, m4: 8 }),
      run(6, { m1: 6, m2: 6, m3: 6, m4: 6 }),
      run(4, { m1: 4, m2: 4, m3: 4, m4: 4 }),
    ]);
    expect(agg.total?.mean).toBe(6);
    expect(agg.total?.range).toBe(4);
    expect(agg.consistency.level).toBe("낮음");
    expect(agg.consistency.requiresReview).toBe(true);
    expect(agg.total!.stdev).toBeGreaterThan(1.0);
  });

  it("최빈값(0.5 버킷): 7.5/7.6/7.7 → mode 7.5", () => {
    const agg = aggregateRuns([
      run(7.5, { m1: 7.5 }), run(7.6, { m1: 7.6 }), run(7.7, { m1: 7.7 }),
    ]);
    expect(agg.total?.mode).toBe(7.5);
  });

  it("항목별 집계 + null(N/A) 표본 제외", () => {
    const agg = aggregateRuns([
      run(7, { m1: 9, m2: 6, m5: null }),
      run(7, { m1: 8, m2: null, m5: null }),
    ]);
    const m1 = agg.items.find((i) => i.id === "m1");
    expect(m1?.stat?.mean).toBe(8.5); // (9+8)/2
    expect(m1?.runs).toEqual([9, 8]);
    const m2 = agg.items.find((i) => i.id === "m2");
    expect(m2?.stat?.mean).toBe(6); // null 제외, 6 하나
    expect(m2?.stat?.n).toBe(1);
    const m5 = agg.items.find((i) => i.id === "m5");
    expect(m5?.totalReflected).toBe(false);
    expect(m5?.stat).toBeNull(); // 전부 null
  });

  it("총점 null 회차는 집계에서 제외", () => {
    const agg = aggregateRuns([run(8, { m1: 8 }), run(null, { m1: null }), run(6, { m1: 6 })]);
    expect(agg.total?.n).toBe(2);
    expect(agg.total?.mean).toBe(7);
    expect(agg.representativeIndex === 0 || agg.representativeIndex === 2).toBe(true);
  });
});

describe("적응형 반복진단 권고 (신뢰구간 게이트 + 경계 HITL)", () => {
  it("안정적 3회(7.8±소폭) → 정밀도 충분", () => {
    const agg = aggregateRuns([run(7.8, { m1: 8 }), run(7.8, { m1: 8 }), run(7.9, { m1: 8 })]);
    expect(agg.recommendation.status).toBe("sufficient");
    expect(agg.recommendation.ciHalfWidth).toBeLessThanOrEqual(0.5);
  });
  it("변동 큰 3회(8/6/4) → 추가 진단 또는 HITL (정밀도 미달)", () => {
    const agg = aggregateRuns([run(8, { m1: 8 }), run(6, { m1: 6 }), run(4, { m1: 4 })]);
    expect(["more_runs", "hitl_required"]).toContain(agg.recommendation.status);
    expect(agg.recommendation.ciHalfWidth).toBeGreaterThan(0.5);
  });
  it("CI가 등급 경계(5.5) 가로지르면 HITL 강제", () => {
    // 5.3/5.7/5.5 → 평균 5.5 근처, CI가 5.5 경계 straddle
    const agg = aggregateRuns([run(5.2, { m1: 5 }), run(5.8, { m1: 6 }), run(5.5, { m1: 5 })]);
    expect(agg.recommendation.straddlesBand).toBe(true);
    expect(agg.recommendation.status).toBe("hitl_required");
  });
});
