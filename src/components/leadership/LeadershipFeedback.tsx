"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  PlayCircle,
  Sparkles,
  Save,
  FileText,
  ClipboardList,
  Wand2,
  Bot,
  CheckCircle2,
  Circle,
  Loader2,
  Eye,
  Hand,
  Zap,
} from "lucide-react";
import { useVideoSearch, useVideoAnalysis, useVideoTranscription } from "@/hooks/useTwelveLabs";
import { TWELVELABS_INDEXES, LEADERSHIP_COMPETENCY_DEFS } from "@/lib/constants";
import {
  matchChapterToCompetency,
  generateAIScore,
  generateAutoFeedback,
} from "@/lib/leadership-analysis";
import { useMultimodalPipeline } from "@/hooks/useMultimodalPipeline";
import TranscriptTimeline from "./TranscriptTimeline";
import SpeakerRoleMapping from "./SpeakerRoleMapping";
import type { RoleContext } from "@/app/api/twelvelabs/multimodal-extract/route";
import type { IndicatorJudgment } from "@/lib/multimodal-scoring";
import type { Chapter, Highlight, LeadershipCompetencyKey } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

// ─── 3색 등급 헬퍼 (상위 teal · 중위 amber · 하위 red) — 피드백 ⑤ ───
function tierColorByJudgment(j: IndicatorJudgment["judgment"]): { bar: string; text: string; chipBg: string } {
  if (j === "상위") return { bar: "bg-emerald-500", text: "text-emerald-600", chipBg: "bg-emerald-100 text-emerald-700" };
  if (j === "중상" || j === "중하") return { bar: "bg-amber-400", text: "text-amber-600", chipBg: "bg-amber-100 text-amber-700" };
  if (j === "미흡") return { bar: "bg-red-400", text: "text-red-500", chipBg: "bg-red-100 text-red-600" };
  return { bar: "bg-slate-300", text: "text-slate-400", chipBg: "bg-slate-100 text-slate-500" }; // 참고/N/A
}

