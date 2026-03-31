"use client";

import { useState, useCallback, useRef } from "react";
import type { SearchResult, UploadProgress, MultipartUploadInit, TaskStatusResponse } from "@/lib/types";

// 클라이언트 로거 (브라우저 console)
const tag = (name: string) => `[TL:${name}]`;

// API 호출 공통 래퍼
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "요청 실패" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// =============================================
// 영상 검색 훅
// =============================================
export function useVideoSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async (indexId: string, query: string) => {
    console.log(tag("Search"), "검색 시작", { indexId, query });
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const data = await apiFetch<{ data: Array<{
        video_id: string;
        start: number;
        end: number;
        confidence: string;
        metadata: { filename?: string };
      }> }>("/api/twelvelabs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indexId, query }),
      });
      const mapped: SearchResult[] = (data.data || []).map((r) => ({
        videoId: r.video_id,
        videoTitle: r.metadata?.filename || "제목 없음",
        start: r.start,
        end: r.end,
        confidence: parseFloat(r.confidence),
      }));
      console.log(tag("Search"), `검색 완료: ${mapped.length}건`, { query });
      setResults(mapped);
      return mapped;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "검색 중 오류 발생";
      console.error(tag("Search"), "검색 실패", msg);
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, hasSearched, search };
}

// =============================================
// 영상 업로드 훅 — 직접 업로드 방식
// =============================================
// 플로우:
// 1. POST /api/twelvelabs/upload → 서버가 presigned URL 발급
// 2. 클라이언트가 각 파트를 presigned URL로 직접 PUT
// 3. POST /api/twelvelabs/upload/complete → 인덱싱 시작
// 4. GET /api/twelvelabs/upload/status 폴링 → 완료 대기

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const STATUS_POLL_INTERVAL = 5000; // 5초 간격 폴링

export function useVideoUpload() {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const abortRef = useRef(false);

  const upload = useCallback(async (indexId: string, file: File): Promise<string> => {
    abortRef.current = false;
    const logPrefix = tag("Upload");

    // 1) 클라이언트 사전 검증
    if (file.size > MAX_UPLOAD_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      const errMsg = `파일 크기(${sizeMB}MB)가 제한(2GB)을 초과합니다`;
      console.error(logPrefix, errMsg);
      setProgress({ fileName: file.name, progress: 0, status: "error", error: errMsg });
      throw new Error(errMsg);
    }

    console.log(logPrefix, "업로드 시작", {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
      indexId,
    });

    setProgress({ fileName: file.name, progress: 0, status: "uploading" });

    try {
      // 2) 서버에 멀티파트 업로드 초기화 요청 → presigned URL 수신
      console.log(logPrefix, "서버에 presigned URL 요청 중...");
      const initData = await apiFetch<MultipartUploadInit>("/api/twelvelabs/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indexId,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      const { taskId, parts } = initData;
      console.log(logPrefix, `presigned URL ${parts.length}개 수신`, { taskId });
      setProgress({ fileName: file.name, progress: 5, status: "uploading", taskId });

      // 3) 각 파트를 presigned URL로 직접 업로드 (TwelveLabs 클라우드로 직접 전송)
      for (let i = 0; i < parts.length; i++) {
        if (abortRef.current) throw new Error("업로드 취소됨");

        const part = parts[i];
        const chunk = file.slice(part.startByte, part.endByte + 1);
        const chunkSizeMB = (chunk.size / 1024 / 1024).toFixed(1);

        console.log(logPrefix, `파트 ${i + 1}/${parts.length} 업로드 중 (${chunkSizeMB}MB)`, {
          startByte: part.startByte,
          endByte: part.endByte,
        });

        const res = await fetch(part.presignedUrl, {
          method: "PUT",
          body: chunk,
          headers: { "Content-Type": "application/octet-stream" },
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error(logPrefix, `파트 ${i + 1} 업로드 실패`, { status: res.status, error: errText });
          throw new Error(`파트 ${i + 1} 업로드 실패 (${res.status})`);
        }

        // 프로그레스: 5% ~ 85% (파트 업로드 구간)
        const partProgress = 5 + Math.round(((i + 1) / parts.length) * 80);
        console.log(logPrefix, `파트 ${i + 1}/${parts.length} 완료 (${partProgress}%)`);
        setProgress({ fileName: file.name, progress: partProgress, status: "uploading", taskId });
      }

      // 4) 서버에 업로드 완료 통보 → 인덱싱 시작
      console.log(logPrefix, "모든 파트 업로드 완료 — 인덱싱 요청 중...");
      setProgress({ fileName: file.name, progress: 90, status: "processing", taskId });

      await apiFetch("/api/twelvelabs/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      console.log(logPrefix, "인덱싱 시작됨 — 상태 폴링 시작", { taskId });
      setProgress({ fileName: file.name, progress: 92, status: "indexing", taskId });

      // 5) 인덱싱 완료 대기 (폴링)
      const videoId = await pollTaskStatus(taskId, file.name);

      console.log(logPrefix, "업로드 + 인덱싱 완료!", { taskId, videoId });
      setProgress({ fileName: file.name, progress: 100, status: "complete", taskId, videoId });

      return videoId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "업로드 실패";
      console.error(logPrefix, "업로드 실패", msg);
      setProgress({ fileName: file.name, progress: 0, status: "error", error: msg });
      throw e;
    }
  }, []);

  // 인덱싱 상태 폴링
  async function pollTaskStatus(taskId: string, fileName: string): Promise<string> {
    const logPrefix = tag("Poll");
    let attempts = 0;
    const maxAttempts = 360; // 최대 30분 (5초 × 360)

    while (attempts < maxAttempts) {
      if (abortRef.current) throw new Error("업로드 취소됨");

      await new Promise((r) => setTimeout(r, STATUS_POLL_INTERVAL));
      attempts++;

      try {
        const data = await apiFetch<TaskStatusResponse>(
          `/api/twelvelabs/upload/status?taskId=${taskId}`
        );

        console.log(logPrefix, `[${attempts}] 상태: ${data.status}`, {
          taskId,
          videoId: data.videoId,
          estimatedTime: data.estimatedTime,
        });

        if (data.status === "ready" && data.videoId) {
          return data.videoId;
        }

        if (data.status === "failed") {
          throw new Error("인덱싱 실패 — TwelveLabs에서 처리 중 오류 발생");
        }

        // 프로그레스: 92% ~ 99% (인덱싱 구간)
        const indexProgress = Math.min(92 + Math.floor(attempts * 0.2), 99);
        setProgress({ fileName, progress: indexProgress, status: "indexing", taskId });
      } catch (e) {
        if (e instanceof Error && e.message.includes("인덱싱 실패")) throw e;
        console.warn(logPrefix, `폴링 ${attempts}회 실패 — 재시도`, (e as Error).message);
      }
    }

    throw new Error("인덱싱 타임아웃 (30분 초과)");
  }

  const cancel = useCallback(() => {
    abortRef.current = true;
    console.log(tag("Upload"), "업로드 취소 요청됨");
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    abortRef.current = false;
  }, []);

  return { progress, upload, cancel, reset };
}

// =============================================
// 영상 분석 훅
// =============================================
export function useVideoAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (videoId: string, type: "summary" | "chapter" | "highlight" | "text") => {
    console.log(tag("Analyze"), "분석 시작", { videoId, type });
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ data: unknown }>("/api/twelvelabs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, type }),
      });
      console.log(tag("Analyze"), "분석 완료", { videoId, type });
      return data.data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "분석 실패";
      console.error(tag("Analyze"), "분석 실패", msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, analyze };
}
