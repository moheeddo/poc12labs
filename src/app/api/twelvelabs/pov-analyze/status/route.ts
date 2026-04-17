import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/pov-analysis-engine';
import { errorResponse, checkRateLimit, ApiError } from '@/lib/api-middleware';

export async function GET(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get('x-forwarded-for') || 'unknown');

    const jobId = req.nextUrl.searchParams.get('jobId');
    if (!jobId) throw new ApiError('MISSING_PARAMS', 400, 'jobId 필요');
    const job = getJob(jobId);
    if (!job) throw new ApiError('NOT_FOUND', 404, '작업을 찾을 수 없습니다');
    return NextResponse.json({
      status: job.status, progress: job.progress, stages: job.stages,
      result: job.status === 'complete' ? job.result : undefined, error: job.error,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
