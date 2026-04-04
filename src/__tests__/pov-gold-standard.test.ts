import {
  listGoldStandards, registerGoldStandard, deleteGoldStandard,
  getBestGoldStandard, suggestGoldStandardCandidate,
} from '@/lib/pov-gold-standard';
import { writeFileSync } from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'gold-standards.json');

beforeEach(() => {
  writeFileSync(DATA_PATH, '[]', 'utf-8');
});

describe('골드스탠다드 관리', () => {
  it('등록 후 조회', () => {
    const gs = registerGoldStandard('appendix-1', 'vid-1', '평가관', 90);
    expect(gs.id).toMatch(/^gs-/);
    const list = listGoldStandards('appendix-1');
    expect(list).toHaveLength(1);
  });

  it('getBestGoldStandard — 최고 점수 반환', () => {
    registerGoldStandard('appendix-1', 'vid-1', '평가관', 85);
    registerGoldStandard('appendix-1', 'vid-2', '평가관', 95);
    registerGoldStandard('appendix-1', 'vid-3', '평가관', 88);
    const best = getBestGoldStandard('appendix-1');
    expect(best?.averageScore).toBe(95);
  });

  it('suggestGoldStandardCandidate — 85미만 거부', () => {
    const result = suggestGoldStandardCandidate('appendix-1', 'vid-1', 70);
    expect(result.eligible).toBe(false);
  });

  it('suggestGoldStandardCandidate — 이미 등록된 영상 거부', () => {
    registerGoldStandard('appendix-1', 'vid-1', '평가관', 90);
    const result = suggestGoldStandardCandidate('appendix-1', 'vid-1', 92);
    expect(result.eligible).toBe(false);
  });

  it('suggestGoldStandardCandidate — 최고 점수 추천', () => {
    const result = suggestGoldStandardCandidate('appendix-1', 'vid-1', 95);
    expect(result.eligible).toBe(true);
  });

  it('삭제 후 목록에서 제거', () => {
    const gs = registerGoldStandard('appendix-1', 'vid-1', '평가관', 90);
    deleteGoldStandard(gs.id);
    expect(listGoldStandards('appendix-1')).toHaveLength(0);
  });
});
