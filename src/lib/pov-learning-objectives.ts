// =============================================
// HPO-8: 학습목표 매트릭스 — 절차↔역량↔HPO 매핑 + 달성도
// 표준지침-3035-01 및 표준운영-2035A 기반 자동 생성
// =============================================

import type { Procedure } from './pov-standards';

/** 개별 학습목표 */
export interface LearningObjective {
  id: string;
  description: string;          // 한국어 목표 기술
  fundamentals: string[];       // 관련 기본수칙 key
  hpoTools: string[];           // 관련 HPO 도구 key
  assessmentCriteria: string;   // 달성 판단 기준
}

/**
 * 절차 정의로부터 학습목표 자동 생성 (최대 5종)
 * 1. 절차 준수 — 항상
 * 2. 밸브 조작 — 밸브 단계 있을 때
 * 3. 안전 확인 — critical step 있을 때
 * 4. HPO 기법 적용 — 항상
 * 5. 감시 — 계기 확인 단계 있을 때
 */
export function generateLearningObjectives(procedure: Procedure): LearningObjective[] {
  const objectives: LearningObjective[] = [];

  // 1. 절차 준수 목표 (항상 포함)
  objectives.push({
    id: `${procedure.id}-compliance`,
    description: `${procedure.title} 절차를 SOP 순서대로 정확히 수행할 수 있다`,
    fundamentals: ['control', 'knowledge'],
    hpoTools: ['procedureCompliance', 'selfCheck'],
    assessmentCriteria: '절차 준수 점수 70% 이상, 핵심 단계 전부 통과',
  });

  // 2. 밸브 조작 목표 — VG/VL 장비 단계가 있을 때
  const hasValves = procedure.sections.some((s) =>
    s.steps.some(
      (st) =>
        st.equipment?.startsWith('VG') ||
        st.equipment?.startsWith('VL') ||
        st.equipment?.startsWith('SOL'),
    ),
  );
  if (hasValves) {
    objectives.push({
      id: `${procedure.id}-valve-ops`,
      description: '밸브 기기번호를 정확히 식별하고, 올바른 방향으로 조작할 수 있다',
      fundamentals: ['control', 'knowledge'],
      hpoTools: ['verificationTechnique', 'selfCheck'],
      assessmentCriteria: '밸브 조작 단계 pass율 80% 이상',
    });
  }

  // 3. 안전 확인 목표 — isCritical 단계가 존재할 때
  const hasCritical = procedure.sections.some((s) =>
    s.steps.some((st) => st.isCritical),
  );
  if (hasCritical) {
    objectives.push({
      id: `${procedure.id}-safety`,
      description: '핵심 안전 단계에서 이중확인(현장+제어실)을 수행할 수 있다',
      fundamentals: ['conservativeBias', 'monitor'],
      hpoTools: ['peerCheck', 'verificationTechnique'],
      assessmentCriteria: '핵심 단계 전수 통과, 이중확인 증거 검출',
    });
  }

  // 4. HPO 기법 적용 목표 (항상 포함)
  objectives.push({
    id: `${procedure.id}-hpo`,
    description: '인적오류 예방기법(STAR, 동료점검 등)을 절차 수행 중 적용할 수 있다',
    fundamentals: ['teamwork'],
    hpoTools: ['selfCheck', 'communication', 'peerCheck'],
    assessmentCriteria: 'HPO 기본 4종 전부 검출, 조건부 최소 2종 적용',
  });

  // 5. 감시 목표 — 계기 확인 단계(PI/LI/TI, kgf/범위 키워드) 있을 때
  const hasInstruments = procedure.sections.some((s) =>
    s.steps.some(
      (st) =>
        st.equipment?.startsWith('PI') ||
        st.equipment?.startsWith('LI') ||
        st.equipment?.startsWith('TI') ||
        st.expectedState?.includes('kgf') ||
        st.expectedState?.includes('범위') ||
        st.equipment?.startsWith('저장탱크'),
    ),
  );
  if (hasInstruments) {
    objectives.push({
      id: `${procedure.id}-monitoring`,
      description: '계기 판독값을 정상 범위와 비교하여 정확히 확인할 수 있다',
      fundamentals: ['monitor'],
      hpoTools: ['situationAwareness'],
      assessmentCriteria: '계기 확인 단계 pass율 90% 이상',
    });
  }

  return objectives;
}

