'use client';

import { useState, useCallback } from 'react';
import type { PovEvaluationReport } from '@/lib/types';

// 이력 항목 (서버 응답과 동일한 구조)
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

export interface TrendPoint {
  date: string;
  score: number;
  grade: string;
}

export function usePovHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  /** 이력 목록 조회 (절차 필터 선택) */
  const fetchHistory = useCallback(async (procedureId?: string) => {
    setLoading(true);
    try {
      const url = procedureId
        ? `/api/twelvelabs/pov-history?procedureId=${procedureId}`
        : '/api/twelvelabs/pov-history';
      const res = await fetch(url);
      if (res.ok) {
        setEntries(await res.json());
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 절차별 점수 추이 조회 (차트용) */
  const fetchTrend = useCallback(async (procedureId: string) => {
    try {
      const res = await fetch(`/api/twelvelabs/pov-history/trend?procedureId=${procedureId}`);
      if (res.ok) {
        setTrend(await res.json());
      } else {
        setTrend([]);
      }
    } catch {
      setTrend([]);
    }
  }, []);

  /** 이력 단건 삭제 */
  const deleteEntry = useCallback(async (id: string) => {
    await fetch(`/api/twelvelabs/pov-history?id=${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return { entries, trend, loading, fetchHistory, fetchTrend, deleteEntry };
}
