"use client";

import { useState, useCallback } from "react";
import type { SearchResult, UploadProgress } from "@/lib/types";

// API 호출 공통 래퍼
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "요청 실패" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// 영상 검색 훅
export function useVideoSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async (indexId: string, query: string) => {
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
      setResults(mapped);
      return mapped;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "검색 중 오류 발생";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, hasSearched, search };
}

// 영상 업로드 훅
export function useVideoUpload() {
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const upload = useCallback(async (indexId: string, file: File) => {
    setProgress({ fileName: file.name, progress: 0, status: "uploading" });

    const formData = new FormData();
    formData.append("index_id", indexId);
    formData.append("video_file", file);

    try {
      const xhr = new XMLHttpRequest();
      return await new Promise<string>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress({ fileName: file.name, progress: pct, status: "uploading" });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress({ fileName: file.name, progress: 100, status: "processing" });
            const data = JSON.parse(xhr.responseText);
            setProgress({ fileName: file.name, progress: 100, status: "complete" });
            resolve(data._id);
          } else {
            let errMsg = "업로드 실패";
            try { errMsg = JSON.parse(xhr.responseText).error || errMsg; } catch { /* 무시 */ }
            setProgress({ fileName: file.name, progress: 0, status: "error", error: errMsg });
            reject(new Error(errMsg));
          }
        });

        xhr.addEventListener("error", () => {
          setProgress({ fileName: file.name, progress: 0, status: "error", error: "네트워크 오류" });
          reject(new Error("네트워크 오류"));
        });

        // 서버사이드 프록시 API 경유 — API 키 노출 방지
        xhr.open("POST", "/api/twelvelabs/upload");
        xhr.send(formData);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "업로드 실패";
      setProgress({ fileName: file.name, progress: 0, status: "error", error: msg });
      throw e;
    }
  }, []);

  return { progress, upload };
}

// 영상 분석 훅
export function useVideoAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (videoId: string, type: "summary" | "chapter" | "highlight" | "text") => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ data: unknown }>("/api/twelvelabs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, type }),
      });
      return data.data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "분석 실패";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, analyze };
}
