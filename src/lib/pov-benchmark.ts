// =============================================
// POV 교육과정 효과 벤치마킹
// 기간별 코호트 성과 비교 + 교육 개입 전후 효과 측정
// =============================================

import { readFileSync, existsSync } from 'fs';
import type { PovEvaluationReport } from './types';
import { getDataPath } from './data-path';

const HISTORY_PATH = getDataPath('analysis-history.json');

// ── 이력 항목 (analysis-history.json 구조와 동일) ──────────

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

// ── 공개 타입 ──────────────────────────────────────────────

export interface PeriodMetrics {
  label: string;          // "2024-1Q", "2024-2Q" 등
  startDate: string;      // ISO 날짜 문자열
  endDate: string;
  evaluationCount: number;
  averageScore: number;
  gradeDistribution: Record<string, number>; // { S: 2, A: 5, B: 3, ... }
  passRate: number;        // B+ 이상 비율 (0-100)
  criticalViolationRate: number; // 핵심 이탈 평균 건수
  hpoAdoptionRate: number; // HPO 기법 평균 적용률 (0-100)
}

export interface BenchmarkResult {
  periods: PeriodMetrics[];
  improvement: {
    scoreChange: number;        // 최근 기간 - 이전 기간 평균 점수 차
    passRateChange: number;     // 합격률 변화 (퍼센트 포인트)
    criticalReduction: number;  // 핵심 이탈 감소율 (퍼센트 포인트, 양수면 감소)
    hpoImprovement: number;     // HPO 적용률 향상치
    trend: 'improving' | 'stable' | 'declining';
  };
  insights: string[];   // 한국어 자동 인사이트
  totalEvaluations: number;
  dataRange: { from: string; to: string } | null;
}

// ── 내부 유틸 ──────────────────────────────────────────────

