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
  PlayCircle,
  Printer,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Award,
  Target,
  BookOpen,
  BarChart3,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceMap } from "@/lib/evidence";
import type { DerailerProfile } from "@/lib/derailer";
import type { BEIAnalysis } from "@/lib/bei";
import type { TriangulatedScore, CoachingFeedback } from "@/lib/compliance";
import type { NormTable } from "@/lib/validation";

// ─── 유틸 ───────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString("ko-KR");
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoreColor(score: number): string {
  if (score >= 7) return "text-teal-600";
  if (score >= 5) return "text-amber-600";
  if (score > 0) return "text-red-400";
  return "text-slate-400";
}

function getScoreLabel(score: number): string {
  if (score >= 8) return "탁월";
  if (score >= 7) return "우수";
  if (score >= 5) return "보통";
  if (score >= 3) return "미흡";
  if (score > 0) return "부족";
  return "미평가";
}

function getAgreementStyle(agreement: TriangulatedScore["agreement"]) {
  switch (agreement) {
    case "agree":
      return {
        badge: "bg-teal-100 text-teal-700 border-teal-300",
        label: "일치",
        dot: "bg-teal-500",
      };
    case "minor_diff":
      return {
        badge: "bg-amber-100 text-amber-700 border-amber-300",
        label: "소폭 차이",
        dot: "bg-amber-500",
      };
    case "major_diff":
      return {
        badge: "bg-red-100 text-red-600 border-red-300",
        label: "불일치",
        dot: "bg-red-500",
      };
  }
}

// ─── Props ──────────────────────────────────────────────────────────

interface IntegratedReportProps {
  // 기존 역량 점수
  competencyScores: Record<string, number>;
  competencyLabels: Record<string, string>;
  // 증거 맵
  evidenceMaps?: EvidenceMap[];
  // 탈선 프로필
  derailerProfile?: DerailerProfile | null;
  // BEI 분석
  beiAnalysis?: BEIAnalysis | null;
  // 삼각측정 결과
  triangulatedScores?: TriangulatedScore[];
  // 노름 비교
  normTable?: NormTable | null;
  participantGroup?: string;
  // 코칭 피드백
  coachingFeedback?: CoachingFeedback | null;
  // 비디오 연동
  onSeekVideo?: (timestamp: number) => void;
}

