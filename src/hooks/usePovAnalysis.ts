'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { AnalysisJob, PovEvaluationReport } from '@/lib/types';

interface AnalysisState {
  jobId: string | null;
  status: AnalysisJob['status'] | 'idle';
  progress: number;
  stages: AnalysisJob['stages'] | null;
  report: PovEvaluationReport | null;
  error: string | null;
}

export function usePovAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    jobId: null, status: 'idle', progress: 0, stages: null, report: null, error: null,
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startAnalysis = useCallback(async (videoId: string, procedureId: string, goldStandardId?: string) => {
    stopPolling();
    setState({ jobId: null, status: 'analyzing', progress: 0, stages: null, report: null, error: null });
    try {
      const res = await fetch('/api/twelvelabs/pov-analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, procedureId, goldStandardId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '분석 시작 실패');
      setState(prev => ({ ...prev, jobId: data.jobId }));

      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/twelvelabs/pov-analyze/status?jobId=${data.jobId}`);
          const statusData = await statusRes.json();
          setState(prev => ({
            ...prev, status: statusData.status, progress: statusData.progress,
            stages: statusData.stages, report: statusData.result || prev.report,
            error: statusData.error || null,
          }));
          if (statusData.status === 'complete' || statusData.status === 'error') stopPolling();
        } catch { /* 폴링 실패 무시 */ }
      }, 3000);
    } catch (err) {
      setState(prev => ({ ...prev, status: 'error', error: err instanceof Error ? err.message : '알 수 없는 오류' }));
    }
  }, [stopPolling]);

  return { ...state, startAnalysis, stopPolling };
}
