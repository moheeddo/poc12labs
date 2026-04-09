// GET /api/session/status?id=xxx
// 세션 진행 상태 조회
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id 쿼리 파라미터가 필요합니다' }, { status: 400 });
  }

  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    status: session.status,
    operators: session.operators.map((op) => ({
      role: op.role,
      name: op.name,
      status: op.status,
      progress: op.progress,
      error: op.error,
      hasReport: !!op.report,
    })),
    hasSync: !!session.syncResult,
    hasSummary: !!session.summary,
  });
}