/** JSON 이력 파일을 읽고 파싱 (파일 없으면 빈 배열) */
function readHistory(): HistoryEntry[] {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    const raw = readFileSync(HISTORY_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** ISO 날짜 문자열 → 분기 레이블 (ex: "2024-2Q") */
function toQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  const year = d.getFullYear();
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${year}-${q}Q`;
}

/** 분기 레이블 → 분기 시작/종료 날짜 */
function quarterBounds(label: string): { start: string; end: string } {
  const match = label.match(/^(\d{4})-(\d)Q$/);
  if (!match) return { start: label, end: label };
  const year = parseInt(match[1]);
  const q = parseInt(match[2]);
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = q * 3;
  const endDay = endMonth === 3 ? 31 : endMonth === 6 ? 30 : endMonth === 9 ? 30 : 31;
  return {
    start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    end: `${year}-${String(endMonth).padStart(2, '0')}-${endDay}`,
  };
}

/** 분기 레이블 정렬 비교 (오래된 것 → 최신) */
function compareQuarters(a: string, b: string): number {
  return a.localeCompare(b);
}

/** B+ 이상 등급 여부 (S, A, B+, B) */
function isPass(grade: string): boolean {
  return ['S', 'A', 'B+', 'B'].includes(grade);
}

/** 이력 항목 → 핵심 이탈 건수 */
function getCriticalViolations(entry: HistoryEntry): number {
  const devs = entry.report.deviations || [];
  return devs.filter((d) => d.severity === 'critical' || d.severity === 'high').length;
}

/** 이력 항목 → HPO 적용률 (0-100) */
function getHpoAdoptionRate(entry: HistoryEntry): number {
  const evals = entry.report.hpoEvaluations || [];
  if (evals.length === 0) return 0;
  const applied = evals.filter((h) => h.applied).length;
  return Math.round((applied / evals.length) * 100);
}

// ── 핵심 함수: 분기별 벤치마크 생성 ──────────────────────

/**
 * analysis-history.json을 읽어 분기별 성과 메트릭을 집계하고,
 * 최근 분기 vs 이전 분기 비교 + 한국어 인사이트를 반환한다.
 *
 * 데이터가 없거나 1건 미만인 경우 빈 결과를 반환한다.
 */
export function generateBenchmark(): BenchmarkResult {
  const history = readHistory();

  // 빈 이력 처리
  if (history.length === 0) {
    return {
      periods: [],
      improvement: {
        scoreChange: 0,
        passRateChange: 0,
        criticalReduction: 0,
        hpoImprovement: 0,
        trend: 'stable',
      },
      insights: ['아직 평가 이력이 없습니다. 분석을 진행하면 벤치마킹 데이터가 생성됩니다.'],
      totalEvaluations: 0,
      dataRange: null,
    };
  }

  // 분기별 그룹핑
  const quarterMap = new Map<string, HistoryEntry[]>();
  for (const entry of history) {
    const q = toQuarterLabel(entry.date || entry.createdAt);
    const list = quarterMap.get(q) || [];
    list.push(entry);
    quarterMap.set(q, list);
  }

  // 분기가 1개뿐이면 월별로 분할 (더 세밀한 비교)
  const useMonthly = quarterMap.size === 1;
  const periodMap: Map<string, HistoryEntry[]> = useMonthly
    ? (() => {
        const m = new Map<string, HistoryEntry[]>();
        for (const entry of history) {
          const d = new Date(entry.date || entry.createdAt);
          const label = isNaN(d.getTime())
            ? 'Unknown'
            : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const list = m.get(label) || [];
          list.push(entry);
          m.set(label, list);
        }
        return m;
      })()
    : quarterMap;

  // 기간 레이블 정렬 (오래된 → 최신)
  const sortedLabels = Array.from(periodMap.keys()).sort(compareQuarters);

  // 각 기간별 메트릭 계산
  const periods: PeriodMetrics[] = sortedLabels.map((label) => {
    const entries = periodMap.get(label)!;
    const count = entries.length;

    const avgScore = Math.round(entries.reduce((s, e) => s + e.overallScore, 0) / count);
    const passCount = entries.filter((e) => isPass(e.grade)).length;
    const passRate = Math.round((passCount / count) * 100);

    // 등급 분포
    const gradeDist: Record<string, number> = {};
    for (const e of entries) {
      gradeDist[e.grade] = (gradeDist[e.grade] || 0) + 1;
    }

    // 핵심 이탈 평균
    const totalCritical = entries.reduce((s, e) => s + getCriticalViolations(e), 0);
    const criticalViolationRate = Math.round((totalCritical / count) * 10) / 10;

    // HPO 적용률 평균
    const hpoRates = entries.map(getHpoAdoptionRate);
    const hpoAdoptionRate = Math.round(hpoRates.reduce((s, r) => s + r, 0) / count);

    // 기간 시작/종료
    const bounds = useMonthly
      ? (() => {
          const [y, m] = label.split('-').map(Number);
          const lastDay = new Date(y, m, 0).getDate();
          return {
            start: `${y}-${String(m).padStart(2, '0')}-01`,
            end: `${y}-${String(m).padStart(2, '0')}-${lastDay}`,
          };
        })()
      : quarterBounds(label);

    return {
      label,
      startDate: bounds.start,
      endDate: bounds.end,
      evaluationCount: count,
      averageScore: avgScore,
      gradeDistribution: gradeDist,
      passRate,
      criticalViolationRate,
      hpoAdoptionRate,
    };
  });

  // 최근/이전 기간 비교 (기간이 1개이면 단일 기간 메트릭만)
  const latest = periods[periods.length - 1];
  const prev = periods.length >= 2 ? periods[periods.length - 2] : null;

  const scoreChange = prev ? latest.averageScore - prev.averageScore : 0;
  const passRateChange = prev ? latest.passRate - prev.passRate : 0;
  const criticalReduction = prev
    ? Math.round((prev.criticalViolationRate - latest.criticalViolationRate) * 10) / 10
    : 0;
  const hpoImprovement = prev ? latest.hpoAdoptionRate - prev.hpoAdoptionRate : 0;

  // 추이 판정
  let trend: BenchmarkResult['improvement']['trend'] = 'stable';
  if (scoreChange >= 3 || passRateChange >= 5) trend = 'improving';
  else if (scoreChange <= -3 || passRateChange <= -5) trend = 'declining';

  // 자동 인사이트 생성 (한국어)
  const insights: string[] = [];

  if (prev) {
    if (scoreChange > 0) {
      insights.push(
        `${latest.label} 평균 점수가 ${prev.label} 대비 ${Math.abs(scoreChange).toFixed(1)}점 상승했습니다 (${prev.averageScore}점 → ${latest.averageScore}점).`
      );
    } else if (scoreChange < 0) {
      insights.push(
        `${latest.label} 평균 점수가 ${prev.label} 대비 ${Math.abs(scoreChange).toFixed(1)}점 하락했습니다 (${prev.averageScore}점 → ${latest.averageScore}점) — 원인 분석이 필요합니다.`
      );
    } else {
      insights.push(`${latest.label} 평균 점수가 이전 기간과 동일하게 유지되고 있습니다 (${latest.averageScore}점).`);
    }

    if (criticalReduction > 0) {
      insights.push(
        `핵심 단계 이탈 건수가 평균 ${prev.criticalViolationRate}건에서 ${latest.criticalViolationRate}건으로 감소했습니다 — 교육 개입 효과가 나타나고 있습니다.`
      );
    } else if (criticalReduction < 0) {
      insights.push(
        `핵심 단계 이탈 건수가 ${prev.criticalViolationRate}건에서 ${latest.criticalViolationRate}건으로 증가했습니다 — 절차 준수 교육 강화가 필요합니다.`
      );
    }

    if (hpoImprovement > 0) {
      insights.push(
        `HPO 기법 적용률이 ${hpoImprovement}% 향상되었습니다 (${prev.hpoAdoptionRate}% → ${latest.hpoAdoptionRate}%).`
      );
    } else if (hpoImprovement < 0) {
      insights.push(
        `HPO 기법 적용률이 ${Math.abs(hpoImprovement)}% 감소했습니다 — 인적오류 예방기법 반복 훈련이 권장됩니다.`
      );
    }

    if (passRateChange > 0) {
      insights.push(
        `합격률(B 이상)이 ${prev.passRate}%에서 ${latest.passRate}%로 ${passRateChange}%p 상승했습니다.`
      );
    } else if (passRateChange < 0) {
      insights.push(
        `합격률이 ${prev.passRate}%에서 ${latest.passRate}%로 ${Math.abs(passRateChange)}%p 하락했습니다.`
      );
    }
  } else {
    insights.push(
      `총 ${latest.evaluationCount}건의 평가 데이터가 수집되었습니다. 평균 점수 ${latest.averageScore}점, 합격률 ${latest.passRate}%.`
    );
  }

  // 합격률 60% 미만 경고
  if (latest.passRate < 60) {
    insights.push(
      `현재 합격률(${latest.passRate}%)이 목표치(60%) 미만입니다 — 절차 이해도 향상을 위한 집중 교육이 필요합니다.`
    );
  }

  // HPO 적용률 50% 미만 경고
  if (latest.hpoAdoptionRate < 50) {
    insights.push(
      `HPO 기법 평균 적용률(${latest.hpoAdoptionRate}%)이 목표치(50%) 미만입니다 — 자기진단(STAR) 및 절차서 준수 기법 체화 훈련이 필요합니다.`
    );
  }

  // 전체 데이터 범위
  const allDates = history
    .map((e) => e.date || e.createdAt.split('T')[0])
    .filter(Boolean)
    .sort();
  const dataRange =
    allDates.length > 0
      ? { from: allDates[0], to: allDates[allDates.length - 1] }
      : null;

  return {
    periods,
    improvement: {
      scoreChange,
      passRateChange,
      criticalReduction,
      hpoImprovement,
      trend,
    },
    insights,
    totalEvaluations: history.length,
    dataRange,
  };
}
