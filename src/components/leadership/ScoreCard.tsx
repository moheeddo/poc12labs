"use client";

import { LEADERSHIP_COMPETENCY_CONFIG } from "@/lib/constants";
import type { SpeakerScore } from "@/lib/types";

interface ScoreCardProps {
  speaker: SpeakerScore;
  rank: number;
}

export default function ScoreCard({ speaker, rank }: ScoreCardProps) {
  const rankColors = ["text-amber-400", "text-slate-300", "text-amber-700"];
  const rankBgColors = ["bg-amber-500/10", "bg-slate-500/10", "bg-amber-700/10"];

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 hover:border-teal-500/30 hover:scale-[1.01] transition-all duration-200">
      <div className="flex items-center gap-3 mb-3">
        {/* 순위 배지 */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rankBgColors[rank - 1] || "bg-surface-700"}`}>
          <span className={`text-sm font-bold font-mono ${rankColors[rank - 1] || "text-slate-500"}`}>
            {rank}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{speaker.speakerName}</p>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            종합 {speaker.totalScore.toFixed(1)}점
          </p>
        </div>
      </div>

      {/* 역량별 바 차트 */}
      <div className="space-y-1.5">
        {LEADERSHIP_COMPETENCY_CONFIG.map(({ key, label, weight }) => {
          const score = speaker.scores[key] || 0;
          return (
            <div key={key} className="flex items-center gap-2 group py-0.5 rounded hover:bg-surface-700/30 transition-colors duration-150">
              <span className="text-[10px] text-slate-500 w-12 shrink-0 group-hover:text-slate-400 transition-colors duration-200">{label}</span>
              <div className="flex-1 bg-surface-700 rounded-full h-1 group-hover:h-1.5 transition-all duration-200">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-500"
                  style={{ width: `${score * 10}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400 w-6 text-right group-hover:text-white transition-colors duration-200">{score}</span>
              <span className="text-[10px] text-slate-600 w-8">({(weight * 100).toFixed(0)}%)</span>
            </div>
          );
        })}
      </div>

      {/* 피드백 */}
      {speaker.feedback && (
        <p className="mt-3 text-xs text-slate-400 leading-relaxed border-t border-surface-700 pt-3">
          {speaker.feedback}
        </p>
      )}
    </div>
  );
}
