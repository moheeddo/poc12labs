"use client";

import { useState } from "react";
import { PlayCircle, Circle, CheckCircle2, MapPin, Percent, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceMap, EvidenceClip } from "@/lib/evidence";

// ─── 유틸 ───────────────────────────────────────────────────────────
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getConfidenceColor(conf: number): string {
  if (conf >= 80) return "bg-teal-100 text-teal-700 border-teal-300";
  if (conf >= 60) return "bg-amber-100 text-amber-700 border-amber-300";
  return "bg-red-100 text-red-600 border-red-300";
}

function getConfidenceLabel(conf: number): string {
  if (conf >= 80) return "높음";
  if (conf >= 60) return "보통";
  return "낮음";
}

// ─── 스켈레톤 ───────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 bg-slate-200/60 rounded w-1/3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-200/60 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200/60 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="h-10 bg-slate-200/60 rounded-lg" />
    </div>
  );
}

// ─── 루브릭 항목에서 고유 항목 ID/텍스트 추출 ──────────────────────
function extractRubricItems(clips: EvidenceClip[]): Array<{ id: string; text: string }> {
  const seen = new Map<string, string>();
  for (const c of clips) {
    if (!seen.has(c.rubricItemId)) {
      seen.set(c.rubricItemId, c.rubricItemText);
    }
  }
  return Array.from(seen.entries()).map(([id, text]) => ({ id, text }));
}

// ─── Props ──────────────────────────────────────────────────────────
interface EvidenceMapViewProps {
  evidenceMap: EvidenceMap | null;
  onSeekVideo?: (timestamp: number) => void;
  loading?: boolean;
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function EvidenceMapView({
  evidenceMap,
  onSeekVideo,
  loading = false,
}: EvidenceMapViewProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // 로딩 상태
  if (loading) {
    return (
      <div className="p-4">
        <Skeleton />
      </div>
    );
  }

  // 데이터 없음
  if (!evidenceMap || evidenceMap.clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100/60 flex items-center justify-center mb-4">
          <MapPin className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-base font-medium text-slate-500">분석 후 증거맵이 생성됩니다</p>
        <p className="text-sm text-slate-400 mt-1.5">
          AI 분석을 실행하면 루브릭 항목별 영상 근거가 자동 매핑됩니다
        </p>
      </div>
    );
  }

  const { clips, coverageRate, overallConfidence } = evidenceMap;

  // 루브릭 항목 목록 (clips에서 추출 + 임의 순서 안정화)
  const rubricItems = extractRubricItems(clips);

  // 각 항목에 연결된 클립 목록
  const clipsForItem = (id: string | null): EvidenceClip[] => {
    if (id === null) return clips;
    return clips.filter((c) => c.rubricItemId === id);
  };

  const selectedClips = clipsForItem(selectedItemId);

  const coveragePct = Math.round(coverageRate * 100);

