"use client";
import { useState, useCallback } from "react";
import type { TriangulatedScore, ConsentRecord } from "@/lib/compliance";
import type { TriangulationConfig } from "@/lib/compliance";

/**
 * useCompliance — ISO 10667 준수 API 래퍼
 * triangulate:    POST /api/compliance/triangulate — AI·인간 평가자 점수 삼각측정
 * submitConsent:  POST /api/compliance/consent    — 참여자 동의 기록 생성
 */
export function useCompliance() {
  const [triangulated, setTriangulated] = useState<TriangulatedScore[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triangulate = useCallback(
    async (
      aiScores: Record<string, number>,
      humanScores: Record<string, number>,
      config?: Partial<TriangulationConfig>
    ): Promise<TriangulatedScore[] | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/compliance/triangulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiScores, humanScores, config }),
        });
        if (!res.ok) throw new Error(`삼각측정 실패 (${res.status})`);
        const body = await res.json();
        // 응답 구조: { results, config, summary }
        const results: TriangulatedScore[] = body.results ?? body;
        setTriangulated(results);
        return results;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "삼각측정 중 오류가 발생했습니다";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const submitConsent = useCallback(
    async (
      participantId: string,
      sessionId: string,
      consentType: ConsentRecord["consentType"],
      agreed: boolean
    ): Promise<ConsentRecord | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/compliance/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId, sessionId, consentType, agreed }),
        });
        if (!res.ok) throw new Error(`동의 기록 실패 (${res.status})`);
        const body = await res.json();
        // 응답 구조: { record, warning? }
        return body.record as ConsentRecord;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "동의 기록 중 오류가 발생했습니다";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { triangulated, loading, error, triangulate, submitConsent };
}
