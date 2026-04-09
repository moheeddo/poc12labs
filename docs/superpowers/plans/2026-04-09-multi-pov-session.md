# 멀티 POV 훈련 세션 분석 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** HPO센터 POV 분석을 훈련 세션 단위(운전원A + B + 교관옵션)로 확장하여 개별 역량 평가 + 교차 분석을 제공한다.

**Architecture:** 기존 6단계 분석 파이프라인을 그대로 재사용하고, 세션 래퍼 레이어가 멀티 영상 오케스트레이션 + 전사문 동기화 + 교차 분석을 처리한다. UI는 올인원 세션 생성 폼 → 멀티 진행률 → 운전원 탭 리포트 구조.

**Tech Stack:** Next.js 14 App Router, React 19, TypeScript, TwelveLabs API, Recharts, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-09-multi-pov-session-design.md`

---

## File Structure

### 새로 생성
| 파일 | 역할 |
|------|------|
| `src/lib/session-types.ts` | TrainingSession, OperatorSlot, SyncResult 등 타입 정의 |
| `src/lib/session-store.ts` | 세션 인메모리 저장소 + CRUD |
| `src/lib/transcript-sync.ts` | 전사문 기반 오디오 동기화 알고리즘 |
| `src/hooks/useTrainingSession.ts` | 세션 생성/상태/리포트 관리 훅 |
| `src/app/api/session/create/route.ts` | 세션 생성 + 멀티 영상 분석 시작 |
| `src/app/api/session/status/route.ts` | 세션 전체 진행 상태 조회 |
| `src/app/api/session/report/route.ts` | 세션 리포트 (개별 + 종합) 조회 |
| `src/components/pov/SessionCreateForm.tsx` | 올인원 세션 생성 폼 |
| `src/components/pov/SessionProgress.tsx` | 멀티 영상 분석 진행 상태 |
| `src/components/pov/SessionReport.tsx` | 운전원 탭 + 세션 종합 래퍼 |
| `src/components/pov/EvidencePanel.tsx` | 근거 기반 평가 패널 (영상+전사+AI 판정) |

### 기존 수정
| 파일 | 변경 |
|------|------|
| `src/lib/types.ts` | TranscriptSegment 타입 추가 |
| `src/components/pov/PovAnalysis.tsx` | 세션 모드 phase 분기 추가 |
| `src/components/pov/StepsTimeline.tsx` | EvidencePanel 연동 (onStepClick prop 추가) |

---

## Task 1: 세션 타입 정의

**Files:**
- Create: `src/lib/session-types.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: TranscriptSegment 타입을 types.ts에 추가**

`src/lib/types.ts` 파일 마지막에 추가:

```typescript
// ── 전사문 세그먼트 ──
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}
```

- [ ] **Step 2: session-types.ts 생성**

```typescript
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
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/session-types.ts src/lib/types.ts
git commit -m "feat(session): 훈련 세션 + 전사문 타입 정의"
```

---

## Task 2: 세션 저장소 + 전사문 동기화

**Files:**
- Create: `src/lib/session-store.ts`
- Create: `src/lib/transcript-sync.ts`

- [ ] **Step 1: session-store.ts — 인메모리 세션 CRUD**

```typescript
// src/lib/session-store.ts
import type { TrainingSession } from './session-types';

const sessions = new Map<string, TrainingSession>();

export function createSession(session: TrainingSession): void {
  sessions.set(session.id, session);
}

export function getSession(id: string): TrainingSession | undefined {
  return sessions.get(id);
}

export function updateSession(id: string, patch: Partial<TrainingSession>): TrainingSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  const updated = { ...session, ...patch };
  sessions.set(id, updated);
  return updated;
}

export function updateOperator(
  sessionId: string,
  role: 'operatorA' | 'operatorB',
  patch: Partial<TrainingSession['operators'][0]>
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  const idx = session.operators.findIndex(o => o.role === role);
  if (idx >= 0) {
    session.operators[idx] = { ...session.operators[idx], ...patch };
    sessions.set(sessionId, session);
  }
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}
```

- [ ] **Step 2: transcript-sync.ts — 전사문 기반 동기화**

