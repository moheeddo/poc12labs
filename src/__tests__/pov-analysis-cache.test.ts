import { getCachedReport, cacheReport, clearCache } from '@/lib/pov-analysis-cache';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const CACHE_PATH = path.join(process.cwd(), 'data', 'analysis-cache.json');

beforeEach(() => {
  const dir = path.dirname(CACHE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CACHE_PATH, '[]', 'utf-8');
});

describe('분석 캐시', () => {
  const mockReport = {
    id: 'test-report',
    procedureId: 'appendix-1',
    procedureTitle: '테스트',
    videoId: 'vid-1',
    date: '2026-04-05',
    stepEvaluations: [],
    procedureComplianceScore: 80,
    hpoEvaluations: [],
    hpoOverallScore: 70,
    fundamentalScores: [],
    overallScore: 75,
    grade: 'B',
    deviations: [],
    strengths: [],
    improvements: [],
    summary: '테스트',
  } as any;

  it('캐시 미스 시 null 반환', () => {
    expect(getCachedReport('vid-1', 'appendix-1')).toBeNull();
  });

  it('캐시 저장 후 조회 성공', () => {
    cacheReport('vid-1', 'appendix-1', mockReport, '1.0.0');
    const cached = getCachedReport('vid-1', 'appendix-1');
    expect(cached).not.toBeNull();
    expect(cached!.id).toBe('test-report');
  });

  it('다른 키는 캐시 미스', () => {
    cacheReport('vid-1', 'appendix-1', mockReport, '1.0.0');
    expect(getCachedReport('vid-1', 'appendix-2')).toBeNull();
    expect(getCachedReport('vid-2', 'appendix-1')).toBeNull();
  });

  it('clearCache로 전체 삭제', () => {
    cacheReport('vid-1', 'appendix-1', mockReport, '1.0.0');
    clearCache();
    expect(getCachedReport('vid-1', 'appendix-1')).toBeNull();
  });

  it('clearCache(videoId)로 특정 영상만 삭제', () => {
    cacheReport('vid-1', 'appendix-1', mockReport, '1.0.0');
    cacheReport('vid-2', 'appendix-1', { ...mockReport, id: 'r2' }, '1.0.0');
    clearCache('vid-1');
    expect(getCachedReport('vid-1', 'appendix-1')).toBeNull();
    expect(getCachedReport('vid-2', 'appendix-1')).not.toBeNull();
  });
});
