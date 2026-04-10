"use client";

import { useState } from "react";
import {
  Shield, GitCompare, Star, AlertTriangle,
  FileText, CheckCircle2, XCircle, Clock, Eye,
  Brain, Sparkles, ClipboardCheck, BarChart3, Mic, Loader2,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import ChartTooltip from "@/components/shared/ChartTooltip";
import CompetencyProgression from "@/components/pov/CompetencyProgression";
import LearningObjectivesMatrix from "@/components/pov/LearningObjectivesMatrix";
import StepsTimeline from "@/components/pov/StepsTimeline";
import HandObjectTimeline from "@/components/pov/HandObjectTimeline";
import ComparisonView from "@/components/pov/ComparisonView";
import TimeAnalysis from "@/components/pov/TimeAnalysis";
import CommunicationPanel from "@/components/pov/CommunicationPanel";
import MicroLearning from "@/components/pov/MicroLearning";
import ReflectionComparison from "@/components/pov/ReflectionComparison";
import type { SelfReflectionData } from "@/components/pov/SelfReflection";
import { HPO_TOOLS, OPERATOR_FUNDAMENTALS, getGradeForScore, type Procedure } from "@/lib/pov-standards";
import type { PovEvaluationReport, StepEvaluation, HpoToolEvaluation, FundamentalScore, DetectedStep, GoldStandard } from "@/lib/types";
import type { CommunicationAnalysis } from "@/lib/pov-communication-analysis";
import { formatTime, cn } from "@/lib/utils";

// ── Props ──────────────────────────────────────
export interface OperatorReportViewProps {
  report: PovEvaluationReport;
  procedure: Procedure;
  operatorName?: string;           // 세션 모드에서 운전원 이름
  videoDuration?: number;          // StepsTimeline에 필요
  videoUrl?: string;               // 향후 EvidencePlayer용
  goldStandard?: GoldStandard | null;  // ComparisonView에 필요
  selfReflection?: SelfReflectionData | null;  // ReflectionComparison에 필요
  onSeek?: (time: number) => void;  // 영상 시점 이동
  transcription?: { start: number; end: number; text: string; speaker?: string }[];  // 전사문
}

// ── 메인 컴포넌트 ──────────────────────────────
export default function OperatorReportView({
  report,
  procedure,
  operatorName,
  videoDuration,
  videoUrl,
  goldStandard,
  selfReflection,
  onSeek,
  transcription,
}: OperatorReportViewProps) {
  // 리포트 서브탭 상태 (내부 관리)
  const [reportTab, setReportTab] = useState<
    "overview" | "steps" | "handObject" | "hpo" | "comparison" | "fundamentals" | "time"
  >("overview");

  // 의사소통 분석 (내부 관리)
  const [commAnalysis, setCommAnalysis] = useState<CommunicationAnalysis | null>(null);
  const [commLoading, setCommLoading] = useState(false);

  const handleSeek = (time: number) => onSeek?.(time);

  return (
    <div className="space-y-4">
      {/* 종합 스코어 헤더 */}
      <ReportHeader report={report} />

      {/* 리포트 서브탭 */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-hide">
        {[
          { key: "overview" as const, label: "종합", icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { key: "steps" as const, label: "절차 타임라인", icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
          { key: "handObject" as const, label: "손-물체", icon: <Eye className="w-3.5 h-3.5" /> },
          { key: "hpo" as const, label: "HPO", icon: <Shield className="w-3.5 h-3.5" /> },
          { key: "comparison" as const, label: "숙련자 비교", icon: <GitCompare className="w-3.5 h-3.5" /> },
          { key: "fundamentals" as const, label: "기본수칙", icon: <Brain className="w-3.5 h-3.5" /> },
          { key: "time" as const, label: "시간 분석", icon: <Clock className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setReportTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-base font-medium border-b-2 transition-all whitespace-nowrap",
              reportTab === tab.key ? "text-amber-600 border-amber-400" : "text-slate-500 border-transparent hover:text-slate-700"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 종합 개요 */}
      {reportTab === "overview" && (
        <div className="space-y-4">
          <OverviewTab report={report} procedure={procedure} />
          {/* 셀프 리플렉션 비교 — 자기평가를 제출한 경우만 표시 */}
          {selfReflection && (
            <ReflectionComparison reflection={selfReflection} report={report} />
          )}
        </div>
      )}

      {/* 절차 타임라인 — 실제 분석 결과가 있으면 StepsTimeline, 없으면 기존 StepsTab 폴백 */}
      {reportTab === "steps" && (
        report.sequenceAlignment ? (
          <StepsTimeline
            detectedSteps={report.stepEvaluations.map((se): DetectedStep => ({
              stepId: se.stepId,
              status: se.status === "skipped" ? "fail" : se.status,
              confidence: se.confidence,
              timestamp: se.timestamp || 0,
              endTime: (se.timestamp || 0) + 25,
              searchScore: se.confidence / 100,
            }))}
            alignment={report.sequenceAlignment}
            procedure={procedure}
            videoDuration={videoDuration || 600}
            onSeek={handleSeek}
          />
        ) : (
          <StepsTab report={report} procedure={procedure} />
        )
      )}

      {/* 손-물체 분석 */}
      {reportTab === "handObject" && (
        <HandObjectTimeline
          events={report.handObjectEvents || []}
          currentTime={0}
          onSeek={handleSeek}
        />
      )}

      {/* HPO 기법 적용도 */}
      {reportTab === "hpo" && (
        <HpoTab report={report} />
      )}

      {/* 숙련자 비교 */}
      {reportTab === "comparison" && (
        <ComparisonView
          comparison={report.embeddingComparison}
          goldStandard={goldStandard}
          onRegisterGoldStandard={() => {
            // 현재 영상을 골드스탠다드로 등록
            if (procedure && report.videoId) {
              fetch('/api/twelvelabs/gold-standard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  procedureId: procedure.id,
                  videoId: report.videoId,
                  averageScore: report.overallScore,
                }),
              }).catch(() => { /* 등록 실패 무시 (POC) */ });
            }
          }}
        />
      )}

      {/* 기본수칙 역량 + 의사소통 분석 (HPO-21) */}
      {reportTab === "fundamentals" && (
        <div className="space-y-4">
          <FundamentalsTab report={report} />
          {/* HPO-21: 의사소통 분석 서브섹션 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Mic className="w-4 h-4 text-blue-500" />
                음성/의사소통 분석
              </h3>
              {!commAnalysis && (
                <button
                  onClick={async () => {
                    if (!report.videoId || commLoading) return;
                    setCommLoading(true);
                    try {
                      const res = await fetch('/api/twelvelabs/pov-communication', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ videoId: report.videoId }),
                      });
                      const data = await res.json() as CommunicationAnalysis;
                      setCommAnalysis(data);
                    } catch { /* 실패 무시 */ }
                    finally { setCommLoading(false); }
                  }}
                  disabled={commLoading || !report.videoId || report.videoId === 'demo-video-id'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 text-xs font-medium border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {commLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 분석 중...</>
                  ) : (
                    <><Mic className="w-3.5 h-3.5" /> 의사소통 분석 실행</>
                  )}
                </button>
              )}
            </div>
            <div className="p-4">
              <CommunicationPanel
                analysis={commAnalysis ?? undefined}
                onSeek={handleSeek}
              />
            </div>
          </div>
        </div>
      )}

      {/* HPO-15: 수행 시간 분석 */}
      {reportTab === "time" && (
        <TimeAnalysis report={report} procedure={procedure} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// 리포트 서브 컴포넌트들
// ══════════════════════════════════════════

function ReportHeader({ report }: { report: PovEvaluationReport }) {
  const gradeInfo = getGradeForScore(report.overallScore);
  return (
    <div className={cn("bg-white border rounded-xl p-5", `border-${gradeInfo.grade === "S" || gradeInfo.grade === "A" ? "teal" : gradeInfo.grade === "B" ? "blue" : "amber"}-500/30`)}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* 종합 등급 */}
        <div className="flex items-center gap-4">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black", gradeInfo.bgColor, gradeInfo.color)}>
            {gradeInfo.grade}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-3xl font-bold font-mono tabular-nums", gradeInfo.color)}>{report.overallScore}</span>
              <span className="text-base text-slate-500">/ 100</span>
            </div>
            <p className="text-sm text-slate-500">{gradeInfo.label} — {gradeInfo.description}</p>
          </div>
        </div>

        {/* 세부 점수 */}
        <div className="flex gap-4 md:ml-auto">
          {[
            { label: "절차 준수", score: report.procedureComplianceScore, color: "text-blue-400" },
            { label: "HPO 적용", score: report.hpoOverallScore, color: "text-teal-400" },
            { label: "기본수칙", score: Math.round(report.fundamentalScores.reduce((s, f) => s + f.score, 0) / report.fundamentalScores.length), color: "text-amber-600" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <span className={cn("text-lg font-bold font-mono tabular-nums", item.color)}>{item.score}</span>
              <p className="text-sm text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 제목/날짜 */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {report.procedureTitle}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {report.date}</span>
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> POV 1인칭 분석</span>
      </div>
    </div>
  );
}

function OverviewTab({ report, procedure }: { report: PovEvaluationReport; procedure: Procedure }) {
  // 레이더 차트 데이터
  const radarData = report.fundamentalScores.map((f) => ({
    subject: f.label.replace(/\s*\(.*\)/, ""),
    score: f.score,
    fullMark: 100,
  }));

  const passCount = report.stepEvaluations.filter((s) => s.status === "pass").length;
  const failCount = report.stepEvaluations.filter((s) => s.status === "fail").length;
  const partialCount = report.stepEvaluations.filter((s) => s.status === "partial").length;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 기본수칙 레이더 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-base font-medium text-slate-700 mb-2 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-amber-600" /> 5대 기본수칙 역량
          </h4>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9 }} />
              <Radar name="점수" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 절차 수행 요약 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-base font-medium text-slate-700 mb-4 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-blue-400" /> 절차 수행 현황
          </h4>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-teal-500/5 border border-teal-500/10">
              <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" />
              <span className="text-lg font-bold font-mono text-teal-400">{passCount}</span>
              <p className="text-sm text-slate-500">적합</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto" />
              <span className="text-lg font-bold font-mono text-amber-600">{partialCount}</span>
              <p className="text-sm text-slate-500">부분적합</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <XCircle className="w-5 h-5 text-red-400 mx-auto" />
              <span className="text-lg font-bold font-mono text-red-400">{failCount}</span>
              <p className="text-sm text-slate-500">부적합</p>
            </div>
          </div>
          {/* 프로그레스 바 */}
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
            <div className="bg-teal-500 transition-all duration-1000" style={{ width: `${(passCount / report.stepEvaluations.length) * 100}%` }} />
            <div className="bg-amber-500 transition-all duration-1000" style={{ width: `${(partialCount / report.stepEvaluations.length) * 100}%` }} />
            <div className="bg-red-500 transition-all duration-1000" style={{ width: `${(failCount / report.stepEvaluations.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* 강점 / 개선점 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-teal-500/10 rounded-xl p-4">
          <h4 className="text-base font-medium text-teal-400 mb-3 flex items-center gap-1.5">
            <Star className="w-4 h-4" /> 강점
          </h4>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white border border-amber-500/10 rounded-xl p-4">
          <h4 className="text-base font-medium text-amber-600 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> 개선 필요 사항
          </h4>
          <ul className="space-y-2">
            {report.improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                <XCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI 종합 소견 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="text-base font-medium text-slate-700 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-600" /> AI 종합 소견
        </h4>
        <p className="text-sm text-slate-500 leading-relaxed">{report.summary}</p>
      </div>

      {/* HPO-8: 학습목표 달성도 매트릭스 */}
      <LearningObjectivesMatrix procedure={procedure} report={report} />

      {/* HPO-7: 역량 기반 진행 모델 + 훈련 처방 */}
      <CompetencyProgression
        fundamentals={report.fundamentalScores}
        procedureId={report.procedureId}
        overallScore={report.overallScore}
      />
    </div>
  );
}

function StepsTab({ report, procedure }: { report: PovEvaluationReport; procedure: Procedure }) {
  const statusConfig = {
    pass: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-teal-400", bg: "bg-teal-500/10", label: "적합" },
    partial: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-amber-600", bg: "bg-amber-50", label: "부분적합" },
    fail: { icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400", bg: "bg-red-500/10", label: "부적합" },
    skipped: { icon: <Clock className="w-3.5 h-3.5" />, color: "text-slate-500", bg: "bg-slate-500/10", label: "미수행" },
  };

  return (
    <div className="space-y-3 animate-fade-in-up">
      {procedure.sections.map((section) => {
        const sectionEvals = report.stepEvaluations.filter((e) =>
          section.steps.some((s) => s.id === e.stepId)
        );
        const sectionPassRate = sectionEvals.length > 0
          ? Math.round((sectionEvals.filter((e) => e.status === "pass").length / sectionEvals.length) * 100)
          : 0;

        return (
          <div key={section.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-medium text-slate-700">
                <span className="font-mono text-amber-500/60 mr-2">{section.id}</span>
                {section.title}
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-500 transition-all duration-1000" style={{ width: `${sectionPassRate}%` }} />
                </div>
                <span className="text-sm font-mono text-slate-500">{sectionPassRate}%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {sectionEvals.map((evalItem, i) => {
                const cfg = statusConfig[evalItem.status];
                return (
                  <div
                    key={evalItem.stepId}
                    className="animate-fade-in-up flex items-start gap-3 p-2.5 rounded-lg bg-slate-100/50 hover:bg-slate-100 transition-colors"
                    style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                  >
                    <div className={cn("mt-0.5 shrink-0", cfg.color)}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-sm text-amber-500/60">{evalItem.stepId}</span>
                        <span className={cn("text-sm px-1.5 py-0.5 rounded", cfg.bg, cfg.color)}>{cfg.label}</span>
                        {evalItem.timestamp && (
                          <span className="text-sm font-mono text-slate-400 ml-auto">▶ {formatTime(evalItem.timestamp)}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{evalItem.description}</p>
                      {evalItem.note && (
                        <p className="text-sm text-red-400/70 mt-0.5">{evalItem.note}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-mono text-slate-400">신뢰도</span>
                      <p className="text-sm font-mono text-slate-500">{evalItem.confidence}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HpoTab({ report }: { report: PovEvaluationReport }) {
  const fundamentalTools = report.hpoEvaluations.filter((e) =>
    HPO_TOOLS.find((t) => t.key === e.toolKey)?.category === "fundamental"
  );
  const conditionalTools = report.hpoEvaluations.filter((e) =>
    HPO_TOOLS.find((t) => t.key === e.toolKey)?.category === "conditional"
  );

  const barData = report.hpoEvaluations.map((e) => ({
    name: e.label,
    score: e.score,
    applied: e.applied,
  }));

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* HPO 점수 막대 차트 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="text-base font-medium text-slate-700 mb-4 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-teal-400" /> HPO 기법별 적용 점수
        </h4>
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[500px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} width={100} />
                <Tooltip content={<ChartTooltip unit="점" />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="score" name="적용 점수" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.score >= 70 ? "#14b8a6" : entry.score >= 50 ? "#f59e0b" : "#ef4444"} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 기본적 / 조건부 분리 */}
      {[
        { title: "기본적 인적오류 예방기법", tools: fundamentalTools, color: "text-blue-400" },
        { title: "조건부 인적오류 예방기법", tools: conditionalTools, color: "text-violet-400" },
      ].map(({ title, tools, color }) => (
        <div key={title} className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className={cn("text-base font-medium mb-3", color)}>{title}</h4>
          <div className="space-y-2">
            {tools.map((tool, i) => {
              const toolDef = HPO_TOOLS.find((t) => t.key === tool.toolKey);
              return (
                <div
                  key={tool.toolKey}
                  className="animate-fade-in-up flex items-center gap-3 p-3 rounded-lg bg-slate-100/50"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
                >
                  <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: toolDef?.color || "#64748b" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-slate-700">{tool.label}</span>
                      {tool.applied ? (
                        <span className="text-sm px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400">적용됨</span>
                      ) : (
                        <span className="text-sm px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">미적용</span>
                      )}
                    </div>
                    {tool.evidence && <p className="text-sm text-slate-500">{tool.evidence}</p>}
                  </div>
                  <div className="shrink-0 w-12 text-right">
                    <span className={cn("text-base font-bold font-mono tabular-nums", tool.score >= 70 ? "text-teal-400" : tool.score >= 50 ? "text-amber-600" : "text-red-400")}>
                      {tool.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FundamentalsTab({ report }: { report: PovEvaluationReport }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* 레이더 차트 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="text-base font-medium text-slate-700 mb-2">운전원 기본수칙 5대 역량 종합</h4>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={report.fundamentalScores.map((f) => ({
            subject: f.label.replace(/\s*\(.*\)/, ""),
            score: f.score,
            fullMark: 100,
          }))}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9 }} />
            <Radar name="점수" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 역량별 상세 */}
      {report.fundamentalScores.map((fs, i) => {
        const fundDef = OPERATOR_FUNDAMENTALS.find((f) => f.key === fs.key);
        const gradeInfo = getGradeForScore(fs.score);
        return (
          <div
            key={fs.key}
            className="animate-fade-in-up bg-white border border-slate-200 rounded-xl p-4"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0" style={{ backgroundColor: `${fundDef?.color}15`, color: fundDef?.color }}>
                {fs.score}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="text-base font-medium text-slate-800">{fs.label}</h5>
                  <span className={cn("text-sm px-1.5 py-0.5 rounded", gradeInfo.bgColor, gradeInfo.color)}>{gradeInfo.grade}</span>
                  <span className="text-sm text-slate-400 ml-auto">{fundDef?.section}</span>
                </div>
                <p className="text-sm text-slate-500 mb-2">{fundDef?.definition}</p>

                {/* 프로그레스 바 */}
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${fs.score}%`, backgroundColor: fundDef?.color }} />
                </div>

                {/* 평가 포인트 */}
                <p className="text-sm text-amber-600/70 flex items-start gap-1">
                  <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                  {fs.feedback}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* HPO-23: 마이크로 러닝 추천 (약점 역량 기반) */}
      <MicroLearning fundamentalScores={report.fundamentalScores} />

    </div>
  );
}
