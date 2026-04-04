'use client';
import { useMemo } from 'react';
import type { EmbeddingComparison, GoldStandard } from '@/lib/types';
import SyncVideoPlayer, { type SyncMarker } from './SyncVideoPlayer';

interface Props {
  comparison?: EmbeddingComparison;
  goldStandard?: GoldStandard | null;
  onRegisterGoldStandard?: () => void;
  /** 훈련생 영상 스트리밍 URL (있을 때만 동기화 플레이어 활성화) */
  traineeVideoUrl?: string;
  /** 숙련자 영상 스트리밍 URL (있을 때만 동기화 플레이어 활성화) */
  expertVideoUrl?: string;
}

// 유사도 값에 따른 색상 반환
function similarityColor(sim: number): string {
  if (sim > 0.8) return '#10b981'; // emerald-500
  if (sim >= 0.5) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

// 유사도 값에 따른 Tailwind 텍스트 색상
function similarityTextClass(sim: number): string {
  if (sim > 0.8) return 'text-emerald-400';
  if (sim >= 0.5) return 'text-amber-400';
  return 'text-red-400';
}

// 초 → mm:ss 포맷
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 히트맵 세그먼트 툴팁 포맷
function segmentLabel(traineeStart: number, traineeEnd: number, similarity: number): string {
  return `${formatTime(traineeStart)}–${formatTime(traineeEnd)}\n유사도: ${(similarity * 100).toFixed(1)}%`;
}

export default function ComparisonView({
  comparison,
  goldStandard,
  onRegisterGoldStandard,
  traineeVideoUrl,
  expertVideoUrl,
}: Props) {
  // ── 비교 데이터로 타임라인 마커 생성 (훅은 조건부 반환 전에 위치해야 함) ──
  const syncMarkers = useMemo<SyncMarker[]>(() => {
    if (!comparison) return [];
    const result: SyncMarker[] = [];
    // 격차 구간 → 빨간 마커
    comparison.gapSegments.forEach(seg => {
      result.push({
        time: seg.traineeStart,
        label: `격차: ${formatTime(seg.traineeStart)}–${formatTime(seg.traineeEnd)} (${(seg.similarity * 100).toFixed(0)}%)`,
        color: 'red',
        type: 'gap',
      });
    });
    // 높은 유사도 구간 → 초록 마커 (상위 3개)
    const highSim = comparison.segmentPairs
      .filter(s => s.similarity > 0.85)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
    highSim.forEach(seg => {
      result.push({
        time: seg.traineeStart,
        label: `하이라이트: ${formatTime(seg.traineeStart)} (${(seg.similarity * 100).toFixed(0)}%)`,
        color: 'green',
        type: 'highlight',
      });
    });
    return result;
  }, [comparison]);

  // 골드스탠다드 미등록 상태
  if (!goldStandard) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="text-4xl">🏆</div>
        <div className="text-zinc-400 text-sm max-w-xs">
          이 절차에 등록된 숙련자 골드스탠다드가 없습니다.
          <br />
          숙련자 영상을 먼저 분석하고 골드스탠다드로 등록해주세요.
        </div>
        {onRegisterGoldStandard && (
          <button
            onClick={onRegisterGoldStandard}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            골드스탠다드 등록
          </button>
        )}
      </div>
    );
  }

  // 비교 데이터 없음 — 골드스탠다드는 있으나 비교 결과가 없을 때에도 플레이어는 표시
  if (!comparison) {
    return (
      <div className="flex flex-col gap-6">
        <SyncVideoPlayer
          expertVideoUrl={expertVideoUrl}
          traineeVideoUrl={traineeVideoUrl}
          expertLabel={`숙련자 — ${goldStandard.registeredBy}`}
          traineeLabel="훈련생"
          markers={[]}
        />
        <div className="flex flex-col items-center justify-center py-8 text-zinc-600 text-sm gap-2">
          <span className="text-2xl">📊</span>
          <span>유사도 분석 데이터가 없습니다.</span>
        </div>
      </div>
    );
  }

  const avg = comparison.averageSimilarity;
  const heatmap = comparison.heatmapData;
  const segments = comparison.segmentPairs;
  const gapSegments = comparison.gapSegments;

  return (
    <div className="flex flex-col gap-6">
      {/* ── 동기화 비교 재생 뷰어 ── */}
      <SyncVideoPlayer
        expertVideoUrl={expertVideoUrl}
        traineeVideoUrl={traineeVideoUrl}
        expertLabel={goldStandard ? `숙련자 — ${goldStandard.registeredBy}` : '숙련자 (골드스탠다드)'}
        traineeLabel="훈련생"
        markers={syncMarkers}
      />
      {/* ── 평균 유사도 ── */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 mb-1">숙련자 대비 평균 유사도</div>
          <div className={`text-3xl font-bold font-mono ${similarityTextClass(avg)}`}>
            {(avg * 100).toFixed(1)}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500 mb-1">골드스탠다드</div>
          <div className="text-sm text-zinc-300 font-mono">{goldStandard.registeredBy}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            평균 점수 {goldStandard.averageScore}점
          </div>
        </div>
      </div>

      {/* ── 유사도 히트맵 바 ── */}
      <div>
        <div className="text-xs text-zinc-400 mb-2">구간별 유사도 히트맵</div>
        <div
          className="flex h-8 rounded overflow-hidden border border-zinc-700"
          title="각 구간의 숙련자 유사도"
        >
          {heatmap.length > 0 ? (
            heatmap.map((sim, i) => {
              const seg = segments[i];
              const tooltip = seg
                ? segmentLabel(seg.traineeStart, seg.traineeEnd, sim)
                : `유사도: ${(sim * 100).toFixed(1)}%`;
              return (
                <div
                  key={i}
                  className="flex-1 transition-opacity hover:opacity-80 cursor-default"
                  style={{ backgroundColor: similarityColor(sim) }}
                  title={tooltip}
                />
              );
            })
          ) : (
            <div className="flex-1 bg-zinc-800 flex items-center justify-center text-xs text-zinc-600">
              데이터 없음
            </div>
          )}
        </div>

        {/* 히트맵 범례 */}
        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span>높음 (&gt;80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span>중간 (50–80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>낮음 (&lt;50%)</span>
          </div>
        </div>
      </div>

      {/* ── 격차 구간 목록 ── */}
      {gapSegments.length > 0 && (
        <div>
          <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            격차 구간 (유사도 50% 미만) — {gapSegments.length}건
          </div>
          <div className="flex flex-col gap-2">
            {gapSegments.map((seg, i) => (
              <div
                key={i}
                className="rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-2 flex items-center justify-between text-xs"
              >
                <div className="text-zinc-300">
                  <span className="font-mono text-zinc-400">
                    훈련생: {formatTime(seg.traineeStart)}–{formatTime(seg.traineeEnd)}
                  </span>
                  <span className="mx-3 text-zinc-600">|</span>
                  <span className="font-mono text-zinc-400">
                    숙련자: {formatTime(seg.expertStart)}–{formatTime(seg.expertEnd)}
                  </span>
                </div>
                <span
                  className={`font-mono font-bold ${similarityTextClass(seg.similarity)}`}
                >
                  {(seg.similarity * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 데이터 없을 때 ── */}
      {gapSegments.length === 0 && heatmap.length > 0 && avg > 0.8 && (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400 text-center">
          ✓ 격차 구간 없음 — 숙련자와 높은 유사도 유지
        </div>
      )}
    </div>
  );
}
