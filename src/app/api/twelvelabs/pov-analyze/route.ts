import { NextRequest, NextResponse } from 'next/server';
import { startAnalysis } from '@/lib/pov-analysis-engine';

export async function POST(req: NextRequest) {
  try {
    const { videoId, procedureId, goldStandardId } = await req.json();
    if (!videoId || !procedureId) {
      return NextResponse.json({ error: 'videoId와 procedureId는 필수입니다' }, { status: 400 });
    }
    const jobId = await startAnalysis(videoId, procedureId, goldStandardId);
    return NextResponse.json({ jobId, status: 'analyzing' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '분석 시작 실패' }, { status: 500 }
    );
  }
}
