"use client";

import { Lightbulb } from "lucide-react";
import { LEADERSHIP_COMPETENCY_CONFIG } from "@/lib/constants";
import type { SpeakerScore } from "@/lib/types";

interface ScoreCardProps {
  speaker: SpeakerScore;
  rank: number;
}

/** 점수 구간별 뱃지 색상 (Tailwind v4 동적 클래스 불가 → static map) */
const scoreBadgeMap: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-teal-500/20", text: "text-teal-400" },
  mid: { bg: "bg-amber-500/20", text: "text-amber-400" },
  low: { bg: "bg-red-500/20", text: "text-red-400" },
};

function getScoreTier(score: number) {
  if (score >= 8) return scoreBadgeMap.high;
  if (score >= 6) return scoreBadgeMap.mid;
  return scoreBadgeMap.low;
}

export default function ScoreCard({ speaker, rank }: ScoreCardProps) {
  const rankColors = ["text-amber-400", "text-slate-300", "text-amber-700"];
  const rankBgColors = ["bg-amber-500/10", "bg-slate-500/10", "bg-amber-700/10"];
  const badge = getScoreTier(speaker.totalScore);

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 border-l-2 border-l-transparent hover:border-l-teal-500 hover:border-surface-700 hover:scale-[1.01] transition-all duration-200">
      <div className="flex items-center gap-3 mb-3">
        {/* 순위 배지 */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rankBgColors[rank - 1] || "bg-surface-700"}`}>
          <span className={`text-sm font-bold font-mono ${rankColors[rank - 1] || "text-slate-500"}`}>
            {rank}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{speaker.speakerName}</p>
        </div>
        {/* 종합 점수 뱃지 (점수 구간별 색상) */}
        <div className={`px-2.5 py-1 rounded-md ${badge.bg}`}>
          <span className={`text-xs font-bold font-mono tabular-nums ${badge.text}`}>
            {speaker.totalScore.toFixed(1)}점
          </span>
        </div>
      </div>

      {/* 역량별 바 차트 */}
      <div className="space-y-1.5">
        {LEADERSHIP_COMPETENCY_CONFIG.map(({ key, label, weight }) => {
          const score = speaker.scores[key] || 0;
          return (
            <div key={key} className="flex items-center gap-2 group py-0.5 rounded hover:bg-surface-700/30 transition-colors duration-150">
              <span className="text-xs text-slate-500 w-14 shrink-0 group-hover:text-slate-400 transition-colors duration-200">{label}</span>
              <div className="flex-1 bg-surface-700 rounded-full h-1 group-hover:h-1.5 transition-all duration-200">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-500"
                  style={{ width: `${score * 10}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400 w-6 text-right group-hover:text-white transition-colors duration-200">{score}</span>
              <span className="text-xs text-slate-600 w-8">({(weight * 100).toFixed(0)}%)</span>
            </div>
          );
        })}
      </div>

      {/* 피드백 */}
      {speaker.feedback && (
        <div className="mt-3 flex items-start gap-2 border-t border-surface-700 pt-3">
          <Lightbulb className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            {speaker.feedback}
          </p>
        </div>
      )}
    </div>
  );
}
