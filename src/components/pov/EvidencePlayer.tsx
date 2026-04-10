"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  X,
  MessageSquare,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import type { StepEvaluation, TranscriptSegment } from "@/lib/types";

// ── Props 인터페이스 ──────────────────────────────────────
export interface EvidencePlayerProps {
  videoUrl?: string;                      // blob URL 또는 원격 URL
  step: StepEvaluation;                   // 현재 선택된 SOP 단계 평가 결과
  transcription?: TranscriptSegment[];    // 전사문 데이터
  startTime: number;                      // 구간 시작 (초)
  endTime: number;                        // 구간 끝 (초)
  onClose: () => void;                    // 닫기
  onPrevStep?: () => void;                // 이전 단계
  onNextStep?: () => void;                // 다음 단계
}

// ── 상태별 색상/라벨 매핑 ─────────────────────────────────
const STATUS_CONFIG: Record<
  StepEvaluation["status"],
  { label: string; bg: string; border: string; text: string; badge: string }
> = {
  pass: {
    label: "통과",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  fail: {
    label: "미흡",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
  },
  partial: {
    label: "부분",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  skipped: {
    label: "미탐지",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
    badge: "bg-slate-100 text-slate-600",
  },
};

// 상태별 기본 메시지
const DEFAULT_NOTES: Record<StepEvaluation["status"], string> = {
  pass: "절차를 정확히 수행하였습니다.",
  fail: "해당 절차 수행이 탐지되지 않았습니다.",
  partial: "수행은 확인되었으나 일부 요소가 누락되었습니다.",
  skipped: "영상에서 해당 절차를 탐지하지 못했습니다.",
};

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function EvidencePlayer({
  videoUrl,
  step,
  transcription,
  startTime,
  endTime,
  onClose,
  onPrevStep,
  onNextStep,
}: EvidencePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);

  const segmentDuration = Math.max(endTime - startTime, 1);
  const config = STATUS_CONFIG[step.status];

  // ── 구간 내 전사문 필터링 ─────────────────────────────
  const relevantTranscripts = (transcription ?? []).filter(
    (seg) => seg.end >= startTime && seg.start <= endTime
  );

  // ── 마운트 시 startTime으로 seek ──────────────────────
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
      setIsPlaying(false);
    }
  }, [startTime, videoUrl]);

  // ── endTime 도달 시 자동 정지 ─────────────────────────
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    if (t >= endTime) {
      videoRef.current.pause();
      videoRef.current.currentTime = endTime;
      setIsPlaying(false);
    }
  }, [endTime]);

  // ── 재생/일시정지 토글 ────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // endTime에 도달했으면 startTime부터 다시 재생
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, startTime, endTime]);

  // ── 음소거 토글 ───────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // ── 특정 시점으로 seek ────────────────────────────────
  const seekToTime = useCallback(
    (time: number) => {
      if (!videoRef.current) return;
      const safeTime = Math.max(startTime, Math.min(time, endTime));
      videoRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    },
    [startTime, endTime, isPlaying]
  );

  // ── 프로그레스 바 클릭으로 seek ───────────────────────
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = startTime + ratio * segmentDuration;
      seekToTime(targetTime);
    },
    [startTime, segmentDuration, seekToTime]
  );

  // ── 구간 내 진행률 (0-100%) ───────────────────────────
  const progressPercent =
    segmentDuration > 0
      ? Math.max(0, Math.min(100, ((currentTime - startTime) / segmentDuration) * 100))
      : 0;

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        {/* 이전 단계 */}
        {onPrevStep && (
          <button
            onClick={onPrevStep}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            title="이전 단계"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* 상태 배지 */}
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", config.badge)}>
          {config.label}
        </span>

        {/* 단계 설명 */}
        <span className="text-sm font-medium text-slate-700 truncate flex-1">
          {step.description}
        </span>

        {/* 다음 단계 */}
        {onNextStep && (
          <button
            onClick={onNextStep}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            title="다음 단계"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* 닫기 */}
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors ml-1"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── 본문: 2분할 레이아웃 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-slate-200">
        {/* 좌측: 비디오 플레이어 */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500">해당 구간 영상</span>
            <span className="text-xs font-mono text-amber-600 ml-auto">
              {formatTime(startTime)} ~ {formatTime(endTime)}
            </span>
          </div>

          {videoUrl ? (
            <div className="space-y-2">
              {/* 영상 */}
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                />
                {/* 중앙 재생/일시정지 오버레이 */}
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
                >
                  {!isPlaying && (
                    <Play className="w-12 h-12 text-white/70" />
                  )}
                </button>
              </div>

              {/* 프로그레스 바 */}
              <div
                ref={progressRef}
                className="relative h-1.5 bg-slate-200 rounded-full cursor-pointer group"
                onClick={handleProgressClick}
              >
                <div
                  className="absolute h-full bg-amber-500 rounded-full transition-all pointer-events-none"
                  style={{ width: `${progressPercent}%` }}
                />
                {/* 드래그 핸들 */}
                <div
                  className="absolute w-3 h-3 bg-amber-500 rounded-full -top-[3px] shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `calc(${progressPercent}% - 6px)` }}
                />
              </div>

              {/* 컨트롤 바 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title={isPlaying ? "일시정지" : "재생"}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title={isMuted ? "음소거 해제" : "음소거"}
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <span className="text-xs font-mono text-slate-500 ml-auto">
                  {formatTime(currentTime)} / {formatTime(endTime)}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-100 border border-slate-200 aspect-video flex flex-col items-center justify-center gap-2">
              <Play className="w-8 h-8 text-slate-300" />
              <span className="text-sm text-slate-400">영상 URL 없음</span>
            </div>
          )}
        </div>

        {/* 우측: 전사문 + AI 판정 근거 */}
        <div className="p-4 space-y-3">
          {/* 전사문 패널 */}
          <div>
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
              <MessageSquare className="w-3 h-3" /> 전사문
            </span>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-[160px] overflow-y-auto space-y-1.5">
              {relevantTranscripts.length > 0 ? (
                relevantTranscripts.map((seg, i) => (
                  <button
                    key={i}
                    onClick={() => seekToTime(seg.start)}
                    className="flex items-start gap-2 w-full text-left hover:bg-white rounded px-1.5 py-1 transition-colors group"
                  >
                    <span className="text-[10px] font-mono font-semibold text-slate-400 min-w-[36px] mt-0.5 group-hover:text-amber-600 transition-colors">
                      {formatTime(seg.start)}
                    </span>
                    <div className="flex-1">
                      {seg.speaker && (
                        <span className="text-[10px] font-semibold text-slate-500 mr-1">
                          [{seg.speaker}]
                        </span>
                      )}
                      <span className="text-sm text-slate-700 leading-snug">
                        {seg.text}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">
                  해당 구간 전사문 없음
                </p>
              )}
            </div>
          </div>

          {/* AI 판정 근거 패널 */}
          <div className={cn("rounded-lg p-3 border", config.bg, config.border)}>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className={cn("w-3.5 h-3.5", config.text)} />
              <span className={cn("text-xs font-semibold", config.text)}>
                AI 판정 근거
              </span>
            </div>
            <p className={cn("text-sm leading-relaxed mb-3", config.text)}>
              {step.note || DEFAULT_NOTES[step.status]}
            </p>

            {/* 신뢰도 + 타임스탬프 */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-500">
                <span className="font-medium">신뢰도:</span>
                <span
                  className={cn(
                    "font-semibold",
                    step.confidence >= 80
                      ? "text-emerald-600"
                      : step.confidence >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                  )}
                >
                  {step.confidence}%
                </span>
              </span>
              {step.timestamp != null && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono">{formatTime(step.timestamp)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
