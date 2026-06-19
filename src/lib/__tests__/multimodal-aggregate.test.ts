import { describe, it, expect } from "vitest";
import { aggregateRuns, RECOMMENDED_RUNS } from "../multimodal-aggregate";
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
  it("단일/부족 회차(n<3): 퇴화 CI가 'sufficient'로 새지 않고 more_runs로 보류 (fail-open 방지)", () => {
    for (const v of [7.0, 6.0, 8.5, 7.5, 3.0]) {
      const a1 = aggregateRuns([run(v, { m1: v })]); // n=1
      expect(a1.recommendation.status).toBe("more_runs");
      expect(a1.recommendation.suggestedTotalRuns).toBe(RECOMMENDED_RUNS);
      const a2 = aggregateRuns([run(v, { m1: v }), run(v, { m1: v })]); // n=2 분산0
      expect(a2.recommendation.status).toBe("more_runs");
    }
  });
  it("fail-open 차단: 평균 신뢰구간이 경계를 넘는 치우친 경계사례는 HITL (중앙값 구간만 보면 놓침)", () => {
    // [5,5,5.3]: median 5.0(보통미만) 구간은 5.5 미달이나 mean 5.1±0.43=[4.67,5.53]은 5.5 통과
    // [2.5,2.5,2.8]: mean 2.6±0.43=[2.17,3.03]이 3.0 경계 통과
    for (const runs of [[5, 5, 5.3], [2.5, 2.5, 2.8]]) {
      const agg = aggregateRuns(runs.map((v) => run(v, { m1: v })));
      expect(agg.recommendation.straddlesBand).toBe(true);
      expect(agg.recommendation.status).toBe("hitl_required");
    }
  });
  it("경계에서 충분히 떨어진 안정 케이스는 sufficient (포락선이 어떤 cut도 비포함)", () => {
    // [4.0,4.0,4.2]: 포락선 ≈ [3.6,4.5], cut(3.0/5.5/7.5) 어디에도 안 닿음 → 충분
    const agg = aggregateRuns([4.0, 4.0, 4.2].map((v) => run(v, { m1: v })));
    expect(agg.recommendation.straddlesBand).toBe(false);
    expect(agg.recommendation.status).toBe("sufficient");
  });
  it("표시 구간(ci95) == 판정 구간 == 메시지 구간 — 단일 통계량(자기모순 차단)", () => {
    const agg = aggregateRuns([0, 0, 2.1].map((v) => run(v, { m1: v })));
    if (agg.recommendation.straddlesBand) {
      // 메시지에 박힌 구간이 ci95 배지와 정확히 동일
      expect(agg.recommendation.straddleInterval).toEqual(agg.total!.ci95);
      const [lo, hi] = agg.recommendation.straddleInterval!;
      expect(agg.recommendation.message).toContain(`${lo.toFixed(1)}~${hi.toFixed(1)}`);
    }
  });
  it("분산 0 + 경계 정좌(3,3,3)는 안정적이므로 straddle 제외·sufficient", () => {
    const agg = aggregateRuns([run(3, { m1: 3 }), run(3, { m1: 3 }), run(3, { m1: 3 })]);
    expect(agg.recommendation.straddlesBand).toBe(false);
    expect(agg.recommendation.status).toBe("sufficient");
  });
  it("CI가 등급 경계(5.5) 가로지르면 HITL 강제", () => {
    // 5.3/5.7/5.5 → 평균 5.5 근처, CI가 5.5 경계 straddle
    const agg = aggregateRuns([run(5.2, { m1: 5 }), run(5.8, { m1: 6 }), run(5.5, { m1: 5 })]);
    expect(agg.recommendation.straddlesBand).toBe(true);
    expect(agg.recommendation.status).toBe("hitl_required");
  });

  it("정좌 경계사례 6종(반올림 중심으로 놓치던 fail-open)은 모두 HITL", () => {
    // iter21 전수스캔으로 도달 가능했던 6개 — raw 중심으로 판정해야 straddle=true
    for (const runs of [[2.5, 2.6, 2.8], [3.2, 3.4, 3.5], [5, 5.1, 5.3], [5.7, 5.9, 6], [7, 7.1, 7.3], [7.7, 7.9, 8]]) {
      const agg = aggregateRuns(runs.map((v) => run(v, { m1: v })));
      expect(agg.recommendation.straddlesBand, `runs=${runs}`).toBe(true);
      expect(agg.recommendation.status, `runs=${runs}`).toBe("hitl_required");
    }
  });

  it("[속성] straddle 메시지 구간은 반드시 등급경계를 포함한다 — 거짓 진술 차단(fail-closed)", () => {
    const BAND_CUTS = [3.0, 5.5, 7.5];
    let straddleCases = 0;
    for (let a = 0; a <= 88; a += 1) {
      for (let d = 0; d <= 17; d += 1) {
        const xs = [a / 10, a / 10, Math.min(9, (a + d) / 10)];
        const agg = aggregateRuns(xs.map((v) => run(v, { m1: v })));
        const rec = agg.recommendation;
        if (!rec.straddlesBand) continue;
        straddleCases++;
        // straddle이면 표시 구간이 존재하고, 그 구간이 적어도 한 경계를 실제로 포함해야 함
        expect(rec.straddleInterval, `runs=${xs}`).not.toBeNull();
        const [lo, hi] = rec.straddleInterval!;
        expect(BAND_CUTS.some((c) => lo <= c && hi >= c), `interval=[${lo},${hi}] runs=${xs}`).toBe(true);
      }
    }
    expect(straddleCases).toBeGreaterThan(10);
  });

  // 속성 테스트(그리드 전수) — fail-open 영구 잠금:
  // 기대 straddle을 코드 필드가 아닌 '입력에서 raw로 독립 재계산'해 반올림 맹점을 제거(iter21 지적).
  // raw 평균·중앙값 중 어느 CI라도 경계를 넘으면(분산>0) 절대 sufficient 금지.
  it("[속성] raw 재계산 기준 경계 교차 시 어떤 표본도 sufficient가 아니다(3회 그리드 전수)", () => {
    const BAND_CUTS = [3.0, 5.5, 7.5];
    const T95_DF2 = 4.30; // n=3 → df=2
    const rawMean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const rawMedian = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[1]; };
    const rawSd = (xs: number[]) => {
      const m = rawMean(xs);
      return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
    };
    let crossingCases = 0;
    for (let a = 0; a <= 88; a += 1) {
      for (let d = 0; d <= 14; d += 1) {
        const xs = [a / 10, a / 10, Math.min(9, (a + d) / 10)];
        const margin = T95_DF2 * (rawSd(xs) / Math.sqrt(3)); // 코드와 무관한 독립 계산
        if (margin <= 0) continue;
        const mu = rawMean(xs), md = rawMedian(xs);
        const crosses = BAND_CUTS.some(
          (c) => (mu - margin <= c && mu + margin >= c) || (md - margin <= c && md + margin >= c),
        );
        if (!crosses) continue;
        crossingCases++;
        const agg = aggregateRuns(xs.map((v) => run(v, { m1: v })));
        expect(agg.recommendation.status, `runs=${xs}`).not.toBe("sufficient");
      }
    }
    expect(crossingCases).toBeGreaterThan(5); // 그리드가 실제 경계사례를 충분히 포함
  });
});
