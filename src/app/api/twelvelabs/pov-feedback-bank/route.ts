// HPO-16: 피드백 뱅크 API 라우트
// GET  /api/twelvelabs/pov-feedback-bank?category=strength
// POST /api/twelvelabs/pov-feedback-bank  { action: 'use', id: '...' }  또는 신규 템플릿 바디
// DELETE /api/twelvelabs/pov-feedback-bank?id=fb-1

import { NextRequest, NextResponse } from 'next/server';
import {
  listTemplates,
  addTemplate,
  useTemplate,
  deleteTemplate,
  initializeBank,
} from '@/lib/pov-feedback-bank';

export async function GET(req: NextRequest) {
  initializeBank();
  const category = req.nextUrl.searchParams.get('category') || undefined;
  return NextResponse.json(listTemplates(category));
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 사용 카운트 증가
  if (body.action === 'use') {
    const result = useTemplate(body.id);
    if (!result) {
      return NextResponse.json({ error: '템플릿 없음' }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  // 신규 템플릿 추가
  const { action: _action, ...templateData } = body;
  const tmpl = addTemplate(templateData);
  return NextResponse.json(tmpl);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id 파라미터 필요' }, { status: 400 });
  }
  return NextResponse.json({ deleted: deleteTemplate(id) });
}
