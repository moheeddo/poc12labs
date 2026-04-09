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
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '세션 생성 실패'); }
      const { sessionId } = await res.json();
      setState(prev => ({ ...prev, sessionId, isCreating: false }));

      // Polling
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
            setState(prev => ({
              ...prev,
              session: { id: statusData.id, status: statusData.status, operators: statusData.operators,
                procedureId: '', procedureTitle: '', createdAt: '' } as TrainingSession,
            }));
          }
        } catch { /* polling failure ignored */ }
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
