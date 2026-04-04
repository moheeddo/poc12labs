// =============================================
// HPO-7: 역량 기반 진행 모델 — 4단계 숙달 + 훈련 처방 자동 생성
// 표준지침-3035-01 7.1절 운전원 기본수칙 5대 역량 기반
// =============================================

import type { FundamentalScore } from './types';

/** 4단계 숙달 수준 (Dreyfus 모델 기반) */
export type MasteryLevel = 0 | 1 | 2 | 3;

export const MASTERY_LABELS: Record<
  MasteryLevel,
  { label: string; description: string; color: string; minScore: number }
> = {
  0: { label: '초보', description: '기본 개념 이해 단계, 지도하에 수행', color: '#ef4444', minScore: 0 },
  1: { label: '발전', description: '기본 수행 가능, 간헐적 오류 발생', color: '#f59e0b', minScore: 40 },
  2: { label: '숙련', description: '안정적 수행, 자기진단 가능', color: '#3b82f6', minScore: 70 },
  3: { label: '전문가', description: '완벽 수행, 타인 지도 가능', color: '#10b981', minScore: 90 },
};

/** 역량별 숙달 상태 */
export interface CompetencyMastery {
  competencyId: string;   // OPERATOR_FUNDAMENTALS key
  competencyName: string;
  currentLevel: MasteryLevel;
  currentScore: number;
  nextLevel: MasteryLevel | null;
  targetScore: number;
  gap: number;              // targetScore - currentScore
  suggestedPractice: string[];
}

/** 훈련 처방 전체 */
export interface TrainingPrescription {
  traineeSummary: string;
  overallLevel: MasteryLevel;
  competencies: CompetencyMastery[];
  nextRecommendedProcedure: string | null;
  prerequisitesMet: boolean;
  prescriptionSteps: PrescriptionStep[];
}

/** 단계별 처방 항목 */
export interface PrescriptionStep {
  order: number;
  type: 'review' | 'practice' | 'assessment' | 'advancement';
  description: string;
  targetCompetency?: string;
  estimatedDuration?: string;
}

/** 점수 → 숙달 수준 변환 */
export function scoreToLevel(score: number): MasteryLevel {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  if (score >= 40) return 1;
  return 0;
}

/** 역량별 추천 연습 항목 (숙달 수준별) */
function getSuggestedPractice(competencyId: string, level: MasteryLevel): string[] {
  const practices: Record<string, Record<number, string[]>> = {
    monitor: {
      0: ['계기판 판독 기초 교육', '정상/비정상 범위 암기 훈련'],
      1: ['감시 주기 패턴 훈련', '다중 파라미터 동시 감시 실습'],
      2: ['비정상 상황 조기 감지 시나리오', '트렌드 분석 훈련'],
      3: ['신입 운전원 감시 지도 실습'],
    },
    control: {
      0: ['밸브 조작 기초 실습', '장비 식별 훈련'],
      1: ['정밀 조작 반복 훈련', 'STAR 기법 적용 실습'],
      2: ['복잡 조작 시퀀스 훈련', '비상 조작 시뮬레이션'],
      3: ['조작 표준 개선 제안 활동'],
    },
    conservativeBias: {
      0: ['보수적 의사결정 사례 학습', '안전 우선 원칙 교육'],
      1: ['불확실 상황 대응 시나리오', '"확신 없으면 멈추기" 훈련'],
      2: ['리스크 평가 프레임워크 실습', '과거 사고 사례 분석'],
      3: ['안전문화 리더십 훈련'],
    },
    teamwork: {
      0: ['의사소통 기초(3-way communication)', '보고 절차 교육'],
      1: ['팀 브리핑/디브리핑 실습', '상호 확인 기법 훈련'],
      2: ['리더-팔로워 역할 전환 실습', '스트레스 상황 소통 훈련'],
      3: ['팀 코칭 기법 교육'],
    },
    knowledge: {
      0: ['계통 P&ID 기초 학습', '절차서 구조 이해'],
      1: ['계통 간 상호작용 학습', '절차 논리적 근거 이해'],
      2: ['비정상 절차 연계 학습', '사고 진행 시나리오 분석'],
      3: ['절차 개선 검토 활동', '신규 절차 작성 참여'],
    },
  };
  return practices[competencyId]?.[level] ?? ['추가 훈련 필요'];
}

/** 절차별 선행 역량 요구사항 */
export const PROCEDURE_PREREQUISITES: Record<
  string,
  { competencyId: string; minLevel: MasteryLevel }[]