```typescript
// src/lib/transcript-sync.ts
import type { TranscriptSegment } from './types';
import type { SyncResult } from './session-types';

/**
 * Levenshtein 거리 (퍼지 매칭용)
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * 정규화: 공백 압축, 소문자, 마침표/쉼표 제거
 */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?'"]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 두 전사문 간 퍼지 매칭으로 타임 오프셋 추정
 * @returns SyncResult — offsetAtoB는 B_time = A_time + offset
 */
export function syncTranscripts(
  transcriptA: TranscriptSegment[],
  transcriptB: TranscriptSegment[],
): SyncResult {
  const matches: { phrase: string; timeA: number; timeB: number; offset: number }[] = [];

  for (const segA of transcriptA) {
    const normA = normalize(segA.text);
    if (normA.length < 4) continue; // 너무 짧은 발화 무시

    for (const segB of transcriptB) {
      const normB = normalize(segB.text);
      if (normB.length < 4) continue;

      const maxLen = Math.max(normA.length, normB.length);
      const dist = levenshtein(normA, normB);
      const similarity = 1 - dist / maxLen;

      // 유사도 80% 이상이면 매칭
      if (similarity >= 0.8) {
        matches.push({
          phrase: segA.text,
          timeA: segA.start,
          timeB: segB.start,
          offset: segB.start - segA.start,
        });
        break; // 1:1 매칭
      }
    }
  }

  if (matches.length === 0) {
    return {
      offsetAtoB: 0,
      confidence: 0,
      matchedPhrases: [],
    };
  }

  // 오프셋 중앙값 (아웃라이어 제거)
  const offsets = matches.map(m => m.offset).sort((a, b) => a - b);
  const medianOffset = offsets[Math.floor(offsets.length / 2)];

  // 중앙값 ±5초 이내 매칭만 유효
  const validMatches = matches.filter(m => Math.abs(m.offset - medianOffset) <= 5);

  const confidence = validMatches.length >= 5 ? 95 :
                     validMatches.length >= 3 ? 80 :
                     validMatches.length >= 1 ? 50 : 0;

  return {
    offsetAtoB: medianOffset,
    confidence,
    matchedPhrases: validMatches.map(m => ({
      phrase: m.phrase,
      timeA: m.timeA,
      timeB: m.timeB,
    })),
  };
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/session-store.ts src/lib/transcript-sync.ts
git commit -m "feat(session): 세션 저장소 + 전사문 동기화 알고리즘"
```

---

## Task 3: 세션 API 엔드포인트

**Files:**
- Create: `src/app/api/session/create/route.ts`
- Create: `src/app/api/session/status/route.ts`
- Create: `src/app/api/session/report/route.ts`

- [ ] **Step 1: POST /api/session/create**

