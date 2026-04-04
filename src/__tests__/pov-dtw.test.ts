// src/__tests__/pov-dtw.test.ts
import { alignSequences, detectDeviations } from '@/lib/pov-dtw';

describe('alignSequences', () => {
  it('동일한 시퀀스는 완벽한 정렬', () => {
    const sop = ['1.1', '1.2', '1.3', '2.1', '2.2'];
    const detected = ['1.1', '1.2', '1.3', '2.1', '2.2'];
    const result = alignSequences(sop, detected, new Set());
    expect(result.complianceScore).toBe(100);
    expect(result.deviations).toHaveLength(0);
    expect(result.criticalDeviations).toBe(0);
  });

  it('누락된 단계를 SKIP으로 탐지', () => {
    const sop = ['1.1', '1.2', '1.3', '2.1', '2.2'];
    const detected = ['1.1', '1.3', '2.1', '2.2'];
    const result = alignSequences(sop, detected, new Set());
    const skips = result.deviations.filter(d => d.type === 'skip');
    expect(skips).toHaveLength(1);
    expect(skips[0].stepIds).toContain('1.2');
  });

  it('순서 역전을 SWAP으로 탐지', () => {
    const sop = ['1.1', '1.2', '1.3'];
    const detected = ['1.1', '1.3', '1.2'];
    const result = alignSequences(sop, detected, new Set());
    const swaps = result.deviations.filter(d => d.type === 'swap');
    expect(swaps).toHaveLength(1);
    expect(swaps[0].stepIds).toEqual(expect.arrayContaining(['1.2', '1.3']));
  });

  it('추가 행동을 INSERT로 탐지', () => {
    const sop = ['1.1', '1.2', '1.3'];
    const detected = ['1.1', '1.2', 'X.1', '1.3'];
    const result = alignSequences(sop, detected, new Set());
    const inserts = result.deviations.filter(d => d.type === 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].stepIds).toContain('X.1');
  });

  it('핵심 단계 누락은 critical severity', () => {
    const sop = ['1.1', '1.2', '1.3'];
    const detected = ['1.1', '1.3'];
    const criticalSteps = new Set(['1.2']);
    const result = alignSequences(sop, detected, criticalSteps);
    const skips = result.deviations.filter(d => d.type === 'skip');
    expect(skips[0].severity).toBe('critical');
    expect(result.criticalDeviations).toBe(1);
  });

  it('빈 검출 시퀀스는 모든 단계 SKIP', () => {
    const sop = ['1.1', '1.2', '1.3'];
    const detected: string[] = [];
    const result = alignSequences(sop, detected, new Set());
    expect(result.complianceScore).toBe(0);
    expect(result.deviations.filter(d => d.type === 'skip')).toHaveLength(3);
  });
});

describe('detectDeviations', () => {
  it('복합 이탈: SKIP + SWAP 동시 발생', () => {
    const sop = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'];
    const detected = ['1.1', '1.3', '2.2', '2.1', '2.3'];
    const result = alignSequences(sop, detected, new Set());
    const types = result.deviations.map(d => d.type);
    expect(types).toContain('skip');
    expect(types).toContain('swap');
  });
});
