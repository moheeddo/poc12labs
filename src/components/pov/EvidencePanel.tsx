"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, MessageSquare, ArrowRight, AlertTriangle } from 'lucide-react';
import type { TranscriptSegment, DetectedStep } from '@/lib/types';
import { formatTime, cn } from '@/lib/utils';

interface Props {
  step: DetectedStep;
  stepDescription: string;
  status: 'pass' | 'fail' | 'partial' | 'skipped';
  note?: string;
  videoUrl?: string;
  transcription?: TranscriptSegment[];
  timestamp: number;
  onCrossVideoJump?: (time: number, target: 'operatorB' | 'instructor') => void;
  hasCrossVideos?: { operatorB?: boolean; instructor?: boolean };
}

export default function EvidencePanel({
  step, stepDescription, status, note, videoUrl, transcription,
  timestamp, onCrossVideoJump, hasCrossVideos,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const relevantTranscripts = transcription?.filter(
    seg => seg.start >= timestamp - 5 && seg.end <= timestamp + 30
  ) || [];

  useEffect(() => {
    if (videoRef.current && videoUrl) { videoRef.current.currentTime = timestamp; }
  }, [timestamp, videoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); } else { videoRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const seekToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (!isPlaying) { videoRef.current.play(); setIsPlaying(true); }
    }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-slate-200">
        {/* 좌측: 영상 플레이어 */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500">해당 구간 영상</span>
            <span className="text-xs font-mono text-amber-600 ml-auto">{formatTime(timestamp)}</span>
          </div>
          {videoUrl ? (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain"
                onEnded={() => setIsPlaying(false)} />
              <button onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                {isPlaying ? <Pause className="w-10 h-10 text-white/80" /> : <Play className="w-10 h-10 text-white/80" />}
              </button>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-200 aspect-video flex items-center justify-center">
              <span className="text-sm text-slate-400">영상 미리보기 불가 (URL 업로드)</span>
            </div>
          )}
        </div>

        {/* 우측: 전사문 + AI 판정 */}
        <div className="p-4">
          <div className="mb-3">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
              <MessageSquare className="w-3 h-3" /> 전사문
            </span>
            <div className="bg-white border border-slate-200 rounded-lg p-3 max-h-[120px] overflow-y-auto space-y-1.5">
              {relevantTranscripts.length > 0 ? relevantTranscripts.map((seg, i) => (
                <button key={i} onClick={() => seekToTime(seg.start)}
                  className="flex items-start gap-2 w-full text-left hover:bg-slate-50 rounded px-1.5 py-0.5 transition-colors">
                  <span className="text-[10px] font-mono font-semibold text-slate-400 min-w-[36px] mt-0.5">{formatTime(seg.start)}</span>
                  <span className="text-sm text-slate-700 leading-snug">{seg.text}</span>
                </button>
              )) : (
                <p className="text-xs text-slate-400">해당 구간 전사문 없음</p>
              )}
            </div>
          </div>

          <div className={cn("rounded-lg p-3 border",
            status === 'fail' ? "bg-red-50 border-red-200" :
            status === 'partial' ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className={cn("w-3.5 h-3.5",
                status === 'fail' ? "text-red-500" : status === 'partial' ? "text-amber-500" : "text-emerald-500")} />
              <span className={cn("text-xs font-semibold",
                status === 'fail' ? "text-red-700" : status === 'partial' ? "text-amber-700" : "text-emerald-700")}>AI 판정 근거</span>
            </div>
            <p className={cn("text-sm leading-relaxed",
              status === 'fail' ? "text-red-600" : status === 'partial' ? "text-amber-600" : "text-emerald-600")}>
              {note || (status === 'fail' ? '해당 절차 수행이 탐지되지 않았습니다.' :
                        status === 'partial' ? '수행은 확인되었으나 일부 요소가 누락되었습니다.' :
                        '절차를 정확히 수행하였습니다.')}
            </p>
          </div>
        </div>
      </div>

      {(hasCrossVideos?.operatorB || hasCrossVideos?.instructor) && (
        <div className="px-4 py-2.5 border-t border-slate-200 flex items-center gap-3 bg-white/60">
          <span className="text-xs text-slate-400">관련 영상:</span>
          {hasCrossVideos.operatorB && onCrossVideoJump && (
            <button onClick={() => onCrossVideoJump(timestamp, 'operatorB')}
              className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors">
              운전원B 같은 시점 <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {hasCrossVideos.instructor && onCrossVideoJump && (
            <button onClick={() => onCrossVideoJump(timestamp, 'instructor')}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
              교관 시점 <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
