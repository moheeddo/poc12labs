// 코호트 분석 API — 전체 훈련생 대상 집계 메트릭 반환
import { NextResponse } from 'next/server';
import { generateCohortMetrics } from '@/lib/pov-cohort-analytics';

export async function GET() {
  try {
    const metrics = generateCohortMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : '코호트 분석 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