> = {
  'appendix-1': [
    { competencyId: 'control', minLevel: 1 },
    { competencyId: 'knowledge', minLevel: 1 },
  ],
  'appendix-2': [
    { competencyId: 'control', minLevel: 1 },
    { competencyId: 'knowledge', minLevel: 1 },
  ],
  'appendix-3': [
    { competencyId: 'control', minLevel: 1 },
    { competencyId: 'monitor', minLevel: 1 },
  ],
  'appendix-4': [
    { competencyId: 'control', minLevel: 1 },
    { competencyId: 'monitor', minLevel: 1 },
  ],
  'appendix-5': [
    { competencyId: 'control', minLevel: 2 },
    { competencyId: 'knowledge', minLevel: 2 },
  ],
  'appendix-6': [
    { competencyId: 'control', minLevel: 2 },
    { competencyId: 'knowledge', minLevel: 2 },
  ],
  'appendix-7': [
    { competencyId: 'control', minLevel: 2 },
    { competencyId: 'teamwork', minLevel: 2 },
    { competencyId: 'knowledge', minLevel: 2 },
  ],
  'appendix-8': [
    { competencyId: 'control', minLevel: 2 },
    { competencyId: 'teamwork', minLevel: 2 },
    { competencyId: 'knowledge', minLevel: 2 },
  ],
};

/**
 * 기본수칙 점수 배열로부터 역량별 숙달 상태 계산
 * FundamentalScore.key → competencyId 로 매핑
 */
export function assessCompetencyMastery(fundamentals: FundamentalScore[]): CompetencyMastery[] {
  return fundamentals.map((f) => {
    const level = scoreToLevel(f.score);
    const nextLevel: MasteryLevel | null = level < 3 ? ((level + 1) as MasteryLevel) : null;
    const targetScore =
      nextLevel !== null ? MASTERY_LABELS[nextLevel].minScore : 100;

    return {
      competencyId: f.key,
      competencyName: f.label,
      currentLevel: level,
      currentScore: f.score,
      nextLevel,
      targetScore,
      gap: Math.max(0, targetScore - f.score),
      suggestedPractice: getSuggestedPractice(f.key, level),
    };
  });
}

/**
 * 훈련 처방 생성
 * @param fundamentals 기본수칙 점수 배열
 * @param currentProcedureId 현재 수행한 절차 ID
 * @param overallScore 종합 점수 (0-100)
 */
export function generatePrescription(
  fundamentals: FundamentalScore[],
  currentProcedureId: string,
  overallScore: number,
): TrainingPrescription {
  const competencies = assessCompetencyMastery(fundamentals);
  const overallLevel = scoreToLevel(overallScore);

  // 점수 낮은 순으로 정렬
  const weakest = [...competencies].sort((a, b) => a.currentScore - b.currentScore);

  // 다음 추천 절차 결정
  const procedures = [
    'appendix-1', 'appendix-2', 'appendix-3', 'appendix-4',
    'appendix-5', 'appendix-6', 'appendix-7', 'appendix-8',
  ];
  const currentIdx = procedures.indexOf(currentProcedureId);
  let nextProcedure: string | null = null;
  let prerequisitesMet = true;

  if (currentIdx >= 0 && currentIdx < procedures.length - 1) {
    const nextId = procedures[currentIdx + 1];
    const prereqs = PROCEDURE_PREREQUISITES[nextId] ?? [];
    prerequisitesMet = prereqs.every((p) => {
      const comp = competencies.find((c) => c.competencyId === p.competencyId);
      return comp ? comp.currentLevel >= p.minLevel : false;
    });
    nextProcedure = nextId;
  }

  // 처방 단계 생성
  const steps: PrescriptionStep[] = [];
  let order = 1;

  // 가장 약한 역량 상위 3개 우선 처방
  for (const comp of weakest.slice(0, 3)) {
    if (comp.gap > 0) {
      steps.push({
        order: order++,
        type: 'review',
        description: `${comp.competencyName} 역량 보강: ${comp.suggestedPractice[0]}`,
        targetCompetency: comp.competencyId,
        estimatedDuration: comp.gap > 30 ? '2시간' : '1시간',
      });
    }
  }

  // 현재 절차 재실습 (85점 미만 시)
  if (overallScore < 85) {
    steps.push({
      order: order++,
      type: 'practice',
      description: `현재 절차 재실습 — 목표: ${Math.min(overallScore + 15, 100)}점 이상`,
      estimatedDuration: '실습 1회 (약 30분)',
    });
  }

  // 재평가
  steps.push({
    order: order++,
    type: 'assessment',
    description: overallScore >= 85 ? '숙달 확인 평가' : '보충 훈련 후 재평가',
    estimatedDuration: '30분',
  });

  // 다음 절차 진행 가능 여부
  if (prerequisitesMet && overallScore >= 70 && nextProcedure) {
    steps.push({
      order: order++,
      type: 'advancement',
      description: `다음 절차(${nextProcedure}) 진행 가능`,
    });
  } else if (!nextProcedure && currentIdx === procedures.length - 1) {
    steps.push({
      order: order++,
      type: 'advancement',
      description: '모든 절차 완료 — 최종 종합평가 대상',
    });
  }

  return {
    traineeSummary: `현재 숙달 수준: ${MASTERY_LABELS[overallLevel].label} (${overallScore}점)`,
    overallLevel,
    competencies,
    nextRecommendedProcedure: prerequisitesMet ? nextProcedure : null,
    prerequisitesMet,
    prescriptionSteps: steps,
  };
}
