"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  PlayCircle,
  Sparkles,
  Save,
  FileText,
  ClipboardList,
  BarChart3,
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
  generateAnalysisReport,
} from "@/lib/leadership-analysis";
import type { AnalysisReportData } from "@/lib/leadership-analysis";
import { useMultimodalPipeline } from "@/hooks/useMultimodalPipeline";
import TranscriptTimeline from "./TranscriptTimeline";
import AnalysisReport from "./AnalysisReport";
import type { Chapter, Highlight, LeadershipCompetencyKey } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

interface LeadershipFeedbackProps {
  videoId: string;
  videoTitle: string;
  videoUrl?: string;
  selectedCompetencies?: LeadershipCompetencyKey[];
  scenarioText?: string;
  onBack: () => void;
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
  { phase: 5, label: "BARS 역량 매칭", desc: "내용 기준 역량을 평가합니다", icon: ClipboardList },
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
                  ? "bg-teal-100 text-teal-700 border border-teal-300"
                  : tier === "slate"
                    ? "bg-slate-100 text-slate-700 border border-slate-300"
                    : "bg-amber-100 text-amber-700 border border-amber-300"
                : isAiSuggested
                  ? "bg-violet-500/15 text-violet-600 border border-violet-500/30 ring-1 ring-violet-500/20"
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
            value >= 7 ? "text-teal-600" : value >= 5 ? "text-slate-500" : "text-amber-600"
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
  onBack,
}: LeadershipFeedbackProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 분석 데이터
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [summary, setSummary] = useState("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisPhase, setAnalysisPhase] = useState(0); // 0=대기, 1=인덱싱, 2=챕터, 3=하이라이트, 4=요약, 5=매칭, 6=완료

  // 평가 근거
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  // 멀티모달 파이프라인
  const { progress: mmProgress, result: mmResult, error: mmError, runPipeline } = useMultimodalPipeline();
  const [mmStarted, setMmStarted] = useState(false);

  // 단계별 완료 시각 기록 (로딩 스켈레톤 UX)
  const [phaseTimestamps, setPhaseTimestamps] = useState<PhaseTimestamps>({});

  // 재생
  const [currentTime, setCurrentTime] = useState(0);
  const [, setIsPlaying] = useState(false);

  // UI
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // 우측 패널 탭 — 멀티모달 기본
  const [rightTab, setRightTab] = useState<"evidence" | "transcript" | "report" | "multimodal">("multimodal");

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
        // 0단계: 인덱싱 완료 대기
        setAnalysisPhase(1);
        setAnalysisStep("영상 인덱싱 중... (AI가 영상을 이해하고 있습니다)");
        const ready = await waitForIndexing();
        if (cancelled) return;
        if (!ready) {
          setAnalysisStep("인덱싱 상태 확인 불가 — 분석을 시도합니다...");
          await new Promise((r) => setTimeout(r, 1000));
        }

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
        if (summaryText) setSummary(summaryText);

        // ═══════════════════════════════════════════
        // 4단계: 내용 기반 역량 매칭 + AI 자동 스코어링
        // (기존 라운드-로빈 → 지능형 매칭으로 완전 교체)
        // ═══════════════════════════════════════════
        setAnalysisPhase(5);
        setAnalysisStep("AI 역량 매칭 및 자동 평가 중...");
        const competencyKeys: LeadershipCompetencyKey[] = selectedCompetencies && selectedCompetencies.length > 0
          ? selectedCompetencies
          : ["visionPresentation", "trustBuilding", "memberDevelopment", "rationalDecision"];
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

        if (generatedEvidence.length > 0) setEvidence(generatedEvidence);
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

  // ── 멀티모달 파이프라인 자동 시작 (BARS 분석 완료 후) ──
  useEffect(() => {
    if (!analysisLoading && analysisPhase >= 6 && !mmStarted && videoId) {
      setMmStarted(true);
      const compLabel = competencyKeysToUse.map((k) => COMP_MAP[k]?.label).filter(Boolean).join(", ");
      runPipeline(videoId, compLabel, scenarioText);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisLoading, analysisPhase, mmStarted, videoId]);

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
    localStorage.setItem(
      `evidence-${videoId}`,
      JSON.stringify({ videoId, videoTitle, evidence, savedAt: new Date().toISOString() })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [videoId, videoTitle, evidence]);

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

  // 종합 리포트 데이터
  const reportData: AnalysisReportData | null = useMemo(() => {
    if (evidence.length === 0) return null;
    return generateAnalysisReport(
      evidence.map((e) => ({
        competencyKey: e.competencyKey,
        score: e.score,
        feedback: e.feedback,
        description: e.description,
        aiScore: e.aiScore,
        timestamp: e.timestamp,
      })),
      summary,
      selectedCompetencies && selectedCompetencies.length > 0
        ? selectedCompetencies
        : ["visionPresentation", "trustBuilding", "memberDevelopment", "rationalDecision"]
    );
  }, [evidence, summary, selectedCompetencies]);

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
      : ["visionPresentation", "trustBuilding", "memberDevelopment", "rationalDecision"] as LeadershipCompetencyKey[],
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
  const isFullyLoading = analysisLoading || (mmStarted && mmProgress.phase !== "done" && mmProgress.phase !== "error");
  if (isFullyLoading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 py-12 animate-slide-in-right">
        {/* 뒤로가기 */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-base text-slate-500 hover:text-teal-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          역량진단으로 돌아가기
        </button>

        {/* 영상 정보 */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-teal-600 animate-pulse" />
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
                      <CheckCircle2 className="w-6 h-6 text-teal-500" />
                    ) : isCurrent ? (
                      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  {/* 텍스트 */}
                  <div className="flex-1">
                    <p className={cn(
                      "text-base font-medium transition-colors",
                      isDone ? "text-teal-600" : isCurrent ? "text-slate-800" : "text-slate-400"
                    )}>
                      {step.label}
                      {isDone && (
                        <span className="text-sm text-teal-500 ml-2">
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
                className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min((effectivePhase / 9) * 100, 98)}%` }}
              />
            </div>
          </div>

          {/* 상황사례 표시 */}
          {scenarioText && (
            <div className="mt-6 pt-6 border-t border-slate-200/30">
              <p className="text-sm text-slate-500 mb-1 font-medium">상황사례</p>
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{scenarioText}</p>
            </div>
          )}
        </div>

        {/* 에러 표시 */}
        {analysisError && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700 font-medium mb-1">분석 중 오류 발생</p>
            <p className="text-sm text-amber-600">{analysisError}</p>
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
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-base text-slate-500 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            역량진단
          </button>
          <span className="text-slate-400">/</span>
          <h2 className="text-lg font-bold text-teal-600">영상 리뷰 &amp; 피드백</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* AI 추천 일괄 적용 */}
          {unscoredCount > 0 && (
            <button
              onClick={applyAllAIScores}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium transition-all duration-200 bg-violet-50 text-violet-600 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/30"
            >
              <Wand2 className="w-4 h-4" />
              AI 추천 적용 ({unscoredCount}건)
            </button>
          )}
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium transition-all duration-200",
              saved
                ? "bg-teal-50 text-teal-600 border border-teal-500/30"
                : "bg-white text-slate-700 border border-slate-200 hover:border-teal-500/30 hover:text-teal-600"
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

      {/* ── 2단 레이아웃 (리포트 중심) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── 섹션 C: 좌측 — 영상 플레이어 + 챕터 + 요약 ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 lg:self-start space-y-4">
          {/* 영상 플레이어 */}
          <div className="rounded-2xl overflow-hidden border border-slate-200/40 bg-black shadow-2xl shadow-slate-200/60">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full aspect-video bg-black"
              aria-label="토론 영상"
            />
          </div>

          {/* 챕터 타임라인 (챕터가 있을 때만) */}
          {chapters.length > 0 && (
            <div className="bg-white/60 border border-slate-200/40 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-500 font-medium">챕터</span>
                {currentChapterIndex >= 0 && (
                  <span className="text-xs text-teal-600 truncate">{chapters[currentChapterIndex]?.title}</span>
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
                          ? "bg-teal-500"
                          : currentTime >= ch.end
                            ? "bg-teal-500/30"
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

          {/* 분석 에러 */}
          {analysisError && (
            <div className="bg-white/40 border border-amber-500/20 rounded-xl p-4">
              <p className="text-sm text-amber-600 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                분석 결과를 불러오지 못했습니다
              </p>
              <p className="text-sm text-slate-500">{analysisError}</p>
              <p className="text-sm text-slate-400 mt-2">영상 인덱싱이 완료된 후 다시 시도해 주세요</p>
            </div>
          )}

          {/* AI 요약 + 하이라이트 */}
          {!analysisLoading && (summary || highlights.length > 0) && (
            <div className="bg-white/40 border border-slate-200/30 rounded-xl p-4 space-y-3 animate-fade-in-up">
              {summary && (
                <div>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-500/60" />
                    AI 분석 요약
                  </p>
                  <p className="text-base text-slate-500 leading-relaxed">{summary}</p>
                </div>
              )}
              {highlights.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {highlights.map((hl, i) => (
                    <button
                      key={i}
                      onClick={() => seekTo(hl.start)}
                      className="inline-flex items-center gap-1.5 bg-slate-100/50 hover:bg-teal-50 border border-slate-200/40 hover:border-teal-500/20 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-teal-600 transition-all"
                    >
                      <PlayCircle className="w-3 h-3" />
                      <span className="font-mono">{formatTime(hl.start)}</span>
                      <span className="max-w-[180px] truncate">{hl.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 섹션 D: 우측 — 탭 전환 (멀티모달 / BARS / 대본) ── */}
        <div className="lg:col-span-7 space-y-5">
          {/* 탭 헤더 — 3탭 */}
          <div className="flex items-center gap-1 p-1 bg-white/40 border border-slate-200/30 rounded-xl">
            <button
              onClick={() => setRightTab("multimodal")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                rightTab === "multimodal"
                  ? "bg-violet-50 text-violet-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-500"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              멀티모달 분석
            </button>
            <button
              onClick={() => setRightTab("report")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                rightTab === "report"
                  ? "bg-slate-100/60 text-teal-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-500"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              BARS 리포트
            </button>
            <button
              onClick={() => setRightTab("transcript")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                rightTab === "transcript"
                  ? "bg-slate-100/60 text-teal-600 shadow-sm"
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
                {/* 총점 */}
                <div className="bg-violet-50/50 border border-violet-500/15 rounded-xl p-5 text-center">
                  <p className="text-sm text-violet-600 font-medium mb-1">멀티모달 행동기반 총점</p>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-3xl font-bold font-mono text-violet-600">
                      {mmResult.scoring.totalScore !== null ? mmResult.scoring.totalScore.toFixed(1) : "—"}
                    </span>
                    <span className="text-base text-slate-400">/9</span>
                  </div>
                  <p className="text-sm text-violet-500 mt-1">{mmResult.scoring.interpretation}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {mmResult.scoring.scorableItemCount}/5개 항목 채점 · {mmResult.reportModel === "solar-pro2" ? "Solar Pro 2" : "로컬"} 생성
                  </p>
                  {/* 산출 보류 시 안내 */}
                  {mmResult.scoring.totalScore === null && (
                    <div className="mt-3 pt-3 border-t border-violet-200/30">
                      <p className="text-xs text-amber-600 font-medium">
                        3개 이상 항목이 채점되어야 총점을 산출할 수 있습니다 (현재 {mmResult.scoring.scorableItemCount}개 채점됨)
                      </p>
                      {/* 채점된 항목들의 개별 점수 표시 */}
                      {mmResult.scoring.scorableItemCount > 0 && (
                        <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                          {mmResult.scoring.items
                            .filter((item) => item.itemScore !== null)
                            .map((item) => (
                              <span key={item.id} className="inline-flex items-center gap-1 text-xs">
                                <span className="text-slate-500">{item.name}</span>
                                <span className={cn(
                                  "font-mono font-bold px-1.5 py-0.5 rounded",
                                  item.itemScore !== null && item.itemScore >= 7 ? "bg-teal-50 text-teal-600" :
                                  item.itemScore !== null && item.itemScore >= 5 ? "bg-amber-50 text-amber-600" :
                                  "bg-red-50 text-red-500"
                                )}>
                                  {item.itemScore!.toFixed(1)}
                                </span>
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 항목별 점수 */}
                {mmResult.scoring.items.map((item, itemIdx) => (
                  <div
                    key={item.id}
                    className="bg-white/60 border border-slate-200/30 rounded-xl p-4 border-l-[3px] border-l-violet-400 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => {
                      // 항목 인덱스에 따라 영상 위치 이동 (균등 분할)
                      const videoEl = videoRef.current;
                      if (videoEl && videoEl.duration) {
                        const segmentDuration = videoEl.duration / 5;
                        seekTo(segmentDuration * itemIdx);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-violet-600">{item.name}</span>
                        <span className="text-xs text-slate-400 ml-2">{item.channel}</span>
                      </div>
                      <span className={cn(
                        "text-sm font-mono font-bold px-2 py-0.5 rounded",
                        item.itemScore !== null && item.itemScore >= 7 ? "bg-teal-50 text-teal-600" :
                        item.itemScore !== null && item.itemScore >= 5 ? "bg-amber-50 text-amber-600" :
                        item.itemScore !== null ? "bg-red-50 text-red-500" :
                        "bg-slate-100 text-slate-400"
                      )}>
                        {item.itemScore !== null ? `${item.itemScore.toFixed(1)}/9` : "N/A"}
                      </span>
                    </div>
                    {/* 하위지표 */}
                    <div className="space-y-1">
                      {item.indicators.map((ind) => (
                        <div
                          key={ind.name}
                          className={cn(
                            "flex items-center gap-2 text-xs rounded-md px-1.5 py-1 -mx-1.5 transition-colors",
                            ind.judgment === "미흡" && "bg-red-50/60 ring-1 ring-red-200/40",
                            ind.judgment === "상위" && "bg-teal-50/60 ring-1 ring-teal-200/40"
                          )}
                        >
                          <span className={cn(
                            "flex-1 truncate",
                            ind.judgment === "미흡" ? "text-red-600 font-medium" :
                            ind.judgment === "상위" ? "text-teal-700 font-medium" :
                            "text-slate-500"
                          )}>
                            {ind.label}
                          </span>
                          <span className={cn(
                            "font-mono w-14 text-right",
                            ind.judgment === "미흡" ? "text-red-500" :
                            ind.judgment === "상위" ? "text-teal-600" :
                            "text-slate-500"
                          )}>
                            {ind.value !== null ? ind.value.toFixed(2) : "—"}
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded font-medium w-10 text-center",
                            ind.judgment === "상위" ? "bg-teal-100 text-teal-700" :
                            ind.judgment === "중상" ? "bg-sky-50 text-sky-600" :
                            ind.judgment === "중하" ? "bg-amber-50 text-amber-600" :
                            ind.judgment === "미흡" ? "bg-red-100 text-red-600" :
                            "bg-slate-100 text-slate-400"
                          )}>
                            {ind.judgment}
                          </span>
                        </div>
                      ))}
                    </div>
                    {item.observation && (
                      <div className="mt-2.5 pt-2.5 border-t border-violet-100/50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] uppercase tracking-wider text-violet-500/70 font-medium">AI 관찰 소견</p>
                          {item.observation.length > 120 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedObs((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(itemIdx)) next.delete(itemIdx);
                                  else next.add(itemIdx);
                                  return next;
                                });
                              }}
                              className="text-[10px] text-violet-500 hover:text-violet-700 transition-colors min-h-[28px] min-w-[44px] flex items-center justify-center"
                              aria-label={expandedObs.has(itemIdx) ? "관찰 소견 접기" : "관찰 소견 펼치기"}
                            >
                              {expandedObs.has(itemIdx) ? "접기" : "더보기"}
                            </button>
                          )}
                        </div>
                        <p className={cn(
                          "text-sm text-slate-600 leading-relaxed bg-violet-50/30 rounded-lg px-3 py-2",
                          !expandedObs.has(itemIdx) && item.observation.length > 120 && "line-clamp-3"
                        )}>
                          {item.observation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Solar Pro 2 보고서 (마크다운 렌더링) */}
                {mmResult.report && (
                  <div className="bg-white border border-slate-200/30 rounded-xl p-5 print:shadow-none" id="multimodal-report">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                        AI 종합 보고서
                        {mmResult.reportModel === "solar-pro2" && (
                          <span className="text-xs bg-violet-50 text-violet-500 px-1.5 py-0.5 rounded">Solar Pro 2</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 print:hidden">
                        <button
                          onClick={() => window.print()}
                          className="text-xs text-slate-500 hover:text-teal-600 px-2 py-1 rounded border border-slate-200 hover:border-teal-300 transition-colors"
                        >
                          PDF 내보내기
                        </button>
                        <button
                          onClick={() => {
                            const text = mmResult.report;
                            navigator.clipboard.writeText(text);
                            alert("보고서가 클립보드에 복사되었습니다. 메일이나 메시지에 붙여넣기하세요.");
                          }}
                          className="text-xs text-slate-500 hover:text-teal-600 px-2 py-1 rounded border border-slate-200 hover:border-teal-300 transition-colors"
                        >
                          복사 & 공유
                        </button>
                      </div>
                    </div>
                    <div
                      className="text-sm text-slate-700 leading-[1.8] max-w-none
                        [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:border-slate-200/50 [&_h2]:pb-1
                        [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-700 [&_h3]:mt-4 [&_h3]:mb-1.5
                        [&_strong]:font-semibold [&_strong]:text-slate-800
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2
                        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2
                        [&_li]:text-sm [&_li]:text-slate-600
                        [&_p]:mb-2
                        [&_hr]:my-3 [&_hr]:border-slate-200/50"
                      dangerouslySetInnerHTML={{
                        __html: mmResult.report
                          // XSS 방지: script/iframe/on* 이벤트 핸들러 제거
                          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                          .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
                          .replace(/\son\w+\s*=/gi, ' data-removed=')
                          // 마크다운 → HTML 변환
                          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/^\* (.*$)/gm, '<li>$1</li>')
                          .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
                          .replace(/(<li>.*<\/li>\n?)+/g, (match) =>
                            match.includes('1.') ? `<ol>${match}</ol>` : `<ul>${match}</ul>`
                          )
                          .replace(/^(?!<[hulo])(.*\S.*)$/gm, '<p>$1</p>')
                          .replace(/\n{2,}/g, '<hr/>')
                          .replace(/※/g, '<span class="text-amber-600">※</span>')
                      }}
                    />
                  </div>
                )}
              </div>
            ) : mmProgress.phase === "error" ? (
              <div className="bg-white border border-amber-200 rounded-xl p-6 text-center">
                <p className="text-base text-amber-600 mb-1">멀티모달 분석 오류</p>
                <p className="text-sm text-slate-400">{mmError || "행동 신호 추출에 실패했습니다"}</p>
              </div>
            ) : (
              <div className="bg-white border border-violet-200/30 rounded-xl p-8 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-3 text-violet-400 animate-spin" />
                <p className="text-base text-violet-600 mb-1">멀티모달 행동 분석 진행 중</p>
                <p className="text-sm text-slate-400">5채널 신호 추출 → 채점 → 보고서 생성</p>
              </div>
            )
          )}

          {/* ── 종합 리포트 탭 ── */}
          {rightTab === "report" && (
            reportData ? (
              <AnalysisReport data={reportData} onSeek={seekTo} />
            ) : (
              <div className="bg-white border border-slate-200/30 rounded-xl p-8 text-center space-y-4">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-base text-slate-500 mb-1">
                  {analysisError ? "분석 중 오류 발생" : "리포트 데이터 없음"}
                </p>
                <p className="text-sm text-slate-400">
                  {analysisError
                    ? analysisError
                    : evidence.length === 0
                      ? "영상 분석에서 챕터/하이라이트를 추출하지 못했습니다."
                      : "평가 근거 탭에서 점수를 입력하면 리포트에 반영됩니다."}
                </p>
                {/* 분석 상태 디버그 */}
                <div className="text-xs text-slate-400 font-mono space-y-0.5 pt-2 border-t border-slate-100">
                  <p>챕터: {chapters.length}개 · 하이라이트: {highlights.length}개 · 요약: {summary ? "있음" : "없음"}</p>
                  <p>평가근거: {evidence.length}개 · 전사: {transcriptSegments?.length || 0}개</p>
                </div>
                {/* AI 추천 일괄 적용 버튼 */}
                {evidence.length > 0 && unscoredCount > 0 && (
                  <button
                    onClick={() => { applyAllAIScores(); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-50 text-violet-600 border border-violet-500/20 hover:bg-violet-500/20 transition-all"
                  >
                    <Wand2 className="w-4 h-4" />
                    AI 추천 점수 적용하여 리포트 생성
                  </button>
                )}
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
                      isEvidencePlaying && !isActive && "ring-1 ring-teal-500/20"
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
                            <span className="text-sm font-mono px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 flex items-center gap-0.5">
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
                                  ? "bg-teal-50 text-teal-600"
                                  : ev.score >= 5
                                    ? "bg-slate-500/15 text-slate-500"
                                    : "bg-amber-500/15 text-amber-600"
                              )}
                            >
                              {ev.score}/9
                            </span>
                          )}
                          {isEvidencePlaying && (
                            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 mb-2.5">{ev.criteriaLabel}</p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => handleTimestampReplay(e, ev.timestamp)}
                          className="inline-flex items-center gap-1 bg-teal-50 hover:bg-teal-500/20 text-teal-600 rounded-md px-2.5 py-1 text-sm font-mono transition-colors"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          {formatTime(ev.timestamp)}
                        </button>
                        <span className="text-sm text-slate-500">{ev.speaker}</span>
                        {/* 매칭 키워드 태그 (축약) */}
                        {ev.matchedKeywords.length > 0 && (
                          <span className="text-sm text-violet-600/60 truncate max-w-[120px]">
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
                          <div className="bg-violet-500/5 border border-violet-500/15 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-sm text-violet-600 flex items-center gap-1">
                                <Bot className="w-3 h-3" />
                                AI 분석 근거
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-violet-600/70">
                                  신뢰도 {ev.aiConfidence}%
                                </span>
                                <span className="text-sm font-mono font-bold text-violet-600">
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
                                className="mt-2 flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-300 transition-colors"
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
                                className="text-sm text-violet-600 hover:text-violet-300 flex items-center gap-1 transition-colors"
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
                            className="w-full bg-slate-50/60 border border-slate-200/40 rounded-lg px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 transition-all resize-none leading-relaxed"
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
