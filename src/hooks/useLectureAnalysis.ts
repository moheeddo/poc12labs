"use client";

// src/hooks/useLectureAnalysis.ts
// 강의 평가 분석 오케스트레이션 훅
// PPT 업로드 → 분석 시작 → 상태 폴링 → 결과 반환

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  ParsedPpt,
  LectureAnalysisStage,
  StageStatus,
  LectureEvaluationResult,
} from "@/lib/lecture-types";

// 훅 상태 타입
export type LectureAnalysisStatus =
  | "idle"        // 초기 상태
  | "uploading"   // PPT 업로드 중
  | "analyzing"   // 분석 파이프라인 진행 중
  | "complete"    // 분석 완료
  | "error";      // 오류 발생

export interface UseLectureAnalysisReturn {
  status: LectureAnalysisStatus;
  pptData: ParsedPpt | null;
  progress: number;
  stages: Record<LectureAnalysisStage, StageStatus> | null;
  result: LectureEvaluationResult | null;
  error: string | null;
  uploadPpt: (file: File) => Promise<ParsedPpt | null>;
  startAnalysis: (videoId: string, instructorName: string, courseName: string) => Promise<void>;
  reset: () => void;
}

// 폴링 간격 (ms)
const POLL_INTERVAL = 3000;

export function useLectureAnalysis(): UseLectureAnalysisReturn {
  const [status, setStatus] = useState<LectureAnalysisStatus>("idle");
  const [pptData, setPptData] = useState<ParsedPpt | null>(null);
  const [progress, setProgress] = useState(0);
  const [stages, setStages] = useState<Record<LectureAnalysisStage, StageStatus> | null>(null);
  const [result, setResult] = useState<LectureEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 폴링 인터벌 참조
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 폴링 정리 함수
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // PPT 업로드
  const uploadPpt = useCallback(async (file: File): Promise<ParsedPpt | null> => {
    setStatus("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/lecture/parse-ppt", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "PPT 업로드 실패" }));
        throw new Error(data.error || `PPT 파싱 실패 (${res.status})`);
      }

      const parsed: ParsedPpt = await res.json();
      setPptData(parsed);
      setStatus("idle");
      return parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "PPT 업로드 실패";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, []);

  // 분석 시작 + 상태 폴링
  const startAnalysis = useCallback(async (
    videoId: string,
    instructorName: string,
    courseName: string,
  ) => {
    setStatus("analyzing");
    setError(null);
    setResult(null);
    setProgress(0);
    setStages(null);
    stopPolling();

    try {
      // 분석 Job 생성
      const res = await fetch("/api/lecture/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          pptData,
          instructorName,
          courseName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "분석 시작 실패" }));
        throw new Error(data.error || `분석 시작 실패 (${res.status})`);
      }

      const { jobId } = await res.json();

      // 상태 폴링 시작
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/lecture/analyze/status?jobId=${jobId}`);
          if (!statusRes.ok) {
            // 404 등 — 폴링 중단
            if (statusRes.status === 404) {
              stopPolling();
              setError("분석 Job을 찾을 수 없습니다");
              setStatus("error");
            }
            return;
          }

          const statusData = await statusRes.json();
          setProgress(statusData.progress || 0);
          setStages(statusData.stages || null);

          if (statusData.status === "complete") {
            stopPolling();
            setResult(statusData.result);
            setStatus("complete");
          } else if (statusData.status === "error") {
            stopPolling();
            setError(statusData.error || "분석 중 오류가 발생했습니다");
            setStatus("error");
          }
        } catch {
          // 네트워크 오류 — 폴링은 계속 (일시적 오류일 수 있음)
        }
      }, POLL_INTERVAL);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "분석 시작 실패";
      setError(msg);
      setStatus("error");
    }
  }, [pptData, stopPolling]);

  // 상태 초기화
  const reset = useCallback(() => {
    stopPolling();
    setStatus("idle");
    setPptData(null);
    setProgress(0);
    setStages(null);
    setResult(null);
    setError(null);
  }, [stopPolling]);

  return {
    status,
    pptData,
    progress,
    stages,
    result,
    error,
    uploadPpt,
    startAnalysis,
    reset,
  };
}
