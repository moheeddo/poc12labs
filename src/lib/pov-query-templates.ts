// =============================================
// POV 쿼리 템플릿 시스템
// 한국어 SOP 스텝을 TwelveLabs 영어 검색 쿼리로 변환
// =============================================

import { HPO_PROCEDURES, HPO_TOOLS, ProcedureStep } from './pov-standards';

// ── 출력 타입 ─────────────────────────────────

/** 단일 SOP 스텝에 대한 영어 검색 쿼리 세트 */
export interface StepQueryTemplate {
  stepId: string;       // "1.1.1" 등 절차 스텝 ID
  sopText: string;      // 원본 한국어 절차 설명
  actionQuery: string;  // 행동 중심 영어 쿼리 (1인칭 시점)
  objectQuery: string;  // 대상 장비/물체 중심 영어 쿼리
  stateQuery: string;   // 기대 상태 중심 영어 쿼리
}

/** HPO 도구별 영어 검색 쿼리 */
export interface HpoSearchQuery {
  toolId: string;       // HpoToolKey 값
  toolLabel: string;    // 한국어 도구명
  category: 'fundamental' | 'conditional';
  searchQuery: string;  // TwelveLabs에 보낼 영어 쿼리
}

// ── 장비 유형 추론 ────────────────────────────

/** 장비 ID 문자열에서 영어 장비 유형명 추론 */
function inferEquipmentType(equipment: string): string {
  const eq = equipment.toUpperCase();

  if (eq.startsWith('VG-') || eq.startsWith('VL-') || eq.startsWith('VF-') ||
      eq.startsWith('VP-') || eq.startsWith('VN-')) {
    return 'manual gate valve';
  }
  if (eq.startsWith('LCV-')) return 'level control valve';
  if (eq.startsWith('TCV-')) return 'temperature control valve';
  if (eq.startsWith('FCV-')) return 'flow control valve';
  if (eq.startsWith('SOL-') || eq.startsWith('SOV-')) return 'solenoid valve';
  if (eq.startsWith('PP-')) return 'pump';
  if (eq.startsWith('TK-')) return 'tank';
  if (eq.startsWith('HE-')) return 'heat exchanger';
  if (eq.startsWith('MCC-')) return 'motor control center breaker';
  if (eq.startsWith('PI-')) return 'pressure gauge';
  if (eq.startsWith('LOP-')) return 'local operator panel';
  if (eq.includes('압축기') || eq.includes('컴프레서')) return 'air compressor';
  if (eq.includes('탱크') || eq.includes('TANK')) return 'tank';
  if (eq.includes('램프') || eq.includes('표시등')) return 'indicator lamp';
  if (eq.includes('윤활유')) return 'lubricant oil sight glass';

  // 기본값: ID 그대로 사용
  return `equipment ${equipment}`;
}

// ── 기대 상태 → 영어 변환 ─────────────────────

/** 한국어 기대 상태를 영어로 변환 */
function translateExpectedState(state: string | undefined): string {
  if (!state) return 'correct position';
  const s = state.trim();
  if (s === '열림' || s === '개방') return 'open';
  if (s === '닫힘' || s === '폐쇄') return 'closed';
  if (s === '기동중' || s === '기동') return 'running';
  if (s === '정지') return 'stopped';
  if (s === '점등') return 'illuminated (lamp ON)';
  if (s === '소등') return 'extinguished (lamp OFF)';
  if (s === '투입') return 'engaged (breaker closed)';
  if (s === '기록') return 'reading recorded';
  if (s === '재확인') return 'verified again';
  if (s.includes('kgf') || s.includes('kPa') || s.includes('%')) return `within range ${s}`;
  return s;
}

// ── 행동 동사 선택 ────────────────────────────

/**
 * 스텝 설명과 기대 상태를 기반으로
 * 1인칭 POV 행동 동사를 반환
 */
function selectActionVerb(description: string, expectedState: string | undefined): string {
  const desc = description;
  const state = expectedState || '';

  // 기동/정지 버튼 조작
  if (desc.includes('기동버튼') || desc.includes('기동시킨다')) return 'pressing start button';
  if (desc.includes('정지버튼') || desc.includes('정지시킨다')) return 'pressing stop button';
  // 차단기 투입
  if (state === '투입' || desc.includes('투입')) return 'closing circuit breaker';
  // 기동 상태 확인
  if (state === '기동중') return 'checking running status of';
  if (state === '정지') return 'checking stopped status of';
  // 점등/소등 확인
  if (state === '점등') return 'checking lamp is ON for';
  if (state === '소등') return 'checking lamp is OFF for';
  // 열림/닫힘 밸브 확인
  if (state === '열림' || state === '개방') return 'verifying open position of';
  if (state === '닫힘' || state === '폐쇄') return 'verifying closed position of';
  // 압력/수위 범위 확인
  if (desc.includes('압력') || desc.includes('kgf') || desc.includes('kPa')) return 'checking pressure reading of';
  if (desc.includes('수위') || desc.includes('유위')) return 'checking level of';
  // 제어실 확인
  if (desc.includes('제어실을 통해')) return 'confirming via control room the status of';
  // 기록/재확인
  if (state === '기록') return 'reading and recording value from';
  if (state === '재확인') return 're-checking value of';

  return 'inspecting';
}

