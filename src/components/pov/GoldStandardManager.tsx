'use client';
import { useEffect } from 'react';
import { useGoldStandard } from '@/hooks/useGoldStandard';
import type { GoldStandard } from '@/lib/types';

interface Props {
  procedureId: string;
  currentVideoId?: string;
  currentScore?: number;
  onSelect: (gs: GoldStandard) => void;
}

// 날짜 포맷 (ISO → 한국식)
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function GoldStandardManager({
  procedureId,
  currentVideoId,
  currentScore,
  onSelect,
}: Props) {
  const { standards, loading, fetchStandards, register, remove } = useGoldStandard();

  // procedureId 변경 시 목록 재조회
  useEffect(() => {
    if (procedureId) {
      fetchStandards(procedureId);
    }
  }, [procedureId, fetchStandards]);

  // ── 추천 로직 인라인 (suggestGoldStandardCandidate 기준과 동일) ──
  const isCandidate = currentScore !== undefined && currentScore >= 85;
  const isAlreadyRegistered = !!currentVideoId && standards.some(gs => gs.videoId === currentVideoId);
  const bestScore = standards.length > 0 ? Math.max(...standards.map(gs => gs.averageScore)) : 0;
  const isBest = currentScore !== undefined && currentScore > bestScore;

  // 최종 등록 가능 여부
  const canRegister = !!currentVideoId && isCandidate && !isAlreadyRegistered;

  // 추천 배지 텍스트 결정
  function getRecommendationBadge(): { label: string; className: string } | null {
    if (!currentVideoId || currentScore === undefined) return null;
    if (isAlreadyRegistered) {
      return { label: '이미 등록됨', className: 'bg-zinc-700 text-zinc-400' };
    }
    if (!isCandidate) return null; // 85점 미달 — 배지 없음
    if (isBest) {
      return { label: '최고 점수 — 골드스탠다드 추천', className: 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50' };
    }
    return {
      label: `등록 가능 (기존 최고: ${bestScore}점)`,
      className: 'bg-yellow-900/60 text-yellow-400 border border-yellow-700/50',
    };
  }

  const badge = getRecommendationBadge();

  async function handleRegister() {
    if (!currentVideoId || currentScore == null) return;
    await register(procedureId, currentVideoId, currentScore);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm('이 골드스탠다드를 삭제하시겠습니까?')) {
      await remove(id);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── 헤더 + 등록 버튼 ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <span className="text-yellow-400">🏆</span>
          골드스탠다드 목록
          <span className="text-xs text-zinc-500 font-normal">({standards.length}건)</span>
        </h3>

        <div className="flex items-center gap-2">
          {/* 추천 배지 */}
          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )}

          {/* 등록 버튼 */}
          {canRegister && (
            <button
              onClick={handleRegister}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>+</span>
              <span>현재 영상 등록</span>
              <span className="font-mono opacity-80">({currentScore}점)</span>
            </button>
          )}

          {/* 점수 미달 안내 */}
          {!canRegister && !isAlreadyRegistered && currentVideoId && typeof currentScore === 'number' && currentScore < 85 && (
            <div className="text-xs text-zinc-600">
              등록 가능 점수: 85점 이상
              <span className="ml-1 font-mono text-zinc-500">(현재 {currentScore}점)</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 골드스탠다드 목록 ── */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-zinc-600 text-sm gap-2">
          <span className="animate-spin">⏳</span>
          <span>불러오는 중...</span>
        </div>
      ) : standards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-600 text-sm">
          <span className="text-2xl">🏆</span>
          <span>등록된 골드스탠다드가 없습니다.</span>
          {canRegister && (
            <span className="text-xs text-zinc-500">
              현재 영상(점수 {currentScore}점)을 등록할 수 있습니다.
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {standards.map((gs) => (
            <div
              key={gs.id}
              className="group rounded-lg border border-zinc-700 bg-zinc-900 hover:border-amber-600/60 hover:bg-zinc-800/60 transition-all cursor-pointer px-4 py-3"
              onClick={() => onSelect(gs)}
            >
              <div className="flex items-center justify-between">
                {/* 왼쪽 정보 */}
                <div className="flex flex-col gap-1">
                  {/* 점수 + 날짜 */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-bold font-mono ${
                        gs.averageScore >= 90
                          ? 'text-emerald-400'
                          : gs.averageScore >= 80
                          ? 'text-amber-400'
                          : 'text-zinc-300'
                      }`}
                    >
                      {gs.averageScore}점
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatDate(gs.registeredAt)}
                    </span>
                  </div>

                  {/* 등록자 + 비디오 ID */}
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>등록: {gs.registeredBy}</span>
                    <span className="text-zinc-700">|</span>
                    <span className="font-mono">{gs.videoId.slice(0, 8)}…</span>
                  </div>

                  {/* 세그먼트 범위 */}
                  {gs.segmentRange && (
                    <div className="text-xs text-zinc-600 font-mono">
                      구간: {gs.segmentRange.start}s – {gs.segmentRange.end}s
                    </div>
                  )}
                </div>

                {/* 오른쪽: 선택 + 삭제 */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="px-2 py-1 text-xs bg-amber-700 hover:bg-amber-600 text-white rounded transition-colors"
                    onClick={(e) => { e.stopPropagation(); onSelect(gs); }}
                  >
                    선택
                  </button>
                  <button
                    className="px-2 py-1 text-xs bg-zinc-700 hover:bg-red-700 text-zinc-300 hover:text-white rounded transition-colors"
                    onClick={(e) => handleDelete(gs.id, e)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
