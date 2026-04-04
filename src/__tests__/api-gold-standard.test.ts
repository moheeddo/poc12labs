/**
 * 골드스탠다드 API 통합 테스트
 * 실제 route handler를 직접 호출하여 CRUD 동작 검증
 */
import { GET, POST, DELETE } from '@/app/api/twelvelabs/gold-standard/route';
import { NextRequest } from 'next/server';
import { writeFileSync } from 'fs';
import path from 'path';

// 테스트 전 캐시 초기화
const DATA_PATH = path.join(process.cwd(), 'data', 'gold-standards.json');

beforeEach(() => {
  writeFileSync(DATA_PATH, '[]', 'utf-8');
});

describe('Gold Standard API', () => {
  it('GET — 빈 목록 반환', async () => {
    const req = new NextRequest('http://localhost/api/twelvelabs/gold-standard');
    const res = await GET(req);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it('POST — 등록 성공', async () => {
    const req = new NextRequest('http://localhost/api/twelvelabs/gold-standard', {
      method: 'POST',
      body: JSON.stringify({ procedureId: 'appendix-1', videoId: 'test-vid', averageScore: 90 }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.id).toMatch(/^gs-/);
    expect(data.procedureId).toBe('appendix-1');
    expect(data.averageScore).toBe(90);
  });

  it('POST → GET → DELETE 전체 흐름', async () => {
    // 등록
    const postReq = new NextRequest('http://localhost/api/twelvelabs/gold-standard', {
      method: 'POST',
      body: JSON.stringify({ procedureId: 'appendix-2', videoId: 'vid-2', averageScore: 85 }),
    });
    const postRes = await POST(postReq);
    const created = await postRes.json();

    // 조회
    const getReq = new NextRequest(`http://localhost/api/twelvelabs/gold-standard?procedureId=appendix-2`);
    const getRes = await GET(getReq);
    const list = await getRes.json();
    expect(list).toHaveLength(1);

    // 삭제
    const delReq = new NextRequest(`http://localhost/api/twelvelabs/gold-standard?id=${created.id}`, { method: 'DELETE' });
    const delRes = await DELETE(delReq);
    const delData = await delRes.json();
    expect(delData.deleted).toBe(true);

    // 삭제 확인
    const getReq2 = new NextRequest('http://localhost/api/twelvelabs/gold-standard');
    const getRes2 = await GET(getReq2);
    const list2 = await getRes2.json();
    expect(list2).toHaveLength(0);
  });

  it('POST — 필수 필드 누락 시 400', async () => {
    const req = new NextRequest('http://localhost/api/twelvelabs/gold-standard', {
      method: 'POST',
      body: JSON.stringify({ procedureId: 'appendix-1' }), // videoId 누락
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
