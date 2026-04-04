// =============================================
// 코호트 분석 엔진 — 전체 훈련생 대상 체계적 약점 탐지
// 분석 이력 전체를 집계하여 절차별 성과, 취약단계,
// HPO 적용률, 개입 권고 등 코호트 수준 메트릭 생성
// =============================================

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import type { PovEvaluationReport } from './types';
import { HPO_PROCEDURES, HPO_TOOLS, OPERATOR_FUNDAMENTALS } from './pov-standards';

const HISTORY_PATH = path.join(process.cwd(), 'data', 'analysis-history.json');

// ── 이력 항목 (pov-analysis-history.ts와 동일 구조) ──

interface HistoryEntry {
  id: string;
  videoId: string;
  procedureId: string;
  procedureTitle: string;
  date: string;
  grade: string;
  overallScore: number;
  report: PovEvaluationReport;
  createdAt: string;
}

// ── 코호트 메트릭 인터페이스 ──

export interface CohortMetrics {
  totalEvaluations: number;
  averageScore: number;
  gradeDistribution: Record<string, number>;   // { S: 2, A: 5, B: 8, ... }
  procedureMetrics: ProcedureMetric[];
  weakestSteps: WeakStep[];                     // Top 10 가장 많이 실패하는 단계
  hpoAdoptionRates: HpoAdoption[];             // HPO 도구별 적용률
  fundamentalAverages: { id: string; name: string; avgScore: number; trend: 'up' | 'down' | 'stable' }[];
  interventionAlerts: InterventionAlert[];
}

export interface ProcedureMetric {
  procedureId: string;
  procedureTitle: string;
  evaluationCount: number;
  averageScore: number;
  passRate: number;           // % B등급 이상 (score >= 70)
  failureRate: number;        // % D등급 이하 (score < 55)
  commonDeviations: { type: string; count: number; percentage: number }[];
}

export interface WeakStep {
  stepId: string;
  description: string;
  procedureId: string;
  procedureTitle: string;
  failRate: number;           // % 실패율
  totalEvaluations: number;
  isCritical: boolean;
}

export interface HpoAdoption {
  toolId: string;
  toolName: string;
  category: string;
  adoptionRate: number;       // % 적용률
  trend: 'up' | 'down' | 'stable';
}

export interface InterventionAlert {
  type: 'stepFailure' | 'lowScore' | 'hpoGap' | 'criticalViolation';
  severity: 'high' | 'medium';
  message: string;
  detail: string;
  recommendation: string;
}

// ── 이력 파일 읽기 ──

function readHistory(): HistoryEntry[] {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    const raw = readFileSync(HISTORY_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ── 추세 판정 유틸: 전반부 vs 후반부 평균 비교 ──

function computeTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid);
  const secondHalf = values.slice(mid);
  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const diff = avgSecond - avgFirst;
  if (diff > 3) return 'up';
  if (diff < -3) return 'down';
  return 'stable';
}

// ── 메인 집계 함수 ──

