// ──────────────────────────────────────────────────────
// [현재 미사용] 이 컴포넌트는 리디자인(사이클 7~8)에서
// LeadershipFeedback + AnalysisReport 구조로 대체되었습니다.
// 향후 독립 역량 상세 뷰가 필요할 때 재활용 가능.
// ──────────────────────────────────────────────────────

"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  PlayCircle,
  Save,
  ChevronDown,
  ChevronUp,
  Target,
  Scale,
  GraduationCap,
  Info,
  FileText,
  BookOpen,
  Eye,
  Ear,
  Hand,
  Smile,
  MessageCircle,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { formatTime, cn } from "@/lib/utils";
import type {
  CompetencyAssessmentData,
  DebriefingClip,
  ImprovedRubricItem,
  RubricVersion,
  MultimodalRubricItem,
} from "@/lib/leadership-rubric-data";
import { DEMO_DEBRIEFING_CLIPS, MULTIMODAL_RUBRIC } from "@/lib/leadership-rubric-data";

// 아이콘 매핑 — lucide에 Handshake가 없을 수 있으므로 대체
const ICON_MAP: Record<string, React.ElementType> = {
  Target, Scale, GraduationCap, Handshake: MessageCircle,
};

// 멀티모달 채널 아이콘
const CHANNEL_ICONS: Record<string, React.ElementType> = {
  "시각 (Visual)": Eye,
  "청각 (Vocal)": Ear,
  "언어유창성 (Fluency)": MessageCircle,
  "신체 (Body)": Hand,
  "얼굴 (Face)": Smile,
};

interface CompetencyAssessmentProps {
  data: CompetencyAssessmentData;
  onBack: () => void;
}

// 항목별 평가 상태
interface ItemScore {
  score: number;
  note: string;
}

// 멀티모달 하위지표 점수 (0~3)
interface SubIndicatorScore {
  level: number; // 0=미흡, 1=중하, 2=중상, 3=상위
  value?: string; // 측정값 (사용자 입력)
}

// ─── 공용 9점 척도 점수 선택기 ───
function ScoreSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const getLabel = (s: number) => {
    if (s >= 9) return "매우 우수";
    if (s >= 6) return "보통 이상";
    if (s >= 2) return "보통 미만";
    if (s >= 1) return "미흡";
    return "";
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const filled = n <= value;
        const tier = value >= 6 ? "high" : value >= 2 ? "mid" : "low";
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "w-7 h-7 rounded-md text-sm font-mono font-semibold transition-all duration-150",
              filled
                ? tier === "high"
                  ? "bg-teal-100 text-teal-700 border border-teal-300"
                  : tier === "mid"
                    ? "bg-amber-100 text-amber-700 border border-amber-300"
                    : "bg-red-100 text-red-600 border border-red-300"
                : "bg-slate-50/50 text-slate-400 border border-slate-200/50 hover:border-slate-200 hover:text-slate-500"
            )}
          >
            {n}
          </button>
        );
      })}
      {value > 0 && (
        <span className={cn("text-sm font-medium ml-2 tabular-nums", value >= 6 ? "text-teal-600" : value >= 2 ? "text-amber-600" : "text-red-400")}>
          {value}점 · {getLabel(value)}
        </span>
      )}
    </div>
  );
}

