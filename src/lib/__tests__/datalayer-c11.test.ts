import { describe, it, expect } from "vitest";
import { buildGrowthTimeline } from "@/lib/growth/growth-tracker";
import type { GrowthDataPoint } from "@/lib/growth/types";
import { cohenD } from "@/lib/statistics/descriptive";
import { buildNormTable } from "@/lib/validation/norm-builder";
import { syncTranscripts } from "@/lib/transcript-sync";

// 사이클11 데이터 레이어 회귀 잠금

const dp = (date: string, scores: Record<string, number>): GrowthDataPoint => ({
  sessionId: "s-" + date, date, competencyScores: scores, overallScore: 0,
});

describe("growth-tracker — 누락 역량 0패딩 제거(거짓 신호 차단) (사이클11)", () => {
  it("뒤늦게 등장한 역량이 이전 세션 0으로 패딩돼 거짓 '돌파'를 만들지 않는다", () => {
    // comm은 모든 세션, logic은 마지막에만 등장(8.5)
    const tl = buildGrowthTimeline("e1", "홍길동", [
      dp("2025-01-01", { comm: 6 }),
      dp("2025-02-01", { comm: 7 }),
      dp("2025-03-01", { comm: 8, logic: 8.5 }),
    ]);
    // logic은 1개 세션만 채점 → [0,0,8.5] 패딩 시 거짓 돌파/향상. 이제 [8.5] 단일이라 돌파 아님.
    expect(tl.breakthroughCompetencies).not.toContain("logic");
  });
  it("정상 데이터는 정상 추이 산출(throw 없음)", () => {
    const tl = buildGrowthTimeline("e1", "홍길동", [
      dp("2025-01-01", { comm: 4 }), dp("2025-02-01", { comm: 6 }), dp("2025-03-01", { comm: 8 }),
    ]);
    const comm = tl.trends.find((t) => t.competencyKey === "comm");
    expect(comm?.direction).toBe("improving");
  });
});

describe("cohenD — 소표본 분모 0 NaN 방지 (사이클11)", () => {
  it("각 그룹 표본 1개면 NaN이 아니라 0 반환(공정성 판정 오염 차단)", () => {
    const d = cohenD([7], [3]);
    expect(Number.isNaN(d)).toBe(false);
    expect(d).toBe(0);
  });
  it("정상 두 그룹은 유한한 양수 효과크기", () => {
    const d = cohenD([8, 9, 7, 8], [3, 4, 2, 3]);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(0);
  });
});

describe("buildNormTable — 역량 키 합집합(키 손실 방지) (사이클11)", () => {
  it("첫 참가자에 없는 역량도 norm에 포함된다", () => {
    const table = buildNormTable(
      [
        { participantId: "p1", group: "G", competencyScores: { comm: 8 } },
        { participantId: "p2", group: "G", competencyScores: { comm: 7, logic: 9 } },
      ],
      "group"
    );
    const g = table.groups.find((x) => x.groupName === "G");
    expect(g?.percentiles).toHaveProperty("logic"); // 이전엔 첫 참가자 키만 봐서 누락됐음
    expect(g?.percentiles).toHaveProperty("comm");
  });
});

describe("syncTranscripts — argmax 매칭·B 중복방지·true median (사이클11)", () => {
  const seg = (start: number, text: string) => ({ start, end: start + 2, text });
  it("반복 문구에서 최고 유사도 B에 매칭(첫 매칭 break 아님)", () => {
    // A의 '제어봉 삽입 확인'은 B의 더 늦은 정확한 일치(시각 100)에 매칭돼야(이른 약한 일치 아님)
    const A = [seg(10, "제어봉 삽입 확인")];
    const B = [seg(5, "제어봉 삽입 확인 절차"), seg(100, "제어봉 삽입 확인")];
    const r = syncTranscripts(A, B);
    expect(r.matchedPhrases.length).toBe(1);
    expect(r.matchedPhrases[0].timeB).toBe(100); // 정확 일치(유사도 1.0)
  });
  it("매칭 없으면 안전 반환", () => {
    const r = syncTranscripts([seg(0, "전혀 다른 문장 하나")], [seg(0, "완전히 무관한 텍스트")]);
    expect(r.offsetAtoB).toBe(0);
    expect(r.matchedPhrases).toEqual([]);
  });
});