// ─── 섹션 헤더 ──────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accent = "teal",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  accent?: "teal" | "amber" | "red" | "slate";
}) {
  const accentMap = {
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", accentMap[accent])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── 1. 헤더 섹션 ───────────────────────────────────────────────────

function ReportHeader({
  coachingFeedback,
  overallScore,
  competencyScores,
}: {
  coachingFeedback?: CoachingFeedback | null;
  overallScore: number;
  competencyScores: Record<string, number>;
}) {
  const scoreLabel = getScoreLabel(overallScore);
  const scoreColor = getScoreColor(overallScore);
  const scoredCount = Object.values(competencyScores).filter((s) => s > 0).length;

  return (
    <div className="bg-white/70 border border-slate-200/50 rounded-2xl p-6 print:border-slate-300">
      <div className="flex flex-wrap items-start gap-4">
        {/* 아이콘 + 제목 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-teal-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">리더십 역량 통합 심층 리포트</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {coachingFeedback?.participantId && (
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <User className="w-3.5 h-3.5" />
                  참여자: {coachingFeedback.participantId}
                </span>
              )}
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(coachingFeedback?.generatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* 종합 점수 배지 */}
        <div className="shrink-0 text-center">
          <div
            className={cn(
              "px-5 py-3 rounded-xl border-2",
              overallScore >= 7
                ? "bg-teal-50 border-teal-400"
                : overallScore >= 5
                ? "bg-amber-50 border-amber-400"
                : "bg-red-50 border-red-400"
            )}
          >
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">종합 점수</p>
            <p className={cn("text-3xl font-bold font-mono tabular-nums", scoreColor)}>
              {overallScore > 0 ? overallScore.toFixed(1) : "—"}
            </p>
            <p className="text-xs font-medium text-slate-500">/ 10</p>
            {overallScore > 0 && (
              <p className={cn("text-xs font-semibold mt-1", scoreColor)}>{scoreLabel}</p>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {scoredCount}개 역량 평가 완료
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 2. 통합 레이더 차트 ────────────────────────────────────────────

interface RadarDatum {
  subject: string;
  competency: number;
  derailerRisk: number;
  fullMark: number;
}

function IntegratedRadar({
  competencyScores,
  competencyLabels,
  derailerProfile,
}: {
  competencyScores: Record<string, number>;
  competencyLabels: Record<string, string>;
  derailerProfile?: DerailerProfile | null;
}) {
  const radarData: RadarDatum[] = useMemo(() => {
    return Object.entries(competencyLabels).map(([key, label]) => {
      const competency = competencyScores[key] ?? 0;

      // 탈선 데이터 연계: 탈선 패턴 점수를 역전(10 - score)해서 역량과 함께 표시
      let derailerRisk = 10; // 기본값: 위험 없음 = 10 (좋은 것)
      if (derailerProfile) {
        // 탈선 위험이 높을수록 낮은 값으로 변환 (역전)
        const maxRisk = derailerProfile.patterns.length > 0
          ? Math.max(...derailerProfile.patterns.map((p) => p.score))
          : 0;
        derailerRisk = 10 - maxRisk * 0.3; // 가중 적용
      }

      return {
        subject: label,
        competency,
        derailerRisk,
        fullMark: 10,
      };
    });
  }, [competencyScores, competencyLabels, derailerProfile]);

  const hasDerailer = !!derailerProfile;

  return (
    <div className="bg-white/70 border border-slate-200/50 rounded-2xl p-5 print:border-slate-300">
      <SectionHeader
        icon={Layers}
        title="밝은면 + 어두운면 통합 역량 레이더"
        subtitle="역량 강점(teal)과 탈선 위험도(amber) 통합 시각화"
        accent="teal"
      />

      <div className="flex flex-wrap gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-3 h-3 rounded-sm bg-teal-400/60 inline-block" />
          역량 점수
        </span>
        {hasDerailer && (
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-sm bg-amber-400/60 inline-block" />
            탈선 위험 역전값 (높을수록 안전)
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickCount={5}
          />
          <Radar
            name="역량 점수"
            dataKey="competency"
            stroke="#14b8a6"
            fill="#14b8a6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          {hasDerailer && (
            <Radar
              name="탈선 위험 역전값"
              dataKey="derailerRisk"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.15}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-xl">
                  <p className="text-xs font-medium text-slate-700 mb-1">
                    {payload[0]?.payload?.subject}
                  </p>
                  {payload.map((p, i) => (
                    <p key={i} className="text-xs" style={{ color: p.color }}>
                      {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
                    </p>
                  ))}
                </div>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* 탈선 위험 요약 */}
      {hasDerailer && derailerProfile && (
        <div className="mt-3 flex flex-wrap gap-2">
          {derailerProfile.topRisks.slice(0, 3).map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 text-[10px] font-medium border rounded px-2 py-1 bg-amber-50 text-amber-700 border-amber-300"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              {r.name}: {r.score.toFixed(1)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 3. 삼각측정 비교 테이블 ────────────────────────────────────────

function TriangulationTable({
  triangulatedScores,
  competencyLabels,
}: {
  triangulatedScores: TriangulatedScore[];
  competencyLabels: Record<string, string>;
}) {
  return (
    <div className="bg-white/70 border border-slate-200/50 rounded-2xl p-5 print:border-slate-300">
      <SectionHeader
        icon={BarChart3}
        title="삼각측정 비교 분석"
        subtitle="AI vs 인간 평가자 점수 대조 및 최종 합산 결과"
        accent="slate"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/60">
              <th className="text-left py-2 pr-3 text-xs font-medium text-slate-500 uppercase tracking-wider">역량</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">AI 점수</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">인간 점수</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">최종 점수</th>
              <th className="text-center py-2 pl-2 text-xs font-medium text-slate-500 uppercase tracking-wider">일치도</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {triangulatedScores.map((row) => {
              const style = getAgreementStyle(row.agreement);
              const label = competencyLabels[row.competencyKey] ?? row.competencyKey;
              return (
                <tr key={row.competencyKey} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-2.5 pr-3 font-medium text-slate-700">{label}</td>
                  <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-600">
                    {row.aiScore.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-600">
                    {row.humanScore.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={cn("font-bold font-mono tabular-nums", getScoreColor(row.finalScore))}>
                      {row.finalScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2.5 pl-2 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5",
                        style.badge
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                      {style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 범례 */}
      <div className="mt-3 flex flex-wrap gap-3 pt-3 border-t border-slate-100/60">
        {(["agree", "minor_diff", "major_diff"] as const).map((ag) => {
          const s = getAgreementStyle(ag);
          return (
            <span key={ag} className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className={cn("w-2 h-2 rounded-full", s.dot)} />
              {s.label}
            </span>
          );
        })}
        <span className="ml-auto text-[10px] text-slate-400">가중치: AI 60% · 인간 40%</span>
      </div>
    </div>
  );
}

// ─── 4. 증거 링크 섹션 ──────────────────────────────────────────────

function EvidenceSection({
  evidenceMaps,
  competencyLabels,
  onSeekVideo,
}: {
  evidenceMaps: EvidenceMap[];
  competencyLabels: Record<string, string>;
  onSeekVideo?: (timestamp: number) => void;
}) {
  return (
    <div className="bg-white/70 border border-slate-200/50 rounded-2xl p-5 print:border-slate-300">
      <SectionHeader
        icon={BookOpen}
        title="증거 링크 맵"
        subtitle="역량별 영상 근거 클립 및 커버리지"
        accent="teal"
      />

      <div className="space-y-4">
        {evidenceMaps.map((em) => {
          const label = competencyLabels[em.competencyKey] ?? em.competencyKey;
          const coveragePct = Math.round(em.coverageRate * 100);

          return (
            <div
              key={em.competencyKey}
              className="border border-slate-200/40 rounded-xl overflow-hidden"
            >
              {/* 역량 헤더 */}
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/60">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {/* 커버리지 바 */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[10px] text-slate-500 shrink-0">커버리지</span>
                      <div className="flex-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-700"
                          style={{ width: `${coveragePct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-medium text-teal-600 shrink-0">
                        {coveragePct}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold font-mono tabular-nums text-teal-600">
                    {em.score.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-slate-400">클립 {em.clips.length}건</p>
                </div>
              </div>

              {/* 클립 목록 */}
              {em.clips.length > 0 && (
                <div className="px-4 py-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {em.clips.map((clip, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSeekVideo?.(clip.videoTimestamp.start)}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded px-1.5 py-1 min-h-[28px] transition-colors whitespace-nowrap"
                      title={clip.matchedText || clip.rubricItemText}
                    >
                      <PlayCircle className="w-2.5 h-2.5 shrink-0" />
                      {formatTime(clip.videoTimestamp.start)}–{formatTime(clip.videoTimestamp.end)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 5. BEI 핵심 사례 ───────────────────────────────────────────────

function BEISection({
  beiAnalysis,
  competencyLabels,
  onSeekVideo,
}: {
  beiAnalysis: BEIAnalysis;
  competencyLabels: Record<string, string>;
  onSeekVideo?: (timestamp: number) => void;
}) {
  // qualityScore 내림차순 Top 3
  const topEvents = useMemo(
    () =>
      [...beiAnalysis.events]
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, 3),
    [beiAnalysis.events]
  );

  return (
    <div className="bg-white/70 border border-slate-200/50 rounded-2xl p-5 print:border-slate-300">
      <SectionHeader
        icon={Star}
        title="BEI 핵심 사례 (Top 3)"
        subtitle="품질 점수 기준 상위 행동 사례 STAR 분석"
        accent="amber"
      />

      <div className="space-y-3">
        {topEvents.map((event, rank) => {
          const competencyTags = event.codedCompetencies
            .map((cc) => competencyLabels[cc.competencyKey] ?? cc.competencyKey)
            .slice(0, 3);

          return (
            <div
              key={event.id}
              className="border border-slate-200/50 rounded-xl overflow-hidden"
            >
              {/* STAR 카드 헤더 */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50/60 border-b border-amber-100/60">
                <span className="text-[10px] font-mono font-bold text-white bg-amber-500 rounded px-1.5 py-0.5">
                  #{rank + 1}
                </span>
                <span className="text-sm font-semibold text-slate-700 flex-1 min-w-0">
                  이벤트 {event.id}
                </span>
                {/* 품질 점수 */}
                <span className="flex items-center gap-1 text-xs font-mono text-amber-700">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {event.qualityScore}/5
                </span>
                {/* STAR 완성도 */}
                <span className="text-[10px] text-slate-500">
                  완성도 {Math.round(event.star.completeness * 100)}%
                </span>
              </div>

              {/* Action 텍스트 (핵심) */}
              <div className="px-4 py-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Action</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {event.star.action.text}
                </p>

                {/* 타임스탬프 링크 */}
                <button
                  onClick={() => onSeekVideo?.(event.star.action.timestamp.start)}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded px-1.5 py-1 min-h-[28px] transition-colors"
                >
                  <PlayCircle className="w-2.5 h-2.5" />
                  {formatTime(event.star.action.timestamp.start)}–{formatTime(event.star.action.timestamp.end)}
                </button>

                {/* 역량 태그 */}
                {competencyTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {competencyTags.map((tag, i) => {
                      const cc = event.codedCompetencies[i];
                      return (
                        <span
                          key={i}
                          className={cn(
                            "text-[10px] font-medium border rounded px-1.5 py-0.5",
                            cc?.level === "differentiating"
                              ? "bg-teal-100 text-teal-700 border-teal-300"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          )}
                        >
                          {tag}
                          {cc?.level === "differentiating" && " ★"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {beiAnalysis.events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
            <Star className="w-8 h-8 mb-2 text-slate-200" />
            <p className="text-sm">BEI 이벤트가 없습니다</p>
          </div>
        )}
      </div>

      {/* 차별화 역량 */}
      {beiAnalysis.differentiatingCompetencies.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100/60">
          <p className="text-xs font-medium text-slate-600 mb-2">차별화 역량</p>
          <div className="flex flex-wrap gap-1.5">
            {beiAnalysis.differentiatingCompetencies.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 text-[10px] font-medium bg-teal-100 text-teal-700 border border-teal-300 rounded-full px-2 py-0.5"
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                {competencyLabels[key] ?? key}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 6. 노름 비교 ───────────────────────────────────────────────────

function NormComparison({
  normTable,
  participantGroup,
  competencyScores,
  competencyLabels,
}: {
  normTable: NormTable;
  participantGroup: string;
  competencyScores: Record<string, number>;
  competencyLabels: Record<string, string>;
}) {
  // 참여자 그룹 통계 찾기
  const groupStats = normTable.groups.find((g) => g.groupName === participantGroup);

  if (!groupStats) {
    return (
      <div className="bg-white/70 border border-slate-200/50 rounded-2xl p-5 print:border-slate-300">
        <SectionHeader icon={Target} title="노름 비교" accent="slate" />
        <p className="text-sm text-slate-400 text-center py-6">
          그룹 &apos;{participantGroup}&apos;에 대한 노름 데이터가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/70 border border-slate-200/50 rounded-2xl p-5 print:border-slate-300">
      <SectionHeader
        icon={Target}
        title="노름 비교"
        subtitle={`${groupStats.groupName} 그룹 기준 (N=${groupStats.n})`}
        accent="slate"
      />

      <div className="space-y-3">
        {Object.entries(competencyLabels).map(([key, label]) => {
          const score = competencyScores[key] ?? 0;
          const stats = groupStats.percentiles[key];
          if (!stats) return null;

          // 백분위 계산 (선형 보간)
          let percentile = 50;
          if (score <= stats.p10) percentile = 10;
          else if (score <= stats.p25) percentile = 10 + ((score - stats.p10) / (stats.p25 - stats.p10)) * 15;
          else if (score <= stats.p50) percentile = 25 + ((score - stats.p25) / (stats.p50 - stats.p25)) * 25;
          else if (score <= stats.p75) percentile = 50 + ((score - stats.p50) / (stats.p75 - stats.p50)) * 25;
          else if (score <= stats.p90) percentile = 75 + ((score - stats.p75) / (stats.p90 - stats.p75)) * 15;
          else percentile = 90 + Math.min(10, ((score - stats.p90) / (10 - stats.p90)) * 10);

          const pctRounded = Math.round(percentile);
          const indicatorLeft = Math.max(0, Math.min(100, pctRounded));

          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-600 flex-1 min-w-0 truncate">{label}</span>
                <span className={cn("text-xs font-mono font-bold tabular-nums", getScoreColor(score))}>
                  {score > 0 ? score.toFixed(1) : "—"}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0 w-14 text-right">
                  P{pctRounded}
                </span>
              </div>

              {/* 백분위 바 */}
              <div className="relative h-3 bg-slate-100/80 rounded-full overflow-visible">
                {/* 백분위 구간 색상 영역 */}
                <div className="absolute inset-0 flex rounded-full overflow-hidden">
                  <div className="w-[10%] bg-red-200/60" />
                  <div className="w-[15%] bg-amber-200/60" />
                  <div className="w-[25%] bg-yellow-200/60" />
                  <div className="w-[25%] bg-teal-200/60" />
                  <div className="w-[15%] bg-teal-300/60" />
                  <div className="w-[10%] bg-teal-400/60" />
                </div>
                {/* P50 중앙선 */}
                <div className="absolute top-0 bottom-0 w-px bg-slate-400/40" style={{ left: "50%" }} />
                {/* 현재 점수 인디케이터 */}
                {score > 0 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-teal-600 border-2 border-white shadow-sm z-10"
                    style={{ left: `${indicatorLeft}%` }}
                    title={`P${pctRounded}`}
                  />
                )}
              </div>

              {/* P10 / P50 / P90 레이블 */}
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 px-0.5">
                <span>P10 ({stats.p10})</span>
                <span>P50 ({stats.p50})</span>
                <span>P90 ({stats.p90})</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400 mt-3 text-right">
        마지막 업데이트: {new Date(normTable.lastUpdated).toLocaleDateString("ko-KR")}
      </p>
    </div>
  );
}

// ─── 7. 즉시 코칭 피드백 ────────────────────────────────────────────

function CoachingSection({
  coachingFeedback,
  competencyLabels,
}: {
  coachingFeedback: CoachingFeedback;
  competencyLabels: Record<string, string>;
}) {
  const { strengths, developmentAreas, comparedToPrevious } = coachingFeedback;

  function PreviousBadge({ competencyKey }: { competencyKey: string }) {
    if (!comparedToPrevious) return null;
    if (comparedToPrevious.improved.includes(competencyKey)) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-teal-100 text-teal-700 border border-teal-300 rounded-full px-1.5 py-0.5 ml-1">
          <TrendingUp className="w-2.5 h-2.5" />
          향상↑
        </span>
      );
    }
    if (comparedToPrevious.maintained.includes(competencyKey)) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-1.5 py-0.5 ml-1">
          <Minus className="w-2.5 h-2.5" />
          유지→
        </span>
      );
    }
    if (comparedToPrevious.needsAttention.includes(competencyKey)) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-1.5 py-0.5 ml-1">
          <TrendingDown className="w-2.5 h-2.5" />
          주의↓
        </span>
      );
    }
    return null;
  }

  return (
    <div className="bg-white/70 border border-slate-200/50 rounded-2xl p-5 print:border-slate-300">
      <SectionHeader
        icon={Award}
        title="즉시 코칭 피드백"
        subtitle="AI 분석 기반 강점 및 개발 영역 피드백"
        accent="teal"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 강점 */}
        <div>
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            강점 ({strengths.length}건)
          </p>
          <div className="space-y-2">
            {strengths.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">강점 데이터 없음</p>
            ) : (
              strengths.map((s, i) => (
                <div
                  key={i}
                  className="border-l-2 border-teal-400 bg-teal-50/60 rounded-r-xl px-3 py-2.5"
                >
                  <div className="flex items-center flex-wrap gap-0.5 mb-1">
                    <span className="text-xs font-semibold text-teal-800">
                      {competencyLabels[s.competencyKey] ?? s.competencyKey}
                    </span>
                    <PreviousBadge competencyKey={s.competencyKey} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.description}</p>
                  {s.evidence && (
                    <p className="text-[10px] text-slate-400 mt-1 italic">&ldquo;{s.evidence}&rdquo;</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 개발 영역 */}
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            개발 영역 ({developmentAreas.length}건)
          </p>
          <div className="space-y-2">
            {developmentAreas.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">개발 영역 데이터 없음</p>
            ) : (
              developmentAreas.map((d, i) => (
                <div
                  key={i}
                  className="border-l-2 border-amber-400 bg-amber-50/60 rounded-r-xl px-3 py-2.5"
                >
                  <div className="flex items-center flex-wrap gap-0.5 mb-1">
                    <span className="text-xs font-semibold text-amber-800">
                      {competencyLabels[d.competencyKey] ?? d.competencyKey}
                    </span>
                    <PreviousBadge competencyKey={d.competencyKey} />
                  </div>
                  <p className="text-[10px] text-slate-500 mb-1">
                    현재: {d.currentLevel} → 목표: {d.targetLevel}
                  </p>
                  {d.actionItems.length > 0 && (
                    <ul className="space-y-0.5">
                      {d.actionItems.map((action, ai) => (
                        <li key={ai} className="flex items-start gap-1 text-xs text-slate-600">
                          <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 이전 세션 비교 요약 */}
      {comparedToPrevious && (
        <div className="mt-4 pt-3 border-t border-slate-100/60">
          <p className="text-xs font-medium text-slate-600 mb-2">이전 세션 비교 요약</p>
          <div className="flex flex-wrap gap-2">
            {comparedToPrevious.improved.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-teal-700">
                <TrendingUp className="w-3 h-3" />
                향상: {comparedToPrevious.improved.map((k) => competencyLabels[k] ?? k).join(", ")}
              </div>
            )}
            {comparedToPrevious.maintained.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Minus className="w-3 h-3" />
                유지: {comparedToPrevious.maintained.map((k) => competencyLabels[k] ?? k).join(", ")}
              </div>
            )}
            {comparedToPrevious.needsAttention.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-amber-700">
                <TrendingDown className="w-3 h-3" />
                주의: {comparedToPrevious.needsAttention.map((k) => competencyLabels[k] ?? k).join(", ")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────

export default function IntegratedReport({
  competencyScores,
  competencyLabels,
  evidenceMaps,
  derailerProfile,
  beiAnalysis,
  triangulatedScores,
  normTable,
  participantGroup,
  coachingFeedback,
  onSeekVideo,
}: IntegratedReportProps) {
  // 종합 점수 계산
  const overallScore = useMemo(() => {
    const scores = Object.values(competencyScores).filter((s) => s > 0);
    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }, [competencyScores]);

  const hasTriangulation = triangulatedScores && triangulatedScores.length > 0;
  const hasEvidence = evidenceMaps && evidenceMaps.length > 0;
  const hasBEI = beiAnalysis && beiAnalysis.events.length > 0;
  const hasNorm = normTable && participantGroup;
  const hasCoaching = !!coachingFeedback;

  return (
    <>
      {/* 인쇄 전용 스타일 */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:border-slate-300 { border-color: #cbd5e1 !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="space-y-5">
        {/* PDF 인쇄 버튼 */}
        <div className="flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            PDF 인쇄
          </button>
        </div>

        {/* 1. 헤더 */}
        <ReportHeader
          coachingFeedback={coachingFeedback}
          overallScore={overallScore}
          competencyScores={competencyScores}
        />

        {/* 2. 통합 레이더 차트 */}
        <IntegratedRadar
          competencyScores={competencyScores}
          competencyLabels={competencyLabels}
          derailerProfile={derailerProfile}
        />

        {/* 3. 삼각측정 비교 테이블 */}
        {hasTriangulation && (
          <TriangulationTable
            triangulatedScores={triangulatedScores}
            competencyLabels={competencyLabels}
          />
        )}

        {/* 4. 증거 링크 섹션 */}
        {hasEvidence && (
          <EvidenceSection
            evidenceMaps={evidenceMaps}
            competencyLabels={competencyLabels}
            onSeekVideo={onSeekVideo}
          />
        )}

        {/* 5. BEI 핵심 사례 */}
        {hasBEI && (
          <BEISection
            beiAnalysis={beiAnalysis}
            competencyLabels={competencyLabels}
            onSeekVideo={onSeekVideo}
          />
        )}

        {/* 6. 노름 비교 */}
        {hasNorm && (
          <NormComparison
            normTable={normTable}
            participantGroup={participantGroup}
            competencyScores={competencyScores}
            competencyLabels={competencyLabels}
          />
        )}

        {/* 7. 즉시 코칭 피드백 */}
        {hasCoaching && (
          <CoachingSection
            coachingFeedback={coachingFeedback}
            competencyLabels={competencyLabels}
          />
        )}

        {/* 데이터 없음 안내 */}
        {!hasTriangulation && !hasEvidence && !hasBEI && !hasNorm && !hasCoaching && (
          <div className="bg-white/60 border border-slate-200/40 rounded-2xl p-8 text-center">
            <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">분석 데이터 대기 중</p>
            <p className="text-xs text-slate-400 mt-1">
              AI 분석을 실행하면 통합 심층 리포트가 자동 생성됩니다.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
