// 코호트 분석 API — 전체 훈련생 대상 집계 메트릭 반환
import { NextRequest, NextResponse } from 'next/server';
import { generateCohortMetrics } from '@/lib/pov-cohort-analytics';
import { errorResponse, checkRateLimit } from '@/lib/api-middleware';

export async function GET(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get('x-forwarded-for') || 'unknown');

    const metrics = generateCohortMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    return errorResponse(error);
  }
}
