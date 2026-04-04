"use client";
import { useState, useCallback } from "react";
import type { FairnessReport } from "@/lib/fairness";

/** 공정성 분석 대상 참여자 점수 항목 */
interface FairnessScoreItem {
  participantId: string;
  overallScore: number;
  demographics: Record<string, string>;
}

/**
 * useFairness — 편향/공정성 모니터링 API 래퍼
 * POST /api/fairness/analyze 으로 참여자 점수의 그룹별 편향을 분석한다.
 */
export function useFairness() {
  const [report, setReport] = useState<FairnessReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFairness = useCallback(
    async (
      scores: FairnessScoreItem[],
      groupVariables?: string[]
    ): Promise<FairnessReport | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/fairness/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scores, groupVariables }),
        });
        if (!res.ok) throw new Error(`공정성 분석 실패 (${res.status})`);
        const result: FairnessReport = await res.json();
        setReport(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "공정성 분석 중 오류가 발생했습니다";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { report, loading, error, analyzeFairness };
}
