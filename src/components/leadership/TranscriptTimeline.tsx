"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  PlayCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  Download,
  Volume2,
} from "lucide-react";
import type { TranscriptSegment } from "@/hooks/useTwelveLabs";
import type { Chapter } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

// ─── 화자 색상 팔레트 ───
const SPEAKER_PALETTE = [
  { name: "화자 A", color: "#14b8a6", bg: "bg-teal-500/12", border: "border-teal-500/25", text: "text-teal-600", ring: "ring-teal-500/20" },
  { name: "화자 B", color: "#f59e0b", bg: "bg-amber-500/12", border: "border-amber-500/25", text: "text-amber-600", ring: "ring-amber-500/20" },
  { name: "화자 C", color: "#8b5cf6", bg: "bg-violet-500/12", border: "border-violet-500/25", text: "text-violet-600", ring: "ring-violet-500/20" },
  { name: "화자 D", color: "#ef4444", bg: "bg-red-500/12", border: "border-red-500/25", text: "text-red-400", ring: "ring-red-500/20" },
  { name: "화자 E", color: "#3b82f6", bg: "bg-blue-500/12", border: "border-blue-500/25", text: "text-blue-400", ring: "ring-blue-500/20" },
  { name: "화자 F", color: "#ec4899", bg: "bg-pink-500/12", border: "border-pink-500/25", text: "text-pink-400", ring: "ring-pink-500/20" },
];

// ─── 병합된 세그먼트 타입 ───
interface MergedSegment {
  index: number;
  speaker: string;
  palette: (typeof SPEAKER_PALETTE)[0];
  start: number;
  end: number;
  text: string;
  originalSegments: number[]; // 원본 세그먼트 인덱스
}