export function generateCohortMetrics(): CohortMetrics {
  const history = readHistory();
  const total = history.length;

  // 빈 이력일 때 기본값 반환
  if (total === 0) {
    return {
      totalEvaluations: 0,
      averageScore: 0,
      gradeDistribution: {},
      procedureMetrics: [],
      weakestSteps: [],
      hpoAdoptionRates: HPO_TOOLS.map(t => ({
        toolId: t.key,
        toolName: t.label,
        category: t.category,
        adoptionRate: 0,
        trend: 'stable' as const,
      })),
      fundamentalAverages: OPERATOR_FUNDAMENTALS.map(f => ({
        id: f.key,
        name: f.label,
        avgScore: 0,
        trend: 'stable' as const,
      })),
      interventionAlerts: [],
    };
  }

  // ── 1. 전체 평균 + 등급 분포 ──

  const avgScore = Math.round(history.reduce((s, h) => s + h.overallScore, 0) / total);
  const gradeDistribution: Record<string, number> = {};
  for (const h of history) {
    gradeDistribution[h.grade] = (gradeDistribution[h.grade] || 0) + 1;
  }

  // ── 2. 절차별 메트릭 ──

  const byProcedure = new Map<string, HistoryEntry[]>();
  for (const h of history) {
    const list = byProcedure.get(h.procedureId) || [];
    list.push(h);
    byProcedure.set(h.procedureId, list);
  }

  const procedureMetrics: ProcedureMetric[] = [];
  for (const [procId, entries] of byProcedure.entries()) {
    const count = entries.length;
    const avg = Math.round(entries.reduce((s, e) => s + e.overallScore, 0) / count);
    const passCount = entries.filter(e => e.overallScore >= 70).length;
    const failCount = entries.filter(e => e.overallScore < 55).length;

    // 이탈 유형 집계 (severity 기준)
    const deviationCounts = new Map<string, number>();
    for (const entry of entries) {
      for (const dev of entry.report.deviations || []) {
        const key = dev.severity;
        deviationCounts.set(key, (deviationCounts.get(key) || 0) + 1);
      }
    }
    const commonDeviations = Array.from(deviationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, cnt]) => ({
        type,
        count: cnt,
        percentage: Math.round((cnt / count) * 100),
      }));

    const proc = HPO_PROCEDURES.find(p => p.id === procId);
    procedureMetrics.push({
      procedureId: procId,
      procedureTitle: proc ? `붙임${proc.appendixNo}. ${proc.title}` : entries[0]?.procedureTitle || procId,
      evaluationCount: count,
      averageScore: avg,
      passRate: Math.round((passCount / count) * 100),
      failureRate: Math.round((failCount / count) * 100),
      commonDeviations,
    });
  }

  // ── 3. 취약 단계 Top 10 ──

  // 모든 절차의 모든 스텝에 대해 실패 횟수 집계
  const stepFailMap = new Map<string, { description: string; procedureId: string; procedureTitle: string; failCount: number; totalCount: number; isCritical: boolean }>();

  for (const h of history) {
    const report = h.report;
    if (!report.stepEvaluations) continue;

    // 해당 절차의 isCritical 정보를 가져오기 위한 맵
    const proc = HPO_PROCEDURES.find(p => p.id === h.procedureId);
    const criticalStepIds = new Set<string>();
    if (proc) {
      for (const section of proc.sections) {
        for (const step of section.steps) {
          if (step.isCritical) criticalStepIds.add(step.id);
        }
      }
    }

    for (const stepEval of report.stepEvaluations) {
      const key = `${h.procedureId}::${stepEval.stepId}`;
      const existing = stepFailMap.get(key) || {
        description: stepEval.description,
        procedureId: h.procedureId,
        procedureTitle: report.procedureTitle,
        failCount: 0,
        totalCount: 0,
        isCritical: criticalStepIds.has(stepEval.stepId),
      };
      existing.totalCount++;
      if (stepEval.status === 'fail' || stepEval.status === 'skipped') {
        existing.failCount++;
      }
      stepFailMap.set(key, existing);
    }
  }

  const weakestSteps: WeakStep[] = Array.from(stepFailMap.entries())
    .map(([, data]) => ({
      stepId: data.description.slice(0, 40), // 간략화
      description: data.description,
      procedureId: data.procedureId,
      procedureTitle: data.procedureTitle,
      failRate: data.totalCount > 0 ? Math.round((data.failCount / data.totalCount) * 100) : 0,
      totalEvaluations: data.totalCount,
      isCritical: data.isCritical,
    }))
    .filter(s => s.failRate > 0) // 실패율 0% 제외
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 10);

  // ── 4. HPO 도구 적용률 ──

  const hpoAdoptionRates: HpoAdoption[] = HPO_TOOLS.map(tool => {
    let detectedCount = 0;
    const scores: number[] = [];

    for (const h of history) {
      const hpoEval = h.report.hpoEvaluations?.find(e => e.toolKey === tool.key);
      if (hpoEval) {
        if (hpoEval.applied) detectedCount++;
        scores.push(hpoEval.score);
      }
    }

    return {
      toolId: tool.key,
      toolName: tool.label,
      category: tool.category,
      adoptionRate: total > 0 ? Math.round((detectedCount / total) * 100) : 0,
      trend: computeTrend(scores),
    };
  });

  // ── 5. 운전원 기본수칙 역량 평균 ──

  const fundamentalAverages = OPERATOR_FUNDAMENTALS.map(fund => {
    const scores: number[] = [];

    for (const h of history) {
      const fundScore = h.report.fundamentalScores?.find(f => f.key === fund.key);
      if (fundScore) scores.push(fundScore.score);
    }

    const avg = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

    return {
      id: fund.key,
      name: fund.label,
      avgScore: avg,
      trend: computeTrend(scores),
    };
  });

  // ── 6. 개입 권고 알림 자동 생성 ──

  const interventionAlerts: InterventionAlert[] = [];

  // 6-1. 단계 실패율 > 40%
  for (const step of weakestSteps) {
    if (step.failRate > 40) {
      interventionAlerts.push({
        type: 'stepFailure',
        severity: step.isCritical ? 'high' : 'medium',
        message: `단계 실패율 ${step.failRate}% — "${step.description.slice(0, 50)}..."`,
        detail: `${step.procedureTitle}의 해당 단계에서 ${step.totalEvaluations}건 중 ${Math.round(step.failRate * step.totalEvaluations / 100)}건 실패`,
        recommendation: '교육 커리큘럼에 해당 단계 집중 훈련을 추가하고, 시범 영상을 활용한 사전 교육을 실시하세요.',
      });
    }
  }

  // 6-2. 절차 평균 < 60
  for (const pm of procedureMetrics) {
    if (pm.averageScore < 60) {
      interventionAlerts.push({
        type: 'lowScore',
        severity: 'high',
        message: `${pm.procedureTitle} 평균 점수 ${pm.averageScore}점`,
        detail: `${pm.evaluationCount}건 평가 결과 평균이 60점 미만입니다.`,
        recommendation: '훈련 방법을 재검토하고, 숙련자 시범 영상 기반 사전 학습을 강화하세요.',
      });
    }
  }

  // 6-3. HPO 도구 적용률 < 30%
  for (const hpo of hpoAdoptionRates) {
    if (hpo.adoptionRate < 30 && total >= 2) {
      interventionAlerts.push({
        type: 'hpoGap',
        severity: 'medium',
        message: `${hpo.toolName} 적용률 ${hpo.adoptionRate}%`,
        detail: `전체 평가 ${total}건 중 ${Math.round(hpo.adoptionRate * total / 100)}건에서만 탐지되었습니다.`,
        recommendation: `${hpo.toolName} 기법의 교육 시간을 늘리고, 실습 시 필수 적용 항목으로 지정하세요.`,
      });
    }
  }

  // 6-4. 중요 단계 위반율 > 20%
  for (const step of Array.from(stepFailMap.values())) {
    if (step.isCritical) {
      const violationRate = step.totalCount > 0 ? Math.round((step.failCount / step.totalCount) * 100) : 0;
      if (violationRate > 20) {
        interventionAlerts.push({
          type: 'criticalViolation',
          severity: 'high',
          message: `중요단계 위반율 ${violationRate}% — "${step.description.slice(0, 50)}..."`,
          detail: `안전 관련 중요단계에서 ${step.totalCount}건 중 ${step.failCount}건이 위반되었습니다.`,
          recommendation: '해당 중요단계에 대한 별도 안전 교육 세션을 편성하고, 실습 전 반드시 확인 체크리스트를 수행하세요.',
        });
      }
    }
  }

  // severity=high 먼저, 그 다음 medium 정렬
  interventionAlerts.sort((a, b) => {
    if (a.severity === 'high' && b.severity !== 'high') return -1;
    if (a.severity !== 'high' && b.severity === 'high') return 1;
    return 0;
  });

  return {
    totalEvaluations: total,
    averageScore: avgScore,
    gradeDistribution,
    procedureMetrics,
    weakestSteps,
    hpoAdoptionRates,
    fundamentalAverages,
    interventionAlerts,
  };
}
