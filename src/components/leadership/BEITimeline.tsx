"use client";

import { useMemo } from "react";
import { Star, PlayCircle, AlertCircle } from "lucide-react";
import type { BEIAnalysis, BEIEvent } from "@/lib/bei";
import { cn, formatTime } from "@/lib/utils";

// ─── Props ───
interface BEITimelineProps {
  analysis: BEIAnalysis | null;
  onSeekVideo?: (timestamp: number) => void;
  loading?: boolean;
}

// ─── STAR 섹션 색상 정의 ───
const STAR_SECTIONS = [
  { key: "situation" as const, label: "S", fullLabel: "상황", color: "bg-blue-500/15 border-blue-400/30 text-blue-400", badgeColor: "bg-blue-500/20 text-blue-300" },
  { key: "task"      as const, label: "T", fullLabel: "과제", color: "bg-violet-500/15 border-violet-400/30 text-violet-400", badgeColor: "bg-violet-500/20 text-violet-300" },
  { key: "action"    as const, label: "A", fullLabel: "행동", color: "bg-teal-500/15 border-teal-400/30 text-teal-400", badgeColor: "bg-teal-500/20 text-teal-300" },
  { key: "result"    as const, label: "R", fullLabel: "결과", color: "bg-amber-500/15 border-amber-400/30 text-amber-400", badgeColor: "bg-amber-500/20 text-amber-300" },
] as const;

// ─── 역량 색상 팔레트 ───
const COMPETENCY_COLORS: Record<string, string> = {
  visionPresentation:   "bg-teal-500/20 text-teal-300 border-teal-500/30",
  visionPractice:       "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  trustBuilding:        "bg-amber-500/20 text-amber-300 border-amber-500/30",
  communication:        "bg-violet-500/20 text-violet-300 border-violet-500/30",
  memberDevelopment:    "bg-red-500/20 text-red-300 border-red-500/30",
  selfDevelopment:      "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rationalDecision:     "bg-blue-500/20 text-blue-300 border-blue-500/30",
  problemSolving:       "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const DEFAULT_COMPETENCY_COLOR = "bg-slate-500/20 text-slate-300 border-slate-500/30";

// 역량 키 → 한국어 라벨
const COMPETENCY_LABELS: Record<string, string> = {
  visionPresentation:  "비전제시",
  visionPractice:      "비전실천",
  trustBuilding:       "신뢰형성",
  communication:       "의사소통",
  memberDevelopment:   "구성원육성",
  selfDevelopment:     "자기개발",
  rationalDecision:    "합리적의사결정",
  problemSolving:      "문제해결",
};

// ─── 별점 컴포넌트 ───
function QualityStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3 h-3",
            i < score ? "text-amber-400 fill-amber-400" : "text-slate-600"
          )}
        />
      ))}
      <span className="ml-1 text-xs font-mono text-slate-400">{score}/5</span>
    </div>
  );
}

// ─── 완성도 인디케이터 ───
function CompletenessBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? "bg-emerald-500" :
    pct >= 60 ? "bg-teal-500" :
    pct >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── 단일 BEI 이벤트 카드 ───
