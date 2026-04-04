// POV 교육과정 효과 벤치마킹 API
// GET /api/twelvelabs/pov-benchmark
import { NextResponse } from 'next/server';
import { generateBenchmark } from '@/lib/pov-benchmark';

export async function GET() {
  try {
    const result = generateBenchmark();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '벤치마킹 데이터 생성 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
