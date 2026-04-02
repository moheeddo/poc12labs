"use client";

import { useState, useCallback, useRef } from "react";
import type { SearchResult, UploadProgress, TaskStatusResponse } from "@/lib/types";

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
// 영상 업로드 훅 — 서버사이드 프록시 (API 키 서버 전용)
// =============================================
// 플로우:
// 1. XHR로 FormData 전송 → /api/twelvelabs/upload (busboy 스트리밍)
// 2. 서버가 TwelveLabs에 직접 업로드 → taskId 반환
// 3. GET /api/twelvelabs/upload/status 폴링 → 완료 대기

const STATUS_POLL_INTERVAL = 5000; // 5초 간격 폴링

export function useVideoUpload() {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const abortRef = useRef(false);

  const upload = useCallback(async (indexId: string, file: File): Promise<string> => {
    abortRef.current = false;
    const logPrefix = tag("Upload");

    console.log(logPrefix, "업로드 시작", {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
      indexId,
    });

    setProgress({ fileName: file.name, progress: 0, status: "uploading" });

    try {
      // 브라우저 → TwelveLabs API 직접 업로드 (서버 미경유, 크기 제한 없음)
      // 1) 서버에서 업로드 토큰 조회 (작은 JSON, Vercel 제한 없음)
      console.log(logPrefix, "업로드 토큰 조회 중...");
      const { token } = await apiFetch<{ token: string }>("/api/tl-token");

      // 2) TwelveLabs API로 직접 전송
      console.log(logPrefix, "TwelveLabs API로 직접 전송 중...");
      const formData = new FormData();
      formData.append("index_id", indexId);
      formData.append("video_file", file);

      const apiUrl = "https://api.twelvelabs.io/v1.3/tasks";

      // XMLHttpRequest로 업로드 진행률 추적
      const { taskId } = await new Promise<{ taskId: string; videoId?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", apiUrl);
        xhr.setRequestHeader("x-api-key", token);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = 5 + Math.round((e.loaded / e.total) * 80);
            console.log(logPrefix, `업로드 ${pct}% (${(e.loaded / 1024 / 1024).toFixed(1)}MB / ${(e.total / 1024 / 1024).toFixed(1)}MB)`);
            setProgress({ fileName: file.name, progress: pct, status: "uploading" });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ taskId: data._id, videoId: data.video_id });
            } catch {
              reject(new Error("서버 응답 파싱 실패"));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.message || err.error || `HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`업로드 실패 (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.onabort = () => reject(new Error("업로드 취소됨"));
        xhr.send(formData);

        // 취소 처리
        const checkAbort = setInterval(() => {
          if (abortRef.current) { xhr.abort(); clearInterval(checkAbort); }
        }, 500);
        xhr.onloadend = () => clearInterval(checkAbort);
      });

      console.log(logPrefix, "업로드 완료 — 인덱싱 시작", { taskId });
      setProgress({ fileName: file.name, progress: 90, status: "indexing", taskId });

      // 인덱싱 완료 대기 (폴링)
      const videoId = await pollTaskStatus(taskId, file.name);

      console.log(logPrefix, "업로드 + 인덱싱 완료!", { taskId, videoId });
      setProgress({ fileName: file.name, progress: 100, status: "complete", taskId, videoId });

      return videoId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "업로드 실패";
      console.error(logPrefix, "업로드 실패", msg);
      setProgress({ fileName: file.name, progress: 0, status: "error", error: msg });
      throw new Error(msg);
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

  // URL 기반 업로드 — 용량 제한 없음 (TwelveLabs가 URL에서 직접 다운로드)
  const uploadByUrl = useCallback(async (indexId: string, videoUrl: string, displayName?: string): Promise<string> => {
    abortRef.current = false;
    const logPrefix = tag("UrlUpload");
    const fileName = displayName || videoUrl.split("/").pop() || "영상";

    console.log(logPrefix, "URL 업로드 시작", { indexId, videoUrl });
    setProgress({ fileName, progress: 5, status: "uploading" });

    try {
      // JSON 요청 — 서버가 TwelveLabs에 video_url 전달 (body 크기 제한 없음)
      const res = await fetch("/api/twelvelabs/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indexId, videoUrl }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "요청 실패" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const { taskId } = await res.json();
      console.log(logPrefix, "URL 업로드 접수 — 인덱싱 시작", { taskId });
      setProgress({ fileName, progress: 50, status: "indexing", taskId });

      // 인덱싱 완료 대기
      const videoId = await pollTaskStatus(taskId, fileName);

      console.log(logPrefix, "URL 업로드 + 인덱싱 완료!", { taskId, videoId });
      setProgress({ fileName, progress: 100, status: "complete", taskId, videoId });

      return videoId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "URL 업로드 실패";
      console.error(logPrefix, "URL 업로드 실패", msg);
      setProgress({ fileName, progress: 0, status: "error", error: msg });
      throw e;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
    console.log(tag("Upload"), "업로드 취소 요청됨");
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    abortRef.current = false;
  }, []);

  return { progress, upload, uploadByUrl, cancel, reset };
}

// =============================================
// 영상 전사(transcript) 조회 훅
// =============================================
export interface TranscriptSegment {
  value: string;
  start: number;
  end: number;
}

export function useVideoTranscription() {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscription = useCallback(async (indexId: string, videoId: string) => {
    console.log(tag("Transcript"), "전사 조회 시작", { indexId, videoId });
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        videoId: string;
        duration: number;
        transcription: TranscriptSegment[];
      }>(`/api/twelvelabs/transcription?indexId=${encodeURIComponent(indexId)}&videoId=${encodeURIComponent(videoId)}`);
      const segs = data.transcription || [];
      console.log(tag("Transcript"), `전사 조회 완료: ${segs.length}개 세그먼트`);
      setSegments(segs);
      return segs;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "전사 조회 실패";
      console.error(tag("Transcript"), "전사 조회 실패", msg);
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { segments, loading, error, fetchTranscription };
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
