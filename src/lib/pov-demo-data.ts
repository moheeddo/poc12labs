// =============================================
// 데모 모드용 완전한 POV 분석 결과 생성
// 실제 TwelveLabs API 없이 전체 파이프라인 결과를 시뮬레이션
// DTW/RCA/스코어링 실제 로직을 호출하여 현실적 결과 생성
// =============================================

import type {
  PovEvaluationReport,
  DetectedStep,
  HandObjectEvent,
  HpoToolResult,
  FundamentalScore,
  SequenceAlignment,
} from './types';
import { HPO_PROCEDURES } from './pov-standards';
import { alignSequences } from './pov-dtw';
import {
  calculateProcedureScore,
  calculateHpoScore,
  calculateFundamentalsScore,
  calculateOverallScore,
  getGrade,
  applyGradeOverride,
} from './pov-scoring';
import { analyzeRootCause } from './pov-rca';

/**
 * 데모 모드용 완전한 분석 결과 생성.
 * 실제 TwelveLabs API 없이 전체 파이프라인 결과를 시뮬레이션.
 */
export function generateDemoAnalysis(procedureId: string): PovEvaluationReport {
  const procedure = HPO_PROCEDURES.find(p => p.id === procedureId);
  if (!procedure) throw new Error(`절차 ${procedureId} 없음`);

  // 1. 단계 검출 시뮬레이션 (80% pass, 10% partial, 10% fail)
  const allSteps = procedure.sections.flatMap(s => s.steps);
  const detectedSteps: DetectedStep[] = allSteps.map((step, i) => {
    const rand = Math.random();
    const status: DetectedStep['status'] =
      rand > 0.2 ? 'pass' : rand > 0.1 ? 'partial' : 'fail';
    const confidence =
      status === 'pass'
        ? 0.7 + Math.random() * 0.3
        : status === 'partial'
          ? 0.3 + Math.random() * 0.3
          : Math.random() * 0.2;
    return {
      stepId: step.id,
      status,
      confidence,
      timestamp: i * 15 + Math.random() * 5,
      endTime: i * 15 + 10 + Math.random() * 5,
      searchScore: confidence,
    };
  });

  // 2. 손-물체 이벤트 시뮬레이션
  const handObjectEvents: HandObjectEvent[] = detectedSteps
    .filter(s => s.status !== 'fail')
    .map(s => {
      const step = allSteps.find(st => st.id === s.stepId);
      const tools = ['렌치', '맨손', '체크리스트', '키', '계측기'];
      const actions = ['turn_valve', 'check_gauge', 'press_button', 'write_record', 'verify_state'];
      const quality = 60 + Math.random() * 40;
      return {
        stepId: s.stepId,
        timestamp: s.timestamp,
        endTime: s.endTime,
        heldObject: tools[Math.floor(Math.random() * tools.length)],
        targetEquipment: step?.equipment || '미확인',
        actionType: actions[Math.floor(Math.random() * actions.length)],
        stateBefore: step?.expectedState === '열림' ? '닫힘' : '정상',
        stateAfter: step?.expectedState || '정상',
        matchesSOP: s.status === 'pass',
        confidence: s.confidence,
        rawDescription: `데모 데이터: ${step?.description || ''}`,
        qualityScore: Math.round(quality),
        qualityFeedback: quality < 70 ? '조작 정밀도 향상 필요' : undefined,
      };
    });

  // 3. DTW 시퀀스 매칭
  const sopIds = allSteps.map(s => s.id);
  const detectedIds = detectedSteps
    .filter(s => s.status !== 'fail')
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(s => s.stepId);

  // 순서 역전(swap) 시뮬레이션
  if (detectedIds.length > 5) {
    const swapIdx = 3;
    [detectedIds[swapIdx], detectedIds[swapIdx + 1]] = [detectedIds[swapIdx + 1], detectedIds[swapIdx]];
  }

  const criticalStepIds = new Set(allSteps.filter(s => s.isCritical).map(s => s.id));
  const alignment: SequenceAlignment = alignSequences(sopIds, detectedIds, criticalStepIds);

  // 4. 운전원 기본수칙 역량 점수
  const fundamentalScores: FundamentalScore[] = [
    { key: 'monitor', label: '감시', score: 65 + Math.floor(Math.random() * 25), feedback: '감시 활동 수준이 양호합니다.' },
    { key: 'control', label: '제어', score: 60 + Math.floor(Math.random() * 30), feedback: '제어 조작 정확도를 개선하세요.' },
    { key: 'conservativeBias', label: '보수적 판단', score: 70 + Math.floor(Math.random() * 20), feedback: '보수적 판단 기조가 확인되었습니다.' },
    { key: 'teamwork', label: '팀워크', score: 65 + Math.floor(Math.random() * 25), feedback: '팀 내 의사소통이 원활합니다.' },
    { key: 'knowledge', label: '지식', score: 55 + Math.floor(Math.random() * 35), feedback: '절차서 숙지도를 높이세요.' },
  ];

  // 5. HPO 도구 시뮬레이션
  const hpoResults: HpoToolResult[] = [
    { toolId: 'situationAwareness', toolName: '상황인식', category: 'fundamental', detected: Math.random() > 0.3, detectionCount: Math.floor(Math.random() * 3) + 1, timestamps: [20, 80], confidence: 0.7 + Math.random() * 0.3 },
    { toolId: 'selfCheck', toolName: '자기진단(STAR)', category: 'fundamental', detected: Math.random() > 0.4, detectionCount: Math.floor(Math.random() * 3), timestamps: [35], confidence: 0.6 + Math.random() * 0.3 },
    { toolId: 'communication', toolName: '의사소통', category: 'fundamental', detected: Math.random() > 0.2, detectionCount: Math.floor(Math.random() * 4) + 1, timestamps: [10, 50, 120], confidence: 0.7 + Math.random() * 0.3 },
    { toolId: 'procedureCompliance', toolName: '절차준수', category: 'fundamental', detected: Math.random() > 0.3, detectionCount: Math.floor(Math.random() * 2) + 1, timestamps: [5], confidence: 0.7 + Math.random() * 0.2 },
    { toolId: 'preJobBriefing', toolName: '작업전회의', category: 'conditional', detected: Math.random() > 0.5, detectionCount: 1, timestamps: [2], confidence: 0.5 + Math.random() * 0.3 },
    { toolId: 'verificationTechnique', toolName: '확인기법', category: 'conditional', detected: Math.random() > 0.4, detectionCount: Math.floor(Math.random() * 3), timestamps: [30, 90], confidence: 0.6 + Math.random() * 0.3 },
    { toolId: 'peerCheck', toolName: '동료점검', category: 'conditional', detected: Math.random() > 0.5, detectionCount: Math.floor(Math.random() * 2), timestamps: [60], confidence: 0.5 + Math.random() * 0.3 },
    { toolId: 'labeling', toolName: '인식표', category: 'conditional', detected: Math.random() > 0.6, detectionCount: Math.floor(Math.random() * 2), timestamps: [45], confidence: 0.5 + Math.random() * 0.3 },
    { toolId: 'stepMarkup', toolName: '수행단계표시', category: 'conditional', detected: Math.random() > 0.4, detectionCount: Math.floor(Math.random() * 3), timestamps: [15, 75], confidence: 0.6 + Math.random() * 0.3 },
    { toolId: 'turnover', toolName: '인수인계', category: 'conditional', detected: Math.random() > 0.7, detectionCount: 1, timestamps: [150], confidence: 0.5 + Math.random() * 0.2 },
    { toolId: 'postJobReview', toolName: '작업후평가', category: 'conditional', detected: Math.random() > 0.5, detectionCount: 1, timestamps: [180], confidence: 0.5 + Math.random() * 0.3 },
  ];

  // RCA: 이탈 항목에 근본원인 분석 적용
  alignment.deviations.forEach(dev => {
    dev.rootCause = analyzeRootCause(dev, detectedSteps, hpoResults, fundamentalScores);
  });

  // 6. 스코어링
  const procedureScore = calculateProcedureScore(detectedSteps, allSteps.length, alignment.criticalDeviations);
  const hpoScore = calculateHpoScore(hpoResults);
  const fundamentalsScore = calculateFundamentalsScore(fundamentalScores);
  const overallScore = calculateOverallScore(procedureScore, hpoScore, fundamentalsScore);
  let grade = getGrade(overallScore);
  grade = applyGradeOverride(grade, alignment.criticalDeviations);

  // 7. 리포트 조립
  return {
    id: `demo-${Date.now()}`,
    procedureId,
    procedureTitle: procedure.title,
    videoId: `demo-video-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    stepEvaluations: detectedSteps.map(s => {
      const step = allSteps.find(st => st.id === s.stepId);
      return {
        stepId: s.stepId,
        description: step?.description || '',
        status: s.status,
        confidence: Math.round(s.confidence * 100),
        timestamp: s.timestamp,
        note: s.status === 'fail' ? '검출되지 않음 (데모)' : undefined,
      };
    }),
    procedureComplianceScore: procedureScore,
    hpoEvaluations: hpoResults.map(r => ({
      toolKey: r.toolId,
      label: r.toolName,
      applied: r.detected,
      score: Math.round(r.confidence * 100),
      evidence: r.detected ? `${r.detectionCount}회 검출 (데모)` : '미검출 (데모)',
    })),
    hpoOverallScore: hpoScore,
    fundamentalScores,
    overallScore,
    grade,
    deviations: alignment.deviations.map(d => ({
      step: d.stepIds[0],
      expected: d.type === 'skip' ? '수행' : '정상 순서',
      actual: d.description,
      severity: d.severity === 'critical' ? 'critical' : d.severity === 'major' ? 'high' : 'medium',
      timestamp: d.timestamp ?? 0,
    })),
    strengths: generateDemoStrengths(procedureScore, hpoResults),
    improvements: generateDemoImprovements(alignment, hpoResults),
    summary: `[데모 모드] ${procedure.title} 분석 결과: ${allSteps.length}단계 중 ${detectedSteps.filter(s => s.status === 'pass').length}단계 통과. 등급 ${grade}(${overallScore}점).`,
    handObjectEvents,
    sequenceAlignment: alignment,
    hpoResults,
    analysisMetadata: {
      analyzedAt: new Date().toISOString(),
      pipelineVersion: '1.0.0-demo',
      totalApiCalls: 0,
      processingTimeMs: 0,
    },
  };
}

function generateDemoStrengths(procedureScore: number, hpoResults: HpoToolResult[]): string[] {
  const s: string[] = [];
  if (procedureScore >= 70) s.push('절차 준수율 양호');
  const applied = hpoResults.filter(r => r.category === 'fundamental' && r.detected).length;
  if (applied >= 3) s.push(`기본 HPO 도구 ${applied}종 적용`);
  if (s.length === 0) s.push('절차에 대한 기본 이해도 확인됨');
  return s;
}

function generateDemoImprovements(alignment: SequenceAlignment, hpoResults: HpoToolResult[]): string[] {
  const imp: string[] = [];
  const skips = alignment.deviations.filter(d => d.type === 'skip').length;
  if (skips > 0) imp.push(`${skips}개 단계 누락`);
  const swaps = alignment.deviations.filter(d => d.type === 'swap').length;
  if (swaps > 0) imp.push(`${swaps}건 순서 오류`);
  const missing = hpoResults.filter(r => r.category === 'fundamental' && !r.detected);
  if (missing.length > 0) imp.push(`기본 HPO 미적용: ${missing.map(r => r.toolName).join(', ')}`);
  return imp;
}
