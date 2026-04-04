'use client';
import { useState, useCallback } from 'react';
import type { GoldStandard } from '@/lib/types';

export function useGoldStandard() {
  const [standards, setStandards] = useState<GoldStandard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStandards = useCallback(async (procedureId?: string) => {
    setLoading(true);
    try {
      const url = procedureId ? `/api/twelvelabs/gold-standard?procedureId=${procedureId}` : '/api/twelvelabs/gold-standard';
      const res = await fetch(url);
      const data = await res.json();
      setStandards(data);
    } catch { setStandards([]); }
    finally { setLoading(false); }
  }, []);

  const register = useCallback(async (procedureId: string, videoId: string, averageScore: number) => {
    const res = await fetch('/api/twelvelabs/gold-standard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procedureId, videoId, averageScore }),
    });
    const gs = await res.json();
    setStandards(prev => [...prev, gs]);
    return gs as GoldStandard;
  }, []);

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/twelvelabs/gold-standard?id=${id}`, { method: 'DELETE' });
    setStandards(prev => prev.filter(gs => gs.id !== id));
  }, []);

  return { standards, loading, fetchStandards, register, remove };
}
