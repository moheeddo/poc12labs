// HPO-21: 음성/의사소통 분석 API 라우트
// POST /api/twelvelabs/pov-communication
// { videoId: string } → CommunicationAnalysis

import { NextRequest, NextResponse } from 'next/server';
import { analyzeCommunication } from '@/lib/pov-communication-analysis';
import { TWELVELABS_INDEXES } from '@/lib/constants';
import { requireApiKey, errorResponse, checkRateLimit, ApiError } from '@/lib/api-middleware';

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get('x-forwarded-for') || 'unknown');
    requireApiKey();

    const body = await req.json() as { videoId?: string };
    const { videoId } = body;

    if (!videoId) {
      throw new ApiError('MISSING_PARAMS', 400, 'videoId 필요');
    }

    const result = await analyzeCommunication(videoId, TWELVELABS_INDEXES.pov);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