function BEIEventCard({
  event,
  index,
  onSeekVideo,
}: {
  event: BEIEvent;
  index: number;
  onSeekVideo?: (timestamp: number) => void;
}) {
  const differentiatingSet = useMemo(
    () => new Set(event.codedCompetencies.filter((c) => c.level === "differentiating").map((c) => c.competencyKey)),
    [event.codedCompetencies]
  );

  return (
    <div className="relative flex gap-4">
      {/* 타임라인 세로선 + 번호 버블 */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-xs font-bold text-teal-400 z-10">
          {index + 1}
        </div>
        <div className="w-px flex-1 bg-slate-700/60 mt-1" />
      </div>

      {/* 카드 본체 */}
      <div className="flex-1 pb-6">
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
          {/* 카드 헤더 */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/40 bg-slate-800/60">
            <div className="flex items-center gap-3">
              <QualityStars score={event.qualityScore} />
              <span className="text-xs text-slate-500 font-mono">화자 {event.speakerId}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">STAR 완성도</span>
              <div className="w-24">
                <CompletenessBar value={event.star.completeness} />
              </div>
            </div>
          </div>

          {/* STAR 4개 블록 그리드 */}
          <div className="grid grid-cols-2 gap-2 p-3">
            {STAR_SECTIONS.map((section) => {
              const element = event.star[section.key];
              const hasData = element && element.text;
              const startTs = element?.timestamp?.start ?? 0;

              return (
                <div
                  key={section.key}
                  className={cn(
                    "rounded-lg border p-2.5 transition-colors",
                    section.color,
                    !hasData && "opacity-40"
                  )}
                >
                  {/* 섹션 라벨 + 타임스탬프 */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn("text-xs font-bold tracking-widest", section.badgeColor.split(" ")[1])}>
                      {section.label} — {section.fullLabel}
                    </span>
                    {hasData && onSeekVideo && (
                      <button
                        onClick={() => onSeekVideo(startTs)}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-teal-400 transition-colors"
                        title={`${formatTime(startTs)}으로 이동`}
                      >
                        <PlayCircle className="w-3 h-3" />
                        {formatTime(startTs)}
                      </button>
                    )}
                  </div>
                  {/* 텍스트 프리뷰 */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {hasData ? element.text : "—"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 역량 태그 */}
          {event.codedCompetencies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-3">
              {event.codedCompetencies.map((c) => {
                const isDiff = differentiatingSet.has(c.competencyKey);
                const colorClass = COMPETENCY_COLORS[c.competencyKey] ?? DEFAULT_COMPETENCY_COLOR;
                return (
                  <span
                    key={c.competencyKey}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium",
                      colorClass
                    )}
                  >
                    {isDiff && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                    {COMPETENCY_LABELS[c.competencyKey] ?? c.competencyKey}
                    <span className="opacity-60 font-mono">
                      {Math.round(c.confidence * 100)}%
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 역량 분포 바 차트 ───
function CompetencyDistributionBar({ distribution }: { distribution: Record<string, number> }) {
  const entries = useMemo(
    () =>
      Object.entries(distribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    [distribution]
  );

  const max = entries.reduce((m, [, v]) => Math.max(m, v), 0);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => {
        const pct = max > 0 ? (value / max) * 100 : 0;
        const colorClass = COMPETENCY_COLORS[key] ?? DEFAULT_COMPETENCY_COLOR;
        const barColor = colorClass.split(" ")[0]; // bg-xxx 부분만

        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-24 truncate shrink-0">
              {COMPETENCY_LABELS[key] ?? key}
            </span>
            <div className="flex-1 h-2 rounded-full bg-slate-700/60 overflow-hidden">
              <div
                className={cn("h-full rounded-full", barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-500 w-10 text-right">
              {value.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── 메인 컴포넌트 ───
export default function BEITimeline({ analysis, onSeekVideo, loading = false }: BEITimelineProps) {
  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">BEI 분석 중...</p>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle className="w-10 h-10 text-slate-600" />
        <p className="text-sm text-slate-500">BEI 분석을 실행하면 행동사건이 표시됩니다</p>
      </div>
    );
  }

  const { events, totalEvents, averageCompleteness, differentiatingCompetencies, competencyDistribution } = analysis;

  return (
    <div className="space-y-6">
      {/* ─── 요약 바 ─── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 총 이벤트 수 */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono text-teal-400">{totalEvents}</span>
            <span className="text-sm text-slate-400">행동사건</span>
          </div>

          <div className="h-8 w-px bg-slate-700/60" />

          {/* 평균 완성도 */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {Math.round(averageCompleteness * 100)}%
            </span>
            <span className="text-sm text-slate-400">평균 STAR 완성도</span>
          </div>

          {/* 차별화 역량 배지 */}
          {differentiatingCompetencies.length > 0 && (
            <>
              <div className="h-8 w-px bg-slate-700/60" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 uppercase tracking-wider">차별화 역량</span>
                {differentiatingCompetencies.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium"
                  >
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    {COMPETENCY_LABELS[key] ?? key}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── 이벤트 타임라인 ─── */}
      {events.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">행동사건이 없습니다</p>
      ) : (
        <div>
          <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-4">행동사건 타임라인</h4>
          <div className="space-y-0">
            {events.map((event, idx) => (
              <BEIEventCard
                key={event.id}
                event={event}
                index={idx}
                onSeekVideo={onSeekVideo}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── 역량 분포 차트 ─── */}
      {Object.keys(competencyDistribution).length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-4">역량별 분포</h4>
          <CompetencyDistributionBar distribution={competencyDistribution} />
        </div>
      )}
    </div>
  );
}
