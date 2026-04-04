// =============================================
// POV 이탈 근본원인 분석 (Root Cause Analysis)
// 6유형 원인 분류 + HPO 도구/기본수칙 연계 + 개선 권고
// =============================================

import type { PovSopDeviation, DetectedStep, HpoToolResult, FundamentalScore } from './types';

/** RCA 결과 — PovSopDeviation.rootCause 에 저장 */
export interface RootCause {
  category: 'knowledgeGap' | 'attentionLapse' | 'procedureUnclear' | 'hpoMissing' | 'techniqueError' | 'unknown';
  evidence: string;
  remediation: string;
  relatedFundamental?: string;  // 관련 운전원 기본수칙 ID
  relatedHpoTool?: string;     // 관련 HPO 도구 ID
}

/** RCA 카테고리 한국어 레이블 */
export const RCA_LABELS: Record<RootCause['category'], string> = {
  knowledgeGap: '지식 부족',
  attentionLapse: '주의력 부족',
  procedureUnclear: '절차 범위 오해',
  hpoMissing: 'HPO 기법 미적용',
  techniqueError: '기술 미숙',
  unknown: '원인 미확인',
};

/**
 * 이탈 항목에 대해 근본원인을 분석
 *
 * 분석 로직:
 * - SKIP: STAR 기법 미적용 → hpoMissing, 지식 점수 낮음 → knowledgeGap, 기타 → attentionLapse
 * - SWAP: 절차준수 기법 미적용 → hpoMissing, 기타 → knowledgeGap
 * - INSERT: 절차 범위 오해 → procedureUnclear
 * - DELAY: 기술 미숙 → techniqueError
 */
export function analyzeRootCause(
  deviation: PovSopDeviation,
  _allSteps: DetectedStep[],
  hpoResults: HpoToolResult[],
  fundamentals: FundamentalScore[],
): RootCause {
  const { type } = deviation;

  // ── SKIP: 단계 누락 ──────────────────────────
  if (type === 'skip') {
    // STAR 미적용이면 주의력 결핍
    const starResult = hpoResults.find((h) => h.toolId === 'selfCheck');
    if (starResult && !starResult.detected) {
      return {
        category: 'hpoMissing',
        evidence: '자기진단(STAR) 기법 미적용 — 단계 수행 전 멈추기-확인 과정 생략',
        remediation: 'STAR 기법 훈련 강화: 각 단계 전 Stop-Think-Act-Review 습관화',
        relatedHpoTool: 'selfCheck',
      };
    }

    // 지식 점수가 낮으면 지식 부족
    const knowledge = fundamentals.find((f) => f.key === 'knowledge');
    if (knowledge && knowledge.score < 60) {
      return {
        category: 'knowledgeGap',
        evidence: `지식 역량 점수 ${knowledge.score}점 — 해당 절차의 목적/중요성 이해 부족 추정`,
        remediation: '해당 계통의 P&ID 복습 + 절차 목적 교육 수강 권장',
        relatedFundamental: 'knowledge',
      };
    }

    return {
      category: 'attentionLapse',
      evidence: '특정 원인 미확인 — 주의력 부족 또는 절차 익숙도 미흡 가능성',
      remediation: '해당 구간 반복 훈련 + 체크리스트 활용 습관화',
    };
  }

  // ── SWAP: 순서 역전 ──────────────────────────
  if (type === 'swap') {
    const procedureCompliance = hpoResults.find((h) => h.toolId === 'procedureCompliance');
    if (procedureCompliance && !procedureCompliance.detected) {
      return {
        category: 'hpoMissing',
        evidence: '절차준수 기법 미적용 — 절차서를 참조하지 않고 기억에 의존',
        remediation: '절차서 동시참조 훈련: 각 단계 수행 시 절차서에서 해당 단계 확인 후 수행',
        relatedHpoTool: 'procedureCompliance',
      };
    }

    return {
      category: 'knowledgeGap',
      evidence: '단계 순서 혼동 — 절차의 논리적 순서 이해 부족',
      remediation: '절차 순서의 논리적 근거 교육 (왜 이 순서인지?) + 순서 퀴즈',
      relatedFundamental: 'knowledge',
    };
  }

  // ── INSERT: 불필요한 행동 ─────────────────────
  if (type === 'insert') {
    return {
      category: 'procedureUnclear',
      evidence: 'SOP에 없는 행동 수행 — 절차 범위 오해 또는 습관적 행동',
      remediation: '절차 범위 재교육: 절차에 명시된 것만 수행, 임의 추가 행동 금지',
    };
  }

  // ── DELAY: 과도한 지연 ────────────────────────
  if (type === 'delay') {
    return {
      category: 'techniqueError',
      evidence: '단계 간 과도한 지연 — 조작 미숙 또는 불확실성',
      remediation: '해당 장비 조작 실습 강화 + 시뮬레이터 반복 훈련',
      relatedFundamental: 'control',
    };
  }

  // ── 기타: 원인 미확인 ─────────────────────────
  return {
    category: 'unknown',
    evidence: '구체적 원인 분석 불가',
    remediation: '교수자 면담을 통한 추가 확인 필요',
  };
}