  return (
    <div className="space-y-4">
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">루브릭 증거맵</h3>
          <p className="text-xs text-slate-500">루브릭 항목 → 영상 구간 매핑</p>
        </div>
      </div>

      {/* ── 본문: 좌/우 패널 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ── 왼쪽: 루브릭 항목 목록 ── */}
        <div className="bg-white/50 border border-slate-200/40 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100/60 bg-slate-50/40">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">
              루브릭 항목
            </p>
          </div>
          <ul className="divide-y divide-slate-100/50">
            {/* '전체' 선택 항목 */}
            <li>
              <button
                onClick={() => setSelectedItemId(null)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-teal-50/30",
                  selectedItemId === null && "bg-teal-50/60"
                )}
              >
                <CheckCircle2
                  className={cn(
                    "w-4 h-4 shrink-0",
                    selectedItemId === null ? "text-teal-500" : "text-slate-300"
                  )}
                />
                <span className="text-xs font-medium text-slate-600">전체 클립 보기</span>
                <span className="ml-auto text-xs font-mono text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                  {clips.length}
                </span>
              </button>
            </li>
            {rubricItems.map(({ id, text }) => {
              const hasEvidence = clips.some((c) => c.rubricItemId === id);
              const count = clips.filter((c) => c.rubricItemId === id).length;
              const isSelected = selectedItemId === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => setSelectedItemId(isSelected ? null : id)}
                    className={cn(
                      "w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-teal-50/30",
                      isSelected && "bg-teal-50/60"
                    )}
                  >
                    {hasEvidence ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-500" />
                    ) : (
                      <Circle className="w-4 h-4 shrink-0 mt-0.5 text-slate-300" />
                    )}
                    <span
                      className={cn(
                        "text-xs leading-relaxed flex-1 min-w-0",
                        hasEvidence ? "text-slate-700" : "text-slate-400"
                      )}
                    >
                      {text}
                    </span>
                    {hasEvidence && (
                      <span className="ml-1 shrink-0 text-xs font-mono text-teal-600 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5">
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── 오른쪽: 선택된 클립 목록 ── */}
        <div className="bg-white/50 border border-slate-200/40 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100/60 bg-slate-50/40 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">
              영상 증거 클립
            </p>
            <span className="text-xs text-slate-400">{selectedClips.length}건</span>
          </div>

          {selectedClips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Circle className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">이 항목에 매핑된 증거가 없습니다</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100/50 max-h-72 overflow-y-auto">
              {selectedClips.map((clip, idx) => (
                <li key={idx} className="px-3 py-3 hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-start gap-2.5">
                    {/* 타임스탬프 버튼 */}
                    <button
                      onClick={() => onSeekVideo?.(clip.videoTimestamp.start)}
                      className={cn(
                        "inline-flex items-center gap-1 shrink-0 text-xs font-mono",
                        "text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200",
                        "rounded px-2 py-1.5 min-h-[36px] transition-colors whitespace-nowrap"
                      )}
                      title="해당 구간으로 이동"
                    >
                      <PlayCircle className="w-3 h-3" />
                      {formatTime(clip.videoTimestamp.start)}
                      {" – "}
                      {formatTime(clip.videoTimestamp.end)}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      {/* 신뢰도 배지 */}
                      <span
                        className={cn(
                          "inline-block text-[10px] font-medium border rounded px-1.5 py-0.5",
                          getConfidenceColor(clip.confidence)
                        )}
                      >
                        신뢰도 {Math.round(clip.confidence)}% · {getConfidenceLabel(clip.confidence)}
                      </span>

                      {/* 매칭 텍스트 미리보기 */}
                      {clip.matchedText && (
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          &ldquo;{clip.matchedText}&rdquo;
                        </p>
                      )}

                      {/* 루브릭 항목 텍스트 (전체 보기 시에만) */}
                      {selectedItemId === null && (
                        <p className="text-[10px] text-slate-400 truncate">
                          {clip.rubricItemText}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── 하단 바: 커버리지 + 종합 신뢰도 ── */}
      <div className="bg-slate-50/60 border border-slate-200/30 rounded-xl px-4 py-3 flex flex-wrap gap-4 items-center">
        {/* 커버리지 */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <Percent className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">루브릭 커버리지</p>
            <p className="text-sm font-bold font-mono text-teal-600">{coveragePct}%</p>
          </div>
          <div className="w-24 h-2 bg-slate-200/60 rounded-full overflow-hidden ml-1">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>

        {/* 구분선 */}
        <div className="hidden sm:block w-px h-8 bg-slate-200/60" />

        {/* 종합 신뢰도 */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Activity className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">종합 신뢰도</p>
            <p
              className={cn(
                "text-sm font-bold font-mono",
                overallConfidence >= 80
                  ? "text-teal-600"
                  : overallConfidence >= 60
                  ? "text-amber-600"
                  : "text-red-500"
              )}
            >
              {Math.round(overallConfidence)}%
            </p>
          </div>
        </div>

        {/* 총 클립 수 */}
        <div className="ml-auto text-xs text-slate-400 shrink-0">
          총 <span className="font-mono font-medium text-slate-600">{clips.length}</span>개 클립
        </div>
      </div>
    </div>
  );
}
