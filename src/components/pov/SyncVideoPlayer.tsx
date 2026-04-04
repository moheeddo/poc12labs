'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

// ── 타입 정의 ──────────────────────────────────────────────
export interface SyncMarker {
  time: number;
  label: string;
  color: 'red' | 'amber' | 'green';
  type: 'deviation' | 'highlight' | 'gap';
}

interface Props {
  expertVideoUrl?: string;   // 숙련자 영상 URL
  traineeVideoUrl?: string;  // 훈련생 영상 URL
  expertLabel?: string;      // 좌측 레이블 (기본: "숙련자 (골드스탠다드)")
  traineeLabel?: string;     // 우측 레이블 (기본: "훈련생")
  markers?: SyncMarker[];    // 타임라인 마커 (이탈·격차·하이라이트)
  onTimeUpdate?: (time: number) => void;
}

// ── 마커 색상 클래스 매핑 ───────────────────────────────────
const markerColorClass: Record<string, string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
};

// ── 시간 포맷 헬퍼 ─────────────────────────────────────────
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── 영상 없을 때 플레이스홀더 ──────────────────────────────
function VideoPlaceholder({ message }: { message: string }) {
  return (
    <div className="w-full aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
      {/* 영상 아이콘 */}
      <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
      <span className="text-center px-4">{message}</span>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function SyncVideoPlayer({
  expertVideoUrl,
  traineeVideoUrl,
  expertLabel = '숙련자 (골드스탠다드)',
  traineeLabel = '훈련생',
  markers = [],
  onTimeUpdate,
}: Props) {
  const expertRef  = useRef<HTMLVideoElement>(null);
  const traineeRef = useRef<HTMLVideoElement>(null);

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [offset,       setOffset]       = useState(0); // 숙련자 오프셋 (초)

  // ── 동기화: 훈련생 기준, 숙련자에 오프셋 적용 ─────────────
  const syncVideos = useCallback(() => {
    if (!expertRef.current || !traineeRef.current) return;
    const traineeTime  = traineeRef.current.currentTime;
    const expertTarget = traineeTime + offset;
    // 0.5초 이상 차이날 때만 강제 보정 (루프 방지)
    if (Math.abs(expertRef.current.currentTime - expertTarget) > 0.5) {
      expertRef.current.currentTime = Math.max(0, expertTarget);
    }
  }, [offset]);

  // ── 재생 ───────────────────────────────────────────────
  const play = useCallback(() => {
    expertRef.current?.play().catch(() => { /* src 없을 때 무시 */ });
    traineeRef.current?.play().catch(() => { /* src 없을 때 무시 */ });
    setIsPlaying(true);
  }, []);

  // ── 일시정지 ───────────────────────────────────────────
  const pause = useCallback(() => {
    expertRef.current?.pause();
    traineeRef.current?.pause();
    setIsPlaying(false);
  }, []);

  // ── 시크 ───────────────────────────────────────────────
  const seekTo = useCallback((time: number) => {
    const safeTime = Math.max(0, Math.min(time, duration));
    if (traineeRef.current) traineeRef.current.currentTime = safeTime;
    if (expertRef.current)  expertRef.current.currentTime  = Math.max(0, safeTime + offset);
    setCurrentTime(safeTime);
  }, [duration, offset]);

  // ── 10초 스킵 ──────────────────────────────────────────
  const skipBack    = useCallback(() => seekTo(currentTime - 10), [seekTo, currentTime]);
  const skipForward = useCallback(() => seekTo(currentTime + 10), [seekTo, currentTime]);

  // ── 재생 속도 동기화 ───────────────────────────────────
  useEffect(() => {
    if (expertRef.current)  expertRef.current.playbackRate  = playbackRate;
    if (traineeRef.current) traineeRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // ── 훈련생 timeupdate → currentTime / syncVideos ───────
  useEffect(() => {
    const trainee = traineeRef.current;
    if (!trainee) return;
    const handleTimeUpdate = () => {
      setCurrentTime(trainee.currentTime);
      syncVideos();
      onTimeUpdate?.(trainee.currentTime);
    };
    const handleEnded = () => setIsPlaying(false);
    trainee.addEventListener('timeupdate', handleTimeUpdate);
    trainee.addEventListener('ended',      handleEnded);
    return () => {
      trainee.removeEventListener('timeupdate', handleTimeUpdate);
      trainee.removeEventListener('ended',      handleEnded);
    };
  }, [syncVideos, onTimeUpdate]);

  // ── 훈련생 영상 metadata 로드 → duration 설정 ──────────
  useEffect(() => {
    const trainee = traineeRef.current;
    if (!trainee) return;
    const handleLoadedMetadata = () => {
      setDuration(trainee.duration || 0);
    };
    trainee.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => trainee.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [traineeVideoUrl]);

  // ── 오프셋 변경 시 즉시 숙련자 영상 위치 보정 ──────────
  useEffect(() => {
    if (!expertRef.current) return;
    expertRef.current.currentTime = Math.max(0, currentTime + offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  // ── 진행률 (%) 계산 ─────────────────────────────────────
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── 렌더 ───────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 flex flex-col gap-3">
      {/* 섹션 제목 */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-4 rounded-full bg-blue-500" />
        <span className="text-xs font-semibold text-zinc-300">동기화 비교 재생</span>
        <span className="ml-auto text-[10px] text-zinc-600 font-mono">SYNC PLAYER</span>
      </div>

      {/* ── 영상 나란히 배치 ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* 좌: 숙련자 */}
        <div>
          <div className="text-xs text-emerald-400 font-semibold mb-1.5 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            {expertLabel}
          </div>
          {expertVideoUrl ? (
            <video
              ref={expertRef}
              src={expertVideoUrl}
              className="w-full rounded-lg bg-black border border-zinc-700"
              preload="metadata"
              playsInline
              /* 숙련자 영상 독립 클릭도 일괄 제어로 리다이렉트 */
              onClick={isPlaying ? pause : play}
            />
          ) : (
            <VideoPlaceholder message="숙련자 영상이 등록되지 않았습니다" />
          )}
        </div>

        {/* 우: 훈련생 */}
        <div>
          <div className="text-xs text-amber-400 font-semibold mb-1.5 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            {traineeLabel}
          </div>
          {traineeVideoUrl ? (
            <video
              ref={traineeRef}
              src={traineeVideoUrl}
              className="w-full rounded-lg bg-black border border-zinc-700"
              preload="metadata"
              playsInline
              onClick={isPlaying ? pause : play}
            />
          ) : (
            <VideoPlaceholder message="훈련생 영상을 선택해주세요" />
          )}
        </div>
      </div>

      {/* ── 통합 타임라인 + 마커 ── */}
      <div className="relative h-3 bg-zinc-800 rounded-full mt-1">
        {/* 재생 진행 바 */}
        <div
          className="absolute h-full bg-blue-500/50 rounded-full pointer-events-none transition-all"
          style={{ width: `${progress}%` }}
        />
        {/* 마커 오버레이 */}
        {markers.map((m, i) => (
          <div
            key={i}
            className={`absolute w-2.5 h-2.5 rounded-full -top-px cursor-pointer border border-zinc-900 ${markerColorClass[m.color] ?? 'bg-zinc-500'} hover:scale-125 transition-transform z-10`}
            style={{ left: `calc(${duration > 0 ? (m.time / duration) * 100 : 0}% - 5px)` }}
            title={m.label}
            onClick={() => seekTo(m.time)}
          />
        ))}
        {/* 시크 인터랙션 (투명 range input 오버레이) */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={e => seekTo(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label="영상 탐색"
        />
      </div>

      {/* 타임라인 범례 */}
      {markers.length > 0 && (
        <div className="flex items-center gap-3 -mt-1 text-[10px] text-zinc-500">
          <span>마커:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />이탈
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />격차
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />하이라이트
          </span>
        </div>
      )}

      {/* ── 컨트롤 바 ── */}
      <div className="flex items-center gap-3 px-1">
        {/* 10초 뒤로 */}
        <button
          onClick={skipBack}
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="-10초"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={isPlaying ? pause : play}
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          title={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* 10초 앞으로 */}
        <button
          onClick={skipForward}
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="+10초"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* 현재 시간 / 전체 시간 */}
        <span className="text-xs text-zinc-400 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* 재생 속도 */}
        <div className="flex items-center gap-0.5 ml-2">
          {([0.5, 1, 1.5, 2] as const).map(rate => (
            <button
              key={rate}
              onClick={() => setPlaybackRate(rate)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                playbackRate === rate
                  ? 'bg-blue-500/20 text-blue-400 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* 오프셋 조절 — 숙련자 영상 타이밍 보정 */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] text-zinc-500">오프셋</span>
          <button
            onClick={() => setOffset(o => o - 1)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
            title="숙련자 -1초"
          >
            −
          </button>
          <span className="text-xs text-zinc-200 w-8 text-center font-mono">
            {offset > 0 ? `+${offset}` : offset}s
          </span>
          <button
            onClick={() => setOffset(o => o + 1)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
            title="숙련자 +1초"
          >
            +
          </button>
        </div>
      </div>

      {/* POC 안내 */}
      {(!expertVideoUrl || !traineeVideoUrl) && (
        <div className="text-[10px] text-zinc-600 text-center mt-1 border-t border-zinc-800 pt-2">
          POC 환경: 실제 스트리밍 URL 연동 시 동기화 재생이 활성화됩니다.
          TwelveLabs 인덱싱 완료 후 영상 URL을 props로 전달하세요.
        </div>
      )}
    </div>
  );
}
