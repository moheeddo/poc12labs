// =============================================
// POV 평가 데이터 CSV 내보내기 유틸리티
// BOM 포함으로 한글 Excel 호환 보장
// =============================================

import type { PovEvaluationReport } from './types';
import type { HistoryEntry } from './pov-analysis-history';
import type { CohortMetrics } from './pov-cohort-analytics';

/** CSV 문자열 생성 (BOM 포함 — 한글 Excel 호환) */
export function toCSV(headers: string[], rows: string[][]): string {
  const BOM = '\uFEFF';
  // 셀 내 큰따옴표 이스케이프 + 전체 셀을 따옴표로 감쌈
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map(row => row.map(escape).join(','));
  return BOM + [headerLine, ...dataLines].join('\n');
}

/** 평가 결과 단건 CSV — 단계별 수행 결과 */
export function reportToCSV(report: PovEvaluationReport): string {
  const headers = ['단계ID', '설명', '상태', '신뢰도(%)', '타임스탬프(초)', '비고'];
  const rows = report.stepEvaluations.map(s => [
    s.stepId,
    s.description || '',
    s.status,
    String(s.confidence || 0),
    String(s.timestamp ?? ''),
    s.note || '',
  ]);
  return toCSV(headers, rows);
}

/** HPO 도구 적용 현황 CSV */
export function hpoToCSV(report: PovEvaluationReport): string {
  const headers = ['도구키', '도구명', '적용여부', '점수', '증거', '타임스탬프(초)'];
  const rows = (report.hpoEvaluations || []).map(h => [
    h.toolKey,
    h.label,
    h.applied ? '적용' : '미적용',
    String(h.score),
    h.evidence || '',
    String(h.timestamp ?? ''),
  ]);
  return toCSV(headers, rows);
}

/** 평가 이력 전체 CSV */
export function historyToCSV(entries: HistoryEntry[]): string {
  const headers = [
    '날짜', '절차명', '등급', '종합점수',
    '절차준수점수', 'HPO점수', '기본수칙평균',
    '통과단계수', '이탈건수',
  ];
  const rows = entries.map(e => {
    const r = e.report;
    // 기본수칙 평균 계산
    const fundamentalAvg = r.fundamentalScores?.length
      ? Math.round(
          r.fundamentalScores.reduce((sum, f) => sum + f.score, 0) /
          r.fundamentalScores.length,
        )
      : 0;
    return [
      e.date,
      e.procedureTitle,
      e.grade,
      String(e.overallScore),
      String(r.procedureComplianceScore),
      String(r.hpoOverallScore),
      String(fundamentalAvg),
      String(r.stepEvaluations?.filter(s => s.status === 'pass').length || 0),
      String(r.deviations?.length || 0),
    ];
  });
  return toCSV(headers, rows);
}

/** 코호트 요약 CSV — 절차별 지표 + 취약 단계 */
export function cohortToCSV(metrics: CohortMetrics): string {
  const headers = ['절차명', '평가수', '평균점수', '합격률(%)'];
  const rows: string[][] = metrics.procedureMetrics.map(p => [
    p.procedureTitle,
    String(p.evaluationCount),
    String(p.averageScore),
    String(Math.round(p.passRate)),
  ]);

  // 취약 단계 섹션 (빈 행 구분 후 추가)
  rows.push(['', '', '', '']);
  rows.push(['[취약 단계 Top 10]', '', '', '']);
  rows.push(['단계ID + 설명', '절차명', '실패율(%)', '총 평가수']);
  metrics.weakestSteps.forEach(w => {
    rows.push([
      `${w.stepId} ${w.description}`,
      w.procedureTitle,
      String(Math.round(w.failRate)),
      String(w.totalEvaluations),
    ]);
  });

  return toCSV(headers, rows);
}
