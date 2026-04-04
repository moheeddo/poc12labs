// =============================================
// POV 분석 캐시 관리 API
// GET  ?videoId=...&procedureId=... → 캐시 조회
// DELETE ?videoId=...               → 캐시 삭제 (videoId 미지정 시 전체)
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { getCachedReport, clearCache } from '@/lib/pov-analysis-cache';

/** 캐시 조회 */
export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId') || '';
  const procedureId = req.nextUrl.searchParams.get('procedureId') || '';

  if (!videoId || !procedureId) {
    return NextResponse.json({ cached: false });
  }

  const report = getCachedReport(videoId, procedureId);
  return NextResponse.json({ cached: !!report, report });
}

/** 캐시 삭제 */
export async function DELETE(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');
  const cleared = clearCache(videoId || undefined);
  return NextResponse.json({ cleared });
}
