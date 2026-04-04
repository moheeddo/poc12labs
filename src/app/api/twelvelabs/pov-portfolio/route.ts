// =============================================
// HPO-14: 훈련생 포트폴리오 API 라우트
// GET  ?id=xxx → 특정 훈련생 포트폴리오 요약
// GET         → 전체 훈련생 목록
// POST        → 훈련생 추가
// DELETE ?id=xxx → 훈련생 삭제
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  listTrainees,
  addTrainee,
  deleteTrainee,
  generatePortfolioSummary,
} from '@/lib/pov-trainee-portfolio';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  // 특정 훈련생 포트폴리오 요약 조회
  if (id) {
    const trainees = listTrainees();
    const trainee = trainees.find(t => t.id === id);
    if (!trainee) {
      return NextResponse.json({ error: '훈련생 없음' }, { status: 404 });
    }
    return NextResponse.json(generatePortfolioSummary(trainee));
  }

  // 전체 훈련생 목록 조회
  return NextResponse.json(listTrainees());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, department } = body as { name?: string; department?: string };

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: '이름 필수' }, { status: 400 });
  }

  const trainee = addTrainee(name.trim(), department?.trim());
  return NextResponse.json(trainee, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id 필요' }, { status: 400 });
  }
  const deleted = deleteTrainee(id);
  return NextResponse.json({ deleted });
}
