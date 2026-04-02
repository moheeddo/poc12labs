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
} from "lucide-react";
import { useVideoSearch, useVideoAnalysis, useVideoTranscription } from "@/hooks/useTwelveLabs";
import { TWELVELABS_INDEXES, LEADERSHIP_COMPETENCY_DEFS } from "@/lib/constants";
import SearchBar from "@/components/shared/SearchBar";
import TranscriptTimeline from "./TranscriptTimeline";
import type { Chapter, Highlight, SearchResult, LeadershipCompetencyKey } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

interface LeadershipFeedbackProps {
  videoId: string;
  videoTitle: string;
  videoUrl?: string;
  onBack: () => void;
}

// 평가 근거 항목 — 영상 타임스탬프 + 역량 기준 연결
interface EvidenceItem {
  id: string;
  chapterIndex: number;
  competencyKey: LeadershipCompetencyKey;
  criteriaLabel: string;
  timestamp: number;
  endTime: number;
  description: string;
  speaker: string;
  score: number;
  feedback: string;
}

// 역량 정보 빠른 조회
const COMP_MAP = Object.fromEntries(
  LEADERSHIP_COMPETENCY_DEFS.map((d) => [d.key, d])
) as Record<LeadershipCompetencyKey, (typeof LEADERSHIP_COMPETENCY_DEFS)[number]>;

