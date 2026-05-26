import { NextRequest, NextResponse } from 'next/server';
import { startAnalysis } from '@/lib/pov-analysis-engine';
import { requireApiKey, errorResponse, checkRateLimit, ApiError } from '@/lib/api-middleware';

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get('x-forwarded-for') || 'unknown');
    requireApiKey();

    const { videoId, procedureId, goldStandardId } = await req.json();
    if (!videoId || !procedureId) {
      throw new ApiError('MISSING_PARAMS', 400, 'videoId와 procedureId는 필수입니다');
    }
    const jobId = await startAnalysis(videoId, procedureId, goldStandardId);
    return NextResponse.json({ jobId, status: 'analyzing' });
  } catch (error) {
    return errorResponse(error);
  }
}
