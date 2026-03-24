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
      <div className={`bg-surface-800 border border-surface-700 rounded-xl flex flex-col items-center justify-center gap-3 aspect-video ${className}`}>
        <PlayCircle className="w-10 h-10 text-slate-600" />
        <p className="text-sm text-slate-500">영상을 선택하세요</p>
        <p className="text-xs text-slate-600">파일을 업로드하거나 검색 결과에서 선택</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      className={`w-full rounded-xl bg-black ${className}`}
    />
  );
}
