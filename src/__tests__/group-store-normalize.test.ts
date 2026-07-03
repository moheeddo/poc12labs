import { describe, it, expect, beforeEach } from "vitest";
import { loadAllSessions } from "@/lib/group-store";

// =============================================
// 회귀 테스트 — legacy 세션의 memberScores 누락 방어
//
// 배경(2026-07-03): 프로덕션에서 "Application error: a client-side exception"이
// 재방문 사용자에게 떴다. 근본 원인 = 과거 저장본의 competency 객체에 memberScores
// 필드가 없어, GroupDashboard 집계가 c.memberScores[id] → undefined['id'] 로 throw.
// normalizeSession이 로드 시 memberScores를 {} 로 backfill 하는지 잠근다.
// =============================================

const STORAGE_KEY = "khnp-group-sessions";

describe("group-store normalizeSession — legacy memberScores 방어", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("memberScores 필드가 없는 competency에 {} 를 backfill 한다", () => {
    // memberScores가 통째로 빠진 legacy 세션 (구버전 저장 형태)
    const legacy = [
      {
        id: "sess-legacy-1",
        name: "레거시 조",
        createdAt: "2026-01-01T00:00:00.000Z",
        currentStep: 0,
        members: [{ id: "m1", name: "홍길동", position: "차장" }],
        competencies: [
          { competencyKey: "visionPresentation" /* memberScores 없음 */ },
          { competencyKey: "trustBuilding", memberScores: null },
        ],
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const sessions = loadAllSessions();
    expect(sessions).toHaveLength(1);
    for (const comp of sessions[0].competencies) {
      expect(comp.memberScores).toBeDefined();
      expect(typeof comp.memberScores).toBe("object");
      // 집계 코드가 안전하게 접근할 수 있어야 함 (undefined['m1'] 크래시 없음)
      expect(() => comp.memberScores["m1"]).not.toThrow();
    }
  });

  it("정상 세션의 memberScores는 그대로 보존한다", () => {
    const normal = [
      {
        id: "sess-ok-1",
        name: "정상 조",
        createdAt: "2026-02-01T00:00:00.000Z",
        currentStep: 1,
        members: [{ id: "m1", name: "김철수", position: "부장" }],
        competencies: [
          {
            competencyKey: "visionPresentation",
            memberScores: { m1: { overallScore: 7, analyzed: true } },
          },
        ],
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normal));

    const sessions = loadAllSessions();
    expect(sessions[0].competencies[0].memberScores.m1.overallScore).toBe(7);
  });
});