```typescript
// src/app/api/session/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession, updateSession, updateOperator } from '@/lib/session-store';
import { startAnalysis } from '@/lib/pov-analysis-engine';
import { syncTranscripts } from '@/lib/transcript-sync';
import type { TrainingSession, OperatorSlot } from '@/lib/session-types';
import type { TranscriptSegment } from '@/lib/types';

export const maxDuration = 300;

const API_KEY = process.env.TWELVELABS_API_KEY;
const API_URL = process.env.TWELVELABS_API_URL || 'https://api.twelvelabs.io/v1.3';
const POV_INDEX_ID = process.env.TWELVELABS_POV_INDEX_ID || '69ccf4b881e81bcd08ca5488';

/** TwelveLabs 전사문 추출 */
async function fetchTranscription(videoId: string): Promise<TranscriptSegment[]> {
  if (!API_KEY) return [];
  try {
    const res = await fetch(`${API_URL}/videos/${videoId}/transcription`, {
      headers: { 'x-api-key': API_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((seg: { start: number; end: number; value: string }) => ({
      start: seg.start,
      end: seg.end,
      text: seg.value,
    }));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { procedureId, procedureTitle, operators, instructorVideoUrl } = body as {
    procedureId: string;
    procedureTitle: string;
    operators: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string }[];
    instructorVideoUrl?: string;
  };

  if (!procedureId || !operators?.length) {
    return NextResponse.json({ error: '절차와 운전원 정보가 필요합니다' }, { status: 400 });
  }

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const session: TrainingSession = {
    id: sessionId,
    procedureId,
    procedureTitle,
    createdAt: new Date().toISOString(),
    status: 'analyzing',
    operators: operators.map(op => ({
      role: op.role,
      name: op.name,
      videoUrl: op.videoUrl,
      status: 'pending' as const,
      progress: 0,
    })),
    instructorSlot: instructorVideoUrl ? { videoUrl: instructorVideoUrl, status: 'pending' as const } : undefined,
  };

  createSession(session);

  // 백그라운드에서 각 운전원 분석 시작 (비동기)
  (async () => {
    const analysisPromises = session.operators.map(async (op) => {
      try {
        updateOperator(sessionId, op.role, { status: 'analyzing', progress: 5 });

        // TwelveLabs에 이미 인덱싱된 videoId가 있거나, URL 업로드 필요
        // POC: videoUrl을 TwelveLabs에 업로드
        let videoId = op.videoId;
        if (!videoId && op.videoUrl) {
          if (!API_KEY) {
            // 데모 모드: videoUrl 자체를 ID로 사용
            videoId = `demo-${op.role}-${Date.now()}`;
          } else {
            const uploadForm = new FormData();
            uploadForm.append('index_id', POV_INDEX_ID);
            uploadForm.append('video_url', op.videoUrl);
            const uploadRes = await fetch(`${API_URL}/tasks`, {
              method: 'POST',
              headers: { 'x-api-key': API_KEY },
              body: uploadForm,
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              videoId = uploadData.video_id;
              // 인덱싱 완료 대기 (최대 5분)
              let attempts = 0;
              while (attempts < 60) {
                const taskRes = await fetch(`${API_URL}/tasks/${uploadData._id}`, {
                  headers: { 'x-api-key': API_KEY },
                });
                if (taskRes.ok) {
                  const taskData = await taskRes.json();
                  if (taskData.status === 'ready') break;
                  if (taskData.status === 'failed') throw new Error('인덱싱 실패');
                }
                await new Promise(r => setTimeout(r, 5000));
                attempts++;
                updateOperator(sessionId, op.role, { progress: Math.min(20, 5 + attempts) });
              }
            }
          }
        }

        if (!videoId) {
          updateOperator(sessionId, op.role, { status: 'error', error: '영상 업로드 실패' });
          return;
        }

        updateOperator(sessionId, op.role, { videoId, progress: 25 });

        // 기존 분석 파이프라인 실행
        const jobId = await startAnalysis(videoId, procedureId);
        updateOperator(sessionId, op.role, { progress: 30 });

        // 분석 완료 대기 (폴링)
        let done = false;
        while (!done) {
          await new Promise(r => setTimeout(r, 3000));
          // pov-analysis-engine의 getJob 활용
          const { getJob } = await import('@/lib/pov-analysis-engine');
          const job = getJob(jobId);
          if (!job) { done = true; break; }

          const progress = 30 + Math.round((job.progress / 100) * 60);
          updateOperator(sessionId, op.role, { progress });

          if (job.status === 'complete' && job.report) {
            // 전사문 추출
            const transcription = await fetchTranscription(videoId);
            updateOperator(sessionId, op.role, {
              status: 'complete',
              progress: 100,
              report: job.report,
              transcription,
            });
            done = true;
          } else if (job.status === 'error') {
            updateOperator(sessionId, op.role, { status: 'error', error: job.error || '분석 실패' });
            done = true;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류';
        updateOperator(sessionId, op.role, { status: 'error', error: msg });
      }
    });

    await Promise.all(analysisPromises);

    // 모든 개별 분석 완료 후 교차 분석
    const updated = getSession(sessionId);
    if (!updated) return;

    const completedOps = updated.operators.filter(o => o.status === 'complete');

    // 동기화 (2명 이상일 때)
    if (completedOps.length >= 2 && completedOps[0].transcription && completedOps[1].transcription) {
      updateSession(sessionId, { status: 'syncing' });
      const syncResult = syncTranscripts(completedOps[0].transcription, completedOps[1].transcription);
      updateSession(sessionId, { syncResult });
    }

    // 세션 종합 생성
    const grades = completedOps.map(op => ({
      name: op.name,
      role: op.role,
      grade: op.report?.grade || 'N/A',
      score: op.report?.overallScore || 0,
    }));

    const avgScore = grades.length > 0
      ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length)
      : 0;

    const highlights: string[] = [];
    if (grades.length === 2) {
      const [a, b] = grades;
      if (a.score > b.score) highlights.push(`${a.name}이(가) 종합 ${a.score - b.score}점 우세`);
      else if (b.score > a.score) highlights.push(`${b.name}이(가) 종합 ${b.score - a.score}점 우세`);
      else highlights.push('두 운전원 동점');
    }

    updateSession(sessionId, {
      status: completedOps.length > 0 ? 'complete' : 'error',
      summary: { averageScore: avgScore, grades, comparisonHighlights: highlights },
    });
  })();

  return NextResponse.json({ sessionId, status: 'analyzing' });
}
```

- [ ] **Step 2: GET /api/session/status**

```typescript
// src/app/api/session/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('id');
  if (!sessionId) {
    return NextResponse.json({ error: 'id 파라미터가 필요합니다' }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    status: session.status,
    operators: session.operators.map(op => ({
      role: op.role,
      name: op.name,
      status: op.status,
      progress: op.progress,
      error: op.error,
      hasReport: !!op.report,
    })),
    hasSync: !!session.syncResult,
    hasSummary: !!session.summary,
  });
}
```

- [ ] **Step 3: GET /api/session/report**

```typescript
// src/app/api/session/report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('id');
  if (!sessionId) {
    return NextResponse.json({ error: 'id 파라미터가 필요합니다' }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    procedureId: session.procedureId,
    procedureTitle: session.procedureTitle,
    createdAt: session.createdAt,
    status: session.status,
    operators: session.operators.map(op => ({
      role: op.role,
      name: op.name,
      status: op.status,
      report: op.report,
      transcription: op.transcription,
    })),
    instructorTranscription: session.instructorSlot?.transcription,
    syncResult: session.syncResult,
    summary: session.summary,
  });
}
```

- [ ] **Step 4: pov-analysis-engine.ts에 getJob export 추가**

`src/lib/pov-analysis-engine.ts`에서 getJob 함수가 이미 존재하는지 확인하고, 없으면 추가:

```typescript
// jobs Map 접근 함수 (session API에서 사용)
export function getJob(jobId: string): AnalysisJob | undefined {
  return jobs.get(jobId);
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/session/ src/lib/pov-analysis-engine.ts
git commit -m "feat(session): 세션 API 엔드포인트 (create/status/report)"
```

