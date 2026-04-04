"use client";
import { useState, useCallback } from "react";
import type { BEIAnalysis } from "@/lib/bei";

/**
 * useBEI — BEI(Behavioral Event Interview) 자동 분석 API 래퍼
 * POST /api/bei/extract 으로 영상에서 STAR 구조 행동 사례를 추출한다.
 */
export function useBEI() {
  const [analysis, setAnalysis] = useState<BEIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractBEI = useCallback(
    async (
      videoId: string,
      transcriptSegments?: { speakerId: string; text: string; start: number; end: number }[]
    ): Promise<BEIAnalysis | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/bei/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, transcriptSegments }),
        });
        if (!res.ok) throw new Error(`BEI 추출 실패 (${res.status})`);
        const result: BEIAnalysis = await res.json();
        setAnalysis(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "BEI 분석 중 오류가 발생했습니다";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { analysis, loading, error, extractBEI };
}