// 세그먼트 병합 로직 — 문장 단위로 레벨링
function mergeSegments(segments: TranscriptSegment[]): MergedSegment[] {
  if (segments.length === 0) return [];

  const merged: MergedSegment[] = [];
  let currentGroup: {
    start: number;
    end: number;
    texts: string[];
    indices: number[];
  } = {
    start: segments[0].start,
    end: segments[0].end,
    texts: [segments[0].value || ""],
    indices: [0],
  };

  // 문장 종결 패턴 (한국어 + 영어)
  // 한국어 종결어미: 다/요/까/죠/니다/세요/네요/거든요/잖아요/습니다/ㅂ니다/나요/던데요/대요/래요/겠습니다
  const sentenceEndRegex = /[.!?。…]\s*$|(?:니다|세요|네요|거든요|잖아요|던데요|대요|래요|겠습니다)[.!?]?\s*$|(?:다|요|까|죠)[.!?]\s*$/;

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const prevText = currentGroup.texts.join(" ");
    const timeDiff = seg.start - currentGroup.end;
    const totalLength = prevText.length + (seg.value?.length || 0);

    // 병합 조건:
    // 1. 시간 갭이 2초 이내
    // 2. 전체 텍스트 길이가 300자 미만
    // 3. 이전 텍스트가 문장 종결이 아니거나, 총 길이가 60자 미만 (너무 짧은 문장 방지)
    const shouldMerge =
      timeDiff <= 2.0 &&
      totalLength < 300 &&
      (!sentenceEndRegex.test(prevText.trim()) || prevText.trim().length < 60);

    if (shouldMerge) {
      currentGroup.end = seg.end;
      currentGroup.texts.push(seg.value || "");
      currentGroup.indices.push(i);
    } else {
      // 현재 그룹 완료
      merged.push({
        index: merged.length,
        speaker: "발표자",
        palette: SPEAKER_PALETTE[0],
        start: currentGroup.start,
        end: currentGroup.end,
        text: currentGroup.texts.join(" ").trim(),
        originalSegments: currentGroup.indices,
      });

      // 새 그룹 시작
      currentGroup = {
        start: seg.start,
        end: seg.end,
        texts: [seg.value || ""],
        indices: [i],
      };
    }
  }

  // 마지막 그룹 추가
  merged.push({
    index: merged.length,
    speaker: "발표자",
    palette: SPEAKER_PALETTE[0],
    start: currentGroup.start,
    end: currentGroup.end,
    text: currentGroup.texts.join(" ").trim(),
    originalSegments: currentGroup.indices,
  });

  return merged;
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
  videoId: _videoId,
  currentTime,
  chapters,
  onSeek,
  transcriptSegments,
  loading = false,
}: TranscriptTimelineProps) {
  void _videoId;
  const rawSegments = useMemo(
    () => (transcriptSegments && transcriptSegments.length > 0 ? transcriptSegments : []),
    [transcriptSegments]
  );

  // 문장 단위로 병합된 세그먼트
  const segments = useMemo(() => mergeSegments(rawSegments), [rawSegments]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCompact, setIsCompact] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());

  // 필터 + 검색 적용
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, searchQuery]);

  // 현재 재생 중인 세그먼트
  const activeIndex = useMemo(
    () => segments.findIndex((s) => currentTime >= s.start && currentTime < s.end),
    [segments, currentTime]
  );

  // 자동 스크롤
  useEffect(() => {
    if (!autoScroll || activeIndex < 0 || !activeRef.current) return;
    activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex, autoScroll]);

  const toggleBookmark = useCallback((index: number) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // 현재 챕터 찾기
  const getChapterForTime = useCallback(
    (time: number) => chapters.find((ch) => time >= ch.start && time < ch.end),
    [chapters]
  );

  // 통계 정보
  const totalDuration = useMemo(() => {
    if (segments.length === 0) return 0;
    return segments[segments.length - 1].end - segments[0].start;
  }, [segments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
          <p className="text-base text-slate-500">전사 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ─── 헤더 바 ─── */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-700">디브리핑 대본</h4>
            <p className="text-sm text-slate-400 font-mono">
              {segments.length}개 문단 · {rawSegments.length}개 원본 구간
              {totalDuration > 0 && ` · ${formatTime(totalDuration)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-sm transition-colors",
              autoScroll ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:text-slate-500"
            )}
            title="자동 스크롤"
            aria-label={autoScroll ? "자동 스크롤 끄기" : "자동 스크롤 켜기"}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-slate-400 hover:text-slate-500 transition-colors"
            title={isCompact ? "상세 보기" : "간결 보기"}
            aria-label={isCompact ? "상세 보기로 전환" : "간결 보기로 전환"}
          >
            {isCompact ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ─── 인라인 검색 ─── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="대본 내 검색..."
          className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200/40 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 transition-all"
        />
        {searchQuery && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-teal-600 font-mono">
            {filtered.length}건
          </span>
        )}
      </div>

      {/* ─── 전사 타임라인 (문장 단위 병합) ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
        {filtered.length === 0 && !loading && (
          <div className="py-8 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">
              {searchQuery ? "검색 결과가 없습니다" : "전사 데이터가 없습니다"}
            </p>
          </div>
        )}

        {filtered.map((seg, fi) => {
          const isActive = activeIndex >= 0 && seg.index === activeIndex;
          const isBookmarked = bookmarks.has(seg.index);
          const chapter = getChapterForTime(seg.start);
          // 챕터 경계 표시
          const prevSeg = fi > 0 ? filtered[fi - 1] : null;
          const prevChapter = prevSeg ? getChapterForTime(prevSeg.start) : null;
          const showChapterBoundary = chapter && (!prevChapter || chapter.title !== prevChapter.title);
          const duration = seg.end - seg.start;

          return (
            <div key={seg.index}>
              {/* 챕터 구분선 */}
              {showChapterBoundary && (
                <div className="flex items-center gap-3 py-3 mt-2 first:mt-0">
                  <div className="h-px flex-1 bg-gradient-to-r from-teal-500/20 to-transparent" />
                  <span className="text-sm font-medium text-teal-500/60 uppercase tracking-wider whitespace-nowrap">
                    {chapter.title}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-teal-500/20 to-transparent" />
                </div>
              )}

              {/* 문단 카드 */}
              <div
                ref={isActive ? activeRef : undefined}
                className={cn(
                  "group relative rounded-xl transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-teal-50/60 ring-1 ring-teal-500/20 shadow-sm"
                    : "hover:bg-slate-50/60",
                  isBookmarked && !isActive && "bg-amber-50/30"
                )}
                onClick={() => onSeek(seg.start)}
              >
                <div className="px-4 py-3">
                  {/* 타임스탬프 헤더 */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(seg.start);
                      }}
                      className="inline-flex items-center gap-1 text-teal-600 font-mono text-sm hover:text-teal-500 transition-colors"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      {formatTime(seg.start)}
                    </button>
                    <span className="text-slate-300">—</span>
                    <span className="text-sm font-mono text-slate-400">{formatTime(seg.end)}</span>

                    {!isCompact && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100/60 px-1.5 py-0.5 rounded">
                        {duration >= 60
                          ? `${Math.floor(duration / 60)}분 ${Math.round(duration % 60)}초`
                          : `${Math.round(duration)}초`}
                      </span>
                    )}

                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-teal-600 font-medium animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                        재생 중
                      </span>
                    )}

                    {/* 북마크 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(seg.index);
                      }}
                      aria-label={isBookmarked ? "북마크 해제" : "북마크 추가"}
                      className={cn(
                        "ml-auto shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-all",
                        isBookmarked
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <Star
                        className={cn(
                          "w-3.5 h-3.5 transition-colors",
                          isBookmarked
                            ? "text-amber-600 fill-amber-400"
                            : "text-slate-300 hover:text-amber-600"
                        )}
                      />
                    </button>
                  </div>

                  {/* 본문 텍스트 — 문장 단위 병합으로 가독성 향상 */}
                  <p
                    className={cn(
                      "text-[15px] leading-[1.8] transition-colors",
                      isActive ? "text-slate-800 font-medium" : "text-slate-600",
                      isCompact && "line-clamp-2"
                    )}
                  >
                    {searchQuery ? highlightText(seg.text, searchQuery) : seg.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 푸터: 북마크 요약 ─── */}
      {bookmarks.size > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm uppercase tracking-wider text-amber-500/60 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-600" />
              핵심 구간 {bookmarks.size}건
            </p>
            <button
              onClick={() => {
                const text = Array.from(bookmarks)
                  .sort()
                  .map((i) => {
                    const s = segments[i];
                    return s ? `[${formatTime(s.start)}~${formatTime(s.end)}]\n${s.text}` : "";
                  })
                  .filter(Boolean)
                  .join("\n\n");
                navigator.clipboard.writeText(text);
              }}
              className="text-sm text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              복사
            </button>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {Array.from(bookmarks)
              .sort()
              .map((i) => {
                const s = segments[i];
                if (!s) return null;
                return (
                  <button
                    key={i}
                    onClick={() => onSeek(s.start)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-50/60 transition-colors"
                  >
                    <span className="text-sm font-mono text-teal-600">{formatTime(s.start)}</span>
                    <span className="text-sm text-slate-600 truncate flex-1">{s.text}</span>
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
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-teal-100 text-teal-700 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
