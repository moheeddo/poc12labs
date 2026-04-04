"use client";
import { useState, useCallback } from "react";
import type { DerailerProfile } from "@/lib/derailer";

/**
 * useDerailer — Hogan HDS 탈선 요인 탐지 API 래퍼
 * POST /api/derailer/analyze 으로 참여자별 탈선 프로파일을 분석한다.
 */
export function useDerailer() {
  const [profile, setProfile] = useState<DerailerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeDerailer = useCallback(
    async (
      videoId: string,
      participantId: string,
      scenarioType: "normal" | "emergency"
    ): Promise<DerailerProfile | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/derailer/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, participantId, scenarioType }),
        });
        if (!res.ok) throw new Error(`탈선 분석 실패 (${res.status})`);
        const result: DerailerProfile = await res.json();
        setProfile(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "탈선 분석 중 오류가 발생했습니다";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { profile, loading, error, analyzeDerailer };
}
