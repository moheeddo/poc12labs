"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Shield, GitCompare, Star, AlertTriangle, ChevronRight,
  FileText, CheckCircle2, XCircle, Clock, Activity, BookOpen, Eye,
  Users, Brain, Zap, ClipboardCheck, BarChart3, ArrowLeft,
  ChevronDown, Sparkles, MessageSquare, Settings, History,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import VideoUploader from "@/components/shared/VideoUploader";
import ChartTooltip from "@/components/shared/ChartTooltip";
import PovReviewSession from "@/components/pov/PovReviewSession";
import AnalysisProgress from "@/components/pov/AnalysisProgress";
import StepsTimeline from "@/components/pov/StepsTimeline";
import HandObjectTimeline from "@/components/pov/HandObjectTimeline";
import ComparisonView from "@/components/pov/ComparisonView";
import GoldStandardManager from "@/components/pov/GoldStandardManager";
import SopManager from "@/components/pov/SopManager";
import AnalysisHistory from "@/components/pov/AnalysisHistory";
import { useVideoUpload } from "@/hooks/useTwelveLabs";
import { usePovAnalysis } from "@/hooks/usePovAnalysis";
import { TWELVELABS_INDEXES } from "@/lib/constants";
import {
  HPO_PROCEDURES, OPERATOR_FUNDAMENTALS, HPO_TOOLS,
  getGradeForScore, SYSTEM_COLORS, getCriticalSteps,
  type Procedure,
} from "@/lib/pov-standards";
import type { PovEvaluationReport, StepEvaluation, HpoToolEvaluation, FundamentalScore, SopDeviation, GoldStandard, DetectedStep } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

// ── 데모 리포트 생성 (실제 구현 시 TwelveLabs API 호출 결과로 대체) ──

function generateDemoReport(procedure: Procedure): PovEvaluationReport {
  const allSteps = procedure.sections.flatMap((s) => s.steps);
  const stepEvals: StepEvaluation[] = allSteps.map((step, i) => {
    const rand = Math.random();
    const status = rand > 0.75 ? "pass" : rand > 0.5 ? "pass" : rand > 0.2 ? "partial" : "fail";
    return {
      stepId: step.id,
      description: step.description,
      status: status as StepEvaluation["status"],
      confidence: Math.round(60 + Math.random() * 38),
      timestamp: 30 + i * 25 + Math.round(Math.random() * 15),
      note: status === "fail" ? `${step.equipment} 상태 확인 누락` : status === "partial" ? "확인은 했으나 절차서 미참조" : undefined,
    };
  });

  const hpoEvals: HpoToolEvaluation[] = HPO_TOOLS.map((tool) => ({
    toolKey: tool.key,
    label: tool.label,
    applied: Math.random() > 0.3,
    score: Math.round(40 + Math.random() * 58),
    evidence: Math.random() > 0.4 ? `${tool.label} 적용 장면 탐지됨` : undefined,
    timestamp: Math.round(Math.random() * 600),
  }));

  const fundScores: FundamentalScore[] = OPERATOR_FUNDAMENTALS.map((f) => ({
    key: f.key,
    label: f.label,
    score: Math.round(50 + Math.random() * 45),
    feedback: f.evaluationPoints[Math.floor(Math.random() * f.evaluationPoints.length)],
  }));

  const passCount = stepEvals.filter((s) => s.status === "pass").length;
  const procedureScore = Math.round((passCount / stepEvals.length) * 100);
  const hpoScore = Math.round(hpoEvals.reduce((sum, h) => sum + h.score, 0) / hpoEvals.length);
  const fundAvg = Math.round(fundScores.reduce((sum, f) => sum + f.score, 0) / fundScores.length);
  const overall = Math.round(procedureScore * 0.5 + hpoScore * 0.3 + fundAvg * 0.2);

  const deviations: SopDeviation[] = stepEvals
    .filter((s) => s.status === "fail")
    .map((s) => {
      const origStep = allSteps.find((st) => st.id === s.stepId);
      return {
        step: s.stepId,
        expected: origStep?.description || "",
        actual: s.note || "수행 미확인",
        timestamp: s.timestamp || 0,
        severity: (origStep?.isCritical ? "critical" : "high") as SopDeviation["severity"],
      };
    });

  return {
    id: `report-${Date.now()}`,
    procedureId: procedure.id,
    procedureTitle: `붙임${procedure.appendixNo}. ${procedure.title}`,
    videoId: "demo-video-id",
    date: new Date().toISOString().split("T")[0],
    stepEvaluations: stepEvals,
    procedureComplianceScore: procedureScore,
    hpoEvaluations: hpoEvals,
    hpoOverallScore: hpoScore,
    fundamentalScores: fundScores,
    overallScore: overall,
    grade: getGradeForScore(overall).grade,
    deviations,
    strengths: [
      "압축공기계통 확인 절차를 정확하게 수행함",
      "밸브 조작 시 자기진단(STAR) 기법 적용 확인",
      "절차서를 지참하고 단계별 참조 수행",
    ],
    improvements: [
      "일부 밸브 상태 확인 시 교차 확인 미수행",
      "제어실 확인이 필요한 단계에서 현장 단독 확인",
      "작업후 평가 미실시 — 완료 후 피드백 절차 필요",
    ],
    summary: `${procedure.title} 절차를 전반적으로 수행했으나, 일부 중요 단계에서 확인 절차가 미흡했습니다. HPO 기법 중 자기진단은 양호하나, 동시확인 및 작업후 평가 적용이 부족합니다. 표준지침 7.1.2(제어) 및 7.1.3(보수적 판단) 역량 향상이 필요합니다.`,
  };
}

