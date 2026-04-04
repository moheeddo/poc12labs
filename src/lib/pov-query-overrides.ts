// =============================================
// POV 쿼리 오버라이드 유틸리티
// 클라이언트 전용 — localStorage 기반 쿼리 오버라이드 관리
// =============================================

import type { StepQueryTemplate } from './types';

const STORAGE_KEY = 'pov-query-overrides';

/** localStorage에서 모든 오버라이드 조회 */
export function getOverrides(): Record<string, Partial<StepQueryTemplate>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 특정 stepId에 오버라이드 저장 */
export function setOverride(stepId: string, override: Partial<StepQueryTemplate>): void {
  const overrides = getOverrides();
  overrides[stepId] = { ...overrides[stepId], ...override };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

/** 특정 stepId의 오버라이드 제거 (기본값 복원) */
export function removeOverride(stepId: string): void {
  const overrides = getOverrides();
  delete overrides[stepId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

/** 템플릿 배열에 오버라이드를 적용하여 반환 (stepId, sopText는 변경 불가) */
export function applyOverrides(templates: StepQueryTemplate[]): StepQueryTemplate[] {
  const overrides = getOverrides();
  return templates.map(t => {
    const override = overrides[t.stepId];
    if (!override) return t;
    // stepId와 sopText는 오버라이드 대상에서 제외
    return {
      ...t,
      actionQuery: override.actionQuery ?? t.actionQuery,
      objectQuery: override.objectQuery ?? t.objectQuery,
      stateQuery: override.stateQuery ?? t.stateQuery,
    };
  });
}

/** 현재 오버라이드 수 반환 */
export function getOverrideCount(): number {
  return Object.keys(getOverrides()).length;
}
