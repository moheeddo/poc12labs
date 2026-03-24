"use client";

import { useRef, useEffect } from "react";
import { PlayCircle, Upload, Search } from "lucide-react";

interface VideoPlayerProps {
  src?: string;
  startTime?: number;
  className?: string;
}

export default function VideoPlayer({ src, startTime, className = "" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && startTime !== undefined) {
      videoRef.current.currentTime = startTime;
    }
  }, [startTime]);

  if (!src) {
    return (
      <div className={`relative overflow-hidden border border-surface-700 rounded-xl aspect-video ${className}`}>
        {/* 시머 스켈레톤 배경 */}
        <div className="absolute inset-0 animate-shimmer" />
        {/* 콘텐츠 오버레이 */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 h-full">
          <div className="relative">
            <PlayCircle className="w-12 h-12 text-slate-600" />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-surface-800 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium">영상을 선택하세요</p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> 업로드</span>
            <span className="text-surface-600">|</span>
            <span className="flex items-center gap-1"><Search className="w-3 h-3" /> 검색</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      aria-label="영상 플레이어"
      className={`w-full rounded-xl bg-black border border-surface-600 ${className}`}
    />
  );
}
