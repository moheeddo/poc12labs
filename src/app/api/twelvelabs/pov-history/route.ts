// POV 분석 이력 API — 이력 조회 / 삭제
import { NextRequest, NextResponse } from 'next/server';
import { getHistory, getHistoryEntry, deleteHistoryEntry } from '@/lib/pov-analysis-history';

export async function GET(req: NextRequest) {
  const procedureId = req.nextUrl.searchParams.get('procedureId') || undefined;
  const id = req.nextUrl.searchParams.get('id');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

  // 단건 조회
  if (id) {
    const entry = getHistoryEntry(id);
    return entry
      ? NextResponse.json(entry)
      : NextResponse.json({ error: '이력 없음' }, { status: 404 });
  }

  // 목록 조회 (절차 필터 + 제한)
  return NextResponse.json(getHistory(procedureId, limit));
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id 필요' }, { status: 400 });
  }
  return NextResponse.json({ deleted: deleteHistoryEntry(id) });
}
