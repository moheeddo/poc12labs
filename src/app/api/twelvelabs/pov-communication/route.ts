// HPO-21: 음성/의사소통 분석 API 라우트
// POST /api/twelvelabs/pov-communication
// { videoId: string } → CommunicationAnalysis

import { NextRequest, NextResponse } from 'next/server';
import { analyzeCommunication } from '@/lib/pov-communication-analysis';
import { TWELVELABS_INDEXES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const body = await req.json() as { videoId?: string };
  const { videoId } = body;

  if (!videoId) {
    return NextResponse.json({ error: 'videoId 필요' }, { status: 400 });
  }

  try {
    const result = await analyzeCommunication(videoId, TWELVELABS_INDEXES.pov);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '의사소통 분석 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
