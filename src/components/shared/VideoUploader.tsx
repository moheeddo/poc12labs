"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileVideo, CheckCircle, AlertCircle } from "lucide-react";
import type { UploadProgress } from "@/lib/types";
import { formatFileSize, cn } from "@/lib/utils";

interface VideoUploaderProps {
  onUpload: (file: File) => Promise<void>;
  progress: UploadProgress | null;
  accentColor?: string; // coral, teal, amber
}

export default function VideoUploader({ onUpload, progress, accentColor = "coral" }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rejectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("video/")) {
      setSelectedFile(file);
      setIsRejected(false);
    } else if (file) {
      // 비디오가 아닌 파일 — 빨간 테두리 플래시 + 에러 메시지
      setIsRejected(true);
      if (rejectionTimerRef.current) clearTimeout(rejectionTimerRef.current);
      rejectionTimerRef.current = setTimeout(() => setIsRejected(false), 1000);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
    }
  }, [selectedFile, onUpload]);

  return (
    <div className="space-y-3">
      {/* 드래그 앤 드롭 영역 */}
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
              ? `${colorMap[accentColor]} scale-[1.01]`
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
        <Upload className={cn("w-8 h-8 mx-auto mb-3", isRejected ? "text-red-400" : "text-slate-500")} />
        <p className="text-sm text-slate-300 mb-1">영상 파일을 드래그하거나 클릭하여 선택</p>
        <p className="text-xs text-slate-500">MP4, AVI, MOV 지원 (최대 2GB)</p>
        {isRejected && (
          <p className="text-xs text-red-400 mt-2 animate-fade-in-up">
            지원하지 않는 파일 형식입니다. 영상 파일만 업로드할 수 있습니다.
          </p>
        )}
      </div>

      {/* 선택된 파일 */}
      {selectedFile && !progress && (
        <div className="flex items-center gap-3 bg-surface-800 rounded-lg p-3 border border-surface-700">
          <FileVideo className="w-5 h-5 text-slate-400 shrink-0" />
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
              accentColor === "coral" && "bg-coral-600 hover:bg-coral-500 active:bg-coral-700",
              accentColor === "teal" && "bg-teal-600 hover:bg-teal-500 active:bg-teal-700",
              accentColor === "amber" && "bg-amber-600 hover:bg-amber-500 active:bg-amber-700",
            )}
          >
            업로드
          </button>
        </div>
      )}

      {/* 프로그레스 바 */}
      {progress && (
        <div className="bg-surface-800 rounded-lg p-3 border border-surface-700">
          <div className="flex items-center gap-3 mb-2">
            {progress.status === "complete" ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : progress.status === "error" ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <FileVideo className="w-5 h-5 text-slate-400 shrink-0 animate-pulse" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{progress.fileName}</p>
              <p className="text-xs text-slate-500">
                {progress.status === "uploading" && `업로드 중... ${progress.progress}%`}
                {progress.status === "processing" && "인덱싱 처리 중..."}
                {progress.status === "complete" && "업로드 완료"}
                {progress.status === "error" && (progress.error || "오류 발생")}
              </p>
            </div>
          </div>
          {(progress.status === "uploading" || progress.status === "processing") && (
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
                  progress.status === "processing" ? "animate-pulse bg-blue-500" : progressColorMap[accentColor],
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
