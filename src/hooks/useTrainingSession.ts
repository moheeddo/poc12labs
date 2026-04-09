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
    sessionId: null, session: null, isCreating: false, error: null,
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 세션 생성 파라미터를 저장하여 폴링 중 사용
  const paramsRef = useRef<{ procedureId: string; procedureTitle: string } | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  const createSession = useCallback(async (params: {
    procedureId: string;
    procedureTitle: string;
    operators: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string }[];
    instructorVideoUrl?: string;
  }) => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));
    paramsRef.current = { procedureId: params.procedureId, procedureTitle: params.procedureTitle };
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '세션 생성 실패'); }
      const { sessionId } = await res.json();

      // 즉시 초기 세션 상태 설정 (폴링 전 빈 화면 방지)
      const initialSession: TrainingSession = {
        id: sessionId,
        procedureId: params.procedureId,
        procedureTitle: params.procedureTitle,
        createdAt: new Date().toISOString(),
        status: 'analyzing',
        operators: params.operators.map(op => ({
          role: op.role,
          name: op.name,
          videoUrl: op.videoUrl,
          status: 'pending' as const,
          progress: 0,
        })),
      };
      setState(prev => ({ ...prev, sessionId, isCreating: false, session: initialSession }));

      // Polling — 3초 간격
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/session/status?id=${sessionId}`);
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();

          if (statusData.status === 'complete' || statusData.status === 'error') {
            stopPolling();
            const reportRes = await fetch(`/api/session/report?id=${sessionId}`);
            if (reportRes.ok) {
              const reportData = await reportRes.json();
              setState(prev => ({ ...prev, session: reportData }));
            }
          } else {
            // 진행 상태 업데이트 — 원래 세션 정보를 유지하면서 operator 상태만 갱신
            setState(prev => ({
              ...prev,
              session: {
                ...(prev.session || initialSession),
                id: statusData.id,
                status: statusData.status,
                operators: statusData.operators.map((op: { role: 'operatorA' | 'operatorB'; name: string; status: string; progress: number; error?: string }) => ({
                  ...op,
                  // status API는 간략 정보만 반환하므로 videoUrl 등은 기존 값 유지
                  videoUrl: prev.session?.operators.find(o => o.role === op.role)?.videoUrl || '',
                })),
              } as TrainingSession,
            }));
          }
        } catch { /* polling 실패는 무시 — 다음 틱에서 재시도 */ }
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
    paramsRef.current = null;
    setState({ sessionId: null, session: null, isCreating: false, error: null });
  }, [stopPolling]);

  return { ...state, createSession, stopPolling, reset };
}
