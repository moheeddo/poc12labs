import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/pov-analysis-engine';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId 필요' }, { status: 400 });
  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: '작업을 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json({
    status: job.status, progress: job.progress, stages: job.stages,
    result: job.status === 'complete' ? job.result : undefined, error: job.error,
  });
}
