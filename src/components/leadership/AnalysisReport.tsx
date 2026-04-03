"use client";

import { useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import type { AnalysisReportData } from "@/lib/leadership-analysis";
import { cn } from "@/lib/utils";

interface AnalysisReportProps {
  data: AnalysisReportData;
}

function getScoreColor(score: number) {
  if (score >= 7) return "text-teal-600";
  if (score >= 5) return "text-amber-600";
  if (score > 0) return "text-red-400";
  return "text-slate-400";
}

function getScoreLabel(score: number) {
  if (score >= 8) return "탁월";
  if (score >= 7) return "우수";
  if (score >= 5) return "보통";
  if (score >= 3) return "미흡";
  if (score > 0) return "부족";
  return "미평가";
}

function getScoreBg(score: number) {
  if (score >= 7) return "bg-teal-50 border-teal-500/30";
  if (score >= 5) return "bg-amber-500/15 border-amber-500/30";
  if (score > 0) return "bg-red-500/15 border-red-500/30";
  return "bg-slate-100/30 border-slate-200/40";
}

// 레이더 차트 커스텀 툴팁
function RadarTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { subject: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm text-slate-500">{d.payload.subject}</p>
      <p className={cn("text-base font-bold font-mono", getScoreColor(d.value))}>
        {d.value.toFixed(1)}/9 {getScoreLabel(d.value)}
      </p>
    </div>
  );
}

