// =============================================
// POV 단계별 루브릭 정의 + AI 판정 근거 설명
// 장비 유형별 제네릭 루브릭 시스템 (254 스텝 대응)
// =============================================

import type { ProcedureStep } from './pov-standards';

/** 루브릭 수준 정의 */
export interface RubricLevel {
  status: 'pass' | 'partial' | 'fail' | 'skipped';
  label: string;        // 한국어 배지
  description: string;  // 한국어 설명
  evidence: string[];   // 이 판정에 필요한 증거
  score: number;        // 0-100
}

/** 스텝별 루브릭 */
export interface StepRubric {
  stepId: string;
  description: string;
  isCritical: boolean;
  equipmentType: string;
  levels: RubricLevel[];
}

// ── 장비 유형 추론 ────────────────────────────

/** 장비 ID 접두사로 유형 추론 */
function inferEquipmentType(equip: string): string {
  if (!equip) return 'general';
  const upper = equip.toUpperCase();
  if (upper.startsWith('VG') || upper.startsWith('V-') || upper.startsWith('VL') || upper.startsWith('VF') || upper.startsWith('VN') || upper.startsWith('VP')) return 'valve';
  if (upper.startsWith('PP') || upper.startsWith('P-')) return 'pump';
  if (upper.startsWith('TK')) return 'tank';
  if (upper.startsWith('LCV') || upper.startsWith('TCV') || upper.startsWith('FCV')) return 'control_valve';
  if (upper.startsWith('SOL')) return 'solenoid';
  if (upper.startsWith('MCC')) return 'electrical';
  if (upper.startsWith('PI') || upper.startsWith('LI') || upper.startsWith('TI') || upper.startsWith('FE')) return 'instrument';
  return 'general';
}

// ── 루브릭 생성 ──────────────────────────────

/** 장비 유형별 루브릭 템플릿 */
interface RubricTemplate {
  pass: string;
  partial: string;
  fail: string;
  passEvidence: string[];
  partialEvidence: string[];
  failEvidence: string[];
}

function getRubricTemplate(equipType: string, expectedState: string): RubricTemplate {
  const templates: Record<string, RubricTemplate> = {
    valve: {
      pass: `밸브를 정확히 ${expectedState} 상태로 확인/조작하고, 기기 번호를 확인함`,
      partial: `밸브 조작은 수행했으나, 기기 번호 미확인 또는 상태 완전 확인 미흡`,
      fail: `밸브 조작 미수행 또는 잘못된 밸브 조작`,
      passEvidence: ['기기번호 확인', `${expectedState} 상태 확인`, '조작 완료'],
      partialEvidence: ['조작 시도됨', '번호 미확인 또는 상태 불확실'],
      failEvidence: ['조작 미검출', '잘못된 장비 접근'],
    },
    pump: {
      pass: `펌프를 정확히 ${expectedState} 상태로 전환하고, 제어반 확인 수행`,
      partial: `펌프 조작은 수행했으나, 제어반 상태 확인 미흡`,
      fail: `펌프 조작 미수행`,
      passEvidence: ['펌프 제어 조작', `${expectedState} 확인`, '제어반 지시값 확인'],
      partialEvidence: ['조작 시도됨', '상태 미확인'],
      failEvidence: ['조작 미검출'],
    },
    control_valve: {
      pass: `제어밸브 ${expectedState} 상태를 현장 및 제어실을 통해 이중 확인`,
      partial: `제어밸브 확인은 수행했으나, 이중확인(현장+제어실) 미이행`,
      fail: `제어밸브 확인 미수행`,
      passEvidence: ['현장 확인', '제어실 확인', '이중 확인 완료'],
      partialEvidence: ['단일 확인만 수행'],
      failEvidence: ['확인 미검출'],
    },
    instrument: {
      pass: `계기를 정확히 읽고 ${expectedState} 범위 확인`,
      partial: `계기 확인은 했으나, 판독값 기록 또는 정확 범위 확인 미흡`,
      fail: `계기 확인 미수행`,
      passEvidence: ['계기 판독', '범위 확인', '기록'],
      partialEvidence: ['대략적 확인'],
      failEvidence: ['확인 미검출'],
    },
    tank: {
      pass: `탱크 수위/상태를 정확히 확인하고 ${expectedState} 기준 충족 확인`,
      partial: `탱크 확인은 했으나 정확한 수치 확인 미흡`,
      fail: `탱크 상태 확인 미수행`,
      passEvidence: ['수위 확인', '기준값 대비', '기록'],
      partialEvidence: ['대략적 확인'],
      failEvidence: ['확인 미검출'],
    },
    solenoid: {
      pass: `솔레노이드 밸브 ${expectedState} 상태를 제어실을 통해 확인`,
      partial: `확인은 했으나 제어실 연계 확인 미흡`,
      fail: `확인 미수행`,
      passEvidence: ['현장 확인', '제어실 확인'],
      partialEvidence: ['부분 확인'],
      failEvidence: ['미검출'],
    },
    electrical: {
      pass: `전기설비를 정확히 ${expectedState} 상태로 전환/확인`,
      partial: `전기설비 조작은 했으나 상태 확인 미흡`,
      fail: `전기설비 조작 미수행`,
      passEvidence: ['설비 조작', '상태 확인', '지시값 확인'],
      partialEvidence: ['조작 시도'],
      failEvidence: ['미검출'],
    },
    general: {
      pass: `절차를 정확히 수행하고 ${expectedState || '정상'} 상태 확인`,
      partial: `절차 수행했으나 완전한 확인 미흡`,
      fail: `절차 미수행`,
      passEvidence: ['수행 확인', '상태 확인'],
      partialEvidence: ['부분 수행'],
      failEvidence: ['미검출'],
    },
  };

  return templates[equipType] || templates.general;
}

