import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

// JSON 파일 기반 교수자 노트 저장소
const DATA_PATH = path.join(process.cwd(), 'data', 'instructor-notes.json');

export interface InstructorNote {
  id: string;
  reportId: string;
  stepId?: string;
  authorName: string;
  createdAt: string;
  category: 'calibration' | 'workaround' | 'studentContext' | 'ambiguousEvidence' | 'general';
  content: string;
  flagged: boolean;
  overrideData?: {
    originalStatus: string;
    newStatus: string;
    reason: string;
  };
}

export interface CalibrationSummary {
  totalOverrides: number;
  overridesByCategory: Record<string, number>;
  mostOverriddenSteps: { stepId: string; count: number; reasons: string[] }[];
  // (전체 - 오버라이드) / 전체 * 100
  aiAccuracyEstimate: number;
}

// ── 내부 파일 I/O ──

function readNotes(): InstructorNote[] {
  if (!existsSync(DATA_PATH)) return [];
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeNotes(data: InstructorNote[]): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ── 공개 CRUD 함수 ──

/** 노트 추가 (최대 500건 유지) */
export function addNote(note: Omit<InstructorNote, 'id' | 'createdAt'>): InstructorNote {
  const notes = readNotes();
  const created: InstructorNote = {
    ...note,
    id: `note-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  notes.unshift(created);
  if (notes.length > 500) notes.pop();
  writeNotes(notes);
  return created;
}

/** 노트 조회 — reportId/stepId로 필터 가능 */
export function getNotes(reportId?: string, stepId?: string): InstructorNote[] {
  let notes = readNotes();
  if (reportId) notes = notes.filter((n) => n.reportId === reportId);
  if (stepId) notes = notes.filter((n) => n.stepId === stepId);
  return notes;
}

/** 플래그된 노트(판정 어려운 단계) 전체 조회 */
export function getFlaggedNotes(): InstructorNote[] {
  return readNotes().filter((n) => n.flagged);
}

/** 노트 삭제 */
export function deleteNote(id: string): boolean {
  const notes = readNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  notes.splice(idx, 1);
  writeNotes(notes);
  return true;
}

/** AI 오버라이드 패턴 요약 생성 */
export function getCalibrationSummary(): CalibrationSummary {
  const notes = readNotes();
  const overrideNotes = notes.filter((n) => n.overrideData);

  // 카테고리별 노트 수
  const byCategory: Record<string, number> = {};
  notes.forEach((n) => {
    byCategory[n.category] = (byCategory[n.category] || 0) + 1;
  });

  // 단계별 오버라이드 집계
  const stepOverrides: Record<string, { count: number; reasons: string[] }> = {};
  overrideNotes.forEach((n) => {
    if (n.stepId) {
      if (!stepOverrides[n.stepId]) stepOverrides[n.stepId] = { count: 0, reasons: [] };
      stepOverrides[n.stepId].count++;
      if (n.overrideData?.reason) stepOverrides[n.stepId].reasons.push(n.overrideData.reason);
    }
  });

  const mostOverridden = Object.entries(stepOverrides)
    .map(([stepId, data]) => ({ stepId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalOverrides: overrideNotes.length,
    overridesByCategory: byCategory,
    mostOverriddenSteps: mostOverridden,
    aiAccuracyEstimate:
      notes.length > 0
        ? Math.round(((notes.length - overrideNotes.length) / notes.length) * 100)
        : 100,
  };
}
