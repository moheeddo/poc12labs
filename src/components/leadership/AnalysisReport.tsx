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
  BookOpen,
} from "lucide-react";
import type { AnalysisReportData } from "@/lib/leadership-analysis";
import { cn } from "@/lib/utils";
import { PlayCircle } from "lucide-react";

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface AnalysisReportProps {
  data: AnalysisReportData;
  onSeek?: (time: number) => void;
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

export default function AnalysisReport({ data, onSeek }: AnalysisReportProps) {
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
      <div className="bg-white border border-slate-200/40 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 px-5 py-4 border-b border-slate-200/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">BARS 역량 분석 리포트</h3>
              <p className="text-xs text-slate-500">
                {data.totalEvidenceCount}개 행동 근거 분석 · {data.scoredCount}건 평가 완료 · AI 자동 채점
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* 종합 점수 + 역량 바 */}
          <div className="flex items-start gap-6">
            <div className={cn("px-5 py-4 rounded-xl border shrink-0 text-center min-w-[120px]", getScoreBg(data.overallScore))}>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">종합 점수</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className={cn("text-4xl font-bold font-mono tabular-nums", getScoreColor(data.overallScore))}>
                  {hasScores ? data.overallScore.toFixed(1) : "-"}
                </span>
                <span className="text-sm text-slate-400">/9</span>
              </div>
              {hasScores && (
                <span className={cn(
                  "inline-block text-xs font-semibold mt-2 px-2.5 py-1 rounded-full",
                  data.overallScore >= 7 ? "bg-teal-100 text-teal-700" :
                  data.overallScore >= 5 ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-600"
                )}>
                  {data.overallInterpretation || getScoreLabel(data.overallScore)}
                </span>
              )}
            </div>

            {/* 역량별 미니 바 */}
            <div className="flex-1 space-y-2.5">
              {data.competencies.map((c) => (
                <div key={c.key} className="flex items-center gap-2.5">
                  <span className="text-[13px] text-slate-600 w-24 truncate font-medium">{c.label}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(c.avgScore > 0 ? (c.avgScore / 9) * 100 : 2, 2)}%`,
                        backgroundColor: c.color,
                        opacity: c.avgScore > 0 ? 1 : 0.15,
                      }}
                    />
                  </div>
                  <span className={cn("text-sm font-mono font-semibold tabular-nums w-10 text-right", getScoreColor(c.avgScore))}>
                    {c.avgScore > 0 ? c.avgScore.toFixed(1) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 보고서 요약 (rubricurl 문서 4 규칙) ── */}
      {data.reportSummary ? (
        <div className="bg-teal-50/50 border border-teal-500/15 rounded-xl p-5">
          <p className="text-base text-teal-600 font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            종합 평가 요약
          </p>
          <p className="text-base text-slate-700 leading-[1.85]">{data.reportSummary}</p>
        </div>
      ) : (
        <div className="bg-slate-50/50 border border-slate-200/30 rounded-xl p-4">
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
            BARS 분석 완료 — 역량별 상세 결과를 확인하세요
          </p>
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

      {/* ── AI 분석 요약 ── */}
      {data.aiSummary && (
        <div className="bg-white/60 border border-slate-200/40 rounded-xl p-5">
          <p className="text-sm text-teal-600 font-medium flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            AI 분석 요약
          </p>
          <p className="text-base text-slate-600 leading-[1.8]">{data.aiSummary}</p>
        </div>
      )}

      {/* ── 강점/개선 + 레이더 (좌:강점개선, 우:차트 컴팩트) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 강점 */}
        <div className="bg-teal-500/5 border border-teal-500/15 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            <p className="text-xs font-medium text-teal-600">강점</p>
          </div>
          <div className="space-y-1.5">
            {data.topStrengths.length > 0 ? data.topStrengths.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-teal-500/60 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">{s}</p>
              </div>
            )) : <p className="text-xs text-slate-400">분석 후 표시됩니다</p>}
          </div>
        </div>

        {/* 개선 */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-xs font-medium text-amber-600">개선 포인트</p>
          </div>
          <div className="space-y-1.5">
            {data.topImprovements.length > 0 ? data.topImprovements.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-500/60 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">{s}</p>
              </div>
            )) : <p className="text-xs text-slate-400">분석 후 표시됩니다</p>}
          </div>
        </div>

        {/* 레이더 차트 (컴팩트) */}
        {hasScores && (
          <div className="bg-white/40 border border-slate-200/30 rounded-xl p-2">
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 9 }} />
                <PolarRadiusAxis domain={[0, 9]} tickCount={3} tick={false} axisLine={false} />
                <Radar
                  name="점수"
                  dataKey="score"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#14b8a6", strokeWidth: 0 }}
                />
                <Tooltip content={<RadarTooltipContent />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── 역량별 상세 ── */}
      <div className="space-y-4" id="competency-details">
        {data.competencies.map((c) => (
          <div
            key={c.key}
            className="bg-white border border-slate-200/30 rounded-2xl overflow-hidden"
          >
            {/* 역량 헤더 */}
            <div
              className="px-5 py-3.5 flex items-center justify-between"
              style={{ backgroundColor: `${c.color}08`, borderBottom: `2px solid ${c.color}30` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${c.color}18` }}
                >
                  <BarChart3 className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: c.color }}>
                    {c.label}
                  </h4>
                  {c.scenario && (
                    <p className="text-[11px] text-slate-500">{c.scenario} · {c.activityType}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">{c.evidenceCount}건</span>
                <div className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-mono font-bold",
                  c.avgScore >= 7 ? "bg-teal-50 text-teal-600 border border-teal-200" :
                  c.avgScore >= 5 ? "bg-amber-50 text-amber-600 border border-amber-200" :
                  c.avgScore > 0 ? "bg-red-50 text-red-500 border border-red-200" :
                  "bg-slate-50 text-slate-400 border border-slate-200"
                )}>
                  {c.avgScore > 0 ? `${c.avgScore.toFixed(1)}/9` : "미평가"}
                  <span className="text-[10px] ml-1 font-medium">
                    {c.avgScore > 0 ? getScoreLabel(c.avgScore) : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* 대표 근거 + 비디오 이동 */}
              {c.topHighlight && (
                <div className={cn(
                  "flex items-start gap-3 rounded-xl p-3.5",
                  c.highlightTimestamp !== undefined && onSeek ? "bg-teal-50/50 border border-teal-100 cursor-pointer hover:bg-teal-50 transition-colors" : "bg-slate-50/50 border border-slate-100"
                )}
                  onClick={() => {
                    if (c.highlightTimestamp !== undefined && onSeek) onSeek(c.highlightTimestamp);
                  }}
                >
                  {c.highlightTimestamp !== undefined && onSeek && (
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                      <PlayCircle className="w-5 h-5 text-teal-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {c.highlightTimestamp !== undefined && (
                      <p className="text-[10px] font-mono text-teal-600 mb-0.5">{formatTime(c.highlightTimestamp)} 클릭하여 해당 장면 재생</p>
                    )}
                    <p className="text-sm text-slate-600 leading-relaxed">{c.topHighlight}</p>
                  </div>
                </div>
              )}

              {/* BARS 루브릭 판정 테이블 */}
              {c.rubricScores.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">BARS 루브릭 판정</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{c.rubricScores[0]?.levelLabel}</span>
                  </div>
                  <div className="space-y-2">
                    {c.rubricScores.map((rs, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-xl border p-3.5 transition-all",
                          rs.evidenceTimestamp !== undefined && rs.evidenceTimestamp > 0 && onSeek
                            ? "cursor-pointer hover:shadow-md hover:border-teal-200"
                            : "",
                          "bg-white border-slate-100"
                        )}
                        onClick={() => {
                          if (rs.evidenceTimestamp !== undefined && rs.evidenceTimestamp > 0 && onSeek) {
                            onSeek(rs.evidenceTimestamp);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">#{i + 1}</span>
                              <span className="text-xs font-semibold text-slate-700">{rs.criteria}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{rs.subLabel}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{rs.levelDescription}</p>
                          </div>
                          {rs.evidenceTimestamp !== undefined && rs.evidenceTimestamp > 0 && onSeek && (
                            <div className="shrink-0 flex items-center gap-1 text-[11px] font-mono text-teal-600 bg-teal-50 rounded-lg px-2.5 py-1.5 border border-teal-100">
                              <PlayCircle className="w-3 h-3" />
                              {formatTime(rs.evidenceTimestamp)}
                            </div>
                          )}
                        </div>
                        {/* 행동 근거 */}
                        {rs.evidenceText && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="text-[11px] text-teal-700/80 leading-relaxed flex items-start gap-1.5">
                              <span className="shrink-0 text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">근거</span>
                              <span className="italic">&ldquo;{rs.evidenceText}&rdquo;</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 강점/개선 태그 */}
              {(c.strengths.length > 0 || c.improvements.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {c.strengths.map((s, i) => (
                    <span key={i} className="text-xs bg-teal-50 text-teal-600 px-2.5 py-1 rounded-lg border border-teal-100 font-medium">
                      {s}
                    </span>
                  ))}
                  {c.improvements.map((s, i) => (
                    <span key={i} className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg border border-amber-100 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── 평가 방법론 참고 문헌 ── */}
      {(() => {
        // 모든 역량의 reference를 수집, 개별 논문으로 분리, 중복 제거
        const allRefs = data.competencies
          .filter((c) => c.reference)
          .flatMap((c) => c.reference!.split("|").map((r) => r.trim()))
          .filter((r) => r.length > 0);
        const uniqueRefs = [...new Set(allRefs)];
        if (uniqueRefs.length === 0) return null;

        return (
          <div className="bg-slate-50/60 border border-slate-200/30 rounded-xl p-4 mt-1">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-600">
                평가 방법론 참고 문헌
              </p>
            </div>
            <ul className="space-y-1.5">
              {uniqueRefs.map((ref, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed"
                >
                  <span className="font-mono text-[10px] text-slate-400 shrink-0 mt-0.5">
                    [{i + 1}]
                  </span>
                  <span>{ref}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
              본 평가는 BARS(Behaviorally Anchored Rating Scales) 방법론과 멀티모달 AI 분석을 결합하여 수행되었습니다.
              각 역량의 행동 앵커는 위 학술 연구에 기반합니다.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
