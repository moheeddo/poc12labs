// POV 분석 이력 API — 이력 조회 / 삭제
import { NextRequest, NextResponse } from 'next/server';
import { getHistory, getHistoryEntry, deleteHistoryEntry } from '@/lib/pov-analysis-history';
import { errorResponse, checkRateLimit, ApiError } from '@/lib/api-middleware';

export async function GET(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get('x-forwarded-for') || 'unknown');

    const procedureId = req.nextUrl.searchParams.get('procedureId') || undefined;
    const id = req.nextUrl.searchParams.get('id');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

    // 단건 조회
    if (id) {
      const entry = getHistoryEntry(id);
      if (!entry) throw new ApiError('NOT_FOUND', 404, '이력 없음');
      return NextResponse.json(entry);
    }

    // 목록 조회 (절차 필터 + 제한)
    return NextResponse.json(getHistory(procedureId, limit));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get('x-forwarded-for') || 'unknown');

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      throw new ApiError('MISSING_PARAMS', 400, 'id 필요');
    }
    return NextResponse.json({ deleted: deleteHistoryEntry(id) });
  } catch (error) {
    return errorResponse(error);
  }
}
