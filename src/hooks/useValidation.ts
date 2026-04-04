"use client";
import { useState, useCallback } from "react";
import type { ReliabilityReport, NormTable } from "@/lib/validation";
import type { ReliabilityDatasetItem, NormDatasetItem } from "@/lib/validation";

/**
 * useValidation — 심리측정 타당화 API 래퍼
 * analyzeReliability: POST /api/validation/reliability — Cronbach α, ICC(2,1) 신뢰도 분석
 * buildNorms:         POST /api/validation/norms       — 그룹별 규준(노름) 테이블 구축
 */
export function useValidation() {
  const [report, setReport] = useState<ReliabilityReport | null>(null);
  const [norms, setNorms] = useState<NormTable | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeReliability = useCallback(
    async (dataset: ReliabilityDatasetItem[]): Promise<ReliabilityReport | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/validation/reliability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataset }),
        });
        if (!res.ok) throw new Error(`신뢰도 분석 실패 (${res.status})`);
        const result: ReliabilityReport = await res.json();
        setReport(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "신뢰도 분석 중 오류가 발생했습니다";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const buildNorms = useCallback(
    async (dataset: NormDatasetItem[], groupBy: string): Promise<NormTable | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/validation/norms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataset, groupBy }),
        });
        if (!res.ok) throw new Error(`노름 구축 실패 (${res.status})`);
        const result: NormTable = await res.json();
        setNorms(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "노름 구축 중 오류가 발생했습니다";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { report, norms, loading, error, analyzeReliability, buildNorms };
}
