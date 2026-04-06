"use client";

// src/components/lecture/PptUploader.tsx
// 강의안 PPT 업로드 컴포넌트 (드래그앤드롭)

import { useState, useRef, useCallback } from "react";
import { FileText, Check, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedPpt } from "@/lib/lecture-types";

interface PptUploaderProps {
  pptData: ParsedPpt | null;
  onUpload: (file: File) => Promise<ParsedPpt | null>;
  loading?: boolean;
}

export default function PptUploader({ pptData, onUpload, loading }: PptUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useRef(`ppt-upload-${Math.random().toString(36).slice(2, 8)}`).current;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".pptx")) {
      onUpload(file);
    }
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // 같은 파일 재선택 허용
    e.target.value = "";
  }, [onUpload]);

  const handleChange = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // PPT 업로드 완료 상태
  if (pptData) {
    const notesCount = pptData.slides.filter((s) => s.notes.trim().length > 0).length;
    return (
      <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{pptData.fileName}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            슬라이드 {pptData.slideCount}장 · 발표노트 {notesCount}장 포함
          </p>
        </div>
        <button
          onClick={handleChange}
          className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          변경
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pptx"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="border-2 border-dashed border-coral-300 bg-coral-50/30 rounded-xl p-5 text-center">
        <Loader2 className="w-6 h-6 text-coral-500 mx-auto mb-2 animate-spin" />
        <p className="text-sm text-slate-500">PPT 파싱 중...</p>
      </div>
    );
  }

  // 업로드 대기 상태
  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".pptx"
        className="hidden"
        onChange={handleFileSelect}
      />
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200",
          isDragging
            ? "border-coral-400 bg-coral-50/30 scale-[1.01]"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        )}
      >
        <div className="flex flex-col items-center">
          {isDragging ? (
            <Upload className="w-6 h-6 mb-2 text-coral-500 animate-bounce" />
          ) : (
            <FileText className="w-6 h-6 mb-2 text-slate-400" />
          )}
          <p className="text-sm text-slate-600">강의안 PPT 첨부 (선택)</p>
          <p className="text-xs text-slate-400 mt-1">.pptx 파일만 지원</p>
        </div>
      </label>
    </div>
  );
}
