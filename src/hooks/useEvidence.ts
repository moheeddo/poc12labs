"use client";
import { useState, useCallback } from "react";
import type { EvidenceMap } from "@/lib/evidence";

/**
 * useEvidence — 증거 기반 설명 가능성 API 래퍼
 * POST /api/evidence/map 으로 역량별 영상 증거 클립을 가져온다.
 */
export function useEvidence() {
  const [evidenceMap, setEvidenceMap] = useState<EvidenceMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvidence = useCallback(
    async (
      videoId: string,
      indexId: string,
      competencyKey: string,
      score: number,
      rubricItems: string[]
    ): Promise<EvidenceMap | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/evidence/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, indexId, competencyKey, score, rubricItems }),
        });
        if (!res.ok) throw new Error(`증거 매핑 실패 (${res.status})`);
        const result: EvidenceMap = await res.json();
        setEvidenceMap(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "증거 매핑 중 오류가 발생했습니다";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { evidenceMap, loading, error, fetchEvidence };
}