/** 장비유형·핵심여부에 따른 4단계 루브릭 레벨 생성 */
function getRubricLevels(equipType: string, expectedState: string, isCritical: boolean): RubricLevel[] {
  const t = getRubricTemplate(equipType, expectedState);
  const criticalNote = isCritical ? ' [핵심단계 — 표준지침 7.1.2/7.1.3 적용]' : '';

  return [
    { status: 'pass', label: '적합', description: t.pass + criticalNote, evidence: t.passEvidence, score: 100 },
    { status: 'partial', label: '부분적합', description: t.partial + criticalNote, evidence: t.partialEvidence, score: 50 },
    { status: 'fail', label: '부적합', description: t.fail + criticalNote, evidence: t.failEvidence, score: 0 },
    { status: 'skipped', label: '미수행', description: '해당 단계가 영상에서 검출되지 않음', evidence: ['검색 결과 없음'], score: 0 },
  ];
}

/** ProcedureStep으로부터 루브릭 생성 */
export function generateStepRubric(step: ProcedureStep): StepRubric {
  const equipType = inferEquipmentType(step.equipment || '');
  const isCritical = step.isCritical || false;

  return {
    stepId: step.id,
    description: step.description,
    isCritical,
    equipmentType: equipType,
    levels: getRubricLevels(equipType, step.expectedState || '', isCritical),
  };
}

// ── AI 판정 근거 설명 ────────────────────────

/** AI 판정을 자연어 근거로 설명 */
export function explainJudgment(
  step: ProcedureStep,
  status: 'pass' | 'partial' | 'fail' | 'skipped',
  confidence: number,
  searchScore: number,
): string {
  const rubric = generateStepRubric(step);
  const level = rubric.levels.find((l) => l.status === status);
  if (!level) return '';

  const confText = confidence >= 0.8 ? '높은 신뢰도' : confidence >= 0.5 ? '중간 신뢰도' : '낮은 신뢰도';

  return (
    `[${level.label}] ${level.description}\n` +
    `판정 근거: ${confText} (${Math.round(confidence * 100)}%) — 검색 점수 ${Math.round(searchScore * 100)}%\n` +
    `필요 증거: ${level.evidence.join(', ')}`
  );
}
