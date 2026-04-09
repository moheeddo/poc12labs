// src/lib/session-types.ts
import type { PovEvaluationReport, TranscriptSegment } from './types';

export interface OperatorSlot {
  role: 'operatorA' | 'operatorB';
  name: string;
  videoId?: string;
  videoUrl?: string;
  report?: PovEvaluationReport;
  transcription?: TranscriptSegment[];
  status: 'pending' | 'uploading' | 'analyzing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export interface InstructorSlot {
  videoId?: string;
  videoUrl?: string;
  transcription?: TranscriptSegment[];
  status: 'pending' | 'uploading' | 'analyzing' | 'complete' | 'error';
}

export interface SyncResult {
  offsetAtoB: number;
  offsetAtoInst?: number;
  confidence: number;
  matchedPhrases: { phrase: string; timeA: number; timeB: number }[];
}

export interface SessionSummary {
  averageScore: number;
  grades: { name: string; role: string; grade: string; score: number }[];
  comparisonHighlights: string[];
}

export interface TrainingSession {
  id: string;
  procedureId: string;
  procedureTitle: string;
  createdAt: string;
  status: 'created' | 'analyzing' | 'syncing' | 'complete' | 'error';
  operators: OperatorSlot[];
  instructorSlot?: InstructorSlot;
  syncResult?: SyncResult;
  summary?: SessionSummary;
}
