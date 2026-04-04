import { describe, it, expect, beforeEach } from "vitest";
import { db, addSession, getSession, getAllSessions, addScore, getScoresBySession } from "../store";

describe("assessment-store", () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it("세션 추가 및 조회", async () => {
    await addSession({ id: "s1", name: "테스트 세션", createdAt: "2026-04-05", status: "active" });
    const session = await getSession("s1");
    expect(session?.name).toBe("테스트 세션");
  });

  it("전체 세션 목록 (최신순)", async () => {
    await addSession({ id: "s1", name: "세션1", createdAt: "2026-04-01", status: "active" });
    await addSession({ id: "s2", name: "세션2", createdAt: "2026-04-05", status: "active" });
    const all = await getAllSessions();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("s2");
  });

  it("점수 추가 및 세션별 조회", async () => {
    await addScore({ id: "sc1", sessionId: "s1", participantId: "p1", competencyKey: "visionPresentation", aiScore: 7, createdAt: "2026-04-05" });
    await addScore({ id: "sc2", sessionId: "s1", participantId: "p1", competencyKey: "trustBuilding", aiScore: 6, createdAt: "2026-04-05" });
    const scores = await getScoresBySession("s1");
    expect(scores).toHaveLength(2);
  });
});
