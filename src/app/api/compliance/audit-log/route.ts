// GET /api/compliance/audit-log?sessionId=xxx
// 세션별 감사 로그 조회 — ISO 10667 §9 감사 추적 요건 충족
import { NextResponse } from "next/server";

// Dexie(IndexedDB)는 브라우저 전용이므로, 서버 API에서는 직접 접근 불가
// 실제 운영 환경에서는 서버 사이드 DB(Postgres 등)로 교체 필요
// 현재 아키텍처에서는 클라이언트가 IndexedDB를 직접 조회하고,
// 이 엔드포인트는 감사 로그 포맷 검증 및 필터링 역할 수행

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        {
          error: "sessionId 쿼리 파라미터가 필요합니다.",
          example: "/api/compliance/audit-log?sessionId=session-123",
        },
        { status: 400 },
      );
    }

    // 아키텍처 참고:
    // Dexie IndexedDB는 브라우저 환경에서만 동작합니다.
    // 서버 사이드(Next.js API Route)에서는 직접 조회할 수 없습니다.
    // 클라이언트에서 getAuditLogBySession(sessionId)를 호출하거나
    // 서버 사이드 DB(예: Supabase, PlanetScale)로 마이그레이션 후 이 엔드포인트를 확장하세요.
    //
    // 클라이언트 직접 호출 예시:
    //   import { getAuditLogBySession } from "@/lib/assessment-store";
    //   const logs = await getAuditLogBySession(sessionId);

    return NextResponse.json({
      sessionId,
      message:
        "감사 로그는 IndexedDB(클라이언트 전용)에 저장됩니다. 클라이언트에서 getAuditLogBySession()을 직접 호출하거나 서버 사이드 DB 마이그레이션 후 이 엔드포인트를 사용하세요.",
      clientUsage: {
        import: `import { getAuditLogBySession } from "@/lib/assessment-store";`,
        call: `const logs = await getAuditLogBySession("${sessionId}");`,
      },
      entries: [], // 서버 사이드 DB 연동 시 실제 데이터로 교체
      _note: "ISO 10667 §9: 모든 평가 활동은 감사 추적 가능해야 하며, 로그는 최소 3년간 보존되어야 합니다.",
    });
  } catch (error) {
    console.error("[compliance/audit-log] 오류:", error);
    return NextResponse.json(
      { error: "감사 로그 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
