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

// ─── 데모 전사 데이터 (TwelveLabs 연동 전 POC용) ───
const DEMO_TRANSCRIPT: TranscriptSegment[] = [
  { value: "안녕하십니까. 오늘 신임부장 리더십 역량진단 세션을 시작하겠습니다. 각자 소개를 간단히 부탁드리겠습니다.", start: 2, end: 12 },
  { value: "네, 발전운영처 김철수 부장입니다. 신재생에너지 사업부를 맡고 있습니다.", start: 14, end: 21 },
  { value: "안전관리부 이영희 부장입니다. 원전 안전성 향상 프로젝트를 담당하고 있습니다.", start: 23, end: 31 },
  { value: "기술연구소 박민준 부장입니다. R&D 전략 수립을 진행 중입니다.", start: 33, end: 40 },
  { value: "인력개발원 정수진 부장입니다. 교육 훈련 체계 개편을 담당합니다.", start: 42, end: 49 },
  { value: "경영기획실 한지원 부장입니다. 중장기 경영전략을 총괄하고 있습니다.", start: 51, end: 58 },
  { value: "품질보증부 최동현 부장입니다. 품질경영시스템 고도화를 추진 중입니다.", start: 60, end: 68 },
  // 전략 발표 구간
  { value: "그러면 PEST 분석 과제부터 시작하겠습니다. 김 부장님, 정치적 환경 분석 결과를 발표해 주시죠.", start: 125, end: 137 },
  { value: "네. 정치적 측면에서 보면, 정부의 에너지 전환 정책이 가속화되고 있습니다. 탈원전 기조가 완화되면서 원전 수명연장과 신규 건설 논의가 재개되고 있고, 동시에 신재생에너지 의무비율이 상향 조정될 예정입니다.", start: 139, end: 162 },
  { value: "경제적 측면에서는 원자재 가격 상승과 건설비 증가가 리스크 요인이지만, 한편으로는 전력 수요가 꾸준히 증가하고 있어 안정적 매출 기반이 유지될 전망입니다.", start: 165, end: 185 },
  { value: "좋은 분석입니다. 이 부장님은 사회적 환경 분석을 맡으셨는데요.", start: 188, end: 196 },
  { value: "네. 사회적 측면에서 원전 안전에 대한 국민적 관심이 지속되고 있고, ESG 경영에 대한 요구가 강화되고 있습니다. 특히 지역사회와의 상생 이슈가 경영에 큰 영향을 미치고 있어, 이 부분을 전략에 반영해야 합니다.", start: 198, end: 225 },
  { value: "김 부장님이 제시한 정치적 기회 요인과 사회적 리스크를 교차 분석하면, 원전과 신재생의 균형 포트폴리오 전략이 핵심이 되어야 한다고 봅니다.", start: 228, end: 248 },
  // 그룹 토의 구간
  { value: "이제 그룹 토의로 넘어가겠습니다. 부서간 자원 배분 갈등 상황을 시뮬레이션합니다. 각자 맡은 부서 입장에서 주장해 주세요.", start: 365, end: 382 },
  { value: "기술연구소 입장에서 R&D 예산 축소는 중장기 경쟁력을 심각하게 훼손합니다. 단기 실적에만 집중하면 5년 후 기술 격차를 만회할 수 없습니다.", start: 385, end: 405 },
  { value: "박 부장님 말씀에 공감하지만, 현재 안전 관련 현안이 시급합니다. 안전 투자를 미루면 대형 사고 리스크가 증가하고, 이는 회사 존립 자체를 위협합니다.", start: 408, end: 430 },
  { value: "양쪽 다 일리가 있습니다. 제가 제안 드리고 싶은 건, 안전과 R&D를 대립시키지 말고 안전 기술 R&D로 융합하는 방안입니다. 이렇게 하면 두 부서 모두 예산 확보의 명분이 생깁니다.", start: 435, end: 462 },
  { value: "한 부장님의 융합 제안이 현실적이라고 봅니다. 구체적으로 어떤 프로젝트를 공동으로 추진할 수 있을까요?", start: 465, end: 480 },
  { value: "예를 들면 AI 기반 설비 예지정비 시스템 같은 것이요. 안전부에서는 사고 예방 데이터를, 연구소에서는 AI 모델을 담당하면 시너지가 날 겁니다.", start: 483, end: 505 },
  { value: "동의합니다. 교육 훈련 측면에서도 이런 융합 프로젝트를 사내 교육에 활용하면 구성원 역량 개발에도 도움이 됩니다.", start: 508, end: 528 },
  // 코칭 면담 구간
  { value: "다음은 코칭 면담 실습입니다. 정 부장님이 면담자 역할을, 최 부장님이 피면담자 역할을 맡아주세요.", start: 605, end: 618 },
  { value: "최 부장님, 요즘 업무 진행은 어떠신가요? 편하게 이야기해 주세요.", start: 625, end: 635 },
  { value: "솔직히 말씀드리면, 품질경영시스템 고도화 프로젝트가 예상보다 더디게 진행되고 있습니다. 부서원들의 참여도가 낮은 게 고민입니다.", start: 638, end: 658 },
  { value: "그렇군요. 참여도가 낮은 구체적인 이유가 무엇이라고 보시나요? 예를 들어, 업무 과부하인지, 아니면 프로젝트 방향에 대한 공감이 부족한 건지요.", start: 662, end: 682 },
  { value: "아마 두 가지 다인 것 같습니다. 기존 업무도 많은데 새로운 시스템까지 익혀야 하니 부담을 느끼고 있고, 왜 이 변화가 필요한지에 대한 설명이 부족했던 것 같습니다.", start: 685, end: 710 },
  { value: "그 인식이 정확하다고 봅니다. 제가 봤을 때 최 부장님의 강점은 기술적 전문성이 뛰어나다는 점인데, 오히려 그 때문에 구성원들 눈높이에서 설명하는 부분이 약간 부족할 수 있어요. 변화의 WHY를 먼저 공유하고, 단계별로 작은 성공 경험을 만들어 가는 건 어떨까요?", start: 715, end: 752 },
  // 종합 토론 구간
  { value: "마지막으로 종합 토론입니다. 오늘 논의된 전략 과제 중 우선순위 상위 3개를 합의해 주시기 바랍니다.", start: 785, end: 800 },
  { value: "한 부장님이 제안한 안전 기술 R&D 융합 프로젝트가 1순위라고 생각합니다. 두 부서 갈등도 해결하고 실질적 성과도 낼 수 있으니까요.", start: 803, end: 823 },
  { value: "동의합니다. 2순위로는 ESG 경영 체계 구축을 제안합니다. 사회적 요구가 급증하고 있고, 규제 대응도 선제적으로 해야 합니다.", start: 826, end: 845 },
  { value: "3순위는 인재 육성 체계 개편이 적합하다고 봅니다. 앞서 논의된 융합 프로젝트를 수행하려면 결국 역량을 갖춘 인재가 있어야 합니다.", start: 848, end: 868 },
  { value: "잠재적 리스크도 짚고 가야 합니다. 융합 프로젝트는 부서간 책임 소재가 모호해질 수 있고, 예산 산정 기준도 명확히 해야 합니다. 이 부분의 거버넌스 체계를 먼저 잡아야 합니다.", start: 870, end: 895 },
];

