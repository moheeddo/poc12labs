"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  PlayCircle,
  Clock,
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
import SearchBar from "@/components/shared/SearchBar";
import TranscriptTimeline from "./TranscriptTimeline";
import AnalysisReport from "./AnalysisReport";
import type { Chapter, Highlight, SearchResult, LeadershipCompetencyKey } from "@/lib/types";
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
              "w-6 h-6 rounded-md text-sm font-mono font-semibold transition-all duration-150",
              filled
                ? tier === "teal"
                  ? "bg-teal-500/25 text-teal-300 border border-teal-500/40"
                  : tier === "slate"
                    ? "bg-slate-500/25 text-slate-700 border border-slate-500/40"
                    : "bg-amber-500/25 text-amber-300 border border-amber-500/40"
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

  // 재생
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // UI
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // 우측 패널 탭 — 리포트 기본
  const [rightTab, setRightTab] = useState<"evidence" | "transcript" | "report">("report");

  // 검색
  const { results: searchResults, loading: searchLoading, search } = useVideoSearch();
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

  // ── 비디오 시간 추적 ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  // ── 핸들러 ──
  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (v) { v.currentTime = time; v.play(); }
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
  }, []);

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

  const handleSearch = useCallback(
    (query: string) => search(TWELVELABS_INDEXES.leadership, query),
    [search]
  );

  // ── 계산값 ──
  const currentChapterIndex = useMemo(
    () => chapters.findIndex((ch) => currentTime >= ch.start && currentTime < ch.end),
    [chapters, currentTime]
  );

  const evidenceByChapter = useMemo(
    () => chapters.map((ch, i) => ({ chapter: ch, items: evidence.filter((e) => e.chapterIndex === i) })),
    [chapters, evidence]
  );

  const scoredCount = useMemo(() => evidence.filter((e) => e.score > 0).length, [evidence]);

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
      })),
      summary,
      selectedCompetencies && selectedCompetencies.length > 0
        ? selectedCompetencies
        : ["visionPresentation", "trustBuilding", "memberDevelopment", "rationalDecision"]
    );
  }, [evidence, summary]);

  // 미평가 항목 수
  const unscoredCount = evidence.filter((e) => e.score === 0).length;

  // 분석 단계 정의
  const ANALYSIS_STEPS = [
    { phase: 1, label: "영상 인덱싱", desc: "AI가 영상 내용을 이해하고 있습니다" },
    { phase: 2, label: "구간 분석", desc: "영상을 의미 있는 챕터로 분할합니다" },
    { phase: 3, label: "핵심 장면 추출", desc: "중요한 하이라이트를 찾고 있습니다" },
    { phase: 4, label: "AI 요약", desc: "전체 내용을 요약하고 있습니다" },
    { phase: 5, label: "역량 매칭 & 평가", desc: "루브릭 기준으로 역량을 평가합니다" },
  ];

  const competencyKeysToUse = selectedCompetencies && selectedCompetencies.length > 0
    ? selectedCompetencies
    : (["visionPresentation", "trustBuilding", "memberDevelopment", "rationalDecision"] as LeadershipCompetencyKey[]);

  // ── JSX ──

  // ═══════════════════════════════════════
  // 분석 중 → 전체 화면 진행 상태
  // ═══════════════════════════════════════
  if (analysisLoading) {
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
              const isDone = analysisPhase > step.phase;
              const isCurrent = analysisPhase === step.phase;
              const isPending = analysisPhase < step.phase;

              return (
                <div key={step.phase} className="flex items-start gap-4">
                  {/* 아이콘 */}
                  <div className="shrink-0 mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-teal-500" />
                    ) : isCurrent ? (
                      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-200" />
                    )}
                  </div>
                  {/* 텍스트 */}
                  <div className="flex-1">
                    <p className={cn(
                      "text-base font-medium transition-colors",
                      isDone ? "text-teal-600" : isCurrent ? "text-slate-800" : "text-slate-400"
                    )}>
                      {step.label}
                      {isDone && <span className="text-sm text-teal-500 ml-2">완료</span>}
                    </p>
                    <p className={cn(
                      "text-sm mt-0.5 transition-colors",
                      isCurrent ? "text-slate-500" : "text-slate-400"
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
              <span className="font-mono">{Math.min(Math.round((analysisPhase / 6) * 100), 95)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min((analysisPhase / 6) * 100, 95)}%` }}
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

  // ═══════════════════════════════════════
  // 분석 완료 → 결과 뷰
  // ═══════════════════════════════════════
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
      <p className="text-base text-slate-700 mb-2">{videoTitle}</p>

      {/* 선택된 역량 + 상황사례 표시 */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {competencyKeysToUse.map((key) => {
          const comp = COMP_MAP[key];
          return comp ? (
            <span
              key={key}
              className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: `${comp.color}15`, color: comp.color }}
            >
              {comp.label}
            </span>
          ) : null;
        })}
      </div>
      {scenarioText && (
        <div className="bg-slate-50/60 border border-slate-200/30 rounded-xl p-4 mb-8">
          <p className="text-sm text-slate-500 mb-1 font-medium">상황사례</p>
          <p className="text-base text-slate-600 leading-relaxed whitespace-pre-line">{scenarioText}</p>
        </div>
      )}
      {!scenarioText && <div className="mb-4" />}

      {/* ── 2단 레이아웃 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ─── 좌측: 영상 + 컨트롤 ─── */}
        <div className="lg:col-span-7 lg:sticky lg:top-6 lg:self-start space-y-5">
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

          {/* 재생 컨트롤 + 챕터 타임라인 */}
          <div className="bg-white/60 border border-slate-200/40 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-500/25 transition-colors shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <span className="text-base font-mono text-slate-700 tabular-nums min-w-[48px]">
                {formatTime(currentTime)}
              </span>
              {currentChapterIndex >= 0 && (
                <span className="text-base text-teal-600/80 truncate">
                  {chapters[currentChapterIndex]?.title}
                </span>
              )}
            </div>
            {chapters.length > 0 && (
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
            )}
          </div>

          {/* 검색 */}
          <SearchBar
            placeholder="토론 장면 검색 — 반박 발언, 리더십 발휘, 코칭 사례..."
            onSearch={handleSearch}
            loading={searchLoading}
            accentColor="teal"
            suggestions={["반박 발언", "비전 발표", "갈등 조율", "코칭 피드백"]}
          />

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="bg-white/60 border border-slate-200/40 rounded-xl p-4 space-y-1 animate-fade-in-up">
              <p className="text-sm text-slate-500 mb-2">검색 결과 {searchResults.length}건</p>
              {searchResults.map((r: SearchResult, i: number) => (
                <button
                  key={i}
                  onClick={() => seekTo(r.start)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100/50 transition-colors group"
                >
                  <span className="inline-flex items-center gap-1 text-teal-600 font-mono text-sm shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime(r.start)}
                  </span>
                  <span className="text-base text-slate-500 group-hover:text-slate-700 truncate flex-1">
                    {r.text || r.videoTitle}
                  </span>
                  <span className="text-sm font-mono text-slate-400">
                    {(r.confidence * 100).toFixed(0)}%
                  </span>
                </button>
              ))}
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

        {/* ─── 우측: 평가 근거 / 디브리핑 대본 / 종합 리포트 ─── */}
        <div className="lg:col-span-5 space-y-6">
          {/* 탭 헤더 — 3탭 */}
          <div className="flex items-center gap-1 p-1 bg-white/40 border border-slate-200/30 rounded-xl">
            <button
              onClick={() => setRightTab("evidence")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-base font-medium transition-all",
                rightTab === "evidence"
                  ? "bg-slate-100/60 text-teal-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-500"
              )}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">평가 근거</span>
              <span className="text-sm font-mono opacity-60">{scoredCount}/{evidence.length}</span>
            </button>
            <button
              onClick={() => setRightTab("report")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-base font-medium transition-all",
                rightTab === "report"
                  ? "bg-slate-100/60 text-teal-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-500"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">종합 리포트</span>
            </button>
            <button
              onClick={() => setRightTab("transcript")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-base font-medium transition-all",
                rightTab === "transcript"
                  ? "bg-slate-100/60 text-teal-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-500"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">대본</span>
            </button>
          </div>

          {/* ── 종합 리포트 탭 ── */}
          {rightTab === "report" && (
            reportData ? (
              <AnalysisReport data={reportData} />
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

          {/* ── 평가 근거 탭 ── */}
          {rightTab === "evidence" && evidence.length === 0 && !analysisLoading && (
            <div className="bg-white/40 border border-slate-200/30 rounded-xl p-8 text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-400" />
              <p className="text-base text-slate-500 mb-1">평가 근거 없음</p>
              <p className="text-sm text-slate-400">AI 분석이 완료되면 챕터별 평가 근거가 자동 생성됩니다</p>
            </div>
          )}
          {rightTab === "evidence" && evidenceByChapter.map(({ chapter, items }, ci) => (
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
                const displayScore = ev.score > 0 ? ev.score : ev.aiScore;

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
