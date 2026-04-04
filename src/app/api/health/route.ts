// =============================================
// /api/health — API 헬스체크 엔드포인트
// TwelveLabs 연결 상태 + 데모 모드 판정 반환
// =============================================

import { NextResponse } from 'next/server';
import { checkApiHealth } from '@/lib/api-health';

export async function GET() {
  const health = await checkApiHealth();
  return NextResponse.json(health);
}
