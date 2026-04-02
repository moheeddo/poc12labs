"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  PlayCircle,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  Printer,
  Download,
  Volume2,
} from "lucide-react";
import type { TranscriptSegment } from "@/hooks/useTwelveLabs";
import type { Chapter } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

// ─── 화자 색상 팔레트 (6인 토론 기준) ───
const SPEAKER_PALETTE = [
  { name: "화자 A", color: "#14b8a6", bg: "bg-teal-500/12", border: "border-teal-500/25", text: "text-teal-400", ring: "ring-teal-500/20" },
  { name: "화자 B", color: "#f59e0b", bg: "bg-amber-500/12", border: "border-amber-500/25", text: "text-amber-400", ring: "ring-amber-500/20" },
  { name: "화자 C", color: "#8b5cf6", bg: "bg-violet-500/12", border: "border-violet-500/25", text: "text-violet-400", ring: "ring-violet-500/20" },
  { name: "화자 D", color: "#ef4444", bg: "bg-red-500/12", border: "border-red-500/25", text: "text-red-400", ring: "ring-red-500/20" },
  { name: "화자 E", color: "#3b82f6", bg: "bg-blue-500/12", border: "border-blue-500/25", text: "text-blue-400", ring: "ring-blue-500/20" },
  { name: "화자 F", color: "#ec4899", bg: "bg-pink-500/12", border: "border-pink-500/25", text: "text-pink-400", ring: "ring-pink-500/20" },
];

// 화자 할당 — 단일 화자(발표자)로 표시
function assignSpeaker(): { name: string; palette: typeof SPEAKER_PALETTE[0] } {
  return { name: "발표자", palette: SPEAKER_PALETTE[0] };
}

// ─── Props ───
interface TranscriptTimelineProps {
  videoId: string;
  currentTime: number;
  chapters: Chapter[];
  onSeek: (time: number) => void;
  transcriptSegments?: TranscriptSegment[];
  loading?: boolean;
}

