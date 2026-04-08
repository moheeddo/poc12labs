// =============================================
// POV 분석 이력 영속 저장소
// JSON 파일 기반 CRUD + 점수 추이 조회
// =============================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { PovEvaluationReport } from './types';
import { getDataPath } from './data-path';

const DATA_PATH = getDataPath('analysis-history.json');

export interface HistoryEntry {
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

function readHistory(): HistoryEntry[] {
  if (!existsSync(DATA_PATH)) return [];
  const raw = readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeHistory(data: HistoryEntry[]): void {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/** 분석 리포트를 이력에 저장 (최신 먼저, 최대 200건) */
export function saveReport(report: PovEvaluationReport): HistoryEntry {
  const history = readHistory();
  const entry: HistoryEntry = {
    id: `hist-${Date.now()}`,
    videoId: report.videoId,
    procedureId: report.procedureId,
    procedureTitle: report.procedureTitle,
    date: report.date,
    grade: report.grade,
    overallScore: report.overallScore,
    report,
    createdAt: new Date().toISOString(),
  };
  history.unshift(entry); // 최신 먼저
  if (history.length > 200) history.pop(); // 최대 200건 유지
  writeHistory(history);
  return entry;
}

/** 이력 목록 조회 (절차 필터 + 제한 건수) */
export function getHistory(procedureId?: string, limit: number = 50): HistoryEntry[] {
  let history = readHistory();
  if (procedureId) history = history.filter(h => h.procedureId === procedureId);
  return history.slice(0, limit);
}

/** 이력 단건 조회 */
export function getHistoryEntry(id: string): HistoryEntry | null {
  return readHistory().find(h => h.id === id) || null;
}

/** 이력 삭제 */
export function deleteHistoryEntry(id: string): boolean {
  const history = readHistory();
  const idx = history.findIndex(h => h.id === id);
  if (idx === -1) return false;
  history.splice(idx, 1);
  writeHistory(history);
  return true;
}

/** 절차별 점수 추이 (차트용, 오래된 것부터) */
export function getScoreTrend(procedureId: string, limit: number = 10): { date: string; score: number; grade: string }[] {
  return getHistory(procedureId, limit).map(h => ({
    date: h.date,
    score: h.overallScore,
    grade: h.grade,
  })).reverse(); // 오래된 것부터 (차트용)
}
