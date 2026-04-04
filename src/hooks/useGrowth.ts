"use client";
import { useState, useCallback } from "react";
import type { GrowthTimeline, GrowthDataPoint } from "@/lib/growth";

/**
 * useGrowth — 역량 성장 추이 추적 API 래퍼
 * POST /api/growth/timeline 으로 직원별 역량 성장 타임라인을 조회한다.
 */
export function useGrowth() {
  const [timeline, setTimeline] = useState<GrowthTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(
    async (
      employeeId: string,
      employeeName: string,
      dataPoints: GrowthDataPoint[]
    ): Promise<GrowthTimeline | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/growth/timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId, employeeName, dataPoints }),
        });
        if (!res.ok) throw new Error(`성장 추이 조회 실패 (${res.status})`);
        const result: GrowthTimeline = await res.json();
        setTimeline(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "성장 추이 조회 중 오류가 발생했습니다";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { timeline, loading, error, fetchTimeline };
}
