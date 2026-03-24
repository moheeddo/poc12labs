"use client";

import { useRef, useEffect } from "react";

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
      <div className={`bg-surface-800 border border-surface-700 rounded-xl flex items-center justify-center aspect-video ${className}`}>
        <p className="text-sm text-slate-500">영상을 선택하세요</p>
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