// 항목 점수(0~9) → 3색 등급
function tierColorByScore(score: number | null): { text: string; chipBg: string; border: string; bg: string; bar: string } {
  if (score === null) return { text: "text-slate-400", chipBg: "bg-slate-100 text-slate-400", border: "border-slate-200", bg: "bg-slate-50/30", bar: "bg-slate-300" };
  if (score >= 7) return { text: "text-emerald-700", chipBg: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50/30", bar: "bg-emerald-500" };
  if (score >= 5) return { text: "text-amber-700", chipBg: "bg-amber-100 text-amber-700", border: "border-amber-200", bg: "bg-amber-50/30", bar: "bg-amber-400" };
  return { text: "text-red-600", chipBg: "bg-red-100 text-red-600", border: "border-red-200", bg: "bg-red-50/30", bar: "bg-red-400" };
}

// 지표 값 표시 포맷 (% 변환은 unit 기준 — 균형지수 등 비율 외 0~1 값 오표기 방지)
function formatIndicatorValue(ind: IndicatorJudgment): string {
  if (ind.value === null || ind.value === undefined) return "—";
  if (typeof ind.value === "boolean") return ind.value ? "예" : "아니오";
  const v = ind.value;
  if (ind.unit === "%") return v <= 1 ? `${(v * 100).toFixed(0)}%` : `${v.toFixed(0)}%`;
  return `${v % 1 !== 0 ? v.toFixed(1) : v}${ind.unit ? ` ${ind.unit}` : ""}`;
}

// 분석 완료 시 조 세션에 자동 반영할 점수 데이터
export interface AnalysisCompletePayload {
  videoId: string;
  overallScore: number;
  bars: Record<string, number>;
  multimodal?: number;
}

interface LeadershipFeedbackProps {
  videoId: string;
  videoTitle: string;
  videoUrl?: string;
  selectedCompetencies?: LeadershipCompetencyKey[];
  scenarioText?: string;
  /** 업로드 단계에서 입력한 주요 용어·명단 (STT 보정 — 분석 프롬프트에 정확 표기 주입) */
  initialGlossary?: string[];
  onBack: () => void;
  /** 분석 완료 시 조 세션에 점수를 자동 반영하기 위한 콜백 */
  onAnalysisComplete?: (payload: AnalysisCompletePayload) => void;
}

// 평가 근거 항목 — AI 추천 점수/피드백 포함
interface EvidenceItem {
  id: string;
  chapterIndex: number;
  competencyKey: LeadershipCompetencyKey;
  criteriaLabel: string;
  timestamp: number;
  endTime: number;
  description: string;
  speaker: string;
  score: number;          // 평가자 입력 (0 = 미입력)
  feedback: string;       // 평가자 피드백
  aiScore: number;        // AI 추천 점수
  aiConfidence: number;   // AI 신뢰도 (0-100)
  aiReasoning: string;    // AI 점수 근거
  autoFeedback: string;   // AI 자동 피드백
  matchedKeywords: string[]; // 매칭된 역량 키워드
}

// 역량 정보 빠른 조회
const COMP_MAP = Object.fromEntries(
  LEADERSHIP_COMPETENCY_DEFS.map((d) => [d.key, d])
) as Record<LeadershipCompetencyKey, (typeof LEADERSHIP_COMPETENCY_DEFS)[number]>;

// ─── 분석 단계 정의 (상수, 컴포넌트 외부) ────────────
const ANALYSIS_STEPS = [
  { phase: 1, label: "영상 인덱싱", desc: "AI가 영상 내용을 이해하고 있습니다", icon: Sparkles },
  { phase: 2, label: "구간 분석", desc: "영상을 의미 있는 챕터로 분할합니다", icon: FileText },
  { phase: 3, label: "핵심 장면 추출", desc: "중요한 하이라이트를 찾고 있습니다", icon: Zap },
  { phase: 4, label: "AI 요약", desc: "전체 내용을 요약하고 있습니다", icon: Bot },
  { phase: 5, label: "역량 매칭", desc: "내용 기준 역량을 평가합니다", icon: ClipboardList },
  { phase: 6, label: "시선 · 음성 · 유창성 분석", desc: "멀티모달 행동 신호를 추출합니다", icon: Eye },
  { phase: 7, label: "자세 · 표정 분석", desc: "신체 행동 신호를 분석합니다", icon: Hand },
  { phase: 8, label: "Solar Pro 2 보고서", desc: "AI가 종합 보고서를 생성합니다", icon: Sparkles },
];

// 단계별 완료 시각 기록용 타입
type PhaseTimestamps = Record<number, number>;

// ─── 헬퍼 ────────────────────────────────────────

function getScoreLabel(score: number) {
  if (score >= 8) return "탁월";
  if (score >= 7) return "우수";
  if (score >= 5) return "보통";
  if (score >= 3) return "미흡";
  if (score > 0) return "부족";
  return "";
}

// 9점 척도 인라인 점수 선택기
function ScoreSelector({
  value,
  aiScore,
  onChange,
}: {
  value: number;
  aiScore?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const filled = n <= value;
        const isAiSuggested = aiScore === n && value === 0;
        const tier = value >= 7 ? "teal" : value >= 5 ? "slate" : "amber";
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "w-7 h-7 rounded-md text-sm font-mono font-semibold transition-all duration-150",
              filled
                ? tier === "teal"
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                  : tier === "slate"
                    ? "bg-slate-100 text-slate-700 border border-slate-300"
                    : "bg-amber-100 text-amber-700 border border-amber-300"
                : isAiSuggested
                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 ring-1 ring-emerald-500/20"
                  : "bg-slate-50/50 text-slate-400 border border-slate-200/50 hover:border-slate-200 hover:text-slate-500"
            )}
          >
            {n}
          </button>
        );
      })}
      {value > 0 && (
        <span
          className={cn(
            "text-sm font-medium ml-2 tabular-nums",
            value >= 7 ? "text-emerald-600" : value >= 5 ? "text-slate-500" : "text-amber-600"
          )}
        >
          {value}/9 {getScoreLabel(value)}
        </span>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────

export default function LeadershipFeedback({
  videoId,
  videoTitle,
  videoUrl,
  selectedCompetencies,
  scenarioText,
  initialGlossary,
  onBack,
  onAnalysisComplete,
}: LeadershipFeedbackProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 분석 데이터
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisPhase, setAnalysisPhase] = useState(0); // 0=대기, 1=인덱싱, 2=챕터, 3=하이라이트, 4=요약, 5=매칭, 6=완료

  // 평가 근거
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  // 멀티모달 파이프라인
  const { progress: mmProgress, result: mmResult, error: mmError, runPipeline, runConsistency } = useMultimodalPipeline();
  const [mmStarted, setMmStarted] = useState(false);
  // 재분석(코치 보정/반복 진단) 중 여부 — 전체 로딩 화면 대신 인플레이스 로딩 유지
  const [mmReanalyzing, setMmReanalyzing] = useState(false);
  // 코치 보정 — 평가 대상자/화자 라벨 (피드백 ⑦) · 업로드 단계 용어사전으로 시드
  const [roleContext, setRoleContext] = useState<RoleContext>(
    initialGlossary && initialGlossary.length > 0 ? { glossary: initialGlossary } : {},
  );
  // N차 반복 진단 회차 (객관성 확보 — 보고서 26.6.18)
  const [consistencyRuns, setConsistencyRuns] = useState(3);
  // HITL — 전문가(코치) 평가 확정 상태
  const [coachConfirmed, setCoachConfirmed] = useState(false);
  const [coachName, setCoachName] = useState("");
  // 내용(content) 평가 — AI 초안 (행동 평가와 분리, fail-closed)
  type ContentCriterion = { criteria: string; score: number | null; grade: string; evidence: string; rationale: string };
  const [contentEval, setContentEval] = useState<{ criteria: ContentCriterion[]; overallNote: string; model: string } | null>(null);
  const [contentEvalLoading, setContentEvalLoading] = useState(false);

  // 단계별 완료 시각 기록 (로딩 스켈레톤 UX)
  const [phaseTimestamps, setPhaseTimestamps] = useState<PhaseTimestamps>({});

  // 재생
  const [currentTime, setCurrentTime] = useState(0);
  const [, setIsPlaying] = useState(false);

  // UI
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [autoSaveToast, setAutoSaveToast] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  // setTimeout cleanup 용 ref (언마운트 시 타이머 정리)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  // 마지막으로 대시보드에 보고한 멀티모달 점수 (N차 집계 갱신 시 재보고용)
  const lastMmReportedRef = useRef<number | null>(null);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // 우측 패널 탭 — 멀티모달 기본
  const [rightTab, setRightTab] = useState<"evidence" | "transcript" | "multimodal">("multimodal");

  // 멀티모달 항목별 observation 확장 상태
  const [expandedObs, setExpandedObs] = useState<Set<number>>(new Set());

  // 검색
  // 검색 기능은 향후 UI 연동을 위해 보존
  const { search: _search } = useVideoSearch();
  void _search;
  const { analyze } = useVideoAnalysis();
  const { segments: transcriptSegments, loading: transcriptLoading, fetchTranscription } = useVideoTranscription();

  // ── 인덱싱 대기 → 분석 → 결과 로드 ──
  useEffect(() => {
    let cancelled = false;
    const POLL_INTERVAL = 4000;

    async function waitForIndexing(): Promise<boolean> {
      for (let i = 0; i < 75; i++) {
        if (cancelled) return false;
        try {
          const res = await fetch(`/api/twelvelabs/upload/status?taskId=${videoId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "ready") return true;
            if (data.status === "failed") return false;
          }
        } catch { /* 폴링 실패 무시 */ }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
      return false;
    }

    async function loadAnalysis() {
      setAnalysisLoading(true);
      setAnalysisError(null);

      try {
        // 0단계: 인덱싱 완료 확인 (videoId가 있으면 이미 인덱싱 완료 상태)
        // upload 훅에서 status="ready" 확인 후 videoId를 반환하므로 별도 대기 불필요
        setAnalysisPhase(1);
        setAnalysisStep("영상 인덱싱 확인 완료 — 분석을 시작합니다...");
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;

        // 1단계: 챕터 분석
        setAnalysisPhase(2);
        setAnalysisStep("영상 구간 분석 중...");
        const ch = await analyze(videoId, "chapter");
        if (cancelled) return;
        const parsed: Chapter[] = Array.isArray(ch)
          ? ch.map((c: Record<string, unknown>) => ({
              title: (c.chapter_title as string) || (c.title as string) || "구간",
              start: c.start as number,
              end: c.end as number,
            }))
          : [];
        if (parsed.length > 0) setChapters(parsed);

        // 2단계: 하이라이트 추출
        setAnalysisPhase(3);
        setAnalysisStep("핵심 장면 추출 중...");
        const hl = await analyze(videoId, "highlight");
        if (cancelled) return;
        const parsedHl: Highlight[] = Array.isArray(hl)
          ? hl.map((h: Record<string, unknown>) => ({
              text: (h.highlight as string) || (h.text as string) || "",
              start: h.start as number,
              end: h.end as number,
            }))
          : [];
        if (parsedHl.length > 0) setHighlights(parsedHl);

        // 3단계: AI 요약
        setAnalysisPhase(4);
        setAnalysisStep("AI 요약 생성 중...");
        const sm = await analyze(videoId, "summary");
        if (cancelled) return;
        const summaryText = typeof sm === "string" && sm ? sm : "";

        // ═══════════════════════════════════════════
        // 4단계: 내용 기반 역량 매칭 + AI 자동 스코어링
        // (기존 라운드-로빈 → 지능형 매칭으로 완전 교체)
        // ═══════════════════════════════════════════
        setAnalysisPhase(5);
        setAnalysisStep("AI 역량 매칭 및 자동 평가 중...");
        const competencyKeys: LeadershipCompetencyKey[] = selectedCompetencies && selectedCompetencies.length > 0
          ? selectedCompetencies
          : ["visionPresentation", "trustBuilding", "memberDevelopment"];
        const generatedEvidence: EvidenceItem[] = [];
        // 챕터가 없으면 영상 전체를 하나의 구간으로 대체
        const chaptersToUse: Chapter[] = parsed.length > 0
          ? parsed
          : [{ title: summaryText ? "영상 전체 분석" : videoTitle, start: 0, end: 300 }];
        const highlightsToUse = parsedHl.length > 0 ? parsedHl : [];

        // 사용된 역량 추적 (다양성 확보)
        const usedKeys = new Set<LeadershipCompetencyKey>();

        chaptersToUse.forEach((chapter, ci) => {
          // 이 챕터에 해당하는 하이라이트
          const chapterHighlights = highlightsToUse.filter(
            (h) => h.start >= chapter.start && h.start <= chapter.end
          );

          // 1) 내용 기반 역량 매칭
          const match = matchChapterToCompetency(
            chapter, chapterHighlights, competencyKeys, usedKeys
          );
          usedKeys.add(match.key);

          // 매칭된 역량의 루브릭 항목 선택
          const comp = COMP_MAP[match.key];
          const rubricItem = comp?.rubric?.[ci % (comp?.rubric?.length || 1)];

          // 2) AI 자동 점수 제안
          const aiResult = generateAIScore(
            chapter, chapterHighlights, match.matchedKeywords, summaryText
          );

          // 3) 자동 피드백 생성
          const autoFb = generateAutoFeedback(
            match.key, aiResult.score, chapter, match.matchedKeywords, chapterHighlights
          );

          // 하이라이트 텍스트 조합
          const hlText = chapterHighlights.length > 0
            ? chapterHighlights.map((h) => h.text).join("; ")
            : chapter.title;

          generatedEvidence.push({
            id: `ev-auto-${ci}`,
            chapterIndex: ci,
            competencyKey: match.key,
            criteriaLabel: rubricItem?.criteria || comp?.label || match.key,
            timestamp: chapter.start,
            endTime: chapter.end,
            description: hlText,
            speaker: "발표자",
            score: 0,
            feedback: "",
            aiScore: aiResult.score,
            aiConfidence: aiResult.confidence,
            aiReasoning: aiResult.reasoning,
            autoFeedback: autoFb,
            matchedKeywords: match.matchedKeywords,
          });
        });

        if (generatedEvidence.length > 0) {
          // AI 점수 자동 적용 (사용자가 수동 버튼을 누를 필요 없도록)
          const autoApplied = generatedEvidence.map((e) => ({
            ...e,
            score: e.aiScore,
            feedback: e.autoFeedback,
          }));
          setEvidence(autoApplied);
        }
        setAnalysisPhase(6);
        setAnalysisStep("분석 완료");
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "분석 실패";
          setAnalysisError(msg);
          setAnalysisStep("");
        }
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    }

    loadAnalysis();
    fetchTranscription(TWELVELABS_INDEXES.leadership, videoId);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, analyze, fetchTranscription]);

  // 멀티모달은 역량 1개 기준으로 실행 (파일럿: 한 번에 한 역량 선택)
  const activeCompetency: LeadershipCompetencyKey = (selectedCompetencies?.[0] as LeadershipCompetencyKey) || "visionPresentation";

  // ── 멀티모달 파이프라인 자동 시작 (BARS 분석 완료 후) ──
  useEffect(() => {
    if (!analysisLoading && analysisPhase >= 6 && !mmStarted && videoId) {
      setMmStarted(true);
      runPipeline(videoId, activeCompetency, scenarioText, roleContext);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisLoading, analysisPhase, mmStarted, videoId]);

  // ── 코치 보정 적용 → 재분석. 직전이 N차 집계였으면 집계 모드 유지(단일진단으로 폐기 방지) ──
  const handleRoleApply = useCallback((rc: RoleContext) => {
    setRoleContext(rc);
    setMmReanalyzing(true);
    setCoachConfirmed(false);
    if (mmResult?.aggregate) {
      runConsistency(videoId, activeCompetency, mmResult.aggregate.runCount || consistencyRuns, scenarioText, rc);
    } else {
      runPipeline(videoId, activeCompetency, scenarioText, rc);
    }
  }, [videoId, activeCompetency, scenarioText, runPipeline, runConsistency, mmResult, consistencyRuns]);

  // ── N차 반복 진단 (객관성 확보 — 평균/중앙값/신뢰구간). runs 인자 우선(적응형 권장 회차 stale 방지) ──
  const handleConsistencyRun = useCallback((runs?: number) => {
    const r = runs ?? consistencyRuns;
    if (runs && runs !== consistencyRuns) setConsistencyRuns(runs);
    setMmReanalyzing(true);
    setCoachConfirmed(false);
    runConsistency(videoId, activeCompetency, r, scenarioText, roleContext);
  }, [videoId, activeCompetency, consistencyRuns, scenarioText, roleContext, runConsistency]);

  // ── 내용(content) 평가 — AI 초안 (행동 평가와 분리, fail-closed 인용 기반) ──
  const handleContentEval = useCallback(async () => {
    setContentEvalLoading(true);
    try {
      const transcript = transcriptSegments.map((s) => s.text || s.value || "").join(" ").trim();
      const res = await fetch("/api/solar/content-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencyKey: activeCompetency, transcript, scenarioText }),
      });
      if (res.ok) {
        const d = await res.json();
        setContentEval({ criteria: d.criteria || [], overallNote: d.overallNote || "", model: d.model || "" });
      } else {
        // fail-closed는 '왜 보류됐는지 알리는 것'까지 — 침묵 실패 방지
        setContentEval({ criteria: [], overallNote: "내용 평가 보류 — 서버 오류 또는 루브릭 없음. 잠시 후 다시 시도하세요.", model: "error" });
      }
    } catch {
      setContentEval({ criteria: [], overallNote: "내용 평가 보류 — 네트워크 오류. 다시 시도하세요.", model: "error" });
    } finally {
      setContentEvalLoading(false);
    }
  }, [transcriptSegments, activeCompetency, scenarioText]);

  // 재분석 완료/실패 시 플래그 해제
  useEffect(() => {
    if (mmReanalyzing && (mmProgress.phase === "done" || mmProgress.phase === "error")) {
      setMmReanalyzing(false);
    }
  }, [mmReanalyzing, mmProgress.phase]);

  // ── 분석 완료 시 자동 저장 + 토스트 + 조 세션 자동 반영 ──
  const [analysisReported, setAnalysisReported] = useState(false);
  useEffect(() => {
    // 전체 분석 완료 (BARS + 멀티모달) 후 evidence가 있으면 자동 저장
    // mmStarted 필수: 멀티모달이 실제로 시작된 후 완료/실패해야 저장 (조기 저장 방지)
    const isFullyDone = !analysisLoading && analysisPhase >= 6
      && mmStarted && (mmProgress.phase === "done" || mmProgress.phase === "error");
    if (isFullyDone && evidence.length > 0 && !autoSaveToast) {
      // 선택된 역량 키도 함께 저장 (대시보드 표시용)
      const primaryCompetency = selectedCompetencies?.[0] || (evidence[0]?.competencyKey ?? "");
      localStorage.setItem(
        `evidence-${videoId}`,
        JSON.stringify({ videoId, videoTitle, competencyKey: primaryCompetency, evidence, savedAt: new Date().toISOString(), autoSaved: true })
      );
      setAutoSaveToast(true);
      // 이전 타이머 정리 후 새 타이머 설정
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => setAutoSaveToast(false), 4000);

      // 조 세션에 점수 자동 반영 — N차 집계 대표값(중앙값) 우선, 집계 갱신 시 재보고
      // 멀티모달 점수: 반복 진단 시 집계 중앙값(강건) → 단일 진단 totalScore 순
      const multimodalScore = mmResult?.aggregate?.total?.median ?? mmResult?.scoring?.totalScore ?? undefined;
      const shouldReport = onAnalysisComplete && (!analysisReported || lastMmReportedRef.current !== (multimodalScore ?? null));
      if (shouldReport && onAnalysisComplete) {
        setAnalysisReported(true);
        lastMmReportedRef.current = multimodalScore ?? null;
        // evidence에서 역량별 점수 집계
        const competencyScores: Record<string, number[]> = {};
        evidence.forEach((ev) => {
          const score = ev.score > 0 ? ev.score : ev.aiScore;
          if (score > 0) {
            if (!competencyScores[ev.competencyKey]) competencyScores[ev.competencyKey] = [];
            competencyScores[ev.competencyKey].push(score);
          }
        });
        // 역량별 평균 bars
        const bars: Record<string, number> = {};
        let totalSum = 0;
        let totalCount = 0;
        Object.entries(competencyScores).forEach(([key, scores]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          bars[key] = Math.round(avg * 10) / 10;
          totalSum += avg;
          totalCount++;
        });
        const overallScore = totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : 0;
        onAnalysisComplete({ videoId, overallScore, bars, multimodal: multimodalScore });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisLoading, analysisPhase, mmProgress.phase, evidence.length, mmResult?.aggregate?.total?.median, mmResult?.scoring?.totalScore]);

  // ── 비디오 시간 추적 (로딩 완료 후 재등록) ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onSeeked = () => setCurrentTime(v.currentTime);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("seeked", onSeeked);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("seeked", onSeeked);
    };
  // 분석 완료 후 video 엘리먼트가 새로 마운트되므로 재등록
  }, [analysisLoading, mmProgress.phase]);

  // ── 핸들러 ──
  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (v) { v.currentTime = time; setCurrentTime(time); v.play(); }
  }, []);

  // togglePlay는 향후 UI 버튼 연동을 위해 남겨둠 (현재 미사용)
  // const togglePlay = useCallback(() => {
  //   const v = videoRef.current;
  //   if (!v) return;
  //   if (v.paused) { v.play(); } else { v.pause(); }
  // }, []);

  const handleEvidenceClick = useCallback(
    (ev: EvidenceItem) => {
      if (activeEvidenceId === ev.id) {
        setActiveEvidenceId(null);
      } else {
        setActiveEvidenceId(ev.id);
        seekTo(ev.timestamp);
      }
    },
    [activeEvidenceId, seekTo]
  );

  const handleTimestampReplay = useCallback(
    (e: React.MouseEvent, ts: number) => { e.stopPropagation(); seekTo(ts); },
    [seekTo]
  );

  const updateScore = useCallback((id: string, score: number) => {
    setEvidence((p) => p.map((e) => (e.id === id ? { ...e, score } : e)));
    setSaved(false);
  }, []);

  const updateFeedback = useCallback((id: string, text: string) => {
    setEvidence((p) => p.map((e) => (e.id === id ? { ...e, feedback: text } : e)));
    setSaved(false);
  }, []);

  // AI 추천 점수 일괄 적용
  const applyAllAIScores = useCallback(() => {
    setEvidence((prev) =>
      prev.map((e) => ({
        ...e,
        score: e.score === 0 ? e.aiScore : e.score,
        feedback: !e.feedback ? e.autoFeedback : e.feedback,
      }))
    );
    setSaved(false);
  }, []);

  // 개별 AI 추천 적용
  const applyAIScore = useCallback((id: string) => {
    setEvidence((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          score: e.aiScore,
          feedback: e.feedback || e.autoFeedback,
        };
      })
    );
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    const primaryCompetency = selectedCompetencies?.[0] || (evidence[0]?.competencyKey ?? "");
    localStorage.setItem(
      `evidence-${videoId}`,
      JSON.stringify({ videoId, videoTitle, competencyKey: primaryCompetency, evidence, savedAt: new Date().toISOString() })
    );
    setSaved(true);
    // 이전 타이머 정리 후 새 타이머 설정
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 3000);
  }, [videoId, videoTitle, evidence, selectedCompetencies]);

  // ── 보고서 PDF 내보내기 (보고서 영역만 별도 창에서 인쇄 → 저장) — 피드백 ⑥ ──
  const buildReportHtml = useCallback((): string => {
    const el = document.getElementById("multimodal-report");
    const inner = el ? el.innerHTML : "<p>보고서를 찾을 수 없습니다.</p>";
    const label = mmResult?.scoring.competencyLabel || "리더십";
    const total = mmResult?.scoring.totalScore;
    const totalLine = total !== null && total !== undefined
      ? `<p class="meta">총점 ${total.toFixed(1)}/9 (${mmResult?.scoring.interpretation}) · 핵심 4개 항목(M1~M4) 평균 · M5 제외</p>`
      : `<p class="meta">총점 산출 보류 (채점 가능 항목 3개 미만)</p>`;
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${label} 멀티모달 행동분석 보고서 — ${videoTitle}</title>
<style>
  *{box-sizing:border-box} body{font-family:'Pretendard',system-ui,sans-serif;color:#1e293b;margin:32px;line-height:1.8}
  h1{font-size:18px;margin:0 0 4px} .sub{color:#64748b;font-size:12px;margin:0 0 2px} .meta{color:#7c3aed;font-size:12px;margin:0 0 16px;font-weight:600}
  h2{font-size:15px;border-bottom:1px solid #ddd6fe;padding-bottom:6px;margin:22px 0 10px}
  h3{font-size:14px;margin:16px 0 6px} h4{font-size:13px;color:#6d28d9;margin:12px 0 4px}
  table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px} th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left} th{background:#f8fafc}
  ul,ol{padding-left:20px} li{margin:3px 0} p{margin:6px 0}
  @media print{body{margin:12mm}}
</style></head><body>
<h1>${label} 멀티모달 행동분석 종합보고서</h1>
<p class="sub">${videoTitle} · KHNP 인재개발원 리더십 역량진단 v1.0</p>
${totalLine}
${inner}
</body></html>`;
  }, [mmResult, videoTitle]);

  const handleExportReportPdf = useCallback(() => {
    // document.write 대신 Blob URL 사용 (XSS·성능 회피). 콘텐츠는 renderReport에서 script/iframe/on* 제거 후 생성됨
    const blob = new Blob([buildReportHtml()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "width=900,height=1000");
    if (!w) { alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요."); URL.revokeObjectURL(url); return; }
    // 로드 후 인쇄 다이얼로그 (사용자가 'PDF로 저장' 선택)
    w.addEventListener("load", () => { w.focus(); w.print(); });
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [buildReportHtml]);

  const handleDownloadReport = useCallback(() => {
    const blob = new Blob([buildReportHtml()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (mmResult?.scoring.competencyLabel || "리더십").replace(/\s+/g, "");
    a.href = url;
    a.download = `${safe}_행동분석보고서_${videoTitle.replace(/\s+/g, "_").slice(0, 40)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [buildReportHtml, mmResult, videoTitle]);

  // handleSearch: 향후 검색 UI 연동을 위해 보존 (현재 미사용)
  // const handleSearch = useCallback(
  //   (query: string) => search(TWELVELABS_INDEXES.leadership, query),
  //   [search]
  // );

  // ── 계산값 ──
  const currentChapterIndex = useMemo(
    () => chapters.findIndex((ch) => currentTime >= ch.start && currentTime < ch.end),
    [chapters, currentTime]
  );

  const evidenceByChapter = useMemo(
    () => chapters.map((ch, i) => ({ chapter: ch, items: evidence.filter((e) => e.chapterIndex === i) })),
    [chapters, evidence]
  );

  // scoredCount는 reportData에서 사용되므로 직접 참조하지 않지만,
  // 향후 UI 카운터에 사용될 수 있어 보존
  const _scoredCount = useMemo(() => evidence.filter((e) => e.score > 0).length, [evidence]);
  void _scoredCount;

  // 미평가 항목 수
  const unscoredCount = evidence.filter((e) => e.score === 0).length;

  // 멀티모달 단계 매핑
  const effectivePhase = useMemo(() => {
    if (analysisPhase < 6) return analysisPhase;
    // BARS 완료 후 멀티모달 단계
    if (mmProgress.phase === "extracting") return 6 + (mmProgress.completedChannels.length >= 3 ? 1 : 0);
    if (mmProgress.phase === "scoring") return 7;
    if (mmProgress.phase === "reporting") return 8;
    if (mmProgress.phase === "done") return 9; // 전체 완료
    return 6;
  }, [analysisPhase, mmProgress]);

  const competencyKeysToUse = useMemo(
    () => selectedCompetencies && selectedCompetencies.length > 0
      ? selectedCompetencies
      : ["visionPresentation", "trustBuilding", "memberDevelopment"] as LeadershipCompetencyKey[],
    [selectedCompetencies]
  );

  // 단계 전환 시 타임스탬프 기록
  useEffect(() => {
    if (effectivePhase > 0) {
      setPhaseTimestamps((prev) => {
        if (prev[effectivePhase]) return prev; // 이미 기록됨
        return { ...prev, [effectivePhase]: Date.now() };
      });
    }
  }, [effectivePhase]);

  // 단계별 소요 시간 계산 헬퍼
  const getPhaseElapsed = useCallback((phase: number): string | null => {
    const startTs = phaseTimestamps[phase];
    const endTs = phaseTimestamps[phase + 1];
    if (!startTs || !endTs) return null;
    const elapsed = Math.round((endTs - startTs) / 1000);
    if (elapsed < 60) return `${elapsed}초`;
    return `${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`;
  }, [phaseTimestamps]);

  // ══════════════════════════════════════════════════════════════
  // JSX 렌더링
  // ──────────────────────────────────────────────────────────────
  // 섹션 A: 분석 진행 화면 (로딩) .................. ~L556–684
  // 섹션 B: 결과 뷰 헤더 + 역량 태그 .............. ~L689–745
  // 섹션 C: 좌측 — 영상 플레이어 + 챕터 + 요약 .... ~L749–836
  // 섹션 D: 우측 — 탭 (멀티모달/BARS/대본) ........ ~L838–1153
  // 섹션 E: [비활성] 평가 근거 카드 리스트 ......... ~L1155–1356
  // ══════════════════════════════════════════════════════════════

  // ── 섹션 A: 분석 진행 화면 (로딩 스크린) ──────────────────
  // BARS 완료 후 멀티모달 시작 전 1-프레임 갭 방지: mmPendingStart 추가
  const mmPendingStart = !analysisLoading && analysisPhase >= 6 && !mmStarted && !!videoId;
  // 재분석(mmReanalyzing) 중에는 전체 로딩 화면으로 되돌아가지 않고 결과 뷰·코치 패널을 유지 (인플레이스 로딩)
  const isFullyLoading = analysisLoading || mmPendingStart || (mmStarted && !mmReanalyzing && mmProgress.phase !== "done" && mmProgress.phase !== "error");
  if (isFullyLoading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 py-12 animate-slide-in-right">
        {/* 뒤로가기 */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-base text-slate-500 hover:text-emerald-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          역량진단으로 돌아가기
        </button>

        {/* 영상 정보 */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-emerald-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">AI 역량 분석 진행 중</h2>
          <p className="text-base text-slate-500">{videoTitle}</p>
        </div>

        {/* 선택된 역량 */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
          {competencyKeysToUse.map((key) => {
            const comp = COMP_MAP[key];
            return comp ? (
              <span
                key={key}
                className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: `${comp.color}15`, color: comp.color }}
              >
                {comp.label}
              </span>
            ) : null;
          })}
        </div>

        {/* 단계별 진행 체크리스트 */}
        <div className="bg-white border border-slate-200/40 rounded-2xl p-8 shadow-sm">
          <div className="space-y-5">
            {ANALYSIS_STEPS.map((step) => {
              const isDone = effectivePhase > step.phase;
              const isCurrent = effectivePhase === step.phase;

              return (
                <div key={step.phase} className="flex items-start gap-4">
                  {/* 아이콘 */}
                  <div className="shrink-0 mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : isCurrent ? (
                      <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  {/* 텍스트 */}
                  <div className="flex-1">
                    <p className={cn(
                      "text-base font-medium transition-colors",
                      isDone ? "text-emerald-600" : isCurrent ? "text-slate-800" : "text-slate-400"
                    )}>
                      {step.label}
                      {isDone && (
                        <span className="text-sm text-emerald-500 ml-2">
                          {(() => {
                            const elapsed = getPhaseElapsed(step.phase);
                            return elapsed ? `${elapsed}` : "완료";
                          })()}
                        </span>
                      )}
                    </p>
                    <p className={cn(
                      "mt-0.5 transition-colors",
                      isCurrent ? "text-base text-slate-700 font-medium" : "text-sm text-slate-400"
                    )}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 프로그레스 바 */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
              <span>{analysisStep}</span>
              <span className="font-mono">{Math.min(Math.round((effectivePhase / 9) * 100), 98)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min((effectivePhase / 9) * 100, 98)}%` }}
              />
            </div>
          </div>

          {/* 소요 시간 안내 */}
          <p className="text-xs text-slate-400 mt-4 text-center">약 2~5분 소요됩니다</p>

          {/* 취소 / 뒤로가기 버튼 */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              분석 취소
            </button>
          </div>

          {/* 상황사례 표시 */}
          {scenarioText && (
            <div className="mt-6 pt-6 border-t border-slate-200/30">
              <p className="text-sm text-slate-500 mb-1 font-medium">상황사례</p>
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{scenarioText}</p>
            </div>
          )}
        </div>

        {/* 에러 표시 + 복구 버튼 */}
        {analysisError && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700 font-medium mb-1">분석 중 오류 발생</p>
            <p className="text-sm text-amber-600 mb-3">{analysisError}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                뒤로 가기
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                다시 분석
              </button>
            </div>
          </div>
        )}

        {/* 영상 미리보기 (하단) */}
        {videoUrl && (
          <div className="mt-8 rounded-2xl overflow-hidden border border-slate-200/40 bg-black shadow-lg">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full aspect-video bg-black"
            />
          </div>
        )}
      </div>
    );
  }

  // ── 섹션 B: 분석 완료 → 결과 뷰 ──────────────────────────
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 animate-slide-in-right">
      {/* 자동 저장 토스트 */}
      {autoSaveToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            분석 결과가 자동 저장되었습니다
          </div>
        </div>
      )}
      {/* 보고서 복사 토스트 */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            보고서가 클립보드에 복사되었습니다
          </div>
        </div>
      )}
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-base text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            역량진단
          </button>
          <span className="text-slate-400">/</span>
          <h2 className="text-lg font-bold text-emerald-600">영상 리뷰 &amp; 피드백</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium transition-all duration-200",
              saved
                ? "bg-emerald-50 text-emerald-600 border border-emerald-500/30"
                : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-500/30 hover:text-emerald-600"
            )}
          >
            <Save className="w-4 h-4" />
            {saved ? "저장 완료" : "피드백 저장"}
          </button>
        </div>
      </div>
      {/* 영상 제목 + 선택 역량 태그 */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <p className="text-base text-slate-700">{videoTitle}</p>
        <span className="text-slate-300">·</span>
        {competencyKeysToUse.map((key) => {
          const comp = COMP_MAP[key];
          return comp ? (
            <span
              key={key}
              className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: `${comp.color}15`, color: comp.color }}
            >
              {comp.label}
            </span>
          ) : null;
        })}
      </div>

      {/* ── 세로 레이아웃: 영상 상단 고정 + 분석 하단 전체너비 ── */}
      <div className="flex flex-col gap-5">
        {/* ── 영상 플레이어 — 화면 상단 sticky 고정 (스크롤 시에도 항상 노출) ── */}
        <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-3 bg-[#f7f8f6]/85 backdrop-blur-sm">
          <div className="rounded-2xl overflow-hidden border border-slate-200/40 bg-black shadow-xl shadow-slate-200/60 mx-auto w-full max-w-3xl">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full aspect-video max-h-[52vh] bg-black"
              aria-label="토론 영상"
            />
          </div>
        </div>

        {/* ── 분석 영역 — 영상 아래 전체 너비 ── */}
        <div className="space-y-4">

          {/* 챕터 타임라인 (챕터가 있을 때만) */}
          {chapters.length > 0 && (
            <div className="bg-white/60 border border-slate-200/40 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-500 font-medium">챕터</span>
                {currentChapterIndex >= 0 && (
                  <span className="text-xs text-emerald-600 truncate">{chapters[currentChapterIndex]?.title}</span>
                )}
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                {chapters.map((ch, i) => {
                  const total = chapters[chapters.length - 1]?.end || 1;
                  return (
                    <button
                      key={i}
                      onClick={() => seekTo(ch.start)}
                      className={cn(
                        "h-full rounded-sm transition-all duration-300 hover:brightness-125",
                        i === currentChapterIndex
                          ? "bg-emerald-500"
                          : currentTime >= ch.end
                            ? "bg-emerald-500/30"
                            : "bg-slate-200"
                      )}
                      style={{ width: `${((ch.end - ch.start) / total) * 100}%` }}
                      title={ch.title}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 분석 에러 + 복구 버튼 */}
          {analysisError && (
            <div className="bg-white/40 border border-amber-500/20 rounded-xl p-4">
              <p className="text-sm text-amber-600 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                분석 결과를 불러오지 못했습니다
              </p>
              <p className="text-sm text-slate-500">{analysisError}</p>
              <p className="text-sm text-slate-400 mt-2">영상 인덱싱이 완료된 후 다시 시도해 주세요</p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  뒤로 가기
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  다시 분석
                </button>
              </div>
            </div>
          )}

          {/* ── HITL 운영 스테퍼 + N차 반복 진단 컨트롤 (보고서 26.6.18: HITL·객관성) ── */}
          {(mmResult || mmReanalyzing) && (() => {
            const busy = mmReanalyzing;
            // HITL 단계: 1 AI 진단 → 2 전문가 검토·일관성 → 3 확정
            const step = coachConfirmed ? 3 : ((mmResult || busy) ? 2 : 1);
            const steps = [
              { n: 1, label: "AI 진단", done: !!mmResult },
              { n: 2, label: "전문가 검토·일관성", done: coachConfirmed },
              { n: 3, label: "평가 확정", done: coachConfirmed },
            ];
            return (
              <div className="bg-white border border-emerald-200/50 rounded-2xl p-5 shadow-sm animate-fade-in-up">
                {/* HITL 스테퍼 */}
                <div className="flex items-center gap-2 mb-4">
                  {steps.map((st, i) => (
                    <div key={st.n} className="flex items-center gap-2">
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
                        st.done ? "bg-emerald-600 text-white" : step === st.n ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30" : "bg-slate-100 text-slate-400",
                      )}>
                        {st.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full bg-current/20 grid place-items-center text-[10px]">{st.n}</span>}
                        {st.label}
                      </div>
                      {i < steps.length - 1 && <div className="w-4 h-px bg-slate-200" />}
                    </div>
                  ))}
                  <span className="ml-auto text-[10px] text-slate-400">Human-in-the-Loop · EU AI Act 준수</span>
                </div>

                {/* 반복 진단 진행 중 */}
                {busy ? (
                  <div className="flex items-center gap-3 py-2">
                    <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                    <div className="text-sm text-slate-600">
                      {mmProgress.totalRuns && mmProgress.totalRuns > 1
                        ? `N차 반복 진단 중 — ${mmProgress.currentRun}/${mmProgress.totalRuns}회차 (${mmProgress.completedChannels.length}/${mmProgress.totalChannels} 항목)`
                        : "재분석 중..."}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">반복 횟수</span>
                      <div className="flex items-center gap-1">
                        {[3, 5, 7].map((r) => (
                          <button key={r} onClick={() => setConsistencyRuns(r)}
                            className={cn("w-8 h-8 rounded-lg text-sm font-mono font-semibold transition-colors",
                              consistencyRuns === r ? "bg-[#006341] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                            {r}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => handleConsistencyRun()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#006341]/[0.08] text-[#006341] border border-[#006341]/30 hover:bg-[#006341]/15 transition-colors">
                        <Sparkles className="w-3.5 h-3.5" />
                        {consistencyRuns}차 반복 진단 (객관성 확보)
                      </button>
                    </div>
                    {mmResult && !coachConfirmed && (
                      <div className="flex items-center gap-2">
                        <input type="text" value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="평가자(코치)명"
                          className="w-28 bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-emerald-500/40" />
                        <button onClick={() => coachName.trim() && setCoachConfirmed(true)} disabled={!coachName.trim()}
                          className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            coachName.trim() ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-100 text-slate-400 cursor-not-allowed")}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> 전문가 평가 확정
                        </button>
                      </div>
                    )}
                    {coachConfirmed && (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> {coachName} 확정 완료
                      </span>
                    )}
                  </div>
                )}

                {/* 컴플라이언스 안내 */}
                {!coachConfirmed && !busy && (
                  <p className="text-[11px] text-amber-600 mt-3 pt-2.5 border-t border-slate-100">
                    ⚠ 본 결과는 <strong>AI 초안</strong>입니다. 음성인식 오차가 있을 수 있어 전문가(코치) 검토·확정 전까지는 참고용입니다. 점수가 회차마다 다를 수 있어 반복 진단으로 객관성을 확보하길 권장합니다.
                  </p>
                )}
              </div>
            );
          })()}

          {/* ── 종합 평가 요약 + 일관성(신뢰구간) (최상단 배치 — 피드백 ④, 보고서 26.6.18) ── */}
          {mmResult && !mmReanalyzing && (() => {
            const s = mmResult.scoring;
            const agg = mmResult.aggregate;
            const tot = agg?.total;
            // 대표값: 반복 진단 시 중앙값(강건), 단일 진단 시 총점
            const headline = tot ? tot.median : s.totalScore;
            const headlineColor = headline === null ? "text-slate-400" : headline >= 5.5 ? "text-emerald-600" : headline >= 3.0 ? "text-amber-600" : "text-red-500";
            const consColor: Record<string, string> = { 높음: "bg-emerald-100 text-emerald-700", 보통: "bg-amber-100 text-amber-700", 낮음: "bg-red-100 text-red-600" };
            return (
              <div className="bg-white border border-emerald-200/50 rounded-2xl p-5 shadow-sm animate-fade-in-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-800">{s.competencyLabel} 멀티모달 종합 평가</span>
                  </div>
                  <span className="text-[11px] text-slate-400">핵심 4개(M1~M4) 평균 · M5 보조 제외</span>
                </div>
                <div className="flex items-end gap-4">
                  <div className="text-center shrink-0">
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-4xl font-bold font-mono", headlineColor)}>{headline !== null ? headline.toFixed(1) : "—"}</span>
                      <span className="text-base text-slate-400">/9</span>
                    </div>
                    <p className={cn("text-sm font-medium mt-0.5", headlineColor)}>{agg ? agg.interpretation : s.interpretation}</p>
                    {agg && tot
                      ? <p className="text-[11px] text-slate-400">{agg.runCount}회 중앙값 · 평균 {tot.mean.toFixed(1)}</p>
                      : (s.totalScore100 !== null && <p className="text-[11px] text-slate-400">100점 환산 {s.totalScore100}점</p>)}
                  </div>
                  {/* 항목별 미니 점수 (3색) */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {s.items.filter((it) => it.totalReflected).map((it) => {
                      const aItem = agg?.items.find((a) => a.id === it.id);
                      const val = aItem?.stat ? aItem.stat.median : it.itemScore;
                      const c = tierColorByScore(val);
                      const pct = val !== null && val !== undefined ? (val / 9) * 100 : 0;
                      return (
                        <div key={it.id} className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-7 shrink-0 font-mono">{it.channel}</span>
                          <span className="text-[11px] text-slate-600 truncate flex-1 min-w-0">{it.name}</span>
                          <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                            <div className={cn("h-full rounded-full", c.bar)} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={cn("text-[11px] font-mono font-bold w-10 text-right shrink-0", c.text)}>
                            {val !== null && val !== undefined ? `${val.toFixed(1)}` : "N/A"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 일관성(신뢰구간) — 반복 진단 시에만 */}
                {agg && tot && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", consColor[agg.consistency.level])}>
                        진단 일관성 {agg.consistency.level}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        95% 신뢰구간 {tot.ci95[0].toFixed(1)}~{tot.ci95[1].toFixed(1)} · σ {tot.stdev.toFixed(2)} · 최빈값 {tot.mode.toFixed(1)}
                      </span>
                    </div>
                    {/* 회차별 점 */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] text-slate-400 w-10 shrink-0">회차별</span>
                      {agg.totalRuns.map((r, i) => (
                        <span key={i} className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded",
                          r === null ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-slate-600")}>
                          {r === null ? "N/A" : r.toFixed(1)}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">{agg.consistency.label}</p>
                    {/* 적응형 권고 (신뢰구간 게이트 + 등급경계 HITL) — 단일 출처 = agg.recommendation */}
                    {(() => {
                      const rec = agg.recommendation;
                      if (rec.status === "sufficient") {
                        return <p className="text-[11px] text-emerald-700 font-medium mt-1">✓ {rec.message}</p>;
                      }
                      if (rec.status === "more_runs") {
                        const canMore = rec.suggestedTotalRuns > agg.runCount && !coachConfirmed && !mmReanalyzing;
                        return (
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <p className="text-[11px] text-amber-600 font-medium">{rec.message}</p>
                            {canMore && (
                              <button
                                type="button"
                                onClick={() => handleConsistencyRun(rec.suggestedTotalRuns)}
                                className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#006341] text-white hover:bg-[#00543a] transition-colors"
                              >
                                {rec.suggestedTotalRuns}회까지 추가 진단
                              </button>
                            )}
                          </div>
                        );
                      }
                      // hitl_required — 등급경계 straddle 또는 상한 초과 변동
                      return (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">
                          → {rec.message}
                          {rec.straddlesBand && <span className="ml-1 font-mono font-normal">(등급경계 사례)</span>}
                        </p>
                      );
                    })()}
                  </div>
                )}

                <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                  채점 가능 핵심 항목 {s.scorableItemCount}/{s.coreItemCount}개 · {mmResult.reportModel === "solar-pro2" ? "Solar Pro 2" : "로컬 템플릿"} 보고서
                  {!agg && <span className="ml-1">· 단일 진단 (반복 진단으로 객관성 확보 권장)</span>}
                  {s.totalScore === null && !agg && <span className="text-amber-600 ml-1">· 채점 가능 항목 3개 미만으로 총점 산출 보류</span>}
                </p>
              </div>
            );
          })()}

          {/* ── 코치 보정 패널 (화자·역할) — 피드백 ⑦ ── */}
          <SpeakerRoleMapping
            competencyKey={activeCompetency}
            value={roleContext}
            onApply={handleRoleApply}
            disabled={mmStarted && mmProgress.phase !== "done" && mmProgress.phase !== "error"}
          />

          {/* 핵심 장면 빠른 이동 (하이라이트 — 발언요약 프로세는 제거, 피드백 ④) */}
          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {highlights.map((hl, i) => (
                <button
                  key={i}
                  onClick={() => seekTo(hl.start)}
                  className="inline-flex items-center gap-1.5 bg-slate-100/50 hover:bg-emerald-50 border border-slate-200/40 hover:border-emerald-500/20 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-all"
                >
                  <PlayCircle className="w-3 h-3" />
                  <span className="font-mono">{formatTime(hl.start)}</span>
                  <span className="max-w-[180px] truncate">{hl.text}</span>
                </button>
              ))}
            </div>
          )}
          {/* ── 내용(content) 평가 — AI 초안 (행동 평가와 분리, fail-closed 인용 기반) [최소 프로토타입] ── */}
          <div className="bg-white border border-slate-200/50 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">내용 평가 <span className="text-[11px] font-normal text-amber-600">(AI 초안 · 교수 확정 필요)</span></p>
                  <p className="text-[11px] text-slate-400 truncate">전사 인용 근거 기반 · 행동 점수와 합산하지 않는 별도 레이어</p>
                </div>
              </div>
              {!contentEval && (
                <button
                  onClick={handleContentEval}
                  disabled={contentEvalLoading || transcriptSegments.length === 0}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0",
                    contentEvalLoading || transcriptSegments.length === 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-slate-800 text-white hover:bg-slate-700",
                  )}
                >
                  {contentEvalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {contentEvalLoading ? "분석 중..." : "내용 평가 실행"}
                </button>
              )}
            </div>
            <div className="px-5 py-4">
              {!contentEval ? (
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  내용 평가는 “전략이 타당한가·논리가 적절한가” 같은 <strong>내용의 질</strong>을 전사(대본) 인용 근거로만 채점하는 별도 레이어입니다.
                  할루시네이션 위험이 큰 영역이라 <strong>인용 근거가 없으면 점수를 보류(fail-closed)</strong>하고, 결과는 항상 <strong>전문가(교수) 확정</strong>을 거칩니다.
                  {transcriptSegments.length === 0 && <span className="text-amber-600"> (전사 데이터가 아직 없어 실행할 수 없습니다.)</span>}
                </p>
              ) : (
                <div className={cn("space-y-3", !coachConfirmed && "opacity-95")}>
                  {coachConfirmed ? (
                    <div className="flex items-start gap-2 bg-emerald-50/70 border border-emerald-200/60 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-emerald-700 leading-relaxed">
                        <strong>{coachName} 전문가 확정 완료.</strong> 내용 평가 초안을 전문가가 검토·확정했습니다. 행동 점수와 합산하지 않습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200/60 rounded-lg px-3 py-2">
                      <span className="text-amber-600 text-sm shrink-0">⚠</span>
                      <p className="text-[12px] text-amber-700 leading-relaxed">
                        <strong>전문가 미확정 AI 초안 · 참고용.</strong> 내용 평가는 전문가들 사이에서도 일치도가 낮은 영역이므로, 상단에서 평가자(코치)가 검토·확정하기 전까지는 참고용입니다. 행동 점수와 합산하지 않습니다.
                      </p>
                    </div>
                  )}
                  {contentEval.criteria.map((c, i) => {
                    const held = c.score === null || !c.evidence?.trim(); // 인용 없는 점수는 UI에서도 보류 (이중 방어)
                    const gc = held ? "bg-slate-100 text-slate-500" : c.score! >= 7 ? "bg-emerald-100 text-emerald-700" : c.score! >= 4 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
                    return (
                      <div key={i} className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[13px] font-semibold text-slate-700">{c.criteria}</span>
                          <span className={cn("text-[11px] font-mono font-bold px-2 py-0.5 rounded shrink-0", gc)}>
                            {held ? "보류" : `${c.score}/9 ${c.grade}`}
                          </span>
                        </div>
                        {c.evidence && (
                          <p className="text-[12px] text-slate-600 bg-slate-50 rounded px-2.5 py-1.5 my-1 border-l-2 border-slate-300">“{c.evidence}”</p>
                        )}
                        <p className="text-[12px] text-slate-500 leading-relaxed">{c.rationale}</p>
                      </div>
                    );
                  })}
                  {contentEval.overallNote && (
                    <p className="text-[12px] text-slate-600 leading-relaxed pt-1">{contentEval.overallNote}</p>
                  )}
                  <button onClick={handleContentEval} disabled={contentEvalLoading}
                    className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1">
                    <Loader2 className={cn("w-3 h-3", contentEvalLoading && "animate-spin")} /> 다시 실행
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── 탭 전환 (멀티모달 / 대본) ── */}
          {/* 탭 헤더 — 2탭 */}
          <div className="flex items-center gap-1 p-1 bg-white/40 border border-slate-200/30 rounded-xl">
            <button
              onClick={() => setRightTab("multimodal")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                rightTab === "multimodal"
                  ? "bg-emerald-50 text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-500"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              멀티모달 행동분석
            </button>
            <button
              onClick={() => setRightTab("transcript")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                rightTab === "transcript"
                  ? "bg-slate-100/60 text-emerald-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-500"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              대본
            </button>
          </div>

          {/* ── 멀티모달 행동분석 탭 ── */}
          {rightTab === "multimodal" && (
            mmResult ? (
              <div className="space-y-4 animate-fade-in-up">
                {/* ── 역량 구동 항목별 카드 (M1~M5) — 피드백 ① ── */}
                {mmResult.scoring.items.map((item, itemIdx) => {
                  const c = tierColorByScore(item.itemScore);
                  const scored = item.indicators.filter((i) => i.scoreReflected);
                  const refs = item.indicators.filter((i) => !i.scoreReflected);
                  return (
                    <div
                      key={item.id}
                      className={cn("rounded-xl p-5 border cursor-pointer hover:shadow-md transition-all", c.border, c.bg)}
                      onClick={() => {
                        const v = videoRef.current;
                        if (v && v.duration) seekTo((v.duration / mmResult.scoring.items.length) * itemIdx);
                      }}
                    >
                      {/* 헤더 */}
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">{item.channel}</span>
                          <span className="text-sm font-semibold text-slate-800 truncate">{item.name}</span>
                          {!item.totalReflected && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">보조 · 총점 미반영</span>
                          )}
                        </div>
                        {item.totalReflected && (
                          <span className={cn("text-sm font-mono font-bold px-2.5 py-1 rounded-lg shrink-0", c.chipBg)}>
                            {item.itemScore !== null ? `${item.itemScore.toFixed(1)}/9` : "N/A"}
                          </span>
                        )}
                      </div>

                      {/* 필수지표 게이지 (3색: 상위 teal · 중위 amber · 하위 red) */}
                      {scored.length > 0 && (
                        <div className="space-y-2">
                          {scored.map((ind) => {
                            const tc = tierColorByJudgment(ind.judgment);
                            const pct = ind.score !== null ? (ind.score / 3) * 100 : 0;
                            return (
                              <div key={ind.name}>
                                <div className="flex items-center justify-between text-[11px] mb-0.5">
                                  <span className="text-slate-600">{ind.label}</span>
                                  <span className="font-mono text-slate-700 font-semibold">{formatIndicatorValue(ind)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all", tc.bar)} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className={cn("text-[10px] font-medium w-8 text-right", tc.text)}>{ind.judgment}</span>
                                </div>
                                {ind.band && <p className="text-[9px] text-slate-400 mt-0.5">상위 기준: {ind.band.upper}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 참고지표 (미채점 — 피드백 ③) */}
                      {refs.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-200/40">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">참고지표 (미채점)</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {refs.map((ind) => (
                              <span key={ind.name} className="text-[11px] text-slate-500">
                                {ind.label}: <span className="font-mono">{formatIndicatorValue(ind)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI 관찰 소견 */}
                      {item.observation && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/30">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] uppercase tracking-wider text-emerald-600/70 font-medium">AI 관찰 소견</p>
                            {item.observation.length > 120 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedObs((prev) => { const n = new Set(prev); if (n.has(itemIdx)) n.delete(itemIdx); else n.add(itemIdx); return n; }); }}
                                className="text-[10px] text-emerald-600 hover:text-emerald-800 transition-colors min-h-[28px] min-w-[44px] flex items-center justify-center"
                              >
                                {expandedObs.has(itemIdx) ? "접기" : "더보기"}
                              </button>
                            )}
                          </div>
                          <p className={cn("text-sm text-slate-600 leading-relaxed bg-white/50 rounded-lg px-3 py-2", !expandedObs.has(itemIdx) && item.observation.length > 120 && "line-clamp-3")}>
                            {item.observation}
                          </p>
                        </div>
                      )}

                      {/* N/A 안내 → 코치 보정 유도 (피드백 ⑦) */}
                      {item.naCount > 0 && item.totalReflected && (
                        <p className="text-[11px] text-amber-600 mt-2 pt-2 border-t border-amber-200/40">
                          {item.naCount}개 필수지표 N/A — 화자분리·역할매핑 또는 화질·각도 한계 가능성. 상단 “화자·역할 보정”에서 평가 대상자를 지정 후 재분석을 권장합니다.
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Solar Pro 2 종합 보고서 */}
                {mmResult.report && (() => {
                  // 마크다운 → 구조화된 HTML 변환 (테이블, 섹션, 리스트 지원)
                  function renderReport(md: string): string {
                    let html = md
                      // XSS 방지
                      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
                      .replace(/\son\w+\s*=/gi, ' data-removed=');

                    // ── 마크다운 테이블 → HTML 테이블 ──
                    html = html.replace(
                      /(?:^|\n)((?:\|[^\n]+\|\n)+)/g,
                      (_match, tableBlock: string) => {
                        const rows = tableBlock.trim().split('\n').filter(r => r.trim());
                        if (rows.length < 2) return tableBlock;
                        // 구분선(|---|---| 등) 제거
                        const dataRows = rows.filter(r => !/^\|[\s-:|]+\|$/.test(r.trim()));
                        if (dataRows.length === 0) return '';
                        const headerCells = dataRows[0].split('|').filter(c => c.trim()).map(c => c.trim());
                        const bodyRows = dataRows.slice(1);
                        let table = '<div class="report-table-wrap"><table class="report-table">';
                        table += '<thead><tr>' + headerCells.map(c => `<th>${c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</th>`).join('') + '</tr></thead>';
                        table += '<tbody>';
                        bodyRows.forEach(row => {
                          const cells = row.split('|').filter(c => c.trim()).map(c => c.trim());
                          table += '<tr>' + cells.map(c => `<td>${c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</td>`).join('') + '</tr>';
                        });
                        table += '</tbody></table></div>';
                        return '\n' + table + '\n';
                      }
                    );

                    // ── 헤딩 (#### → h4, ### → h3, ## → h2) ──
                    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
                    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
                    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');

                    // ── 굵은 텍스트 ──
                    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

                    // ── 번호 목록 ──
                    html = html.replace(/((?:^\d+\.\s.*$\n?)+)/gm, (block) => {
                      const items = block.trim().split('\n').map(l => l.replace(/^\d+\.\s/, '').trim());
                      return '<ol>' + items.map(i => `<li>${i}</li>`).join('') + '</ol>';
                    });

                    // ── 불릿 목록 ──
                    html = html.replace(/((?:^[-*]\s.*$\n?)+)/gm, (block) => {
                      const items = block.trim().split('\n').map(l => l.replace(/^[-*]\s/, '').trim());
                      return '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
                    });

                    // ── 빈 줄이 아닌 일반 텍스트 → 단락 ──
                    html = html.replace(/^(?!<[houdtl])(.*\S.*)$/gm, '<p>$1</p>');

                    // ── 특수 표기 ──
                    html = html.replace(/※/g, '<span class="text-amber-600 font-medium">※</span>');

                    // ── 연속 빈 줄 정리 ──
                    html = html.replace(/\n{3,}/g, '\n\n');

                    return html;
                  }

                  return (
                    <div className="bg-white border border-slate-200/30 rounded-2xl overflow-hidden print:shadow-none" id="multimodal-report">
                      {/* 헤더 */}
                      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50 px-6 py-4 border-b border-slate-200/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-800">{mmResult.scoring.competencyLabel} 멀티모달 행동분석 종합보고서</h3>
                              <p className="text-[11px] text-slate-500">
                                핵심 4개 항목(M1~M4) 기반 · {mmResult.reportModel === "solar-pro2" ? "Solar Pro 2" : "로컬 템플릿"} 생성
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 print:hidden">
                            <button
                              onClick={handleExportReportPdf}
                              className="text-xs text-slate-500 hover:text-emerald-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors"
                            >
                              PDF 내보내기
                            </button>
                            <button
                              onClick={handleDownloadReport}
                              className="text-xs text-slate-500 hover:text-emerald-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors"
                            >
                              보고서 저장(HTML)
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(mmResult.report);
                                setCopyToast(true);
                                if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
                                copyTimerRef.current = setTimeout(() => setCopyToast(false), 2500);
                              }}
                              className="text-xs text-slate-500 hover:text-emerald-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors"
                            >
                              {copyToast ? "복사됨" : "복사"}
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* 본문 */}
                      <div
                        className="px-6 py-5 text-[13px] text-slate-700 leading-[1.9] max-w-none
                          [&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-emerald-100
                          [&_h3]:text-[14px] [&_h3]:font-bold [&_h3]:text-slate-700 [&_h3]:mt-5 [&_h3]:mb-2
                          [&_h4]:text-[13px] [&_h4]:font-semibold [&_h4]:text-emerald-700 [&_h4]:mt-4 [&_h4]:mb-1.5
                          [&_strong]:font-semibold [&_strong]:text-slate-800
                          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:my-3
                          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:my-3
                          [&_li]:text-[13px] [&_li]:text-slate-600 [&_li]:leading-relaxed
                          [&_p]:mb-2.5 [&_p]:leading-[1.9]
                          [&_.report-table-wrap]:my-4 [&_.report-table-wrap]:overflow-x-auto [&_.report-table-wrap]:rounded-lg [&_.report-table-wrap]:border [&_.report-table-wrap]:border-slate-200/50
                          [&_.report-table]:w-full [&_.report-table]:text-[12px]
                          [&_.report-table_th]:bg-slate-50 [&_.report-table_th]:text-left [&_.report-table_th]:px-3 [&_.report-table_th]:py-2 [&_.report-table_th]:font-semibold [&_.report-table_th]:text-slate-600 [&_.report-table_th]:border-b [&_.report-table_th]:border-slate-200/50
                          [&_.report-table_td]:px-3 [&_.report-table_td]:py-2 [&_.report-table_td]:text-slate-600 [&_.report-table_td]:border-b [&_.report-table_td]:border-slate-100"
                        dangerouslySetInnerHTML={{ __html: renderReport(mmResult.report) }}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : mmProgress.phase === "error" ? (
              <div className="bg-white border border-amber-200 rounded-xl p-6 text-center">
                <p className="text-base text-amber-600 mb-1">멀티모달 분석 오류</p>
                <p className="text-sm text-slate-400 mb-3">{mmError || "행동 신호 추출에 실패했습니다"}</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    뒤로 가기
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    다시 분석
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-emerald-200/30 rounded-xl p-8 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-3 text-emerald-400 animate-spin" />
                <p className="text-base text-emerald-600 mb-1">멀티모달 행동 분석 진행 중</p>
                <p className="text-sm text-slate-400">5채널 신호 추출 → 채점 → 보고서 생성</p>
              </div>
            )
          )}

          {/* ── 디브리핑 대본 탭 ── */}
          {rightTab === "transcript" && (
            <TranscriptTimeline
              videoId={videoId}
              currentTime={currentTime}
              chapters={chapters}
              onSeek={seekTo}
              transcriptSegments={transcriptSegments}
              loading={transcriptLoading}
            />
          )}

          {/* ── 섹션 E: [비활성] 평가 근거 카드 — 멀티모달+BARS로 대체됨 ── */}
          {false && evidenceByChapter.map(({ chapter, items }, ci) => (
            <div
              key={ci}
              className="space-y-3 animate-fade-in-up"
              style={{ animationDelay: `${ci * 80}ms`, animationFillMode: "backwards" }}
            >
              {/* 챕터 헤더 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100/60 flex items-center justify-center shrink-0">
                  <span className="text-sm font-mono font-bold text-slate-500">
                    {String(ci + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base text-slate-700 font-medium leading-tight truncate">
                    {chapter.title}
                  </p>
                  <p className="text-sm font-mono text-slate-400">
                    {formatTime(chapter.start)} — {formatTime(chapter.end)}
                  </p>
                </div>
                <div className="h-px flex-1 max-w-[60px] bg-slate-100/50 shrink-0" />
              </div>

              {/* 평가 근거 카드 */}
              {items.map((ev) => {
                const isActive = activeEvidenceId === ev.id;
                const isEvidencePlaying =
                  currentTime >= ev.timestamp && currentTime <= ev.endTime;
                const comp = COMP_MAP[ev.competencyKey];

                return (
                  <div
                    key={ev.id}
                    className={cn(
                      "ml-3.5 rounded-xl border-l-[3px] transition-all duration-200",
                      isActive
                        ? "bg-white border border-slate-200/50 shadow-lg shadow-slate-200/60"
                        : "bg-white/40 border border-transparent hover:bg-white/70 hover:border-slate-200/30",
                      isEvidencePlaying && !isActive && "ring-1 ring-emerald-500/20"
                    )}
                    style={{ borderLeftColor: comp?.color || "#14b8a6" }}
                  >
                    {/* 카드 헤더 */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEvidenceClick(ev)}
                      onKeyDown={(e) => e.key === "Enter" && handleEvidenceClick(ev)}
                      className="p-4 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-sm font-semibold tracking-wide"
                          style={{ color: comp?.color }}
                        >
                          {comp?.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {/* AI 추천 점수 뱃지 */}
                          {!isActive && ev.score === 0 && ev.aiScore > 0 && (
                            <span className="text-sm font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 flex items-center gap-0.5">
                              <Bot className="w-3 h-3" />
                              {ev.aiScore}
                            </span>
                          )}
                          {/* 확정 점수 뱃지 */}
                          {!isActive && ev.score > 0 && (
                            <span
                              className={cn(
                                "text-sm font-mono font-bold px-2 py-0.5 rounded-md",
                                ev.score >= 7
                                  ? "bg-emerald-50 text-emerald-600"
                                  : ev.score >= 5
                                    ? "bg-slate-500/15 text-slate-500"
                                    : "bg-amber-500/15 text-amber-600"
                              )}
                            >
                              {ev.score}/9
                            </span>
                          )}
                          {isEvidencePlaying && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 mb-2.5">{ev.criteriaLabel}</p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => handleTimestampReplay(e, ev.timestamp)}
                          className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-500/20 text-emerald-600 rounded-md px-2.5 py-1 text-sm font-mono transition-colors"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          {formatTime(ev.timestamp)}
                        </button>
                        <span className="text-sm text-slate-500">{ev.speaker}</span>
                        {/* 매칭 키워드 태그 (축약) */}
                        {ev.matchedKeywords.length > 0 && (
                          <span className="text-sm text-emerald-600/60 truncate max-w-[120px]">
                            {ev.matchedKeywords.slice(0, 2).join(", ")}
                          </span>
                        )}
                      </div>

                      {!isActive && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-1 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* 확장: 상세 + AI 추천 + 점수 + 피드백 */}
                    {isActive && (
                      <div className="px-4 pb-5 space-y-4 animate-fade-in-up">
                        <p className="text-base text-slate-700 leading-relaxed">
                          {ev.description}
                        </p>

                        {/* AI 분석 근거 */}
                        {ev.aiReasoning && (
                          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-sm text-emerald-600 flex items-center gap-1">
                                <Bot className="w-3 h-3" />
                                AI 분석 근거
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-emerald-600/70">
                                  신뢰도 {ev.aiConfidence}%
                                </span>
                                <span className="text-sm font-mono font-bold text-emerald-600">
                                  추천 {ev.aiScore}/9
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed">
                              {ev.aiReasoning}
                            </p>
                            {ev.score === 0 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); applyAIScore(ev.id); }}
                                className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-300 transition-colors"
                              >
                                <Wand2 className="w-3 h-3" />
                                AI 추천 점수 적용
                              </button>
                            )}
                          </div>
                        )}

                        {/* 점수 선택 */}
                        <div>
                          <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">
                            평가 (9점 척도)
                          </p>
                          <ScoreSelector
                            value={ev.score}
                            aiScore={ev.aiScore}
                            onChange={(s) => updateScore(ev.id, s)}
                          />
                        </div>

                        {/* 피드백 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm uppercase tracking-wider text-slate-400">
                              피드백
                            </p>
                            {!ev.feedback && ev.autoFeedback && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateFeedback(ev.id, ev.autoFeedback);
                                }}
                                className="text-sm text-emerald-600 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                              >
                                <Wand2 className="w-3 h-3" />
                                AI 피드백 채우기
                              </button>
                            )}
                          </div>
                          <textarea
                            value={ev.feedback}
                            onChange={(e) => updateFeedback(ev.id, e.target.value)}
                            placeholder={ev.autoFeedback ? `AI 추천: ${ev.autoFeedback.slice(0, 60)}...` : "이 장면에 대한 피드백을 작성하세요..."}
                            className="w-full bg-slate-50/60 border border-slate-200/40 rounded-lg px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/15 transition-all resize-none leading-relaxed"
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
