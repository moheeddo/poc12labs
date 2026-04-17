"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Shield, GitCompare, AlertTriangle, ChevronRight,
  FileText, Clock, Activity, BookOpen, Eye,
  Users, Brain, Zap, ClipboardCheck, BarChart3, ArrowLeft,
  ChevronDown, MessageSquare, Settings, History, TrendingUp, Scale,
  Printer, UserCircle, Calendar, Briefcase, Loader2,
} from "lucide-react";
import VideoUploader from "@/components/shared/VideoUploader";
import PovReviewSession from "@/components/pov/PovReviewSession";
import OperatorReportView from "@/components/pov/OperatorReportView";
import AnalysisProgress from "@/components/pov/AnalysisProgress";
import LearningObjectivesMatrix from "@/components/pov/LearningObjectivesMatrix";
import GoldStandardManager from "@/components/pov/GoldStandardManager";
import SopManager from "@/components/pov/SopManager";
import AnalysisHistory from "@/components/pov/AnalysisHistory";
import TraineeProgressDashboard from "@/components/pov/TraineeProgressDashboard";
import CohortAnalytics from "@/components/pov/CohortAnalytics";
import CalibrationDashboard from "@/components/pov/CalibrationDashboard";
import SelfReflection from "@/components/pov/SelfReflection";
import type { SelfReflectionData } from "@/components/pov/SelfReflection";
import PrintableReport from "@/components/pov/PrintableReport";
import ExportMenu from "@/components/pov/ExportMenu";
import BenchmarkDashboard from "@/components/pov/BenchmarkDashboard";
import EvaluationSchedule from "@/components/pov/EvaluationSchedule";
import TraineePortfolio from "@/components/pov/TraineePortfolio";
import ExecutiveSummary from "@/components/pov/ExecutiveSummary";
import IncidentLibrary from "@/components/pov/IncidentLibrary";
// InstructorHome 제거 — 다크테마 대시보드가 라이트 UI와 불일치
import ApiStatusBadge from "@/components/pov/ApiStatusBadge";
import ApiKeyWarning from "@/components/shared/ApiKeyWarning";
import SessionCreateForm from '@/components/pov/SessionCreateForm';
import SessionProgress from '@/components/pov/SessionProgress';
import SessionReport from '@/components/pov/SessionReport';
import { useTrainingSession } from '@/hooks/useTrainingSession';
import { useVideoUpload } from "@/hooks/useTwelveLabs";
import { usePovAnalysis } from "@/hooks/usePovAnalysis";
import { TWELVELABS_INDEXES } from "@/lib/constants";
import {
  HPO_PROCEDURES, OPERATOR_FUNDAMENTALS, HPO_TOOLS,
  getGradeForScore, SYSTEM_COLORS, getCriticalSteps,
  type Procedure,
} from "@/lib/pov-standards";
import type { PovEvaluationReport, StepEvaluation, HpoToolEvaluation, FundamentalScore, SopDeviation, GoldStandard } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const [videoUrl, setVideoUrl] = useState<string | null>(null); // 브라우저 내 재생용 로컬 URL
  const { progress: uploadProgress, upload, uploadByUrl } = useVideoUpload();

  // 실제 분석 파이프라인 훅
  const analysis = usePovAnalysis();
  const [selectedGoldStandard, setSelectedGoldStandard] = useState<GoldStandard | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [_seekTime, setSeekTime] = useState<number | null>(null);
  // 셀프 리플렉션 데이터 (제출 후 보관)
  const [selfReflection, setSelfReflection] = useState<SelfReflectionData | null>(null);
  // 지연된 일정 수 (헤더 배지용)
  const [overdueCount, setOverdueCount] = useState(0);

  // ── 모달 상태 통합 (11개 boolean → 단일 문자열) ──
  type ModalType = "sopManager" | "history" | "progress" | "cohort" | "calibration"
    | "printReport" | "benchmark" | "reflection" | "portfolio" | "schedule"
    | "executive" | "incidentLibrary" | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const openModal = useCallback((m: NonNullable<ModalType>) => setActiveModal(m), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  // 세션 모드 (멀티 POV)
  const [sessionMode, setSessionMode] = useState(false);
  const trainingSession = useTrainingSession();

  // 컴포넌트 언마운트 시 blob URL 해제
  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  // 지연된 일정 수 초기 로드 (헤더 배지 표시용)
  useEffect(() => {
    fetch('/api/twelvelabs/pov-schedule?type=week')
      .then(r => r.json())
      .then(data => { if (data.overdue) setOverdueCount(data.overdue.length); })
      .catch(() => {/* 무시 */});
  }, []);

  // 실제 분석 완료 시 셀프 리플렉션 위저드 먼저 표시
  useEffect(() => {
    if (analysis.status === 'complete' && analysis.report) {
      setReport(analysis.report);
      openModal("reflection"); // 리포트 전에 자기평가 먼저
    }
  }, [analysis.status, analysis.report, openModal]);

  // 세션 분석 완료 시 리포트 화면으로 전환
  useEffect(() => {
    if (sessionMode && trainingSession.session?.status === 'complete') {
      setPhase("report" as ViewPhase);
    }
  }, [sessionMode, trainingSession.session?.status]);

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
        // videoId 없으면 데모 폴백 — 자기평가 먼저 표시
        await new Promise((r) => setTimeout(r, 2000));
        const demoReport = generateDemoReport(selectedProcedure);
        setReport(demoReport);
        openModal("reflection");
      }
    } catch {
      // 업로드 에러 발생 시 데모 리포트 폴백 — 자기평가 먼저 표시
      await new Promise((r) => setTimeout(r, 1500));
      const demoReport = generateDemoReport(selectedProcedure);
      setReport(demoReport);
      openModal("reflection");
    }
  }, [selectedProcedure, upload, videoUrl, analysis, selectedGoldStandard, openModal]);

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
        // 데모 폴백 — 자기평가 먼저 표시
        await new Promise((r) => setTimeout(r, 2000));
        const demoReport = generateDemoReport(selectedProcedure);
        setReport(demoReport);
        openModal("reflection");
      }
    } catch {
      // 업로드 에러 발생 시 데모 리포트 폴백 — 자기평가 먼저 표시
      await new Promise((r) => setTimeout(r, 1500));
      const demoReport = generateDemoReport(selectedProcedure);
      setReport(demoReport);
      openModal("reflection");
    }
  }, [selectedProcedure, uploadByUrl, analysis, selectedGoldStandard, openModal]);

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

  // (InstructorHome 대시보드 제거됨 — 다크테마 불일치)

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
      {/* API 연결 상태 경고 배너 */}
      <ApiKeyWarning />

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
            <ApiStatusBadge />
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
          {/* 세션 / 개별 모드 전환 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSessionMode(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                !sessionMode ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              개별 분석
            </button>
            <button
              onClick={() => setSessionMode(true)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                sessionMode ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              세션 분석 (멀티 POV)
            </button>
          </div>

          {sessionMode && (
            <SessionCreateForm
              onStartSession={(params) => {
                trainingSession.createSession(params);
                setPhase("analyzing" as ViewPhase);
              }}
              isCreating={trainingSession.isCreating}
            />
          )}

          {/* 개별 분석 모드 시작 안내 */}
          {!sessionMode && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-5 mb-4">
              <h4 className="text-sm font-semibold text-amber-800 mb-1">시작하기</h4>
              <p className="text-sm text-amber-700/80 leading-relaxed">
                아래에서 실습 절차를 선택하면 영상 업로드 화면으로 이동합니다.
                POV(1인칭 시점) 영상을 업로드하면 AI가 자동으로 SOP 절차 준수도를 분석합니다.
              </p>
            </div>
          )}

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

          {/* SOP 쿼리 관리 + 분석 이력 + 진행 추이 + 캘리브레이션 진입점 */}
          <div className="flex justify-end gap-2 flex-wrap">
            <button
              onClick={() => openModal("schedule")}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors relative"
            >
              <Calendar className="w-3.5 h-3.5" /> 평가 일정
              {overdueCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white flex items-center justify-center leading-none">
                  {overdueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => openModal("portfolio")}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <UserCircle className="w-3.5 h-3.5" /> 훈련생 관리
            </button>
            <button
              onClick={() => openModal("benchmark")}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" /> 교육과정 효과
            </button>
            <button
              onClick={() => openModal("executive")}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" /> 경영진 보고
            </button>
            <button
              onClick={() => openModal("calibration")}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <Scale className="w-3.5 h-3.5" /> 캘리브레이션
            </button>
            <button
              onClick={() => openModal("cohort")}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Users className="w-3.5 h-3.5" /> 코호트 분석
            </button>
            <button
              onClick={() => openModal("progress")}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5" /> 진행 추이
            </button>
            <button
              onClick={() => openModal("history")}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <History className="w-3.5 h-3.5" /> 분석 이력
            </button>
            <button
              onClick={() => openModal("sopManager")}
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

          {/* 학습목표 매트릭스 — 사전 목표 안내 */}
          <LearningObjectivesMatrix procedure={selectedProcedure} />

          {/* 영상 업로드 */}
          <VideoUploader onUpload={handleUpload} onUrlUpload={handleUrlUpload} progress={uploadProgress} accentColor="amber" />
        </div>
      )}

      {/* ════════ Phase 3-S: 세션 분석 중 ════════ */}
      {phase === "analyzing" && sessionMode && trainingSession.session && (
        <div className="space-y-6 animate-fade-in-up">
          <SessionProgress session={trainingSession.session} />
        </div>
      )}
      {/* 세션 생성 직후 첫 폴링까지의 로딩 상태 */}
      {phase === "analyzing" && sessionMode && !trainingSession.session && !trainingSession.error && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 animate-fade-in-up flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          <span className="text-sm text-slate-600">세션 분석 파이프라인 초기화 중...</span>
        </div>
      )}
      {/* 세션 생성 에러 */}
      {sessionMode && trainingSession.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-700">세션 생성 실패</h4>
              <p className="text-sm text-red-600 mt-1">{trainingSession.error}</p>
              <button
                onClick={() => { trainingSession.reset(); setSessionMode(false); setPhase("select" as ViewPhase); }}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline underline-offset-2"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Phase 3: AI 분석 중 ════════ */}
      {phase === "analyzing" && !sessionMode && (
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
                  openModal("reflection"); // 자기평가 먼저
                }}
                className="px-4 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 text-sm font-medium border border-amber-200 transition-all"
              >
                데모 리포트로 계속 진행
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════ Phase 3.5: 셀프 리플렉션 위저드 ════════ */}
      {activeModal === "reflection" && selectedProcedure && (
        <div className="animate-fade-in-up">
          <SelfReflection
            procedure={selectedProcedure}
            onComplete={(data) => {
              setSelfReflection(data);
              closeModal();
              setPhase("report");
            }}
            onSkip={() => {
              closeModal();
              setPhase("report");
            }}
          />
        </div>
      )}

      {/* ════════ Phase 4-S: 세션 리포트 ════════ */}
      {phase === "report" && sessionMode && trainingSession.session && (
        <div className="space-y-6 animate-fade-in-up">
          <SessionReport
            session={trainingSession.session}
            renderReport={(sessionReport, operatorName, transcription) => {
              // 세션의 procedureId로 절차 객체 탐색
              const proc = HPO_PROCEDURES.find(p => p.id === trainingSession.session!.procedureId) ?? HPO_PROCEDURES[0];
              return (
                <OperatorReportView
                  report={sessionReport}
                  procedure={proc}
                  operatorName={operatorName}
                  onSeek={(time) => setSeekTime(time)}
                  transcription={transcription}
                />
              );
            }}
            onBack={() => {
              trainingSession.reset();
              setSessionMode(false);
              setPhase("select" as ViewPhase);
            }}
          />
        </div>
      )}

      {/* ════════ Phase 4: 평가 리포트 ════════ */}
      {activeModal !== "reflection" && phase === "report" && !sessionMode && report && (
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
            <div className="flex items-center gap-2 shrink-0">
              <ExportMenu report={report} />
              {/* HPO-22: 사고 사례 라이브러리 버튼 */}
              <button
                onClick={() => openModal("incidentLibrary")}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium border border-red-200 transition-all"
                title="관련 사고 사례 보기"
              >
                <BookOpen className="w-4 h-4" /> 사고 사례
              </button>
              <button
                onClick={() => openModal("printReport")}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium border border-zinc-200 transition-all"
              >
                <Printer className="w-4 h-4" /> 상세 리포트 인쇄
              </button>
              <button
                onClick={() => setPhase("review")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 text-base font-semibold border border-amber-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageSquare className="w-4 h-4" /> 강평 세션 열기
              </button>
            </div>
          </div>

          {/* 리포트 본문 — OperatorReportView로 위임 */}
          <OperatorReportView
            report={report}
            procedure={selectedProcedure!}
            videoDuration={videoDuration}
            videoUrl={videoUrl ?? undefined}
            goldStandard={selectedGoldStandard}
            selfReflection={selfReflection}
            onSeek={(time) => setSeekTime(time)}
          />
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
      {activeModal === "sopManager" && (
        <SopManager onClose={() => closeModal()} />
      )}

      {activeModal === "history" && (
        <AnalysisHistory
          procedureId={selectedProcedure?.id}
          onViewReport={(histReport) => {
            setReport(histReport);
            closeModal();
            // 이력에서 선택한 리포트의 절차를 찾아 설정
            const matchProc = HPO_PROCEDURES.find(p => p.id === histReport.procedureId);
            if (matchProc) setSelectedProcedure(matchProc);
            setPhase("report");
          }}
          onClose={() => closeModal()}
        />
      )}

      {/* 역량 진행 추이 대시보드 */}
      {activeModal === "progress" && (
        <TraineeProgressDashboard onClose={() => closeModal()} />
      )}

      {/* 코호트 분석 대시���드 */}
      {activeModal === "cohort" && (
        <CohortAnalytics onClose={() => closeModal()} />
      )}

      {/* 캘리브레이션 대시보드 */}
      {activeModal === "calibration" && (
        <CalibrationDashboard onClose={() => closeModal()} />
      )}

      {/* 상세 리포트 인쇄 모달 */}
      {activeModal === "printReport" && report && selectedProcedure && (
        <PrintableReport
          report={report}
          procedure={selectedProcedure}
          onClose={() => closeModal()}
        />
      )}

      {/* 교육과정 효과 벤치마킹 대시보드 */}
      {activeModal === "benchmark" && (
        <BenchmarkDashboard onClose={() => closeModal()} />
      )}

      {/* 훈련생 포트폴리오 모달 */}
      {activeModal === "portfolio" && (
        <TraineePortfolio
          onClose={() => closeModal()}
          onViewReport={(histReport) => {
            setReport(histReport);
            closeModal();
            const matchProc = HPO_PROCEDURES.find(p => p.id === histReport.procedureId);
            if (matchProc) setSelectedProcedure(matchProc);
            setPhase("report");
          }}
        />
      )}

      {/* HPO-20: 경영진 요약 대시보드 모달 */}
      {activeModal === "executive" && (
        <ExecutiveSummary onClose={() => closeModal()} />
      )}

      {/* HPO-22: 사고 사례 연계 라이브러리 모달 */}
      {activeModal === "incidentLibrary" && (
        <IncidentLibrary
          report={report ?? undefined}
          onClose={() => closeModal()}
        />
      )}

      {/* 평가 일정 캘린더 모달 */}
      {activeModal === "schedule" && (
        <EvaluationSchedule
          onClose={() => {
            closeModal();
            // 닫을 때 overdue 배지 갱신
            fetch('/api/twelvelabs/pov-schedule?type=week')
              .then(r => r.json())
              .then(data => { if (data.overdue) setOverdueCount(data.overdue.length); })
              .catch(() => {/* 무시 */});
          }}
          onStartEvaluation={(procedureId) => {
            const proc = HPO_PROCEDURES.find(p => p.id === procedureId);
            if (proc) {
              closeModal();
              handleSelectProcedure(proc);
            }
          }}
        />
      )}
    </div>
  );
}
