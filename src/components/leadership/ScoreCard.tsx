"use client";

import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp, Target, TrendingUp } from "lucide-react";
import { getCompetenciesForLevel } from "@/lib/constants";
import type { SpeakerScore, JobLevel } from "@/lib/types";

interface ScoreCardProps {
  speaker: SpeakerScore;
  rank: number;
}

/** 9점 척도 점수 구간별 뱃지 색상 */
const scoreBadgeMap: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-teal-500/20", text: "text-teal-400" },
  mid: { bg: "bg-amber-500/20", text: "text-amber-400" },
  low: { bg: "bg-red-500/20", text: "text-red-400" },
};

function getScoreTier(score: number) {
  if (score >= 7) return scoreBadgeMap.high;  // 9점 척도: 7+ = 우수
  if (score >= 5) return scoreBadgeMap.mid;   // 5-6 = 보통
  return scoreBadgeMap.low;                    // 4 이하 = 미흡
}

/** 역량 바 색상 (9점 척도 기준) */
function getBarColor(score: number) {
  if (score >= 7) return "bg-teal-500";
  if (score >= 5) return "bg-amber-500";
  return "bg-red-500";
}

/** 9점 척도 등급 텍스트 */
function getGradeLabel(score: number) {
  if (score >= 8) return "탁월";
  if (score >= 7) return "우수";
  if (score >= 5) return "보통";
  if (score >= 3) return "미흡";
  return "부족";
}

export default function ScoreCard({ speaker, rank }: ScoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rankColors = ["text-amber-400", "text-slate-300", "text-amber-700"];
  const rankBgColors = ["bg-amber-500/10", "bg-slate-500/10", "bg-amber-700/10"];
  const badge = getScoreTier(speaker.totalScore);
  const competencies = getCompetenciesForLevel(speaker.jobLevel);

  return (
    <div className="bg-surface-800/70 border border-surface-700/50 rounded-xl p-5 border-l-[3px] border-l-transparent hover:border-l-teal-500/60 hover:bg-surface-800 hover:shadow-lg hover:shadow-black/20 transition-all duration-200">
      <div className="flex items-center gap-3 mb-4">
        {/* 순위 배지 */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rankBgColors[rank - 1] || "bg-surface-700"}`}>
          <span className={`text-sm font-bold font-mono ${rankColors[rank - 1] || "text-slate-500"}`}>
            {rank}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{speaker.speakerName}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{getGradeLabel(speaker.totalScore)}</p>
        </div>
        {/* 종합 점수 뱃지 */}
        <div className={`px-3 py-1.5 rounded-lg ${badge.bg}`}>
          <span className={`text-sm font-bold font-mono tabular-nums ${badge.text}`}>
            {speaker.totalScore.toFixed(1)}
          </span>
        </div>
      </div>

      {/* 역량별 바 차트 (직급별 4개 역량) */}
      <div className="space-y-2.5">
        {competencies.map((comp, idx) => {
          const score = speaker.scores[comp.key] || 0;
          return (
            <div key={comp.key} className="group" aria-label={`${comp.label} ${score}점`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{comp.label}</span>
                <span className={`text-xs font-mono tabular-nums ${score >= 7 ? "text-teal-400" : score >= 5 ? "text-slate-400" : "text-amber-400"}`}>{score}/9</span>
              </div>
              <div className="h-1.5 bg-surface-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getBarColor(score)}`}
                  style={{ width: `${(score / 9) * 100}%`, transitionDelay: `${200 + idx * 60}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 하위요소 확장 토글 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-teal-400 transition-colors duration-200 w-full pt-3 border-t border-surface-700/40"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? "접기" : "하위요소 · 행동지표 보기"}
      </button>

      {/* 확장: 하위요소 & 루브릭 상세 */}
      {expanded && (
        <div className="mt-3 space-y-3 animate-fade-in-up">
          {competencies.map((comp) => {
            const subs = comp.subElements[speaker.jobLevel as JobLevel];
            const rubricScores = speaker.rubricScores?.[comp.key];
            if (!subs) return null;
            return (
              <div key={comp.key} className="border border-surface-700 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
                  <Target className="w-3 h-3" style={{ color: comp.color }} />
                  {comp.label} 하위요소
                </p>
                <div className="space-y-2">
                  {subs.map((sub, si) => (
                    <div key={si} className="text-xs">
                      <p className="text-slate-400 font-medium">{sub.name}</p>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{sub.behaviorIndicator}</p>
                    </div>
                  ))}
                </div>
                {/* 루브릭 세부 점수 (있을 경우) */}
                {rubricScores && rubricScores.length > 0 && comp.rubric && (
                  <div className="mt-2 pt-2 border-t border-surface-700">
                    <p className="text-xs text-slate-500 mb-1.5">루브릭 세부 평가</p>
                    {comp.rubric.map((r, ri) => {
                      const rs = rubricScores.find((s) => s.criteriaIndex === ri);
                      return (
                        <div key={ri} className="flex items-center gap-2 py-0.5">
                          <span className="text-xs text-slate-500 flex-1 truncate">{r.criteria}</span>
                          <span className={`text-xs font-mono ${rs ? getScoreTier(rs.score).text : "text-slate-600"}`}>
                            {rs ? `${rs.score}/9` : "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 강점/개선점 피드백 */}
      {(speaker.strengths || speaker.improvements) && (
        <div className="mt-3 border-t border-surface-700 pt-3 space-y-2">
          {speaker.strengths && speaker.strengths.length > 0 && (
            <div className="flex items-start gap-2 group/feedback rounded-lg hover:bg-teal-500/5 transition-colors duration-200 p-1 -m-1">
              <TrendingUp className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-teal-400 font-medium mb-0.5">강점</p>
                {speaker.strengths.map((s, i) => (
                  <p key={i} className="text-xs text-slate-400 leading-relaxed">· {s}</p>
                ))}
              </div>
            </div>
          )}
          {speaker.improvements && speaker.improvements.length > 0 && (
            <div className="flex items-start gap-2 group/feedback rounded-lg hover:bg-amber-500/5 transition-colors duration-200 p-1 -m-1">
              <Target className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-400 font-medium mb-0.5">개선점</p>
                {speaker.improvements.map((s, i) => (
                  <p key={i} className="text-xs text-slate-400 leading-relaxed">· {s}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 기존 피드백 (호환) */}
      {speaker.feedback && !speaker.strengths && (
        <div className="mt-3 flex items-start gap-2 border-t border-surface-700 pt-3 group/feedback rounded-b-lg -mx-1 px-1 hover:bg-teal-500/5 transition-colors duration-200">
          <Lightbulb className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5 group-hover/feedback:drop-shadow-[0_0_4px_rgba(20,184,166,0.5)] transition-all duration-300" />
          <p className="text-xs text-slate-400 leading-relaxed group-hover/feedback:text-slate-300 transition-colors duration-200">
            {speaker.feedback}
          </p>
        </div>
      )}
    </div>
  );
}