export default function AnalysisReport({ data }: AnalysisReportProps) {
  // 레이더 차트 데이터
  const radarData = useMemo(
    () =>
      data.competencies.map((c) => ({
        subject: c.label,
        score: c.avgScore,
        fullMark: 9,
      })),
    [data.competencies]
  );

  const hasScores = data.overallScore > 0;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ── 종합 점수 헤더 ── */}
      <div className="bg-white/60 border border-slate-200/40 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">AI 종합 분석 리포트</h3>
            <p className="text-sm text-slate-500">
              {data.totalEvidenceCount}개 평가 근거 · {data.scoredCount}건 평가 완료
            </p>
          </div>
        </div>

        {/* 종합 점수 */}
        <div className="flex items-center gap-6">
          <div className={cn("px-5 py-3 rounded-xl border", getScoreBg(data.overallScore))}>
            <p className="text-sm uppercase tracking-wider text-slate-500 mb-1">종합 점수</p>
            <div className="flex items-baseline gap-1.5">
              <span className={cn("text-3xl font-bold font-mono tabular-nums", getScoreColor(data.overallScore))}>
                {hasScores ? data.overallScore.toFixed(1) : "-"}
              </span>
              <span className="text-base text-slate-500">/9</span>
            </div>
            {hasScores && (
              <p className={cn("text-sm font-medium mt-1", getScoreColor(data.overallScore))}>
                {data.overallInterpretation || getScoreLabel(data.overallScore)}
              </p>
            )}
          </div>

          {/* 역량별 미니 바 */}
          <div className="flex-1 space-y-2">
            {data.competencies.map((c) => (
              <div key={c.key} className="flex items-center gap-2">
                <span className="text-sm text-slate-500 w-20 truncate">{c.label}</span>
                <div className="flex-1 h-2 bg-slate-100/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(c.avgScore / 9) * 100}%`,
                      backgroundColor: c.color,
                      opacity: c.avgScore > 0 ? 1 : 0.2,
                    }}
                  />
                </div>
                <span className={cn("text-sm font-mono tabular-nums w-8 text-right", getScoreColor(c.avgScore))}>
                  {c.avgScore > 0 ? c.avgScore.toFixed(1) : "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 보고서 요약 (rubricurl 문서 4 규칙) ── */}
      {data.reportSummary && (
        <div className="bg-teal-50/50 border border-teal-500/15 rounded-xl p-4">
          <p className="text-sm text-teal-600 font-medium mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            종합 평가 요약
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">{data.reportSummary}</p>
        </div>
      )}

      {/* ── 개선 우선순위 (최대 3개) ── */}
      {data.improvementPriorities && data.improvementPriorities.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-500/15 rounded-xl p-4">
          <p className="text-sm text-amber-700 font-medium mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            개선 우선순위
          </p>
          <div className="space-y-2">
            {data.improvementPriorities.map((p) => (
              <div key={p.rank} className="flex items-start gap-2">
                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-100 rounded px-1.5 py-0.5 shrink-0">
                  {p.rank}
                </span>
                <div>
                  <span className="text-sm font-medium text-slate-700">{p.item}</span>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{p.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 레이더 차트 ── */}
      {hasScores && (
        <div className="bg-white/40 border border-slate-200/30 rounded-xl p-4">
          <p className="text-sm text-slate-500 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-500/60" />
            역량 프로파일 (9점 척도)
          </p>
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  domain={[0, 9]}
                  tickCount={4}
                  tick={{ fill: "#475569", fontSize: 9 }}
                  axisLine={false}
                />
                <Radar
                  name="점수"
                  dataKey="score"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#14b8a6", strokeWidth: 0 }}
                  animationBegin={200}
                  animationDuration={800}
                />
                <Tooltip content={<RadarTooltipContent />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── AI 분석 요약 ── */}
      {data.aiSummary && (
        <div className="bg-white/40 border border-slate-200/30 rounded-xl p-4">
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-500/60" />
            AI 분석 요약
          </p>
          <p className="text-base text-slate-500 leading-relaxed">{data.aiSummary}</p>
        </div>
      )}

      {/* ── 강점 / 개선점 ── */}
      {(data.topStrengths.length > 0 || data.topImprovements.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.topStrengths.length > 0 && (
            <div className="bg-teal-500/5 border border-teal-500/15 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <p className="text-sm font-medium text-teal-600">강점</p>
              </div>
              <div className="space-y-2">
                {data.topStrengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500/60 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-500 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.topImprovements.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-600">개선 포인트</p>
              </div>
              <div className="space-y-2">
                {data.topImprovements.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-500 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 역량별 상세 ── */}
      <div className="space-y-3">
        {data.competencies.map((c) => (
          <div
            key={c.key}
            className="bg-white/40 border border-slate-200/30 rounded-xl p-4 border-l-[3px]"
            style={{ borderLeftColor: c.color }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: c.color }}>
                  {c.label}
                </span>
                <span className="text-sm font-mono text-slate-400">
                  {c.evidenceCount}건 근거
                </span>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-md text-sm font-mono font-bold",
                c.avgScore >= 7 ? "bg-teal-50 text-teal-600" :
                c.avgScore >= 5 ? "bg-amber-500/15 text-amber-600" :
                c.avgScore > 0 ? "bg-red-500/15 text-red-400" :
                "bg-slate-100/30 text-slate-400"
              )}>
                {c.avgScore > 0 ? `${c.avgScore.toFixed(1)}/9` : "미평가"}
              </div>
            </div>
            {/* 상황사례 + 활동유형 */}
            {c.scenario && (
              <p className="text-xs text-slate-400 mb-2">
                {c.scenario} · {c.activityType}
              </p>
            )}

            {c.topHighlight && (
              <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-2">
                {c.topHighlight}
              </p>
            )}

            {/* 루브릭 항목별 판정 기준 (BARS) */}
            {c.rubricScores.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200/20 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  BARS 루브릭 판정 ({c.rubricScores[0]?.levelLabel})
                </p>
                {c.rubricScores.map((rs, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5 shrink-0 w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-slate-600">{rs.criteria}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({rs.subLabel})</span>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{rs.levelDescription}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(c.strengths.length > 0 || c.improvements.length > 0) && (
              <div className="mt-2 pt-2 border-t border-slate-200/30 flex flex-wrap gap-2">
                {c.strengths.map((s, i) => (
                  <span key={i} className="text-sm bg-teal-50 text-teal-600/80 px-2 py-0.5 rounded">
                    {s}
                  </span>
                ))}
                {c.improvements.map((s, i) => (
                  <span key={i} className="text-sm bg-amber-50 text-amber-600/80 px-2 py-0.5 rounded">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
