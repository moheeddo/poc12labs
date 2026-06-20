import { describe, it, expect } from "vitest";
import { buildGrowthTimeline } from "@/lib/growth/growth-tracker";
import type { GrowthDataPoint } from "@/lib/growth/types";

const dp = (date: string, score: number): GrowthDataPoint => ({
  sessionId: "s-" + date,
  date,
  competencyScores: { communication: score },
  overallScore: score,
});

// iter29 회귀: 파싱 불가 date(new Date(x).getTime()=NaN)가 정렬 비교자에 들어가면
// 정렬 결과가 뒤섞이거나 다운스트림 계산이 NaN으로 오염된다 → NaN-안전 정렬로 방어.
describe("growth-tracker — 날짜 정렬 견고성 (iter29)", () => {
  it("정상 날짜는 오름차순으로 정렬된다", () => {
    const tl = buildGrowthTimeline("e1", "홍길동", [
      dp("2025-03-01", 5),
      dp("2025-01-01", 4),
      dp("2025-02-01", 6),
    ]);
    expect(tl.dataPoints.map((d) => d.date)).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
    ]);
  });

  it("파싱 불가 날짜가 섞여도 throw 없이 타임라인을 산출한다", () => {
    const points = [dp("2025-03-15", 5), dp("not-a-date", 6), dp("2025-01-01", 4)];
    expect(() => buildGrowthTimeline("e1", "홍길동", points)).not.toThrow();
    const tl = buildGrowthTimeline("e1", "홍길동", points);
    expect(tl.dataPoints.length).toBe(3);
    expect(tl.employeeId).toBe("e1");
  });

  it("빈 입력에도 안전하게 빈 타임라인을 반환한다", () => {
    const tl = buildGrowthTimeline("e1", "홍길동", []);
    expect(tl.dataPoints).toEqual([]);
    expect(tl.trends).toEqual([]);
  });
});
