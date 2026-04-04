import { NextRequest, NextResponse } from 'next/server';
import { listGoldStandards, registerGoldStandard, deleteGoldStandard } from '@/lib/pov-gold-standard';

export async function GET(req: NextRequest) {
  const procedureId = req.nextUrl.searchParams.get('procedureId') || undefined;
  return NextResponse.json(listGoldStandards(procedureId));
}

export async function POST(req: NextRequest) {
  try {
    const { procedureId, videoId, registeredBy, averageScore, segmentRange } = await req.json();
    if (!procedureId || !videoId) return NextResponse.json({ error: 'procedureId와 videoId 필수' }, { status: 400 });
    const gs = registerGoldStandard(procedureId, videoId, registeredBy || '평가관', averageScore || 0, segmentRange);
    return NextResponse.json(gs);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '등록 실패' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
  return NextResponse.json({ deleted: deleteGoldStandard(id) });
}