/** 학습목표 달성도 평가 결과 */
export interface ObjectiveAssessment {
  objective: LearningObjective;
  achieved: boolean;
  score: number;    // 0-100
  detail: string;
}

/**
 * 리포트 결과를 기반으로 각 학습목표 달성 여부 평가
 * @param objectives generateLearningObjectives() 결과
 * @param procedureScore 절차 준수 점수 (0-100)
 * @param hpoResults HPO 도구별 탐지 결과
 * @param stepEvaluations 단계별 평가 결과
 */
export function assessObjectiveAchievement(
  objectives: LearningObjective[],
  procedureScore: number,
  hpoResults: { toolId: string; detected: boolean }[],
  stepEvaluations: { status: string; isCritical?: boolean }[],
): ObjectiveAssessment[] {
  return objectives.map((obj) => {
    let achieved = false;
    let score = 0;
    let detail = '';

    if (obj.id.endsWith('-compliance')) {
      // 절차 준수: 절차 점수 직접 사용
      achieved = procedureScore >= 70;
      score = procedureScore;
      detail = `절차 준수 ${procedureScore}점`;
    } else if (obj.id.endsWith('-valve-ops')) {
      // 밸브 조작: 절차 점수 프록시
      score = procedureScore;
      achieved = procedureScore >= 80;
      detail = `밸브 조작 기반 점수 ${score}점`;
    } else if (obj.id.endsWith('-safety')) {
      // 안전 확인: 핵심 단계 전수 통과 여부
      const criticalSteps = stepEvaluations.filter((s) => s.isCritical);
      const criticalPassed = criticalSteps.filter((s) => s.status === 'pass').length;
      score =
        criticalSteps.length > 0
          ? Math.round((criticalPassed / criticalSteps.length) * 100)
          : 100;
      achieved = score === 100;
      detail = `핵심단계 ${criticalPassed}/${criticalSteps.length} 통과`;
    } else if (obj.id.endsWith('-hpo')) {
      // HPO 기법: 목표 도구 검출 비율
      const targetTools = obj.hpoTools;
      const detectedCount = targetTools.filter((t) =>
        hpoResults.some((r) => r.toolId === t && r.detected),
      ).length;
      score = Math.round((detectedCount / Math.max(targetTools.length, 1)) * 100);
      achieved = score >= 75;
      detail = `관련 HPO ${detectedCount}/${targetTools.length} 적용`;
    } else if (obj.id.endsWith('-monitoring')) {
      // 감시: 절차 점수 프록시 (계기 단계 식별 어려워 근사치 사용)
      score = procedureScore;
      achieved = procedureScore >= 90;
      detail = `감시 관련 점수 ${score}점`;
    }

    return { objective: obj, achieved, score, detail };
  });
}

/** 기본수칙 key → 한국어 약칭 매핑 */
export const FUNDAMENTAL_SHORT: Record<string, string> = {
  monitor: '감시',
  control: '제어',
  conservativeBias: '보수판단',
  teamwork: '팀워크',
  knowledge: '지식',
};

/** HPO 도구 key → 한국어 약칭 매핑 */
export const HPO_TOOL_SHORT: Record<string, string> = {
  situationAwareness: '상황인식',
  selfCheck: '자기진단',
  communication: '의사소통',
  procedureCompliance: '절차준수',
  preJobBriefing: '작업전회의',
  verificationTechnique: '확인기법',
  peerCheck: '동료점검',
  labeling: '인식표',
  stepMarkup: '단계표시',
  turnover: '인수인계',
  postJobReview: '작업후평가',
};
