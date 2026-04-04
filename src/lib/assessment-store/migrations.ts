import { addSession, addScore } from "./store";
import type { DBSession, DBScore } from "./types";

// LocalStorage → IndexedDB 마이그레이션 완료 플래그 키
const MIGRATION_KEY = "khnp-migration-v1-done";

/**
 * LocalStorage의 기존 group-store 데이터를 IndexedDB로 마이그레이션한다.
 * - 최초 1회만 실행 (MIGRATION_KEY로 중복 방지)
 * - SSR 환경(window 없음)에서는 즉시 반환
 */
export async function migrateFromLocalStorage(): Promise<{ migrated: boolean; count: number }> {
  if (typeof window === "undefined") return { migrated: false, count: 0 };
  if (localStorage.getItem(MIGRATION_KEY)) return { migrated: false, count: 0 };

  const raw = localStorage.getItem("khnp-group-sessions");
  if (!raw) { localStorage.setItem(MIGRATION_KEY, "true"); return { migrated: false, count: 0 }; }

  try {
    const sessions = JSON.parse(raw);
    if (!Array.isArray(sessions)) return { migrated: false, count: 0 };

    let count = 0;
    for (const session of sessions) {
      const dbSession: DBSession = {
        id: session.id,
        name: session.name || "마이그레이션 세션",
        createdAt: session.createdAt || new Date().toISOString(),
        status: "completed",
        groupId: session.id,
      };
      try { await addSession(dbSession); count++; } catch { /* 이미 존재하는 경우 무시 */ }

      // 역량별 점수 마이그레이션
      if (session.competencies && Array.isArray(session.competencies)) {
        for (const comp of session.competencies) {
          if (!comp.memberScores) continue;
          for (const [memberId, scoreData] of Object.entries(comp.memberScores)) {
            const sd = scoreData as { overallScore?: number; bars?: Record<string, number>; analyzed?: boolean };
            if (!sd.analyzed) continue;
            const score: DBScore = {
              id: `mig-${session.id}-${memberId}-${comp.competencyKey}`,
              sessionId: session.id,
              participantId: memberId,
              competencyKey: comp.competencyKey,
              aiScore: sd.overallScore || 0,
              rubricScores: sd.bars,
              createdAt: session.createdAt || new Date().toISOString(),
            };
            try { await addScore(score); } catch { /* 중복 키 무시 */ }
          }
        }
      }
    }

    localStorage.setItem(MIGRATION_KEY, "true");
    return { migrated: true, count };
  } catch { return { migrated: false, count: 0 }; }
}
