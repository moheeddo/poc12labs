// POV 분석 점수 추이 API
import { NextRequest, NextResponse } from 'next/server';
import { getScoreTrend } from '@/lib/pov-analysis-history';

export async function GET(req: NextRequest) {
  const procedureId = req.nextUrl.searchParams.get('procedureId');
  if (!procedureId) {
    return NextResponse.json({ error: 'procedureId 필요' }, { status: 400 });
  }
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
  return NextResponse.json(getScoreTrend(procedureId, limit));
}