export default function TranscriptTimeline({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  videoId,
  currentTime,
  chapters,
  onSeek,
  transcriptSegments,
  loading = false,
}: TranscriptTimelineProps) {
  const segments = useMemo(() => transcriptSegments && transcriptSegments.length > 0 ? transcriptSegments : [], [transcriptSegments]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const [filterSpeaker, setFilterSpeaker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCompact, setIsCompact] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());

  // 화자 주석이 달린 세그먼트
  const annotated = useMemo(() => {
    return segments.map((seg, i) => {
      const { name, palette } = assignSpeaker();
      return { ...seg, index: i, speaker: name, palette };
    });
  }, [segments]);

  // 고유 화자 목록
  const speakers = useMemo(() => {
    const map = new Map<string, typeof SPEAKER_PALETTE[0]>();
    annotated.forEach((a) => {
      if (!map.has(a.speaker)) map.set(a.speaker, a.palette);
    });
    return Array.from(map.entries());
  }, [annotated]);

  // 필터 + 검색 적용
  const filtered = useMemo(() => {
    let result = annotated;
    if (filterSpeaker) result = result.filter((s) => s.speaker === filterSpeaker);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.value?.toLowerCase().includes(q));
    }
    return result;
  }, [annotated, filterSpeaker, searchQuery]);

  // 현재 재생 중인 세그먼트
  const activeIndex = useMemo(
    () => annotated.findIndex((s) => currentTime >= s.start && currentTime < s.end),
    [annotated, currentTime]
  );

  // 자동 스크롤
  useEffect(() => {
    if (!autoScroll || activeIndex < 0 || !activeRef.current) return;
    activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex, autoScroll]);

  const toggleBookmark = useCallback((index: number) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  // 현재 챕터 찾기
  const getChapterForTime = useCallback((time: number) => {
    return chapters.find((ch) => time >= ch.start && time < ch.end);
  }, [chapters]);

  // 화자별 발언 통계
  const speakerStats = useMemo(() => {
    const stats = new Map<string, { count: number; totalDuration: number }>();
    annotated.forEach((seg) => {
      const existing = stats.get(seg.speaker) || { count: 0, totalDuration: 0 };
      existing.count++;
      existing.totalDuration += seg.end - seg.start;
      stats.set(seg.speaker, existing);
    });
    return stats;
  }, [annotated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">전사 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ─── 헤더 바 ─── */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">디브리핑 대본</h4>
            <p className="text-[10px] text-slate-600 font-mono">{segments.length}개 발언 구간</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "p-1.5 rounded-md text-xs transition-colors",
              autoScroll ? "bg-teal-500/15 text-teal-400" : "text-slate-600 hover:text-slate-400"
            )}
            title="자동 스크롤"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-400 transition-colors"
            title={isCompact ? "상세 보기" : "간결 보기"}
          >
            {isCompact ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-400 transition-colors"
            title="인쇄"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── 화자 필터 칩 ─── */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <button
          onClick={() => setFilterSpeaker(null)}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
            !filterSpeaker
              ? "bg-teal-500/15 text-teal-400 border border-teal-500/25"
              : "bg-surface-800/60 text-slate-500 border border-surface-700/40 hover:text-slate-400"
          )}
        >
          <Users className="w-3 h-3" />
          전체
        </button>
        {speakers.map(([name, palette]) => {
          const stats = speakerStats.get(name);
          return (
            <button
              key={name}
              onClick={() => setFilterSpeaker(filterSpeaker === name ? null : name)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                filterSpeaker === name
                  ? `${palette.bg} ${palette.text} ${palette.border}`
                  : "bg-surface-800/40 text-slate-500 border-surface-700/30 hover:text-slate-400"
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: palette.color }}
              />
              {name}
              {stats && (
                <span className="text-[9px] font-mono opacity-60">
                  {stats.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── 인라인 검색 ─── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="대본 내 검색..."
          className="w-full pl-9 pr-3 py-2 bg-surface-900/50 border border-surface-700/40 rounded-lg text-xs text-white placeholder:text-slate-600 outline-none focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 transition-all"
        />
        {searchQuery && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-teal-400 font-mono">
            {filtered.length}건
          </span>
        )}
      </div>

      {/* ─── 화자별 통계 미니 바 ─── */}
      {!isCompact && (
        <div className="mb-4 p-3 bg-surface-800/30 border border-surface-700/20 rounded-xl">
          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-2">발언량 분석</p>
          <div className="space-y-1.5">
            {speakers.map(([name, palette]) => {
              const stats = speakerStats.get(name);
              if (!stats) return null;
              const totalDur = Array.from(speakerStats.values()).reduce((a, b) => a + b.totalDuration, 0);
              const pct = totalDur > 0 ? (stats.totalDuration / totalDur) * 100 : 0;
              return (
                <div key={name} className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-medium w-14 truncate", palette.text)}>
                    {name}
                  </span>
                  <div className="flex-1 h-1.5 bg-surface-900/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: palette.color }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-600 w-10 text-right">
                    {formatTime(stats.totalDuration)}
                  </span>
                  <span className="text-[9px] font-mono text-slate-600 w-8 text-right">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 전사 타임라인 ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
        {filtered.map((seg, fi) => {
          const isActive = activeIndex >= 0 && seg.index === activeIndex;
          const isBookmarked = bookmarks.has(seg.index);
          const chapter = getChapterForTime(seg.start);
          // 챕터 경계 표시
          const prevSeg = fi > 0 ? filtered[fi - 1] : null;
          const prevChapter = prevSeg ? getChapterForTime(prevSeg.start) : null;
          const showChapterBoundary = chapter && (!prevChapter || chapter.title !== prevChapter.title);

          return (
            <div key={seg.index}>
              {/* 챕터 구분선 */}
              {showChapterBoundary && (
                <div className="flex items-center gap-3 py-3 mt-2 first:mt-0">
                  <div className="h-px flex-1 bg-gradient-to-r from-teal-500/20 to-transparent" />
                  <span className="text-[10px] font-medium text-teal-500/60 uppercase tracking-wider whitespace-nowrap">
                    {chapter.title}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-teal-500/20 to-transparent" />
                </div>
              )}

              {/* 발언 카드 */}
              <div
                ref={isActive ? activeRef : undefined}
                className={cn(
                  "group relative flex gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-teal-500/8 ring-1 ring-teal-500/20"
                    : "hover:bg-surface-800/50",
                  isBookmarked && !isActive && "bg-amber-500/5"
                )}
                onClick={() => onSeek(seg.start)}
              >
                {/* 타임라인 도트 + 라인 */}
                <div className="flex flex-col items-center pt-1 shrink-0 w-5">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full border-2 transition-all",
                      isActive
                        ? "border-teal-400 bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                        : `border-surface-600 group-hover:border-slate-500`
                    )}
                    style={!isActive ? { borderColor: seg.palette.color + "40" } : undefined}
                  />
                  {fi < filtered.length - 1 && (
                    <div className="w-px flex-1 mt-1 bg-surface-700/30" />
                  )}
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 min-w-0">
                  {/* 화자 + 타임스탬프 */}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn("text-[11px] font-semibold", seg.palette.text)}
                    >
                      {seg.speaker}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSeek(seg.start); }}
                      className="inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-600 hover:text-teal-400 transition-colors"
                    >
                      <PlayCircle className="w-3 h-3" />
                      {formatTime(seg.start)}
                    </button>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-teal-400 font-medium animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                        재생 중
                      </span>
                    )}
                  </div>

                  {/* 발언 텍스트 */}
                  <p
                    className={cn(
                      "text-sm leading-relaxed transition-colors",
                      isActive ? "text-slate-200" : "text-slate-400",
                      isCompact && "line-clamp-1"
                    )}
                  >
                    {searchQuery ? highlightText(seg.value, searchQuery) : seg.value}
                  </p>

                  {/* 발언 길이 표시 */}
                  {!isCompact && (
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] font-mono text-slate-700">
                        {(seg.end - seg.start).toFixed(0)}초
                      </span>
                    </div>
                  )}
                </div>

                {/* 북마크 */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBookmark(seg.index); }}
                  className={cn(
                    "shrink-0 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                    isBookmarked && "opacity-100"
                  )}
                >
                  <Star
                    className={cn(
                      "w-3.5 h-3.5 transition-colors",
                      isBookmarked ? "text-amber-400 fill-amber-400" : "text-slate-700 hover:text-amber-400"
                    )}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 푸터: 북마크 요약 ─── */}
      {bookmarks.size > 0 && (
        <div className="mt-4 pt-3 border-t border-surface-700/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-amber-500/60 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              핵심 발언 {bookmarks.size}건
            </p>
            <button
              onClick={() => {
                const text = Array.from(bookmarks)
                  .sort()
                  .map((i) => {
                    const s = annotated[i];
                    return `[${formatTime(s.start)}] ${s.speaker}: ${s.value}`;
                  })
                  .join("\n\n");
                navigator.clipboard.writeText(text);
              }}
              className="text-[10px] text-slate-600 hover:text-teal-400 transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              복사
            </button>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {Array.from(bookmarks).sort().map((i) => {
              const s = annotated[i];
              if (!s) return null;
              return (
                <button
                  key={i}
                  onClick={() => onSeek(s.start)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1 rounded-md hover:bg-surface-800/40 transition-colors"
                >
                  <span className="text-[10px] font-mono text-teal-400">{formatTime(s.start)}</span>
                  <span className={cn("text-[10px] font-medium", s.palette.text)}>{s.speaker}</span>
                  <span className="text-[10px] text-slate-500 truncate flex-1">{s.value}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 검색어 하이라이트 헬퍼
function highlightText(text: string, query: string) {
  if (!text || !query.trim()) return text ?? "";
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-teal-500/25 text-teal-300 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
