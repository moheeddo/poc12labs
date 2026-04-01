"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileVideo, CheckCircle, AlertCircle, Link2, ArrowRight } from "lucide-react";
import type { UploadProgress } from "@/lib/types";
import { formatFileSize, cn } from "@/lib/utils";

interface VideoUploaderProps {
  onUpload: (file: File) => Promise<void>;
  onUrlUpload?: (url: string) => Promise<void>;
  progress: UploadProgress | null;
  accentColor?: string; // coral, teal, amber
}

type UploadMode = "file" | "url";

export default function VideoUploader({ onUpload, onUrlUpload, progress, accentColor = "coral" }: VideoUploaderProps) {
  const [mode, setMode] = useState<UploadMode>(onUrlUpload ? "url" : "file");
  const [isDragging, setIsDragging] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSizeError, setFileSizeError] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const rejectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

  const colorMap: Record<string, string> = {
    coral: "border-coral-500/40 bg-coral-500/5",
    teal: "border-teal-500/40 bg-teal-500/5",
    amber: "border-amber-500/40 bg-amber-500/5",
  };

  const progressColorMap: Record<string, string> = {
    coral: "bg-coral-500",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
  };

  const iconAccentColorMap: Record<string, string> = {
    coral: "text-coral-400",
    teal: "text-teal-400",
    amber: "text-amber-400",
  };

  const accentBgMap: Record<string, string> = {
    coral: "bg-coral-500/15 text-coral-400 border-coral-500/30",
    teal: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };

  const accentBtnMap: Record<string, string> = {
    coral: "bg-coral-600 hover:bg-coral-500 active:bg-coral-700",
    teal: "bg-teal-600 hover:bg-teal-500 active:bg-teal-700",
    amber: "bg-amber-600 hover:bg-amber-500 active:bg-amber-700",
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("video/")) {
      if (file.size > MAX_FILE_SIZE) {
        setFileSizeError(true);
        setSelectedFile(null);
        return;
      }
      setFileSizeError(false);
      setSelectedFile(file);
      setIsRejected(false);
    } else if (file) {
      setFileSizeError(false);
      setIsRejected(true);
      if (rejectionTimerRef.current) clearTimeout(rejectionTimerRef.current);
      rejectionTimerRef.current = setTimeout(() => setIsRejected(false), 1000);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setFileSizeError(true);
        setSelectedFile(null);
        return;
      }
      setFileSizeError(false);
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
    }
  }, [selectedFile, onUpload]);

  const handleUrlSubmit = useCallback(async () => {
    if (!onUrlUpload) return;
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setUrlError("URL을 입력해 주세요");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setUrlError("올바른 URL 형식이 아닙니다");
      return;
    }
    setUrlError("");
    await onUrlUpload(trimmed);
  }, [videoUrl, onUrlUpload]);

  const showModeTabs = !!onUrlUpload;

  return (
    <div className="space-y-3">
      {/* 모드 탭 — URL 업로드가 지원될 때만 표시 */}
      {showModeTabs && (
        <div className="flex gap-1 bg-surface-800/60 rounded-lg p-1 border border-surface-700/40">
          <button
            onClick={() => setMode("url")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
              mode === "url"
                ? `${accentBgMap[accentColor]}`
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Link2 className="w-3.5 h-3.5" />
            URL 입력
            <span className="text-[10px] opacity-60 ml-0.5">용량무제한</span>
          </button>
          <button
            onClick={() => setMode("file")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
              mode === "file"
                ? `${accentBgMap[accentColor]}`
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            파일 업로드
            <span className="text-[10px] opacity-60 ml-0.5">최대 2GB</span>
          </button>
        </div>
      )}

      {/* URL 입력 모드 */}
      {mode === "url" && showModeTabs && (
        <div className="space-y-2">
          <div className={cn(
            "border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-all duration-200",
            "border-surface-600",
          )}>
            <Link2 className={cn("w-8 h-8 mx-auto mb-3", iconAccentColorMap[accentColor])} />
            <p className="text-sm text-slate-300 mb-1">영상 URL을 입력하세요</p>
            <p className="text-xs text-slate-500 mb-4">
              Google Drive, Dropbox, S3 등 공개 접근 가능한 영상 URL · 용량 제한 없음
            </p>
            <div className="flex gap-2 max-w-lg mx-auto">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => { setVideoUrl(e.target.value); setUrlError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); }}
                placeholder="https://example.com/video.mp4"
                className={cn(
                  "flex-1 bg-surface-800 border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600",
                  "focus:outline-none focus:ring-1",
                  urlError
                    ? "border-red-500/50 focus:ring-red-500/30"
                    : `border-surface-600 focus:border-${accentColor}-500/50 focus:ring-${accentColor}-500/30`,
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
            {urlError && (
              <p className="text-xs text-red-400 mt-2">{urlError}</p>
            )}
          </div>
        </div>
      )}

      {/* 파일 업로드 모드 */}
      {mode === "file" && (
        <>
          <div
            role="button"
            aria-label="영상 파일 업로드 영역"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer transition-all duration-200",
              isRejected
                ? "border-red-500/60 bg-red-500/5"
                : isDragging
                  ? `${colorMap[accentColor]} scale-[1.01] animate-pulse`
                  : "border-surface-600 hover:border-surface-500 hover:bg-surface-800/30",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className={cn("w-8 h-8 mx-auto mb-3", isRejected ? "text-red-400" : "text-slate-500", isDragging && "animate-bounce")} />
            <p className="text-sm text-slate-300 mb-1">영상 파일을 드래그하거나 클릭하여 선택</p>
            <p className="text-xs text-slate-500">MP4, AVI, MOV 지원 (최대 2GB)</p>
            {isRejected && (
              <p className="text-xs text-red-400 mt-2 animate-fade-in-up">
                지원하지 않는 파일 형식입니다. 영상 파일만 업로드할 수 있습니다.
              </p>
            )}
            {fileSizeError && (
              <p className="text-xs text-red-500 mt-2">
                파일 크기가 2GB를 초과합니다
              </p>
            )}
          </div>

          {/* 선택된 파일 */}
          {selectedFile && !progress && (
            <div className="flex items-center gap-3 bg-surface-800 rounded-lg p-3 border border-surface-700">
              <FileVideo className={cn("w-5 h-5 shrink-0", iconAccentColorMap[accentColor] || "text-slate-400")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button onClick={() => setSelectedFile(null)} className="p-2 text-slate-500 hover:text-white transition-colors duration-200" aria-label="파일 선택 취소">
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
        </>
      )}

      {/* 프로그레스 바 — 공통 */}
      {progress && (
        <div className={cn(
          "bg-surface-800 rounded-lg p-3 border",
          progress.status === "error" && progress.error?.startsWith("UPLOAD_413:")
            ? "border-amber-500/30"
            : "border-surface-700",
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
              <p className="text-sm text-white truncate">{progress.fileName}</p>
              <p className="text-xs text-slate-500">
                {progress.status === "uploading" && `TwelveLabs로 전송 중... ${progress.progress}%`}
                {progress.status === "processing" && "업로드 완료 처리 중..."}
                {progress.status === "indexing" && `인덱싱 중... ${progress.progress}%`}
                {progress.status === "complete" && "업로드 + 인덱싱 완료"}
                {progress.status === "error" && !progress.error?.startsWith("UPLOAD_413:") && (progress.error || "오류 발생")}
              </p>
            </div>
          </div>

          {/* 413 에러 시 URL 모드 전환 안내 */}
          {progress.status === "error" && progress.error?.startsWith("UPLOAD_413:") && showModeTabs && (
            <div className="mt-1 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
              <p className="text-xs text-amber-400 font-medium mb-2">
                {progress.error.replace("UPLOAD_413:", "")}
              </p>
              <button
                onClick={() => { setMode("url"); setSelectedFile(null); }}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors duration-200"
              >
                <Link2 className="w-3.5 h-3.5" />
                URL 입력 모드로 전환
                <ArrowRight className="w-3 h-3" />
              </button>
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