---

## Task 4: useTrainingSession 훅

**Files:**
- Create: `src/hooks/useTrainingSession.ts`

- [ ] **Step 1: 세션 관리 훅 구현**

```typescript
// src/hooks/useTrainingSession.ts
import { useState, useCallback, useRef } from 'react';
import type { TrainingSession } from '@/lib/session-types';

interface SessionState {
  sessionId: string | null;
  session: TrainingSession | null;
  isCreating: boolean;
  error: string | null;
}

export function useTrainingSession() {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    session: null,
    isCreating: false,
    error: null,
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const createSession = useCallback(async (params: {
    procedureId: string;
    procedureTitle: string;
    operators: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string }[];
    instructorVideoUrl?: string;
  }) => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '세션 생성 실패');
      }

      const { sessionId } = await res.json();
      setState(prev => ({ ...prev, sessionId, isCreating: false }));

      // 폴링 시작
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/session/status?id=${sessionId}`);
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();

          if (statusData.status === 'complete' || statusData.status === 'error') {
            stopPolling();
            // 최종 리포트 가져오기
            const reportRes = await fetch(`/api/session/report?id=${sessionId}`);
            if (reportRes.ok) {
              const reportData = await reportRes.json();
              setState(prev => ({ ...prev, session: reportData }));
            }
          } else {
            // 진행 상태 업데이트 (간이 TrainingSession 구성)
            setState(prev => ({
              ...prev,
              session: {
                id: statusData.id,
                status: statusData.status,
                operators: statusData.operators,
                procedureId: '',
                procedureTitle: '',
                createdAt: '',
              } as TrainingSession,
            }));
          }
        } catch { /* 폴링 실패는 무시 */ }
      }, 3000);

      return sessionId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '세션 생성 실패';
      setState(prev => ({ ...prev, isCreating: false, error: msg }));
      return null;
    }
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState({ sessionId: null, session: null, isCreating: false, error: null });
  }, [stopPolling]);

  return { ...state, createSession, stopPolling, reset };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/hooks/useTrainingSession.ts
git commit -m "feat(session): useTrainingSession 훅 — 세션 생성/폴링/리포트"
```

---

## Task 5: SessionCreateForm 컴포넌트

**Files:**
- Create: `src/components/pov/SessionCreateForm.tsx`

- [ ] **Step 1: 올인원 세션 생성 폼 구현**

```typescript
// src/components/pov/SessionCreateForm.tsx
"use client";

import { useState, useCallback } from 'react';
import { Users, Plus, X, Link2, Play, Shield } from 'lucide-react';
import type { Procedure } from '@/lib/pov-standards';
import { HPO_PROCEDURES } from '@/lib/pov-standards';
import { cn } from '@/lib/utils';

interface Props {
  onStartSession: (params: {
    procedureId: string;
    procedureTitle: string;
    operators: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string }[];
    instructorVideoUrl?: string;
  }) => void;
  isCreating: boolean;
}

interface OperatorInput {
  name: string;
  videoUrl: string;
}

