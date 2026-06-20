import { describe, it, expect } from "vitest";
import { mapSearchResultToClip, buildEvidenceMap } from "@/lib/evidence/evidence-mapper";

// iter29 회귀: TwelveLabs Search의 confidence는 범주형 문자열("high"/"medium"/"low")인데
// 이전 구현(parseFloat→NaN→0)은 전 클립을 threshold(60)에서 탈락시켜 증거맵이 항상 비었다.
describe("evidence-mapper — 범주형 신뢰도 변환 회귀 (iter29)", () => {
  const mk = (confidence: string | number, start = 0, end = 10) =>
    mapSearchResultToClip("r1", "루브릭 항목", "검색쿼리", {
      start,
      end,
      confidence: confidence as string,
    });

  it("범주형 신뢰도를 숫자로 변환한다 (high=85, medium=60, low=30, none=0)", () => {
    expect(mk("high").confidence).toBe(85);
    expect(mk("medium").confidence).toBe(60);
    expect(mk("low").confidence).toBe(30);
    expect(mk("none").confidence).toBe(0);
  });

  it("대소문자 무관 + 숫자 문자열/숫자도 처리, 미상값은 0", () => {
    expect(mk("HIGH").confidence).toBe(85);
    expect(mk("Medium").confidence).toBe(60);
    expect(mk("70").confidence).toBe(70);
    expect(mk(42).confidence).toBe(42);
    expect(mk("garbage").confidence).toBe(0);
  });

  it("회귀: 범주형 high/medium 클립이 기본 threshold(60)에서 생존해 증거맵이 비지 않는다", () => {
    const clips = [
      mapSearchResultToClip("item-1", "t1", "q", { start: 0, end: 10, confidence: "high" }),
      mapSearchResultToClip("item-2", "t2", "q", { start: 20, end: 30, confidence: "medium" }),
      mapSearchResultToClip("item-3", "t3", "q", { start: 40, end: 50, confidence: "low" }), // 30 < 60 → 탈락
    ];
    const map = buildEvidenceMap("communication", 7, ["item-1", "item-2", "item-3"], clips);
    expect(map.clips.length).toBe(2); // high(85)+medium(60) 생존, low(30) 탈락
    expect(map.coverageRate).toBeGreaterThan(0);
    expect(map.overallConfidence).toBeGreaterThan(0);
  });

  it("회귀: 이전 버그였다면 빈 맵이 됐을 입력이 이제 정상 매핑된다", () => {
    const clips = [
      mapSearchResultToClip("item-1", "t1", "q", { start: 0, end: 10, confidence: "high" }),
    ];
    const map = buildEvidenceMap("teamwork", 6, ["item-1"], clips);
    expect(map.clips.length).toBeGreaterThan(0);
    expect(map.coverageRate).toBe(1);
  });
});
