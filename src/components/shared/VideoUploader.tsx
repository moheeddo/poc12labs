"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileVideo, CheckCircle, AlertCircle, Link2, ArrowRight, FolderOpen } from "lucide-react";
import type { UploadProgress } from "@/lib/types";
import { formatFileSize, cn } from "@/lib/utils";

interface VideoUploaderProps {
  onUpload: (file: File) => Promise<void>;
  onUrlUpload?: (url: string) => Promise<void>;
  progress: UploadProgress | null;
  accentColor?: string; // coral, teal, amber
}

export default function VideoUploader({ onUpload, onUrlUpload, progress, accentColor = "coral" }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // URL 입력 모드 (413 에러 시 자동 전환)
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const rejectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progressColorMap: Record<string, string> = {
    coral: "bg-coral-500",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
  };

  const iconAccentColorMap: Record<string, string> = {
    coral: "text-coral-600",
    teal: "text-teal-600",
    amber: "text-amber-600",
  };

  const accentBtnMap: Record<string, string> = {
    coral: "bg-coral-600 hover:bg-coral-500 active:bg-coral-700",
    teal: "bg-teal-600 hover:bg-teal-500 active:bg-teal-700",
    amber: "bg-amber-600 hover:bg-amber-500 active:bg-amber-700",
  };

  const accentBorderMap: Record<string, string> = {
    coral: "border-coral-500/40 bg-coral-500/5",
    teal: "border-teal-500/40 bg-teal-500/5",
    amber: "border-amber-500/40 bg-amber-500/5",
  };

  // 파일 드롭 — 용량 제한 없음
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("video/")) {
      setSelectedFile(file);
      setIsRejected(false);
    } else if (file) {
      setIsRejected(true);
      if (rejectionTimerRef.current) clearTimeout(rejectionTimerRef.current);
      rejectionTimerRef.current = setTimeout(() => setIsRejected(false), 1000);
    }
  }, []);

  // 파일 선택 — Finder에서 선택
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  // 파일 업로드 시작
  const handleUpload = useCallback(async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
    }
  }, [selectedFile, onUpload]);

  // URL 업로드
  const handleUrlSubmit = useCallback(async () => {
    if (!onUrlUpload) return;
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setUrlError("URL을 입력해 주세요");
      return;
    }
    try { new URL(trimmed); } catch {
      setUrlError("올바른 URL 형식이 아닙니다");
      return;
    }
    setUrlError("");
    await onUrlUpload(trimmed);
  }, [videoUrl, onUrlUpload]);

  // 고유 input ID (여러 인스턴스 충돌 방지)
  const inputId = useRef(`file-upload-${Math.random().toString(36).slice(2, 8)}`).current;

  return (
    <div className="space-y-3">
      {/* 파일 input — label과 연결, JS .click() 없이 네이티브로 동작 */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="video/*"
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        onChange={handleFileSelect}
      />

      {!showUrlInput && (
        <>
          {/* label로 감싸서 클릭 시 네이티브로 파일 선택창 오픈 */}
          <label
            htmlFor={inputId}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "block border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer transition-all duration-200",
              isRejected
                ? "border-red-500/60 bg-red-500/5"
                : isDragging
                  ? `${accentBorderMap[accentColor]} scale-[1.01] animate-pulse`
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <div className="flex flex-col items-center">
              {isDragging ? (
                <Upload className={cn("w-8 h-8 mb-3 animate-bounce", iconAccentColorMap[accentColor])} />
              ) : (
                <FolderOpen className="w-8 h-8 mb-3 text-slate-500" />
              )}
              <p className="text-base text-slate-600 mb-1">
                클릭하여 파일 선택 또는 드래그앤드롭
              </p>
              <p className="text-sm text-slate-400">MP4, AVI, MOV 지원 · 용량 제한 없음</p>
            </div>
            {isRejected && (
              <p className="text-xs text-red-400 mt-2 animate-fade-in-up">
                영상 파일만 업로드할 수 있습니다
              </p>
            )}
          </label>

          {/* URL 입력 토글 (onUrlUpload이 있을 때만) */}
          {onUrlUpload && !selectedFile && !progress && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowUrlInput(true); }}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors mx-auto"
            >
              <Link2 className="w-3 h-3" />
              URL로 업로드
            </button>
          )}
        </>
      )}

      {/* ── URL 입력 모드 ── */}
      {showUrlInput && onUrlUpload && (
        <div className="space-y-2">
          <div className="border-2 border-dashed rounded-xl p-6 text-center border-slate-200">
            <Link2 className={cn("w-8 h-8 mx-auto mb-3", iconAccentColorMap[accentColor])} />
            <p className="text-base text-slate-600 mb-1">영상 URL을 입력하세요</p>
            <p className="text-sm text-slate-400 mb-4">
              Google Drive, Dropbox, S3 등 공개 접근 가능한 영상 URL
            </p>
            <div className="flex gap-2 max-w-lg mx-auto">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => { setVideoUrl(e.target.value); setUrlError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); }}
                placeholder="https://example.com/video.mp4"
                className={cn(
                  "flex-1 bg-white border rounded-lg px-3 py-2.5 text-base text-slate-900 placeholder-slate-400",
                  "focus:outline-none focus:ring-1",
                  urlError ? "border-red-500/50 focus:ring-red-500/30" : "border-slate-200",
                )}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!videoUrl.trim()}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150",
                  "active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                  accentBtnMap[accentColor],
                )}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {urlError && <p className="text-xs text-red-400 mt-2">{urlError}</p>}
          </div>
          <button
            onClick={() => setShowUrlInput(false)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors mx-auto"
          >
            <FolderOpen className="w-3 h-3" />
            파일로 업로드
          </button>
        </div>
      )}

      {/* ── 선택된 파일 ── */}
      {selectedFile && !progress && (
        <div className="flex items-center gap-3 bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm animate-fade-in-up">
          <FileVideo className={cn("w-5 h-5 shrink-0", iconAccentColorMap[accentColor])} />
          <div className="flex-1 min-w-0">
            <p className="text-base text-slate-900 truncate">{selectedFile.name}</p>
            <p className="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button onClick={() => setSelectedFile(null)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors duration-200" aria-label="파일 선택 취소">
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleUpload}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-150",
              "active:scale-95",
              accentBtnMap[accentColor],
            )}
          >
            업로드
          </button>
        </div>
      )}

      {/* ── 프로그레스 바 ── */}
      {progress && (
        <div className={cn(
          "bg-white rounded-lg p-3.5 border shadow-sm",
          progress.status === "error" ? "border-red-500/30" : "border-slate-200",
        )}>
          <div className="flex items-center gap-3 mb-2">
            {progress.status === "complete" ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce [animation-iteration-count:1]" />
            ) : progress.status === "error" ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <FileVideo className="w-5 h-5 text-slate-400 shrink-0 animate-pulse" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-base text-slate-900 truncate">{progress.fileName}</p>
              <p className="text-sm text-slate-500">
                {progress.status === "uploading" && `전송 중... ${progress.progress}%`}
                {progress.status === "processing" && "업로드 완료 처리 중..."}
                {progress.status === "indexing" && `인덱싱 중... ${progress.progress}%`}
                {progress.status === "complete" && "업로드 + 인덱싱 완료"}
                {progress.status === "error" && "오류 발생"}
              </p>
            </div>
          </div>

          {/* 업로드 에러 상세 표시 */}
          {progress.status === "error" && progress.error && (
            <div className="mt-1 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
              <p className="text-xs text-red-400 font-medium">
                {progress.error}
              </p>
              {/* 파일 크기 관련 에러 시 URL 업로드 전환 버튼 */}
              {onUrlUpload && (progress.error.includes("URL로 업로드") || progress.error.includes("너무 큽니다")) && (
                <button
                  onClick={() => { setShowUrlInput(true); setSelectedFile(null); }}
                  className={cn(
                    "mt-2.5 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all duration-150",
                    "active:scale-95",
                    accentBtnMap[accentColor],
                  )}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  URL로 업로드 전환
                </button>
              )}
            </div>
          )}

          {(progress.status === "uploading" || progress.status === "processing" || progress.status === "indexing") && (
            <div
              className="w-full bg-surface-700 rounded-full h-1.5"
              role="progressbar"
              aria-valuenow={progress.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${progress.fileName} 업로드 진행률`}
            >
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  progress.status === "indexing" ? "animate-pulse bg-violet-500"
                    : progress.status === "processing" ? "animate-pulse bg-blue-500"
                    : progressColorMap[accentColor],
                )}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
