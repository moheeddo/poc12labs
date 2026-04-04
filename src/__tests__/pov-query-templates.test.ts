import { getQueryTemplates, getHpoQueries } from '@/lib/pov-query-templates';

describe('getQueryTemplates', () => {
  it('appendix-1 절차의 쿼리 템플릿 반환', () => {
    const templates = getQueryTemplates('appendix-1');
    expect(templates.length).toBeGreaterThan(0);
    templates.forEach(t => {
      expect(t.stepId).toBeTruthy();
      expect(t.sopText).toBeTruthy();
      expect(t.actionQuery).toBeTruthy();
      expect(t.objectQuery).toBeTruthy();
      expect(t.stateQuery).toBeTruthy();
      expect(t.actionQuery).toMatch(/[a-zA-Z]/);
    });
  });

  it('존재하지 않는 절차는 빈 배열 반환', () => {
    const templates = getQueryTemplates('nonexistent');
    expect(templates).toEqual([]);
  });

  it('모든 절차에 대해 쿼리 생성 가능', () => {
    const procedureIds = [
      'appendix-1', 'appendix-2', 'appendix-3', 'appendix-4',
      'appendix-5', 'appendix-6', 'appendix-7', 'appendix-8',
    ];
    procedureIds.forEach(id => {
      const templates = getQueryTemplates(id);
      expect(templates.length).toBeGreaterThan(0);
    });
  });
});

describe('getHpoQueries', () => {
  it('11개 HPO 도구에 대한 검색 쿼리 반환', () => {
    const queries = getHpoQueries();
    expect(queries.length).toBe(11);
    queries.forEach(q => {
      expect(q.toolId).toBeTruthy();
      expect(q.searchQuery).toBeTruthy();
      expect(q.searchQuery).toMatch(/[a-zA-Z]/);
      expect(['fundamental', 'conditional']).toContain(q.category);
    });
  });
});