// ── 계통별 아이콘 ────────────────────────

const systemIcons: Record<string, React.ReactNode> = {
  냉각수: <Activity className="w-4 h-4" />,
  순환수: <GitCompare className="w-4 h-4" />,
  온수: <Zap className="w-4 h-4" />,
  공정수: <Shield className="w-4 h-4" />,
};

// ── 메인 컴포넌트 ────────────────────────

type ViewPhase = "select" | "upload" | "analyzing" | "report" | "review";

export default function PovAnalysis() {
  const [phase, setPhase] = useState<ViewPhase>("select");
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [report, setReport] = useState<PovEvaluationReport | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [reportTab, setReportTab] = useState<"overview" | "steps" | "handObject" | "hpo" | "comparison" | "fundamentals">("overview");
  const [videoUrl, setVideoUrl] = useState<string | null>(null); // 브라우저 내 재생용 로컬 URL
  const { progress: uploadProgress, upload, uploadByUrl } = useVideoUpload();

  // 실제 분석 파이프라인 훅
  const analysis = usePovAnalysis();
  const [selectedGoldStandard, setSelectedGoldStandard] = useState<GoldStandard | null>(null);
  const [currentTime, _setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [_seekTime, setSeekTime] = useState<number | null>(null);
  // SOP 관리 모달 표시 여부
  const [showSopManager, setShowSopManager] = useState(false);
  // 분석 이력 모달 표시 여부
  const [showHistory, setShowHistory] = useState(false);

  // 컴포넌트 언마운트 시 blob URL 해제
  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  // 실제 분석 완료 시 리포트 전환
  useEffect(() => {
    if (analysis.status === 'complete' && analysis.report) {
      setReport(analysis.report);
      setPhase('report');
    }
  }, [analysis.status, analysis.report]);

  // 절차 선택
  const handleSelectProcedure = useCallback((proc: Procedure) => {
    setSelectedProcedure(proc);
    setPhase("upload");
    setReport(null);
  }, []);

  // 영상 업로드 + 분석 시작
  const handleUpload = useCallback(async (file: File) => {
    if (!selectedProcedure) return;
    // 브라우저 내 재생을 위한 로컬 blob URL 생성
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl);
    // 영상 길이 추출
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = localUrl;
    tempVideo.onloadedmetadata = () => { setVideoDuration(tempVideo.duration); };
    setPhase("analyzing");
    try {
      const videoId = await upload(TWELVELABS_INDEXES.pov, file);
      if (videoId) {
        // 실제 TwelveLabs 분석 파이프라인 시작
        analysis.startAnalysis(videoId, selectedProcedure.id, selectedGoldStandard?.id);
      } else {
        // videoId 없으면 데모 폴백
        await new Promise((r) => setTimeout(r, 2000));
        const demoReport = generateDemoReport(selectedProcedure);
        setReport(demoReport);
        setPhase("report");
      }
    } catch {
      // 업로드 에러 발생 시 데모 리포트 폴백 (POC)
      await new Promise((r) => setTimeout(r, 1500));
      const demoReport = generateDemoReport(selectedProcedure);
      setReport(demoReport);
      setPhase("report");
    }
  }, [selectedProcedure, upload, videoUrl, analysis, selectedGoldStandard]);

  // URL 기반 업로드
  const handleUrlUpload = useCallback(async (url: string) => {
    if (!selectedProcedure) return;
    setPhase("analyzing");
    try {
      const videoId = await uploadByUrl(TWELVELABS_INDEXES.pov, url);
      if (videoId) {
        // 실제 TwelveLabs 분석 파이프라인 시작
        analysis.startAnalysis(videoId, selectedProcedure.id, selectedGoldStandard?.id);
      } else {
        await new Promise((r) => setTimeout(r, 2000));
        const demoReport = generateDemoReport(selectedProcedure);
        setReport(demoReport);
        setPhase("report");
      }
    } catch {
      // 업로드 에러 발생 시 데모 리포트 폴백 (POC)
      await new Promise((r) => setTimeout(r, 1500));
      const demoReport = generateDemoReport(selectedProcedure);
      setReport(demoReport);
      setPhase("report");
    }
  }, [selectedProcedure, uploadByUrl, analysis, selectedGoldStandard]);

  // 뒤로가기
  const handleBack = useCallback(() => {
    if (phase === "upload") { setPhase("select"); setSelectedProcedure(null); }
    else if (phase === "report") { setPhase("upload"); setReport(null); }
    else if (phase === "review") { setPhase("report"); }
  }, [phase]);

  // 섹션 접기/펼치기
  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // 계통별 그룹핑
  const proceduresBySystem = useMemo(() => {
    const map = new Map<string, Procedure[]>();
    HPO_PROCEDURES.forEach((p) => {
      const list = map.get(p.system) || [];
      list.push(p);
      map.set(p.system, list);
    });
    return map;
  }, []);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6 animate-slide-in-right">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        {phase !== "select" && (
          <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" aria-label="뒤로">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-amber-600 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6" /> HPO 훈련영상 POV 분석
          </h2>
          <p className="text-base text-slate-500 mt-1">
            {phase === "select" && "운전행위 표준지침반 실습가이드 기반 — 실습 절차를 선택하세요"}
            {phase === "upload" && selectedProcedure && `붙임${selectedProcedure.appendixNo}. ${selectedProcedure.title} — POV 영상을 업로드하세요`}
            {phase === "analyzing" && "AI가 영상을 분석하고 있습니다..."}
            {phase === "report" && "평가 리포트가 생성되었습니다 — 강평 세션을 시작할 수 있습니다"}
            {phase === "review" && "조별 강평 세션 진행 중"}
          </p>
        </div>
      </div>

      {/* ════════ Phase 1: 실습 절차 선택 ════════ */}
      {phase === "select" && (
        <div className="space-y-6 animate-fade-in-up">
          {/* 과정 안내 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-slate-800">운전행위 표준지침반 실습가이드</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  HPO 센터 종합실습설비를 활용한 운전원 기본수칙 및 인적오류예방기법 체화 훈련입니다.
                  4개 계통(냉각수, 순환수, 온수, 공정수)의 기동/정지/교체운전 밸브라인업 절차를 POV(1인칭 시점) 영상으로 촬영 후 AI가 자동 분석합니다.
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> 표준지침-3035-01 기반</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 표준운영-2035A HPO 기법</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> 1인칭 POV 분석</span>
                </div>
              </div>
            </div>
          </div>

          {/* SOP 쿼리 관리 + 분석 이력 진입점 */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <History className="w-3.5 h-3.5" /> 분석 이력
            </button>
            <button
              onClick={() => setShowSopManager(true)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" /> SOP 쿼리 관리
            </button>
          </div>

          {/* 계통별 절차 카드 */}
          {Array.from(proceduresBySystem.entries()).map(([system, procs]) => {
            const sc = SYSTEM_COLORS[system] || SYSTEM_COLORS["냉각수"];
            return (
              <div key={system}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("flex items-center gap-1.5 text-base font-semibold", sc.primary)}>
                    {systemIcons[system]} {system}계통
                  </span>
                  <span className="text-sm text-slate-500">({procs.length}개 절차)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {procs.map((proc, i) => {
                    const criticalCount = getCriticalSteps(proc).length;
                    return (
                      <button
                        key={proc.id}
                        onClick={() => handleSelectProcedure(proc)}
                        className={cn(
                          "animate-fade-in-up group text-left p-4 rounded-xl border transition-all duration-300",
                          "bg-white border-slate-200",
                          "hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 hover:scale-[1.01]",
                          "active:scale-[0.99]"
                        )}
                        style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-500">
                                붙임{proc.appendixNo}
                              </span>
                              <span className="text-sm text-slate-500">{proc.group}</span>
                            </div>
                            <h4 className="text-base font-medium text-slate-800 group-hover:text-amber-600 transition-colors truncate">
                              {proc.title}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">{proc.operation} | {proc.target}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0 mt-1" />
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><ClipboardCheck className="w-3 h-3" /> {proc.totalSteps}단계</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{proc.estimatedMinutes}분</span>
                          {criticalCount > 0 && (
                            <span className="flex items-center gap-1 text-red-400/70">
                              <AlertTriangle className="w-3 h-3" /> 중요단계 {criticalCount}개
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════ Phase 2: 영상 업로드 ════════ */}
      {phase === "upload" && selectedProcedure && (
        <div className="space-y-4 animate-fade-in-up">
          {/* 선택된 절차 요약 */}
          <div className="bg-white border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-500">
                붙임{selectedProcedure.appendixNo}
              </span>
              <h3 className="text-base font-semibold text-slate-800">{selectedProcedure.title}</h3>
            </div>
            {/* 절차 스텝 미리보기 */}
            <div className="space-y-1.5 mt-3 max-h-[300px] overflow-y-auto scrollbar-hide">
              {selectedProcedure.sections.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center gap-2 w-full text-left py-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {expandedSections.has(section.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span className="font-mono text-amber-500/60">{section.id}</span>
                    <span>{section.title}</span>
                    <span className="text-slate-400 ml-auto">{section.steps.length}단계</span>
                  </button>
                  {expandedSections.has(section.id) && (
                    <div className="ml-5 space-y-0.5 animate-fade-in-up">
                      {section.steps.map((step) => (
                        <div key={step.id} className={cn("flex items-start gap-2 py-0.5 text-sm", step.isCritical ? "text-red-400/80" : "text-slate-500")}>
                          <span className="font-mono shrink-0 w-10 text-right">{step.id}</span>
                          <span className="truncate">{step.description}</span>
                          {step.expectedState && (
                            <span className={cn("shrink-0 px-1 rounded text-sm", step.expectedState.includes("열림") || step.expectedState.includes("기동") ? "bg-teal-500/10 text-teal-500" : "bg-red-500/10 text-red-400")}>
                              {step.expectedState}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 평가 기준 안내 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                <Brain className="w-3.5 h-3.5 text-blue-400" /> 운전원 기본수칙 5대 역량 평가
              </h4>
              <div className="space-y-1">
                {OPERATOR_FUNDAMENTALS.map((f) => (
                  <div key={f.key} className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />
                    <span>{f.label}</span>
                    <span className="text-slate-400 text-sm ml-auto">{f.section}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5 text-teal-400" /> HPO 인적오류 예방기법 평가
              </h4>
              <div className="space-y-1">
                {HPO_TOOLS.slice(0, 6).map((t) => (
                  <div key={t.key} className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span>{t.label}</span>
                    <span className="text-slate-400 text-sm ml-auto">{t.category === "fundamental" ? "기본" : "조건부"}</span>
                  </div>
                ))}
                <p className="text-sm text-slate-400 mt-1">외 {HPO_TOOLS.length - 6}개 기법...</p>
              </div>
            </div>
          </div>

          {/* 골드스탠다드(숙련자 기준영상) 선택 */}
          {selectedProcedure && (
            <GoldStandardManager
              procedureId={selectedProcedure.id}
              currentVideoId={uploadProgress?.videoId}
              currentScore={report?.overallScore}
              onSelect={(gs) => setSelectedGoldStandard(gs)}
            />
          )}

          {/* 영상 업로드 */}
          <VideoUploader onUpload={handleUpload} onUrlUpload={handleUrlUpload} progress={uploadProgress} accentColor="amber" />
        </div>
      )}

      {/* ════════ Phase 3: AI 분석 중 ════════ */}
      {phase === "analyzing" && (
        <div className="animate-fade-in-up">
          <AnalysisProgress
            progress={analysis.progress}
            stages={analysis.stages}
            status={analysis.status}
            error={analysis.error}
          />
          {/* 분석 오류 시 데모 폴백 버튼 */}
          {analysis.status === "error" && selectedProcedure && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => {
                  const demoReport = generateDemoReport(selectedProcedure);
                  setReport(demoReport);
                  setPhase("report");
                }}
                className="px-4 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 text-sm font-medium border border-amber-200 transition-all"
              >
                데모 리포트로 계속 진행
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════ Phase 4: 평가 리포트 ════════ */}
      {phase === "report" && report && (
        <div className="space-y-4 animate-fade-in-up">
          {/* 강평 세션 CTA — 리포트 상단 */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-amber-600 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> 조별 강평 세션 시작
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                분석 결과를 기반으로 영상을 돌려보며 미흡사항을 피드백하고 종합 강평을 진행합니다
              </p>
            </div>
            <button
              onClick={() => setPhase("review")}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 text-base font-semibold border border-amber-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageSquare className="w-4 h-4" /> 강평 세션 열기
            </button>
          </div>

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
            <OverviewTab report={report} procedure={selectedProcedure!} />
          )}

          {/* 절차 타임라인 — 실제 분석 결과가 있으면 StepsTimeline, 없으면 기존 StepsTab 폴백 */}
          {reportTab === "steps" && report && selectedProcedure && (
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
                procedure={selectedProcedure}
                videoDuration={videoDuration || 600}
                onSeek={(time) => setSeekTime(time)}
              />
            ) : (
              <StepsTab report={report} procedure={selectedProcedure} />
            )
          )}

          {/* 손-물체 분석 */}
          {reportTab === "handObject" && report && (
            <HandObjectTimeline
              events={report.handObjectEvents || []}
              currentTime={currentTime}
              onSeek={(time) => setSeekTime(time)}
            />
          )}

          {/* HPO 기법 적용도 */}
          {reportTab === "hpo" && (
            <HpoTab report={report} />
          )}

          {/* 숙련자 비교 */}
          {reportTab === "comparison" && report && (
            <ComparisonView
              comparison={report.embeddingComparison}
              goldStandard={selectedGoldStandard}
              onRegisterGoldStandard={() => {
                // 현재 영상을 골드스탠다드로 등록
                if (selectedProcedure && report.videoId) {
                  fetch('/api/twelvelabs/gold-standard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      procedureId: selectedProcedure.id,
                      videoId: report.videoId,
                      averageScore: report.overallScore,
                    }),
                  }).catch(() => { /* 등록 실패 무시 (POC) */ });
                }
              }}
            />
          )}

          {/* 기본수칙 역량 */}
          {reportTab === "fundamentals" && (
            <FundamentalsTab report={report} />
          )}
        </div>
      )}

      {/* ════════ Phase 5: 강평 세션 (디브리핑) ════════ */}
      {phase === "review" && report && selectedProcedure && (
        <PovReviewSession
          report={report}
          procedure={selectedProcedure}
          videoUrl={videoUrl}
          onBack={() => setPhase("report")}
          onViewReport={() => setPhase("report")}
        />
      )}

      {/* SOP 관리 모달 */}
      {showSopManager && (
        <SopManager onClose={() => setShowSopManager(false)} />
      )}

      {showHistory && (
        <AnalysisHistory
          procedureId={selectedProcedure?.id}
          onViewReport={(histReport) => {
            setReport(histReport);
            setShowHistory(false);
            // 이력에서 선택한 리포트의 절차를 찾아 설정
            const matchProc = HPO_PROCEDURES.find(p => p.id === histReport.procedureId);
            if (matchProc) setSelectedProcedure(matchProc);
            setPhase("report");
          }}
          onClose={() => setShowHistory(false)}
        />
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

function OverviewTab({ report }: { report: PovEvaluationReport; procedure: Procedure }) {
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

    </div>
  );
}
