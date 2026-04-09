// GET /api/session/report?id=xxx
// 전체 세션 리포트 (운전원 리포트 + 전사문 + 동기화 + 요약)
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

  return NextResponse.json(session);
}
