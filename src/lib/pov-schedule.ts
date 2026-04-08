// =============================================
// HPO POV 평가 일정 관리 라이브러리
// 일정 CRUD + 자동 overdue 판정 + 주간 요약
// =============================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getDataPath } from './data-path';

const DATA_PATH = getDataPath('evaluation-schedule.json');

// ── 타입 정의 ────────────────────────────────

export interface ScheduleEntry {
  id: string;
  traineeName: string;
  procedureId: string;
  procedureTitle: string;
  scheduledDate: string;        // YYYY-MM-DD
  scheduledTime?: string;       // HH:MM
  type: 'initial' | 'retest' | 'certification';
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  notes?: string;
  previousReportId?: string;    // 재평가 시 이전 리포트 참조
  createdAt: string;
}

// ── 내부 유틸 ────────────────────────────────

function readSchedule(): ScheduleEntry[] {
  if (!existsSync(DATA_PATH)) return [];
  try { return JSON.parse(readFileSync(DATA_PATH, 'utf-8')); } catch { return []; }
}

function writeSchedule(data: ScheduleEntry[]): void {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ── 공개 API ─────────────────────────────────

/**
 * 일정 목록 조회 (필터링 + 자동 overdue 판정 포함)
 */
export function listSchedule(options?: {
  traineeName?: string;
  procedureId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): ScheduleEntry[] {
  let entries = readSchedule();

  // 필터 적용
  if (options?.traineeName) entries = entries.filter(e => e.traineeName === options.traineeName);
  if (options?.procedureId) entries = entries.filter(e => e.procedureId === options.procedureId);
  if (options?.fromDate) entries = entries.filter(e => e.scheduledDate >= options.fromDate!);
  if (options?.toDate) entries = entries.filter(e => e.scheduledDate <= options.toDate!);

  // 자동 overdue 처리 — 오늘보다 이전이고 scheduled 상태인 경우
  const today = new Date().toISOString().split('T')[0];
  entries.forEach(e => {
    if (e.status === 'scheduled' && e.scheduledDate < today) {
      e.status = 'overdue';
    }
  });

  // status 필터는 overdue 처리 후 적용
  if (options?.status) entries = entries.filter(e => e.status === options.status);

  return entries.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

/**
 * 새 일정 등록
 */
export function addSchedule(entry: Omit<ScheduleEntry, 'id' | 'createdAt' | 'status'>): ScheduleEntry {
  const schedule = readSchedule();
  const created: ScheduleEntry = {
    ...entry,
    id: `sched-${Date.now()}`,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };
  schedule.push(created);
  writeSchedule(schedule);
  return created;
}

/**
 * 일정 상태 업데이트
 */
export function updateScheduleStatus(id: string, status: ScheduleEntry['status']): boolean {
  const schedule = readSchedule();
  const entry = schedule.find(e => e.id === id);
  if (!entry) return false;
  entry.status = status;
  writeSchedule(schedule);
  return true;
}

/**
 * 일정 삭제
 */
export function deleteScheduleEntry(id: string): boolean {
  const schedule = readSchedule();
  const idx = schedule.findIndex(e => e.id === id);
  if (idx === -1) return false;
  schedule.splice(idx, 1);
  writeSchedule(schedule);
  return true;
}

/**
 * 이번 주 일정 요약 반환
 * - today: 오늘 예정인 일정
 * - thisWeek: 오늘~7일 이내 일정
 * - overdue: 지연된 일정
 */
export function getWeekSummary(): {
  today: ScheduleEntry[];
  thisWeek: ScheduleEntry[];
  overdue: ScheduleEntry[];
} {
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const all = listSchedule();

  return {
    today: all.filter(e => e.scheduledDate === today && e.status !== 'cancelled'),
    thisWeek: all.filter(e => e.scheduledDate >= today && e.scheduledDate <= weekEnd && e.status !== 'cancelled'),
    overdue: all.filter(e => e.status === 'overdue'),
  };
}
