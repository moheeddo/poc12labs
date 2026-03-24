"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  BookOpen,
  MessageSquare,
  Star,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import { useVideoSearch, useVideoAnalysis } from "@/hooks/useTwelveLabs";
import { TWELVELABS_INDEXES } from "@/lib/constants";
import SearchBar from "@/components/shared/SearchBar";
import type { Chapter, Highlight, SegmentFeedback, SearchResult } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

interface LeadershipFeedbackProps {
  videoId: string;
  videoTitle: string;
  onBack: () => void;
}

// 별점 라벨
const RATING_LABELS = ["", "미흡", "부족", "보통", "양호", "우수"];

export default function LeadershipFeedback({
  videoId,
  videoTitle,
  onBack,
}: LeadershipFeedbackProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 분석 데이터
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [summary, setSummary] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(true);

  // 피드백 상태
  const [feedbacks, setFeedbacks] = useState<SegmentFeedback[]>([]);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [saved, setSaved] = useState(false);

  // 검색
  const { results: searchResults, loading: searchLoading, search } = useVideoSearch();

  // 분석 API
  const { analyze } = useVideoAnalysis();

  // 초기 분석 데이터 로드
  useEffect(() => {
    let cancelled = false;
    async function loadAnalysis() {
      setAnalysisLoading(true);

      const demoChapters: Chapter[] = [
        { title: "도입 — 참가자 소개 및 주제 설정", start: 0, end: 120 },
        { title: "1차 발언 — 각 참가자 주장 발표", start: 120, end: 360 },
        { title: "교차 토론 — 반박 및 보충 발언", start: 360, end: 600 },
        { title: "쟁점 정리 — 핵심 논점 요약", start: 600, end: 780 },
        { title: "최종 발언 — 결론 및 합의 도출", start: 780, end: 900 },
      ];
      const demoHighlights: Highlight[] = [
        { text: "참가자 A의 논리적 반박이 돋보이는 구간", start: 180, end: 210 },
        { text: "참가자 B의 효과적인 경청 사례", start: 420, end: 450 },
        { text: "참가자 C의 리더십 발휘 — 토론 방향 재정립", start: 540, end: 570 },
      ];
      const demoSummary = "6인 토론 세션에서 리더십, 의사소통, 논리력, 경청, 협업 역량을 종합적으로 평가합니다.";

      function applyDemoData() {
        if (cancelled) return;
        setChapters(demoChapters);
        setHighlights(demoHighlights);
        setSummary(demoSummary);
        setFeedbacks(
          demoChapters.map((ch, i) => ({
            segmentIndex: i,
            title: ch.title,
            start: ch.start,
            end: ch.end,
            feedback: "",
          }))
        );
      }

      try {
        const [chapterData, highlightData, summaryData] = await Promise.all([
          analyze(videoId, "chapter"),
          analyze(videoId, "highlight"),
          analyze(videoId, "summary"),
        ]);

        if (cancelled) return;

        // 챕터 파싱
        const parsedChapters: Chapter[] = Array.isArray(chapterData)
          ? chapterData.map((c: Record<string, unknown>) => ({
              title: (c.chapter_title as string) || (c.title as string) || "구간",
              start: c.start as number,
              end: c.end as number,
            }))
          : [];

        // API가 빈 결과를 반환하면 (analyze 훅이 에러 시 null 반환) 데모 데이터 사용
        if (parsedChapters.length === 0) {
          applyDemoData();
          return;
        }

        // 하이라이트 파싱
        const parsedHighlights: Highlight[] = Array.isArray(highlightData)
          ? highlightData.map((h: Record<string, unknown>) => ({
              text: (h.highlight as string) || (h.text as string) || "",
              start: h.start as number,
              end: h.end as number,
            }))
          : [];

        setChapters(parsedChapters);
        setHighlights(parsedHighlights);
        setSummary(typeof summaryData === "string" ? summaryData : "");
        setFeedbacks(
          parsedChapters.map((ch, i) => ({
            segmentIndex: i,
            title: ch.title,
            start: ch.start,
            end: ch.end,
            feedback: "",
          }))
        );
      } catch {
        if (cancelled) return;
        applyDemoData();
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    }
    loadAnalysis();
    return () => { cancelled = true; };
  }, [videoId, analyze]);

  // 비디오 시간 추적
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  // 구간 클릭 → 해당 시점으로 이동 + 재생
  const seekToSegment = useCallback((start: number, index: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = start;
      video.play();
    }
    setActiveSegment(index);
    setExpandedSegment(index);
  }, []);

  // 검색 결과 클릭 → 해당 시점으로 이동
  const seekToTime = useCallback((start: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = start;
      video.play();
    }
  }, []);

  // 피드백 텍스트 업데이트
  const updateFeedback = useCallback((index: number, text: string) => {
    setFeedbacks((prev) =>
      prev.map((f) => (f.segmentIndex === index ? { ...f, feedback: text } : f))
    );
    setSaved(false);
  }, []);

  // 별점 업데이트
  const updateRating = useCallback((index: number, rating: number) => {
    setFeedbacks((prev) =>
      prev.map((f) => (f.segmentIndex === index ? { ...f, rating } : f))
    );
    setSaved(false);
  }, []);

  // 피드백 저장 (로컬)
  const handleSave = useCallback(() => {
    // 실제 구현 시 API 호출로 대체
    localStorage.setItem(
      `feedback-${videoId}`,
      JSON.stringify({ videoId, videoTitle, feedbacks, savedAt: new Date().toISOString() })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [videoId, videoTitle, feedbacks]);

  // 현재 재생 중인 챕터 인덱스
  const currentChapterIndex = chapters.findIndex(
    (ch) => currentTime >= ch.start && currentTime < ch.end
  );

  // 검색 핸들러
  const handleSearch = useCallback(
    (query: string) => {
      search(TWELVELABS_INDEXES.leadership, query);
    },
    [search]
  );

  // 재생/일시정지 토글
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-5 animate-slide-in-right">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-400 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          역량진단
        </button>
        <span className="text-slate-600">/</span>
        <h2 className="text-lg font-bold text-teal-400 truncate">영상 리뷰 & 피드백</h2>
      </div>

      {/* 비디오 제목 + 저장 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white font-medium truncate">{videoTitle}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {videoId}</p>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200",
            saved
              ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
              : "bg-surface-700 text-slate-300 border border-surface-600 hover:bg-teal-500/10 hover:text-teal-400 hover:border-teal-500/30"
          )}
        >
          <Save className="w-3.5 h-3.5" />
          {saved ? "저장됨" : "피드백 저장"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 좌측: 비디오 플레이어 + 검색 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 비디오 플레이어 */}
          <div className="relative rounded-xl overflow-hidden border border-surface-600 bg-black">
            <video
              ref={videoRef}
              controls
              aria-label="토론 영상 플레이어"
              className="w-full aspect-video bg-black"
            />
            {/* 스캔라인 오버레이 */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
              }}
              aria-hidden="true"
            />
          </div>

          {/* 플레이 컨트롤 + 타임라인 진행바 */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 hover:bg-teal-500/30 transition-colors duration-200"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {formatTime(currentTime)}
              </span>
              {currentChapterIndex >= 0 && (
                <span className="text-xs text-teal-400 truncate">
                  {chapters[currentChapterIndex]?.title}
                </span>
              )}
            </div>
            {/* 챕터 타임라인 바 */}
            {chapters.length > 0 && (
              <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                {chapters.map((ch, i) => {
                  const totalDuration = chapters[chapters.length - 1]?.end || 1;
                  const widthPct = ((ch.end - ch.start) / totalDuration) * 100;
                  const isCurrent = i === currentChapterIndex;
                  const isPast = currentTime >= ch.end;
                  return (
                    <button
                      key={i}
                      onClick={() => seekToSegment(ch.start, i)}
                      className={cn(
                        "h-full rounded-sm transition-all duration-300 cursor-pointer hover:opacity-100",
                        isCurrent
                          ? "bg-teal-500"
                          : isPast
                            ? "bg-teal-500/40"
                            : "bg-surface-600 hover:bg-surface-500"
                      )}
                      style={{ width: `${widthPct}%` }}
                      title={ch.title}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* 영상 내 검색 */}
          <SearchBar
            placeholder="토론 내 특정 장면 검색 (예: 반박 발언, 리더십 발휘)..."
            onSearch={handleSearch}
            loading={searchLoading}
            accentColor="teal"
            suggestions={["반박 발언", "동의 표현", "리더십 발휘", "경청 사례"]}
          />

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 animate-fade-in-up">
              <h4 className="text-sm font-medium text-slate-300 mb-3">
                검색 결과 ({searchResults.length}건)
              </h4>
              <div className="space-y-1.5">
                {searchResults.map((r: SearchResult, i: number) => (
                  <button
                    key={i}
                    onClick={() => seekToTime(r.start)}
                    className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-700 hover:pl-4 hover:border-l-2 hover:border-l-teal-500 cursor-pointer transition-all duration-200"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-xs text-teal-400 shrink-0">
                      {formatTime(r.start)} — {formatTime(r.end)}
                    </span>
                    <span className="text-xs text-slate-300 flex-1 truncate">
                      {r.text || r.videoTitle}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {(r.confidence * 100).toFixed(0)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI 요약 */}
          {summary && (
            <div className="bg-surface-800 border border-teal-500/20 rounded-xl p-4 animate-fade-in-up">
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" /> AI 분석 요약
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">{summary}</p>
            </div>
          )}
        </div>

        {/* 우측: 구간별 타임라인 + 피드백 */}
        <div className="space-y-4">
          {/* 분석 로딩 */}
          {analysisLoading && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 text-center animate-pulse">
              <Sparkles className="w-8 h-8 text-teal-400/40 mx-auto mb-3" />
              <p className="text-sm text-slate-400">AI 분석 진행 중...</p>
              <p className="text-xs text-slate-600 mt-1">챕터, 하이라이트, 요약을 생성합니다</p>
            </div>
          )}

          {/* 챕터별 구간 & 피드백 */}
          {!analysisLoading && chapters.length > 0 && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> 구간별 리뷰 ({chapters.length}개 구간)
              </h4>
              <div className="space-y-2">
                {chapters.map((ch, i) => {
                  const isActive = activeSegment === i;
                  const isCurrent = i === currentChapterIndex;
                  const isExpanded = expandedSegment === i;
                  const fb = feedbacks[i];
                  return (
                    <div
                      key={i}
                      className={cn(
                        "animate-fade-in-up rounded-lg border transition-all duration-200",
                        isActive || isCurrent
                          ? "border-teal-500/30 bg-teal-500/5"
                          : "border-surface-700 hover:border-surface-600"
                      )}
                      style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                    >
                      {/* 구간 헤더 — 클릭하면 해당 구간 재생 */}
                      <button
                        onClick={() => seekToSegment(ch.start, i)}
                        className="w-full text-left flex items-center gap-2.5 p-3 group"
                      >
                        <span
                          className={cn(
                            "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-mono font-semibold border shrink-0 transition-all duration-200",
                            isActive || isCurrent
                              ? "bg-teal-500 border-teal-500 text-white"
                              : "bg-surface-800 border-surface-600 text-slate-500 group-hover:border-teal-500/50 group-hover:text-teal-400"
                          )}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-xs truncate transition-colors duration-200",
                              isActive || isCurrent
                                ? "text-teal-400 font-medium"
                                : "text-slate-300 group-hover:text-white"
                            )}
                          >
                            {ch.title}
                          </p>
                          <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                            {formatTime(ch.start)} — {formatTime(ch.end)}
                          </p>
                        </div>
                        {/* 재생 인디케이터 */}
                        {isCurrent && (
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
                        )}
                        {/* 피드백 있음 표시 */}
                        {fb?.feedback && (
                          <MessageSquare className="w-3 h-3 text-teal-500/60 shrink-0" />
                        )}
                        {/* 별점 표시 */}
                        {fb?.rating && (
                          <span className="text-[10px] text-amber-400 font-mono shrink-0">
                            {"★".repeat(fb.rating)}
                          </span>
                        )}
                      </button>

                      {/* 확장: 피드백 작성 영역 */}
                      <div className="px-3">
                        <button
                          onClick={() => setExpandedSegment(isExpanded ? null : i)}
                          className="w-full flex items-center justify-center gap-1 py-1 text-xs text-slate-600 hover:text-teal-400 transition-colors duration-200"
                        >
                          {isExpanded ? (
                            <>피드백 접기 <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>피드백 작성 <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2 animate-fade-in-up">
                          {/* 별점 */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 mr-1">평가:</span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => updateRating(i, star)}
                                className={cn(
                                  "transition-all duration-150",
                                  (fb?.rating || 0) >= star
                                    ? "text-amber-400 scale-110"
                                    : "text-slate-600 hover:text-amber-400/60"
                                )}
                              >
                                <Star className="w-3.5 h-3.5" fill={(fb?.rating || 0) >= star ? "currentColor" : "none"} />
                              </button>
                            ))}
                            {fb?.rating && (
                              <span className="text-[10px] text-slate-500 ml-1">
                                {RATING_LABELS[fb.rating]}
                              </span>
                            )}
                          </div>
                          {/* 피드백 텍스트 */}
                          <textarea
                            value={fb?.feedback || ""}
                            onChange={(e) => updateFeedback(i, e.target.value)}
                            placeholder="이 구간에 대한 피드백을 작성하세요..."
                            className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all duration-200 resize-none"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 하이라이트 */}
          {!analysisLoading && highlights.length > 0 && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> 주요 하이라이트 ({highlights.length}개)
              </h4>
              <div className="space-y-1.5">
                {highlights.map((hl, i) => (
                  <button
                    key={i}
                    onClick={() => seekToTime(hl.start)}
                    className="animate-fade-in-up w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-surface-700 transition-all duration-200 group"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                  >
                    <Star className="w-3.5 h-3.5 text-amber-500/60 group-hover:text-amber-400 shrink-0 mt-0.5 transition-colors duration-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-200 line-clamp-2">
                        {hl.text}
                      </p>
                      <span className="text-[10px] font-mono text-slate-600 group-hover:text-amber-400/60 transition-colors duration-200">
                        ▶ {formatTime(hl.start)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
