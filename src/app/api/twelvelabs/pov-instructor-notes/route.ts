import { NextRequest, NextResponse } from 'next/server';
import {
  addNote,
  getNotes,
  getFlaggedNotes,
  deleteNote,
  getCalibrationSummary,
} from '@/lib/pov-instructor-notes';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');

  // 캘리브레이션 요약 조회
  if (type === 'calibration') {
    return NextResponse.json(getCalibrationSummary());
  }

  // 플래그된 노트 조회
  if (type === 'flagged') {
    return NextResponse.json(getFlaggedNotes());
  }

  // reportId / stepId 필터 조회
  const reportId = req.nextUrl.searchParams.get('reportId') || undefined;
  const stepId = req.nextUrl.searchParams.get('stepId') || undefined;
  return NextResponse.json(getNotes(reportId, stepId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const note = addNote(body);
  return NextResponse.json(note);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
  return NextResponse.json({ deleted: deleteNote(id) });
}