// 화자 할당 (POC: 데모 데이터 정확 매핑 + 텍스트 패턴 폴백)
const DEMO_SPEAKERS = ["진행자", "김철수", "이영희", "박민준", "정수진", "한지원", "최동현"];

// 진행자 전용 팔레트
const MODERATOR_PALETTE = { name: "진행자", color: "#94a3b8", bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-400", ring: "ring-slate-500/15" };

// 데모 데이터의 화자를 발언 순서(인덱스)로 직접 매핑
// 0:진행자, 1:김철수(0), 2:이영희(1), 3:박민준(2), 4:정수진(3), 5:한지원(4), 6:최동현(5)
const DEMO_SPEAKER_MAP: Record<number, number> = {
  0: -1,  // 진행자: 세션 시작
  1: 0,   // 김철수: 자기소개
  2: 1,   // 이영희: 자기소개
  3: 2,   // 박민준: 자기소개
  4: 3,   // 정수진: 자기소개
  5: 4,   // 한지원: 자기소개
  6: 5,   // 최동현: 자기소개
  7: -1,  // 진행자: PEST 분석 안내
  8: 0,   // 김철수: 정치적 환경 분석
  9: 0,   // 김철수: 경제적 환경 분석 (이어서)
  10: -1, // 진행자: 이 부장님 호명
  11: 1,  // 이영희: 사회적 환경 분석
  12: 4,  // 한지원: 교차 분석 의견
  13: -1, // 진행자: 그룹 토의 전환
  14: 2,  // 박민준: R&D 예산 주장
  15: 1,  // 이영희: 안전 투자 반론
  16: 4,  // 한지원: 융합 제안
  17: 0,  // 김철수: 구체적 프로젝트 질문
  18: 4,  // 한지원: AI 예지정비 제안
  19: 3,  // 정수진: 교육 활용 동의
  20: -1, // 진행자: 코칭 면담 안내
  21: 3,  // 정수진: 면담 시작
  22: 5,  // 최동현: 고민 공유
  23: 3,  // 정수진: 후속 질문
  24: 5,  // 최동현: 원인 분석
  25: 3,  // 정수진: 코칭 피드백
  26: -1, // 진행자: 종합 토론 안내
  27: 0,  // 김철수: 1순위 제안
  28: 1,  // 이영희: 2순위 제안
  29: 3,  // 정수진: 3순위 제안
  30: 2,  // 박민준: 리스크 지적
};

function assignSpeaker(index: number, text: string): { name: string; palette: typeof SPEAKER_PALETTE[0] } {
  // 데모 데이터 직접 매핑 (정확한 화자 할당)
  if (index in DEMO_SPEAKER_MAP) {
    const speakerIdx = DEMO_SPEAKER_MAP[index];
    if (speakerIdx === -1) return { name: "진행자", palette: MODERATOR_PALETTE };
    return { name: DEMO_SPEAKERS[speakerIdx + 1], palette: SPEAKER_PALETTE[speakerIdx % SPEAKER_PALETTE.length] };
  }

  // TwelveLabs API 데이터: 텍스트 패턴 기반 폴백
  // 진행자 패턴 감지
  if (text.includes("시작하겠습니다") || text.includes("넘어가겠습니다") || text.includes("부탁드리") || text.includes("맡으셨") || text.includes("실습입니다") || text.includes("합의해 주시기")) {
    return { name: "진행자", palette: MODERATOR_PALETTE };
  }
  // 이름 패턴 매칭
  for (let i = 1; i < DEMO_SPEAKERS.length; i++) {
    if (text.includes(DEMO_SPEAKERS[i])) {
      return { name: DEMO_SPEAKERS[i], palette: SPEAKER_PALETTE[(i - 1) % SPEAKER_PALETTE.length] };
    }
  }
  // 자기 소개 패턴
  if (text.includes("부장입니다")) {
    const nameMatch = text.match(/([가-힣]{2,3})\s*부장/);
    if (nameMatch) {
      const si = DEMO_SPEAKERS.indexOf(nameMatch[1]);
      if (si > 0) return { name: nameMatch[1], palette: SPEAKER_PALETTE[(si - 1) % SPEAKER_PALETTE.length] };
    }
  }
  // 순서 기반 폴백
  const cycleIdx = index % SPEAKER_PALETTE.length;
  return { name: SPEAKER_PALETTE[cycleIdx].name, palette: SPEAKER_PALETTE[cycleIdx] };
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
  const segments = transcriptSegments && transcriptSegments.length > 0 ? transcriptSegments : DEMO_TRANSCRIPT;
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
      const { name, palette } = assignSpeaker(i, seg.value);
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