// ─── BARS 루브릭 테이블 (접기/펼치기) ───
function BarsRubricTable({
  item,
  isExpanded,
  onToggle,
}: {
  item: ImprovedRubricItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200/40">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white/60 hover:bg-white/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">판정 기준 보기</span>
        </div>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
      </button>
      {isExpanded && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-4 gap-px bg-slate-100/30 min-w-[600px]">
            {item.levels.map((level, li) => (
              <div key={li} className={cn("p-3 text-sm leading-relaxed", level.bgColor)}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={cn("font-bold font-mono", level.color)}>{level.range}</span>
                </div>
                <p className="text-sm font-medium text-slate-500 mb-1">{level.label}</p>
                <p className="text-sm leading-[1.5] text-slate-700/80">{level.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 멀티모달 하위지표 테이블 ───
function MultimodalIndicatorTable({
  item,
  subScores,
  onSubScoreChange,
}: {
  item: MultimodalRubricItem;
  subScores: Record<string, SubIndicatorScore>;
  onSubScoreChange: (id: string, level: number) => void;
}) {
  const ChIcon = CHANNEL_ICONS[item.channel] || Activity;
  const levelColors = ["text-red-400", "text-amber-600", "text-sky-400", "text-teal-600"];
  const levelBgColors = ["bg-red-500/10", "bg-amber-50", "bg-sky-500/10", "bg-teal-50"];

  return (
    <div className="space-y-3">
      {/* 채널 + 정의 */}
      <div className="flex items-center gap-2 mb-1">
        <ChIcon className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-sm text-slate-500">{item.channel}</span>
      </div>

      {/* 하위지표 테이블 */}
      <div className="rounded-lg overflow-x-auto border border-slate-200/40">
        {/* 헤더 */}
        <div className="grid grid-cols-[1fr_repeat(4,80px)] bg-white/80 px-3 py-2 text-sm font-medium text-slate-500 min-w-[480px]">
          <span>하위지표</span>
          <span className="text-center text-teal-600/70">상위 (3)</span>
          <span className="text-center text-sky-400/70">중상 (2)</span>
          <span className="text-center text-amber-600/70">중하 (1)</span>
          <span className="text-center text-red-400/70">미흡 (0)</span>
        </div>
        {/* 행 */}
        {item.subIndicators.map((sub) => {
          const selected = subScores[sub.id]?.level ?? -1;
          const thresholds = [sub.thresholds.upper, sub.thresholds.midHigh, sub.thresholds.midLow, sub.thresholds.poor];

          return (
            <div key={sub.id} className="border-t border-slate-200/30">
              {/* 지표명 */}
              <div className="px-3 py-2 flex items-center gap-2">
                <span className="text-sm text-slate-700">{sub.label}</span>
                <span className="text-[9px] font-mono text-slate-400">{sub.name}</span>
                {sub.condition && (
                  <span className="text-[9px] text-amber-500/70 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    조건부
                  </span>
                )}
              </div>
              {/* 임계값 + 선택 */}
              <div className="grid grid-cols-[1fr_repeat(4,80px)] px-3 pb-2">
                <span className="text-sm text-slate-400 font-mono">{sub.unit}</span>
                {thresholds.map((th, ti) => {
                  const score = 3 - ti; // 상위=3, 중상=2, 중하=1, 미흡=0
                  const isSelected = selected === score;
                  return (
                    <button
                      key={ti}
                      onClick={() => onSubScoreChange(sub.id, score)}
                      className={cn(
                        "text-center text-sm font-mono px-1 py-1 rounded transition-all mx-0.5",
                        isSelected
                          ? cn(levelBgColors[score], levelColors[score], "border", "border-current/30", "font-bold")
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      )}
                    >
                      {th}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 채점 유의사항 */}
      {item.scoringNotes.length > 0 && (
        <div className="flex items-start gap-1.5 px-1">
          <Info className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
          <div className="text-sm text-slate-400 leading-relaxed space-y-0.5">
            {item.scoringNotes.map((note, ni) => (
              <p key={ni}>· {note}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────

export default function CompetencyAssessment({ data, onBack }: CompetencyAssessmentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const IconComp = ICON_MAP[data.icon] || Target;

  // 루브릭 버전 전환
  const [rubricVersion, setRubricVersion] = useState<RubricVersion>("bars");

  // BARS 평가 상태
  const [barsScores, setBarsScores] = useState<Record<string, ItemScore>>(() =>
    Object.fromEntries(data.rubricItems.map((r) => [r.id, { score: 0, note: "" }]))
  );

  // 멀티모달 평가 상태
  const [mmSubScores, setMmSubScores] = useState<Record<string, SubIndicatorScore>>({});
  const [mmNotes, setMmNotes] = useState<Record<string, string>>({});

  const [saved, setSaved] = useState(false);
  // setTimeout cleanup 용 ref (언마운트 시 타이머 정리)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // 영상 재생
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // UI
  const [showScenario, setShowScenario] = useState(true);
  const [expandedRubrics, setExpandedRubrics] = useState<Set<string>>(new Set());
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  // 디브리핑 클립
  const clips = useMemo(
    () => DEMO_DEBRIEFING_CLIPS.filter((c) => c.competencyKey === data.key),
    [data.key]
  );

  // 총점 계산 (BARS)
  const barsTotalScore = useMemo(() => {
    const scored = Object.values(barsScores).filter((s) => s.score > 0);
    if (scored.length === 0) return 0;
    return scored.reduce((sum, s) => sum + s.score, 0) / scored.length;
  }, [barsScores]);

  const barsScoredCount = useMemo(
    () => Object.values(barsScores).filter((s) => s.score > 0).length,
    [barsScores]
  );

  // 멀티모달 항목별 점수 계산
  const mmItemScores = useMemo(() => {
    return MULTIMODAL_RUBRIC.items.map((item) => {
      const scored = item.subIndicators
        .map((sub) => mmSubScores[sub.id])
        .filter((s): s is SubIndicatorScore => s !== undefined && s.level >= 0);
      if (scored.length < 2) return { id: item.id, score: null, count: scored.length };
      const avg = scored.reduce((sum, s) => sum + s.level, 0) / scored.length;
      return { id: item.id, score: Math.min(9, Number((avg * 3).toFixed(1))), count: scored.length };
    });
  }, [mmSubScores]);

  const mmTotalScore = useMemo(() => {
    const scorable = mmItemScores.filter((i) => i.score !== null);
    if (scorable.length < 3) return null;
    return Number((scorable.reduce((sum, i) => sum + (i.score ?? 0), 0) / scorable.length).toFixed(1));
  }, [mmItemScores]);

  // 비디오
  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (v) { v.currentTime = time; v.play(); }
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
  }, []);

  // BARS 점수 업데이트
  const updateBarsScore = useCallback((id: string, score: number) => {
    setBarsScores((p) => ({ ...p, [id]: { ...p[id], score } }));
    setSaved(false);
  }, []);

  const updateBarsNote = useCallback((id: string, note: string) => {
    setBarsScores((p) => ({ ...p, [id]: { ...p[id], note } }));
    setSaved(false);
  }, []);

  // 멀티모달 점수 업데이트
  const updateMmSubScore = useCallback((id: string, level: number) => {
    setMmSubScores((p) => ({ ...p, [id]: { ...p[id], level } }));
    setSaved(false);
  }, []);

  const updateMmNote = useCallback((itemId: string, note: string) => {
    setMmNotes((p) => ({ ...p, [itemId]: note }));
    setSaved(false);
  }, []);

  // 저장
  const handleSave = useCallback(() => {
    localStorage.setItem(
      `assessment-${data.key}`,
      JSON.stringify({ competencyKey: data.key, barsScores, mmSubScores, mmNotes, savedAt: new Date().toISOString() })
    );
    setSaved(true);
    // 이전 타이머 정리 후 새 타이머 설정
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 3000);
  }, [data.key, barsScores, mmSubScores, mmNotes]);

  const toggleRubric = useCallback((id: string) => {
    setExpandedRubrics((p) => { const n = new Set(p); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  }, []);

  const handleClipClick = useCallback(
    (clip: DebriefingClip) => { setActiveClipId(clip.id === activeClipId ? null : clip.id); seekTo(clip.timestamp); },
    [activeClipId, seekTo]
  );

  const clipsByRubric = useMemo(() => {
    const map: Record<string, DebriefingClip[]> = {};
    clips.forEach((c) => { if (!map[c.rubricItemId]) map[c.rubricItemId] = []; map[c.rubricItemId].push(c); });
    return map;
  }, [clips]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 animate-slide-in-right">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-base text-slate-500 hover:text-teal-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />부장(2직급)
          </button>
          <span className="text-slate-400">/</span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${data.color}15` }}>
              <IconComp className="w-4 h-4" style={{ color: data.color }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: data.color }}>{data.label}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 현재 버전 총점 */}
          {rubricVersion === "bars" && barsScoredCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 border border-slate-200/40 rounded-lg">
              <span className="text-sm text-slate-500">BARS 평균</span>
              <span className={cn("text-base font-bold font-mono", barsTotalScore >= 6 ? "text-teal-600" : barsTotalScore >= 2 ? "text-amber-600" : "text-red-400")}>
                {barsTotalScore.toFixed(1)}
              </span>
              <span className="text-sm text-slate-400">/ 9</span>
            </div>
          )}
          {rubricVersion === "multimodal" && mmTotalScore !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 border border-slate-200/40 rounded-lg">
              <span className="text-sm text-slate-500">멀티모달 총점</span>
              <span className={cn("text-base font-bold font-mono", mmTotalScore >= 5.5 ? "text-teal-600" : mmTotalScore >= 3 ? "text-amber-600" : "text-red-400")}>
                {mmTotalScore.toFixed(1)}
              </span>
              <span className="text-sm text-slate-400">/ 9</span>
            </div>
          )}
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-base font-medium transition-all duration-200",
              saved ? "bg-teal-50 text-teal-600 border border-teal-500/30" : "bg-white text-slate-700 border border-slate-200 hover:border-teal-500/30 hover:text-teal-600"
            )}
          >
            <Save className="w-4 h-4" />{saved ? "저장 완료" : "평가 저장"}
          </button>
        </div>
      </div>

      {/* 활동 유형 + 루브릭 버전 전환 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm px-2.5 py-1 rounded-md font-medium" style={{ backgroundColor: `${data.color}15`, color: data.color }}>
            {data.scenario.activityType}
          </span>
          <span className="text-sm text-slate-400">9점 척도</span>
        </div>
        {/* 루브릭 버전 토글 */}
        <div className="flex items-center gap-1 p-1 bg-white/40 border border-slate-200/30 rounded-xl">
          <button
            onClick={() => setRubricVersion("bars")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              rubricVersion === "bars" ? "bg-slate-100/60 text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-500"
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            BARS 역량평가
          </button>
          <button
            onClick={() => setRubricVersion("multimodal")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              rubricVersion === "multimodal" ? "bg-slate-100/60 text-violet-600 shadow-sm" : "text-slate-500 hover:text-slate-500"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            멀티모달 행동기반
            <span className="text-[9px] font-mono opacity-60">{MULTIMODAL_RUBRIC.version}</span>
          </button>
        </div>
      </div>

      {/* ── 2단 레이아웃 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ─── 좌측: 영상 + 상황사례 ─── */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 lg:self-start space-y-5">
          {/* 비디오 플레이어 */}
          <div className="rounded-2xl overflow-hidden border border-slate-200/40 bg-black shadow-2xl shadow-slate-200/60">
            <video
              ref={videoRef}
              controls
              className="w-full aspect-video bg-black"
              onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>

          {/* 재생 컨트롤 */}
          <div className="bg-white/60 border border-slate-200/40 rounded-xl p-3 flex items-center gap-3">
            <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-500/25 transition-colors shrink-0">
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <span className="text-base font-mono text-slate-700 tabular-nums">{formatTime(currentTime)}</span>
          </div>

          {/* 상황 사례 */}
          <div className="bg-white/50 border border-slate-200/40 rounded-xl overflow-hidden">
            <button onClick={() => setShowScenario(!showScenario)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/70 transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-base font-medium text-slate-700">상황 사례</span>
              </div>
              {showScenario ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {showScenario && (
              <div className="px-4 pb-4 space-y-3 animate-fade-in-up">
                <p className="text-sm font-medium text-slate-500">{data.scenario.title}</p>
                <p className="text-base text-slate-500 leading-relaxed whitespace-pre-line">{data.scenario.description}</p>
                <div className="flex items-start gap-1.5 pt-1">
                  <Info className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-400 leading-relaxed">{data.scenario.reference}</p>
                </div>
              </div>
            )}
          </div>

          {/* 멀티모달 버전일 때: 점수 산식 안내 */}
          {rubricVersion === "multimodal" && (
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-violet-600 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                멀티모달 평가 산식
              </p>
              <div className="text-sm text-slate-500 space-y-1 font-mono">
                <p>{MULTIMODAL_RUBRIC.scoringFormula.subIndicatorScale}</p>
                <p>{MULTIMODAL_RUBRIC.scoringFormula.itemFormula}</p>
                <p>{MULTIMODAL_RUBRIC.scoringFormula.totalFormula}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {MULTIMODAL_RUBRIC.totalInterpretation.map((t) => (
                  <span key={t.range} className={cn("text-sm font-mono px-2 py-0.5 rounded", t.color, "bg-white/50")}>
                    {t.range} {t.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── 우측: 평가 항목 ─── */}
        <div className="lg:col-span-7 space-y-6">

          {/* ══ BARS 역량평가 루브릭 ══ */}
          {rubricVersion === "bars" && data.rubricItems.map((item, idx) => {
            const itemClips = clipsByRubric[item.id] || [];
            const itemScore = barsScores[item.id];
            return (
              <div
                key={item.id}
                className="bg-white/40 border border-slate-200/30 rounded-xl overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: "backwards", borderLeftWidth: "3px", borderLeftColor: data.color }}
              >
                {/* 항목 헤더 */}
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-slate-500">{String(idx + 1).padStart(2, "0")}</span>
                      <h3 className="text-base font-semibold text-slate-700">{item.criteria}</h3>
                      <span className="text-sm px-2 py-0.5 rounded bg-slate-100/50 text-slate-500">{item.subLabel}</span>
                    </div>
                    {itemScore.score > 0 && (
                      <span className={cn("text-sm font-mono font-bold px-2.5 py-1 rounded-lg", itemScore.score >= 6 ? "bg-teal-50 text-teal-600" : itemScore.score >= 2 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-400")}>
                        {itemScore.score}/9
                      </span>
                    )}
                  </div>
                </div>

                {/* 루브릭 테이블 */}
                <div className="px-5 pb-3">
                  <BarsRubricTable item={item} isExpanded={expandedRubrics.has(item.id)} onToggle={() => toggleRubric(item.id)} />
                </div>

                {/* 디브리핑 클립 */}
                {itemClips.length > 0 && (
                  <div className="px-5 pb-3">
                    <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">디브리핑 장면 ({itemClips.length}건)</p>
                    <div className="space-y-1.5">
                      {itemClips.map((clip) => {
                        const isClipPlaying = currentTime >= clip.timestamp && currentTime <= clip.endTime;
                        return (
                          <button
                            key={clip.id}
                            onClick={() => handleClipClick(clip)}
                            className={cn(
                              "w-full text-left rounded-lg px-3 py-2.5 transition-all duration-200 group",
                              activeClipId === clip.id ? "bg-slate-100/60 border border-slate-200/50" : "bg-white/40 border border-transparent hover:bg-slate-100/40",
                              isClipPlaying && "ring-1 ring-teal-500/30"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center gap-1 text-teal-600 font-mono text-sm shrink-0">
                                <PlayCircle className="w-3 h-3" />{formatTime(clip.timestamp)}
                              </span>
                              <span className="text-sm text-slate-500">{clip.speaker}</span>
                              {isClipPlaying && <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />}
                              {clip.suggestedScore > 0 && <span className="ml-auto text-sm font-mono text-slate-400">AI 추천: {clip.suggestedScore}점</span>}
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 group-hover:text-slate-700">{clip.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 채점 + 메모 */}
                <div className="px-5 pb-5 space-y-3 border-t border-slate-200/20 pt-3">
                  <div>
                    <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">평가 점수</p>
                    <ScoreSelector value={itemScore.score} onChange={(s) => updateBarsScore(item.id, s)} />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wider text-slate-400 mb-1.5">평가 메모</p>
                    <textarea
                      value={itemScore.note}
                      onChange={(e) => updateBarsNote(item.id, e.target.value)}
                      placeholder="관찰된 행동과 근거를 기록하세요..."
                      className="w-full bg-slate-50/60 border border-slate-200/40 rounded-lg px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 transition-all resize-none leading-relaxed"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* ══ 멀티모달 행동기반 루브릭 ══ */}
          {rubricVersion === "multimodal" && MULTIMODAL_RUBRIC.items.map((item, idx) => {
            const itemResult = mmItemScores.find((r) => r.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-white/40 border border-slate-200/30 rounded-xl overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: "backwards", borderLeftWidth: "3px", borderLeftColor: "#8b5cf6" }}
              >
                {/* 항목 헤더 */}
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-violet-600/70">{String(item.number).padStart(2, "0")}</span>
                      <h3 className="text-base font-semibold text-slate-700">{item.criteria}</h3>
                    </div>
                    {itemResult?.score !== null && itemResult?.score !== undefined && (
                      <span className={cn(
                        "text-sm font-mono font-bold px-2.5 py-1 rounded-lg",
                        itemResult.score >= 5.5 ? "bg-teal-50 text-teal-600" : itemResult.score >= 3 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-400"
                      )}>
                        {itemResult.score.toFixed(1)}/9
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.definition}</p>
                </div>

                {/* 하위지표 테이블 */}
                <div className="px-5 pb-3">
                  <MultimodalIndicatorTable
                    item={item}
                    subScores={mmSubScores}
                    onSubScoreChange={updateMmSubScore}
                  />
                </div>

                {/* 비전제시 클립 (멀티모달에서도 보여줌) */}
                {clips.length > 0 && idx < clips.length && (
                  <div className="px-5 pb-3">
                    <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">관련 장면</p>
                    <button
                      onClick={() => seekTo(clips[idx]?.timestamp || 0)}
                      className="w-full text-left rounded-lg px-3 py-2 bg-white/40 hover:bg-slate-100/40 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-violet-600 font-mono text-sm">
                          <PlayCircle className="w-3 h-3" />{formatTime(clips[idx]?.timestamp || 0)}
                        </span>
                        <span className="text-sm text-slate-500">{clips[idx]?.speaker}</span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1 mt-1 group-hover:text-slate-700">{clips[idx]?.description}</p>
                    </button>
                  </div>
                )}

                {/* 메모 */}
                <div className="px-5 pb-5 border-t border-slate-200/20 pt-3">
                  <p className="text-sm uppercase tracking-wider text-slate-400 mb-1.5">평가 메모</p>
                  <textarea
                    value={mmNotes[item.id] || ""}
                    onChange={(e) => updateMmNote(item.id, e.target.value)}
                    placeholder="행동 신호 기반 관찰 사항을 기록하세요..."
                    className="w-full bg-slate-50/60 border border-slate-200/40 rounded-lg px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/15 transition-all resize-none leading-relaxed"
                    rows={2}
                  />
                </div>
              </div>
            );
          })}

          {/* 종합 평가 요약 (BARS) */}
          {rubricVersion === "bars" && barsScoredCount === data.rubricItems.length && (
            <div className="bg-white/60 border border-slate-200/40 rounded-xl p-5 animate-fade-in-up">
              <h3 className="text-base font-medium text-slate-700 mb-3">BARS 종합 평가</h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono" style={{ color: barsTotalScore >= 6 ? "#14b8a6" : barsTotalScore >= 2 ? "#f59e0b" : "#ef4444" }}>
                    {barsTotalScore.toFixed(1)}
                  </span>
                  <span className="text-base text-slate-400">/ 9</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {data.rubricItems.map((item) => {
                  const s = barsScores[item.id].score;
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 w-32 truncate">{item.criteria}</span>
                      <div className="flex-1 h-2 bg-slate-50/60 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-500", s >= 6 ? "bg-teal-500" : s >= 2 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${(s / 9) * 100}%` }} />
                      </div>
                      <span className="text-sm font-mono text-slate-500 w-6 text-right">{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 종합 평가 요약 (멀티모달) */}
          {rubricVersion === "multimodal" && mmTotalScore !== null && (
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-5 animate-fade-in-up">
              <h3 className="text-base font-medium text-violet-600 mb-3">멀티모달 종합 평가</h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono" style={{ color: mmTotalScore >= 5.5 ? "#14b8a6" : mmTotalScore >= 3 ? "#f59e0b" : "#ef4444" }}>
                    {mmTotalScore.toFixed(1)}
                  </span>
                  <span className="text-base text-slate-400">/ 9</span>
                </div>
                <span className="text-sm text-slate-500">
                  {mmTotalScore >= 7.5 ? "매우 우수" : mmTotalScore >= 5.5 ? "보통 이상" : mmTotalScore >= 3 ? "보통 미만" : "미흡"}
                </span>
              </div>
              <div className="space-y-1.5">
                {MULTIMODAL_RUBRIC.items.map((item) => {
                  const r = mmItemScores.find((i) => i.id === item.id);
                  const s = r?.score ?? 0;
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 w-40 truncate">{item.criteria}</span>
                      <div className="flex-1 h-2 bg-slate-50/60 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-500", s >= 5.5 ? "bg-violet-500" : s >= 3 ? "bg-amber-500" : s > 0 ? "bg-red-500" : "bg-slate-100")} style={{ width: `${(s / 9) * 100}%` }} />
                      </div>
                      <span className="text-sm font-mono text-slate-500 w-8 text-right">{r?.score !== null ? s.toFixed(1) : "N/A"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