// (데모 데이터 제거됨 — TwelveLabs API 분석 결과로 채워짐)

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
function ScoreSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const filled = n <= value;
        const tier = value >= 7 ? "teal" : value >= 5 ? "slate" : "amber";
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "w-6 h-6 rounded-md text-[10px] font-mono font-semibold transition-all duration-150",
              filled
                ? tier === "teal"
                  ? "bg-teal-500/25 text-teal-300 border border-teal-500/40"
                  : tier === "slate"
                    ? "bg-slate-500/25 text-slate-300 border border-slate-500/40"
                    : "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                : "bg-surface-900/50 text-slate-600 border border-surface-700/50 hover:border-surface-600 hover:text-slate-400"
            )}
          >
            {n}
          </button>
        );
      })}
      {value > 0 && (
        <span
          className={cn(
            "text-xs font-medium ml-2 tabular-nums",
            value >= 7 ? "text-teal-400" : value >= 5 ? "text-slate-400" : "text-amber-400"
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
  onBack,
}: LeadershipFeedbackProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 분석 데이터 (TwelveLabs API 결과로 채워짐)
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [summary, setSummary] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(true);

  // 평가 근거
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  // 재생
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // UI
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // 우측 패널 탭
  const [rightTab, setRightTab] = useState<"evidence" | "transcript">("evidence");

  // 검색
  const { results: searchResults, loading: searchLoading, search } = useVideoSearch();
  const { analyze } = useVideoAnalysis();
  const { segments: transcriptSegments, loading: transcriptLoading, fetchTranscription } = useVideoTranscription();

  // ── 분석 데이터 로드 ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setAnalysisLoading(true);
      try {
        const [ch, hl, sm] = await Promise.all([
          analyze(videoId, "chapter"),
          analyze(videoId, "highlight"),
          analyze(videoId, "summary"),
        ]);
        if (cancelled) return;
        const parsed: Chapter[] = Array.isArray(ch)
          ? ch.map((c: Record<string, unknown>) => ({
              title: (c.chapter_title as string) || (c.title as string) || "구간",
              start: c.start as number,
              end: c.end as number,
            }))
          : [];
        if (parsed.length > 0) setChapters(parsed);
        const parsedHl: Highlight[] = Array.isArray(hl)
          ? hl.map((h: Record<string, unknown>) => ({
              text: (h.highlight as string) || (h.text as string) || "",
              start: h.start as number,
              end: h.end as number,
            }))
          : [];
        if (parsedHl.length > 0) setHighlights(parsedHl);
        if (typeof sm === "string" && sm) setSummary(sm);
      } catch {
        // 데모 데이터 유지
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [videoId, analyze]);

  // ── 전사 데이터 로드 ──
  useEffect(() => {
    fetchTranscription(TWELVELABS_INDEXES.leadership, videoId);
  }, [videoId, fetchTranscription]);

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

  // ── JSX ──
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 animate-slide-in-right">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            역량진단
          </button>
          <span className="text-surface-600">/</span>
          <h2 className="text-lg font-bold text-teal-400">영상 리뷰 &amp; 피드백</h2>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            saved
              ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
              : "bg-surface-800 text-slate-300 border border-surface-700 hover:border-teal-500/30 hover:text-teal-400"
          )}
        >
          <Save className="w-4 h-4" />
          {saved ? "저장 완료" : "피드백 저장"}
        </button>
      </div>
      <p className="text-sm text-slate-300 mb-8">{videoTitle}</p>

      {/* ── 2단 레이아웃 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ─── 좌측: 영상 + 컨트롤 ─── */}
        <div className="lg:col-span-7 lg:sticky lg:top-6 lg:self-start space-y-5">
          {/* 영상 플레이어 */}
          <div className="rounded-2xl overflow-hidden border border-surface-700/40 bg-black shadow-2xl shadow-black/50">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full aspect-video bg-black"
              aria-label="토론 영상"
            />
          </div>

          {/* 재생 컨트롤 + 챕터 타임라인 */}
          <div className="bg-surface-800/60 border border-surface-700/40 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-teal-500/15 flex items-center justify-center text-teal-400 hover:bg-teal-500/25 transition-colors shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <span className="text-sm font-mono text-slate-300 tabular-nums min-w-[48px]">
                {formatTime(currentTime)}
              </span>
              {currentChapterIndex >= 0 && (
                <span className="text-sm text-teal-400/80 truncate">
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
                            : "bg-surface-600"
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
            <div className="bg-surface-800/60 border border-surface-700/40 rounded-xl p-4 space-y-1 animate-fade-in-up">
              <p className="text-xs text-slate-500 mb-2">검색 결과 {searchResults.length}건</p>
              {searchResults.map((r: SearchResult, i: number) => (
                <button
                  key={i}
                  onClick={() => seekTo(r.start)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-700/50 transition-colors group"
                >
                  <span className="inline-flex items-center gap-1 text-teal-400 font-mono text-xs shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime(r.start)}
                  </span>
                  <span className="text-sm text-slate-400 group-hover:text-slate-300 truncate flex-1">
                    {r.text || r.videoTitle}
                  </span>
                  <span className="text-xs font-mono text-slate-600">
                    {(r.confidence * 100).toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* AI 요약 + 하이라이트 */}
          {!analysisLoading && (summary || highlights.length > 0) && (
            <div className="bg-surface-800/40 border border-surface-700/30 rounded-xl p-4 space-y-3">
              {summary && (
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-500/60" />
                    AI 분석 요약
                  </p>
                  <p className="text-sm text-slate-400 leading-relaxed">{summary}</p>
                </div>
              )}
              {highlights.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {highlights.map((hl, i) => (
                    <button
                      key={i}
                      onClick={() => seekTo(hl.start)}
                      className="inline-flex items-center gap-1.5 bg-surface-700/50 hover:bg-teal-500/10 border border-surface-700/40 hover:border-teal-500/20 rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-teal-400 transition-all"
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

        {/* ─── 우측: 평가 근거 / 디브리핑 대본 ─── */}
        <div className="lg:col-span-5 space-y-6">
          {/* 탭 헤더 */}
          <div className="flex items-center gap-1 p-1 bg-surface-800/40 border border-surface-700/30 rounded-xl">
            <button
              onClick={() => setRightTab("evidence")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                rightTab === "evidence"
                  ? "bg-surface-700/60 text-teal-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-400"
              )}
            >
              <ClipboardList className="w-4 h-4" />
              평가 근거
              <span className="text-[10px] font-mono opacity-60">{scoredCount}/{evidence.length}</span>
            </button>
            <button
              onClick={() => setRightTab("transcript")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                rightTab === "transcript"
                  ? "bg-surface-700/60 text-teal-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-400"
              )}
            >
              <FileText className="w-4 h-4" />
              디브리핑 대본
            </button>
          </div>

          {/* 디브리핑 대본 탭 */}
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

          {/* 평가 근거 탭 — 챕터별 평가 근거 카드 */}
          {rightTab === "evidence" && evidenceByChapter.map(({ chapter, items }, ci) => (
            <div
              key={ci}
              className="space-y-3 animate-fade-in-up"
              style={{ animationDelay: `${ci * 80}ms`, animationFillMode: "backwards" }}
            >
              {/* 챕터 헤더 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-surface-700/60 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {String(ci + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium leading-tight truncate">
                    {chapter.title}
                  </p>
                  <p className="text-[10px] font-mono text-slate-600">
                    {formatTime(chapter.start)} — {formatTime(chapter.end)}
                  </p>
                </div>
                <div className="h-px flex-1 max-w-[60px] bg-surface-700/50 shrink-0" />
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
                        ? "bg-surface-800 border border-surface-700/50 shadow-lg shadow-black/20"
                        : "bg-surface-800/40 border border-transparent hover:bg-surface-800/70 hover:border-surface-700/30",
                      isEvidencePlaying && !isActive && "ring-1 ring-teal-500/20"
                    )}
                    style={{ borderLeftColor: comp?.color || "#14b8a6" }}
                  >
                    {/* 카드 헤더 — 클릭으로 확장 + 영상 재생 */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEvidenceClick(ev)}
                      onKeyDown={(e) => e.key === "Enter" && handleEvidenceClick(ev)}
                      className="p-4 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-semibold tracking-wide"
                          style={{ color: comp?.color }}
                        >
                          {comp?.label}
                        </span>
                        {!isActive && ev.score > 0 && (
                          <span
                            className={cn(
                              "text-xs font-mono font-bold px-2 py-0.5 rounded-md",
                              ev.score >= 7
                                ? "bg-teal-500/15 text-teal-400"
                                : ev.score >= 5
                                  ? "bg-slate-500/15 text-slate-400"
                                  : "bg-amber-500/15 text-amber-400"
                            )}
                          >
                            {ev.score}/9
                          </span>
                        )}
                        {isEvidencePlaying && (
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mb-2.5">{ev.criteriaLabel}</p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => handleTimestampReplay(e, ev.timestamp)}
                          className="inline-flex items-center gap-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded-md px-2.5 py-1 text-xs font-mono transition-colors"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          {formatTime(ev.timestamp)}
                        </button>
                        <span className="text-xs text-slate-500">{ev.speaker}</span>
                      </div>

                      {!isActive && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-1 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* 확장: 상세 + 점수 + 피드백 */}
                    {isActive && (
                      <div className="px-4 pb-5 space-y-4 animate-fade-in-up">
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {ev.description}
                        </p>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-2">
                            평가 (9점 척도)
                          </p>
                          <ScoreSelector
                            value={ev.score}
                            onChange={(s) => updateScore(ev.id, s)}
                          />
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-2">
                            피드백
                          </p>
                          <textarea
                            value={ev.feedback}
                            onChange={(e) => updateFeedback(ev.id, e.target.value)}
                            placeholder="이 장면에 대한 피드백을 작성하세요..."
                            className="w-full bg-surface-900/60 border border-surface-700/40 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 transition-all resize-none leading-relaxed"
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