// ── 스텝 → 쿼리 변환 핵심 로직 ──────────────

/**
 * ProcedureStep 하나를 받아 StepQueryTemplate 생성
 */
function buildQueryTemplate(step: ProcedureStep): StepQueryTemplate {
  const equipType = step.equipment ? inferEquipmentType(step.equipment) : 'equipment';
  const equipId = step.equipment || '';
  const stateEn = translateExpectedState(step.expectedState);
  const verb = selectActionVerb(step.description, step.expectedState);

  // 1. actionQuery: POV 1인칭 시점 행동 묘사
  const actionQuery = `operator ${verb} ${equipType}${equipId ? ` ${equipId}` : ''}`;

  // 2. objectQuery: 물체/장비 중심 묘사
  const objectQuery = equipId
    ? `${equipType} labeled ${equipId} in industrial facility`
    : `${equipType} in industrial facility`;

  // 3. stateQuery: 기대 상태 중심 묘사
  const stateQuery = `${equipType}${equipId ? ` ${equipId}` : ''} in ${stateEn} state confirmed by operator`;

  return {
    stepId: step.id,
    sopText: step.description,
    actionQuery,
    objectQuery,
    stateQuery,
  };
}

// ── 재귀적 스텝 수집 ─────────────────────────

/**
 * ProcedureStep 배열에서 children까지 포함하여 모든 스텝을 평탄화
 */
function flattenSteps(steps: ProcedureStep[]): ProcedureStep[] {
  const result: ProcedureStep[] = [];
  for (const step of steps) {
    result.push(step);
    if (step.children && step.children.length > 0) {
      result.push(...flattenSteps(step.children));
    }
  }
  return result;
}

// ── 공개 API ─────────────────────────────────

/**
 * 지정한 절차 ID에 속한 모든 스텝의 쿼리 템플릿 반환
 *
 * @param procedureId - "appendix-1" ~ "appendix-8"
 * @returns StepQueryTemplate 배열 (없으면 빈 배열)
 */
export function getQueryTemplates(procedureId: string): StepQueryTemplate[] {
  const procedure = HPO_PROCEDURES.find(p => p.id === procedureId);
  if (!procedure) return [];

  const templates: StepQueryTemplate[] = [];

  for (const section of procedure.sections) {
    const allSteps = flattenSteps(section.steps);
    for (const step of allSteps) {
      templates.push(buildQueryTemplate(step));
    }
  }

  return templates;
}

// ── HPO 도구별 한국어 → 영어 쿼리 변환 맵 ─────

/**
 * HPO 도구 key → 영어 검색 쿼리 매핑
 * TwelveLabs는 영어에 최적화되어 있으므로 대표 영어 쿼리로 변환
 */
const HPO_ENGLISH_QUERIES: Record<string, string> = {
  // 기본적 인적오류 예방기법 (fundamental)
  situationAwareness:
    'operator pausing to assess surroundings and check procedure before proceeding',
  selfCheck:
    'operator stopping and verifying valve or equipment identification number before operation',
  communication:
    'operator communicating via radio or phone and confirming instructions verbally',
  procedureCompliance:
    'operator reading procedure document and following steps in sequence',
  // 조건부 인적오류 예방기법 (conditional)
  preJobBriefing:
    'team members gathered for pre-job briefing discussing task hazards and roles',
  verificationTechnique:
    'two operators simultaneously verifying the same valve or equipment position',
  peerCheck:
    'colleague reviewing and confirming operators action for accuracy',
  labeling:
    'operator checking identification tag or label attached to equipment',
  stepMarkup:
    'operator marking completed step in procedure document with pen or marker',
  turnover:
    'operator writing in logbook or handing over shift information to next crew',
  postJobReview:
    'team discussing completed work results and sharing lessons learned after task',
};

/**
 * 11개 HPO 도구 각각에 대한 영어 검색 쿼리 반환
 *
 * @returns HpoSearchQuery 배열 (정확히 11개)
 */
export function getHpoQueries(): HpoSearchQuery[] {
  return HPO_TOOLS.map(tool => ({
    toolId: tool.key,
    toolLabel: tool.label,
    category: tool.category,
    searchQuery: HPO_ENGLISH_QUERIES[tool.key] ||
      `operator performing ${tool.label} human performance optimization technique`,
  }));
}