export default function SessionCreateForm({ onStartSession, isCreating }: Props) {
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [operatorA, setOperatorA] = useState<OperatorInput>({ name: '', videoUrl: '' });
  const [operatorB, setOperatorB] = useState<OperatorInput>({ name: '', videoUrl: '' });
  const [showOperatorB, setShowOperatorB] = useState(false);
  const [showInstructor, setShowInstructor] = useState(false);
  const [instructorUrl, setInstructorUrl] = useState('');

  const canStart = selectedProcedure && operatorA.name.trim() && operatorA.videoUrl.trim();

  const handleStart = useCallback(() => {
    if (!selectedProcedure || !canStart) return;

    const operators: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string }[] = [
      { role: 'operatorA', name: operatorA.name.trim(), videoUrl: operatorA.videoUrl.trim() },
    ];

    if (showOperatorB && operatorB.name.trim() && operatorB.videoUrl.trim()) {
      operators.push({ role: 'operatorB', name: operatorB.name.trim(), videoUrl: operatorB.videoUrl.trim() });
    }

    onStartSession({
      procedureId: selectedProcedure.id,
      procedureTitle: selectedProcedure.title,
      operators,
      instructorVideoUrl: showInstructor && instructorUrl.trim() ? instructorUrl.trim() : undefined,
    });
  }, [selectedProcedure, operatorA, operatorB, showOperatorB, showInstructor, instructorUrl, canStart, onStartSession]);

  // 절차별 그룹핑
  const proceduresBySystem = new Map<string, Procedure[]>();
  HPO_PROCEDURES.forEach(p => {
    const list = proceduresBySystem.get(p.system) || [];
    list.push(p);
    proceduresBySystem.set(p.system, list);
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 세션 헤더 */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-amber-600" />
          새 훈련 세션
        </h3>

        {/* 절차 선택 */}
        <div className="mb-5">
          <label className="text-sm font-medium text-slate-600 mb-2 block">실습 절차</label>
          <select
            value={selectedProcedure?.id || ''}
            onChange={e => {
              const proc = HPO_PROCEDURES.find(p => p.id === e.target.value);
              setSelectedProcedure(proc || null);
            }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
          >
            <option value="">절차를 선택하세요</option>
            {Array.from(proceduresBySystem).map(([system, procs]) => (
              <optgroup key={system} label={system}>
                {procs.map(p => (
                  <option key={p.id} value={p.id}>
                    붙임{p.appendixNo}. {p.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* 운전원 슬롯 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* 운전원 A (필수) */}
          <div className="border border-teal-200 bg-teal-50/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-semibold text-teal-700">운전원 A</span>
              <span className="text-xs text-teal-500">(필수)</span>
            </div>
            <input
              type="text"
              placeholder="이름 입력"
              value={operatorA.name}
              onChange={e => setOperatorA(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-teal-300"
            />
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="url"
                placeholder="영상 URL (Google Drive, S3 등)"
                value={operatorA.videoUrl}
                onChange={e => setOperatorA(prev => ({ ...prev, videoUrl: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
          </div>

          {/* 운전원 B (선택) */}
          {showOperatorB ? (
            <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">운전원 B</span>
                </div>
                <button onClick={() => { setShowOperatorB(false); setOperatorB({ name: '', videoUrl: '' }); }}
                  className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="이름 입력"
                value={operatorB.name}
                onChange={e => setOperatorB(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-amber-300"
              />
              <div className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="url"
                  placeholder="영상 URL"
                  value={operatorB.videoUrl}
                  onChange={e => setOperatorB(prev => ({ ...prev, videoUrl: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowOperatorB(true)}
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-amber-300 hover:text-amber-600 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm">운전원 B 추가</span>
            </button>
          )}
        </div>

        {/* 교관 영상 (옵션) */}
        {showInstructor ? (
          <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600">교관 관찰 영상 (비평가)</span>
              <button onClick={() => { setShowInstructor(false); setInstructorUrl(''); }}
                className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="url"
                placeholder="교관 영상 URL"
                value={instructorUrl}
                onChange={e => setInstructorUrl(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInstructor(true)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors mb-4 block"
          >
            + 교관 관찰 영상 추가 (옵션)
          </button>
        )}

        {/* 분석 시작 */}
        <button
          onClick={handleStart}
          disabled={!canStart || isCreating}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
            canStart && !isCreating
              ? "bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              세션 생성 중...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              세션 분석 시작
            </>
          )}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/SessionCreateForm.tsx
git commit -m "feat(session): SessionCreateForm 올인원 세션 생성 폼"
```

---

## Task 6: SessionProgress 컴포넌트

**Files:**
- Create: `src/components/pov/SessionProgress.tsx`

- [ ] **Step 1: 멀티 영상 분석 진행 상태 표시**

```typescript
// src/components/pov/SessionProgress.tsx
"use client";

import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import type { TrainingSession } from '@/lib/session-types';
import { cn } from '@/lib/utils';

interface Props {
  session: TrainingSession;
}

export default function SessionProgress({ session }: Props) {
  const statusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'analyzing': return <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const isSyncing = session.status === 'syncing';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 animate-fade-in-up">
      <h3 className="text-lg font-bold text-slate-800 mb-4">세션 분석 진행 중</h3>

      <div className="space-y-4">
        {session.operators.map(op => (
          <div key={op.role} className="flex items-center gap-4">
            {statusIcon(op.status)}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">
                  {op.name || op.role} <span className="text-slate-400">({op.role === 'operatorA' ? '운전원 A' : '운전원 B'})</span>
                </span>
                <span className="text-xs font-mono text-slate-500">{op.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    op.status === 'complete' ? 'bg-emerald-500' :
                    op.status === 'error' ? 'bg-red-500' :
                    op.role === 'operatorA' ? 'bg-teal-500' : 'bg-amber-500'
                  )}
                  style={{ width: `${op.progress}%` }}
                />
              </div>
              {op.error && <p className="text-xs text-red-500 mt-1">{op.error}</p>}
            </div>
          </div>
        ))}

        {/* 교차 분석 */}
        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
          {isSyncing ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : session.syncResult ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Clock className="w-5 h-5 text-slate-300" />
          )}
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-700">교차 분석 (동기화 + 종합)</span>
            <span className="text-xs text-slate-400 ml-2">
              {isSyncing ? '동기화 중...' : session.syncResult ? '완료' : '개별 분석 완료 후 시작'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/SessionProgress.tsx
git commit -m "feat(session): SessionProgress 멀티 영상 분석 진행 상태"
```

---

## Task 7: EvidencePanel 컴포넌트

**Files:**
- Create: `src/components/pov/EvidencePanel.tsx`

- [ ] **Step 1: 근거 기반 평가 패널 구현**

```typescript
// src/components/pov/EvidencePanel.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, MessageSquare, ArrowRight, AlertTriangle } from 'lucide-react';
import type { TranscriptSegment } from '@/lib/types';
import type { DetectedStep } from '@/lib/types';
import { formatTime, cn } from '@/lib/utils';

interface Props {
  step: DetectedStep;
  stepDescription: string;
  status: 'pass' | 'fail' | 'partial' | 'skipped';
  note?: string;
  videoUrl?: string;
  transcription?: TranscriptSegment[];
  timestamp: number;
  /** 동기화된 상대방 영상으로 이동 */
  onCrossVideoJump?: (time: number, target: 'operatorB' | 'instructor') => void;
  hasCrossVideos?: { operatorB?: boolean; instructor?: boolean };
}

export default function EvidencePanel({
  step, stepDescription, status, note, videoUrl, transcription,
  timestamp, onCrossVideoJump, hasCrossVideos,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 해당 구간 전사문 필터링 (±10초)
  const relevantTranscripts = transcription?.filter(
    seg => seg.start >= timestamp - 5 && seg.end <= timestamp + 30
  ) || [];

  // 영상 구간 재생
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = timestamp;
    }
  }, [timestamp, videoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-slate-200">
        {/* 좌측: 영상 플레이어 */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500">해당 구간 영상</span>
            <span className="text-xs font-mono text-amber-600 ml-auto">{formatTime(timestamp)}</span>
          </div>
          {videoUrl ? (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onEnded={() => setIsPlaying(false)}
              />
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-10 h-10 text-white/80" />
                ) : (
                  <Play className="w-10 h-10 text-white/80" />
                )}
              </button>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-200 aspect-video flex items-center justify-center">
              <span className="text-sm text-slate-400">영상 미리보기 불가 (URL 업로드)</span>
            </div>
          )}
        </div>

        {/* 우측: 전사문 + AI 판정 */}
        <div className="p-4">
          {/* 전사문 타임라인 */}
          <div className="mb-3">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
              <MessageSquare className="w-3 h-3" /> 전사문
            </span>
            <div className="bg-white border border-slate-200 rounded-lg p-3 max-h-[120px] overflow-y-auto space-y-1.5">
              {relevantTranscripts.length > 0 ? relevantTranscripts.map((seg, i) => (
                <button
                  key={i}
                  onClick={() => seekToTime(seg.start)}
                  className="flex items-start gap-2 w-full text-left hover:bg-slate-50 rounded px-1.5 py-0.5 transition-colors"
                >
                  <span className="text-[10px] font-mono font-semibold text-slate-400 min-w-[36px] mt-0.5">
                    {formatTime(seg.start)}
                  </span>
                  <span className="text-sm text-slate-700 leading-snug">{seg.text}</span>
                </button>
              )) : (
                <p className="text-xs text-slate-400">해당 구간 전사문 없음</p>
              )}
            </div>
          </div>

          {/* AI 판정 근거 */}
          <div className={cn(
            "rounded-lg p-3 border",
            status === 'fail' ? "bg-red-50 border-red-200" :
            status === 'partial' ? "bg-amber-50 border-amber-200" :
            "bg-emerald-50 border-emerald-200"
          )}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className={cn("w-3.5 h-3.5",
                status === 'fail' ? "text-red-500" :
                status === 'partial' ? "text-amber-500" :
                "text-emerald-500"
              )} />
              <span className={cn("text-xs font-semibold",
                status === 'fail' ? "text-red-700" :
                status === 'partial' ? "text-amber-700" :
                "text-emerald-700"
              )}>AI 판정 근거</span>
            </div>
            <p className={cn("text-sm leading-relaxed",
              status === 'fail' ? "text-red-600" :
              status === 'partial' ? "text-amber-600" :
              "text-emerald-600"
            )}>
              {note || (status === 'fail' ? '해당 절차 수행이 탐지되지 않았습니다.' :
                        status === 'partial' ? '수행은 확인되었으나 일부 요소가 누락되었습니다.' :
                        '절차를 정확히 수행하였습니다.')}
            </p>
          </div>
        </div>
      </div>

      {/* 하단: 크로스 비디오 링크 */}
      {(hasCrossVideos?.operatorB || hasCrossVideos?.instructor) && (
        <div className="px-4 py-2.5 border-t border-slate-200 flex items-center gap-3 bg-white/60">
          <span className="text-xs text-slate-400">관련 영상:</span>
          {hasCrossVideos.operatorB && onCrossVideoJump && (
            <button
              onClick={() => onCrossVideoJump(timestamp, 'operatorB')}
              className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors"
            >
              운전원B 같은 시점 <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {hasCrossVideos.instructor && onCrossVideoJump && (
            <button
              onClick={() => onCrossVideoJump(timestamp, 'instructor')}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
            >
              교관 시점 <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/EvidencePanel.tsx
git commit -m "feat(session): EvidencePanel 근거 기반 평가 — 영상+전사+AI 판정"
```

---

## Task 8: SessionReport 컴포넌트

**Files:**
- Create: `src/components/pov/SessionReport.tsx`

- [ ] **Step 1: 운전원 탭 + 세션 종합 래퍼 구현**

```typescript
// src/components/pov/SessionReport.tsx
"use client";

import { useState } from 'react';
import { Users, BarChart3, ArrowLeft } from 'lucide-react';
import type { TrainingSession } from '@/lib/session-types';
import type { PovEvaluationReport } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getGrade } from '@/lib/utils';

interface Props {
  session: TrainingSession;
  /** 개별 리포트 렌더 위임 (기존 PovAnalysis 리포트 탭 재사용) */
  renderReport: (report: PovEvaluationReport, operatorName: string, transcription?: unknown[]) => React.ReactNode;
  onBack: () => void;
}

export default function SessionReport({ session, renderReport, onBack }: Props) {
  const completedOps = session.operators.filter(o => o.status === 'complete' && o.report);
  const [activeTab, setActiveTab] = useState<string>(completedOps[0]?.role || 'summary');

  // 단일 운전원이면 탭 없이 바로 표시
  if (completedOps.length === 1) {
    const op = completedOps[0];
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> 세션 목록
        </button>
        {op.report && renderReport(op.report, op.name, op.transcription)}
      </div>
    );
  }

  const activeOp = completedOps.find(o => o.role === activeTab);

  return (
    <div className="animate-fade-in-up">
      {/* 세션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> 세션 목록
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{session.procedureTitle}</span>
          {session.summary && (
            <span className={cn(
              "text-sm font-semibold px-3 py-1 rounded-full",
              session.summary.averageScore >= 80 ? "bg-emerald-100 text-emerald-700" :
              session.summary.averageScore >= 60 ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            )}>
              {getGrade(session.summary.averageScore).grade} ({session.summary.averageScore}점)
            </span>
          )}
        </div>
      </div>

      {/* 운전원 탭 */}
      <div className="flex border-b border-slate-200 mb-6">
        {completedOps.map(op => (
          <button
            key={op.role}
            onClick={() => setActiveTab(op.role)}
            className={cn(
              "px-5 py-3 text-sm font-semibold transition-all border-b-2",
              activeTab === op.role
                ? op.role === 'operatorA'
                  ? "text-teal-600 border-teal-500"
                  : "text-amber-600 border-amber-500"
                : "text-slate-400 border-transparent hover:text-slate-600"
            )}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            {op.name}
            {op.report && (
              <span className="ml-2 text-xs font-mono">
                {op.report.overallScore}점
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('summary')}
          className={cn(
            "px-5 py-3 text-sm font-semibold transition-all border-b-2 ml-auto",
            activeTab === 'summary'
              ? "text-blue-600 border-blue-500"
              : "text-slate-400 border-transparent hover:text-slate-600"
          )}
        >
          <BarChart3 className="w-4 h-4 inline mr-1.5" />
          세션 종합
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'summary' ? (
        <SessionSummaryView session={session} />
      ) : activeOp?.report ? (
        renderReport(activeOp.report, activeOp.name, activeOp.transcription)
      ) : (
        <p className="text-slate-400 text-center py-12">리포트가 없습니다</p>
      )}
    </div>
  );
}

/** 세션 종합 뷰 */
function SessionSummaryView({ session }: { session: TrainingSession }) {
  const { summary, syncResult, operators } = session;
  const completedOps = operators.filter(o => o.status === 'complete' && o.report);

  return (
    <div className="space-y-6">
      {/* 점수 비교 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {completedOps.map(op => {
          const { grade, color } = getGrade(op.report!.overallScore);
          return (
            <div key={op.role} className={cn(
              "bg-white border rounded-xl p-5",
              op.role === 'operatorA' ? "border-teal-200" : "border-amber-200"
            )}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">{op.name}</span>
                <span className={cn("text-2xl font-bold", color)}>{grade}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-slate-800">{op.report!.procedureScore}</div>
                  <div className="text-[10px] text-slate-500">절차</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{op.report!.hpoScore}</div>
                  <div className="text-[10px] text-slate-500">HPO</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{op.report!.fundamentalsScore}</div>
                  <div className="text-[10px] text-slate-500">기본수칙</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 동기화 정보 */}
      {syncResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">영상 동기화</h4>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>오프셋: <strong className="font-mono">{syncResult.offsetAtoB.toFixed(1)}초</strong></span>
            <span>신뢰도: <strong>{syncResult.confidence}%</strong></span>
            <span>매칭된 발화: <strong>{syncResult.matchedPhrases.length}개</strong></span>
          </div>
        </div>
      )}

      {/* 비교 인사이트 */}
      {summary?.comparisonHighlights && summary.comparisonHighlights.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">비교 인사이트</h4>
          <ul className="space-y-1.5">
            {summary.comparisonHighlights.map((h, i) => (
              <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/SessionReport.tsx
git commit -m "feat(session): SessionReport 운전원 탭 + 세션 종합 래퍼"
```

---

## Task 9: PovAnalysis 세션 모드 통합

**Files:**
- Modify: `src/components/pov/PovAnalysis.tsx`

이 태스크는 기존 PovAnalysis.tsx에 세션 모드를 추가한다. 기존 단일 영상 분석은 그대로 유지하면서, "세션 분석" 플로우를 병행한다.

- [ ] **Step 1: 새 import 추가**

`src/components/pov/PovAnalysis.tsx` 상단 import 영역에 추가:

```typescript
import SessionCreateForm from '@/components/pov/SessionCreateForm';
import SessionProgress from '@/components/pov/SessionProgress';
import SessionReport from '@/components/pov/SessionReport';
import { useTrainingSession } from '@/hooks/useTrainingSession';
```

- [ ] **Step 2: 세션 상태 변수 추가**

기존 state 선언부 (line ~179) 아래에 추가:

```typescript
// ── 세션 모드 ──
const [sessionMode, setSessionMode] = useState(false);
const trainingSession = useTrainingSession();
```

- [ ] **Step 3: phase "select" 화면에 세션 생성 폼 통합**

기존 `{phase === "select" && (` 블록 내부, "과정 안내" 섹션 위에 세션 모드 토글과 폼을 추가:

```typescript
{/* 세션 / 개별 모드 전환 */}
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setSessionMode(false)}
    className={cn(
      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
      !sessionMode ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    )}
  >
    개별 분석
  </button>
  <button
    onClick={() => setSessionMode(true)}
    className={cn(
      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
      sessionMode ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    )}
  >
    세션 분석 (멀티 POV)
  </button>
</div>

{sessionMode && (
  <SessionCreateForm
    onStartSession={(params) => {
      trainingSession.createSession(params);
      setPhase("analyzing" as ViewPhase);
    }}
    isCreating={trainingSession.isCreating}
  />
)}
```

- [ ] **Step 4: phase "analyzing"에서 세션 진행 상태 표시**

기존 analyzing phase 블록에 세션 모드 분기 추가:

```typescript
{phase === "analyzing" && sessionMode && trainingSession.session && (
  <SessionProgress session={trainingSession.session} />
)}
```

그리고 세션 분석 완료 시 report phase로 전환하는 effect 추가:

```typescript
useEffect(() => {
  if (sessionMode && trainingSession.session?.status === 'complete') {
    setPhase("report" as ViewPhase);
  }
}, [sessionMode, trainingSession.session?.status]);
```

- [ ] **Step 5: phase "report"에서 SessionReport 표시**

기존 report phase 블록에 세션 모드 분기 추가:

```typescript
{phase === "report" && sessionMode && trainingSession.session && (
  <SessionReport
    session={trainingSession.session}
    renderReport={(report, operatorName, transcription) => (
      // 기존 리포트 렌더링 로직 재사용
      <div>
        {/* 기존 reportTab 기반 콘텐츠를 여기에 인라인 렌더 */}
        {/* 점수 요약 + 서브탭 (overview/steps/handObject/hpo/time) */}
      </div>
    )}
    onBack={() => {
      trainingSession.reset();
      setPhase("select" as ViewPhase);
    }}
  />
)}
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/pov/PovAnalysis.tsx
git commit -m "feat(session): PovAnalysis에 세션 모드 통합 — 개별/세션 전환"
```

---

## Task 10: StepsTimeline에 EvidencePanel 연동

**Files:**
- Modify: `src/components/pov/StepsTimeline.tsx`

- [ ] **Step 1: onStepClick prop 추가 및 EvidencePanel 연동**

StepsTimeline Props에 추가:

```typescript
// 기존 Props에 추가
onStepExpand?: (stepId: string, timestamp: number) => void;
transcription?: TranscriptSegment[];
videoUrl?: string;
```

기존 단계 행 클릭 시 EvidencePanel을 토글하는 상태 추가:

```typescript
const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
```

각 단계 행에 클릭 핸들러와 EvidencePanel 렌더링 추가 (기존 루브릭 패널 아래):

```typescript
import EvidencePanel from './EvidencePanel';
// ... 단계 행 뒤에:
{expandedEvidence === step.stepId && (
  <EvidencePanel
    step={step}
    stepDescription={step.description}
    status={stepEval.status}
    note={stepEval.note}
    videoUrl={videoUrl}
    transcription={transcription}
    timestamp={step.timestamp}
  />
)}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/StepsTimeline.tsx
git commit -m "feat(session): StepsTimeline에 EvidencePanel 근거 패널 연동"
```

---

## 구현 순서 요약

| Task | 내용 | 의존성 |
|------|------|--------|
| 1 | 타입 정의 | 없음 |
| 2 | 세션 저장소 + 동기화 | Task 1 |
| 3 | 세션 API | Task 1, 2 |
| 4 | useTrainingSession 훅 | Task 3 |
| 5 | SessionCreateForm | Task 1 |
| 6 | SessionProgress | Task 1 |
| 7 | EvidencePanel | Task 1 |
| 8 | SessionReport | Task 1, 7 |
| 9 | PovAnalysis 통합 | Task 4, 5, 6, 8 |
| 10 | StepsTimeline 연동 | Task 7 |
