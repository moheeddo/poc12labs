// =============================================
// POST /api/twelvelabs/pov-schedule
// 평가 일정 CRUD API 라우트
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  listSchedule,
  addSchedule,
  updateScheduleStatus,
  deleteScheduleEntry,
  getWeekSummary,
} from '@/lib/pov-schedule';

/** GET: 일정 조회 또는 이번 주 요약 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');

  // 이번 주 요약 반환
  if (type === 'week') {
    return NextResponse.json(getWeekSummary());
  }

  // 필터 기반 목록 반환
  const traineeName = req.nextUrl.searchParams.get('traineeName') || undefined;
  const procedureId = req.nextUrl.searchParams.get('procedureId') || undefined;
  const status = req.nextUrl.searchParams.get('status') || undefined;
  const fromDate = req.nextUrl.searchParams.get('fromDate') || undefined;
  const toDate = req.nextUrl.searchParams.get('toDate') || undefined;

  return NextResponse.json(listSchedule({ traineeName, procedureId, status, fromDate, toDate }));
}

/** POST: 새 일정 등록 또는 상태 업데이트 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 상태 업데이트 액션
    if (body.action === 'updateStatus') {
      if (!body.id || !body.status) {
        return NextResponse.json({ error: 'id, status 필드 필요' }, { status: 400 });
      }
      return NextResponse.json({ updated: updateScheduleStatus(body.id, body.status) });
    }

    // 새 일정 등록 — 필수 필드 검증
    if (!body.traineeName || !body.procedureId || !body.procedureTitle || !body.scheduledDate || !body.type) {
      return NextResponse.json({ error: '필수 필드 누락: traineeName, procedureId, procedureTitle, scheduledDate, type' }, { status: 400 });
    }

    const entry = addSchedule({
      traineeName: body.traineeName,
      procedureId: body.procedureId,
      procedureTitle: body.procedureTitle,
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      type: body.type,
      notes: body.notes,
      previousReportId: body.previousReportId,
    });

    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: '요청 처리 실패' }, { status: 500 });
  }
}

/** DELETE: 일정 삭제 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id 파라미터 필요' }, { status: 400 });
  }
  return NextResponse.json({ deleted: deleteScheduleEntry(id) });
}
