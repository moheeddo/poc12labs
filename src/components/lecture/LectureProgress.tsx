"use client";

// src/components/lecture/LectureProgress.tsx
// 강의 평가 분석 진행 상태 표시

import { Circle, Loader2, Check, SkipForward, AlertCircle } from "lucide-react";
import type { LectureAnalysisStage, StageStatus } from "@/lib/lecture-types";

interface LectureProgressProps {
  progress: number;
  stages: Record<LectureAnalysisStage, StageStatus> | null;
}

// 스테이지 순서 및 라벨
const STAGE_CONFIG: { key: LectureAnalysisStage; label: string }[] = [
  { key: "transcription", label: "전사 추출" },
  { key: "pptParsing", label: "PPT 파싱" },
  { key: "contentFidelity", label: "내용 충실도 분석" },
  { key: "multimodal", label: "멀티모달 전달력 분석" },
  { key: "pedagogy", label: "교수법 지표 추출" },
  { key: "scoring", label: "통합 스코어링" },
  { key: "reporting", label: "리포트 생성" },
];

// 상태별 아이콘
function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case "running":
      return <Loader2 className="w-4 h-4 text-coral-500 animate-spin" />;
    case "done":
      return <Check className="w-4 h-4 text-emerald-500" />;
    case "skipped":
      return <SkipForward className="w-4 h-4 text-slate-400" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Circle className="w-4 h-4 text-slate-300" />;
  }
}

export default function LectureProgress({ progress, stages }: LectureProgressProps) {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* 진행률 바 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">분석 진행 중...</p>
          <span className="text-sm font-mono text-coral-600 tabular-nums">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-coral-400 to-coral-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 스테이지 목록 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
        {STAGE_CONFIG.map(({ key, label }) => {
          const status = stages?.[key] || "pending";
          return (
            <div
              key={key}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                status === "running" ? "bg-coral-50" : ""
              }`}
            >
              <StageIcon status={status} />
              <span
                className={`text-sm ${
                  status === "running"
                    ? "text-coral-700 font-medium"
                    : status === "done"
                    ? "text-slate-700"
                    : status === "error"
                    ? "text-red-600"
                    : status === "skipped"
                    ? "text-slate-400 line-through"
                    : "text-slate-400"
                }`}
              >
                {label}
              </span>
              {status === "skipped" && (
                <span className="text-xs text-slate-400 ml-auto">건너뜀</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
