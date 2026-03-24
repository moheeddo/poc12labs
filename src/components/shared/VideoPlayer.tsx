"use client";

import { useRef, useEffect } from "react";
import { PlayCircle } from "lucide-react";

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
          <PlayCircle className="w-10 h-10 text-slate-600" />
          <p className="text-sm text-slate-500">영상을 선택하세요</p>
          <p className="text-xs text-slate-600">파일을 업로드하거나 검색 결과에서 선택</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      className={`w-full rounded-xl bg-black border border-surface-600 ${className}`}
    />
  );
}
