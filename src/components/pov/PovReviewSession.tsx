"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  AlertTriangle, CheckCircle2, XCircle, Clock,
  MessageSquare, Flag, ChevronDown, ChevronRight, ArrowLeft,
  Play, Filter, Plus, Trash2, Sparkles,
  BarChart3, Send, BookOpen,
} from "lucide-react";
import VideoPlayer from "@/components/shared/VideoPlayer";
import {
  getGradeForScore, type Procedure,
} from "@/lib/pov-standards";
import type { PovEvaluationReport, StepEvaluation } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

// ── 타입 ─────────────────────────────────────

type ReviewFilter = "all" | "fail" | "partial" | "undiscussed" | "flagged";

interface PovReviewSessionProps {
  report: PovEvaluationReport;
  procedure: Procedure;
  videoUrl: string | null;
  onBack: () => void;
  onViewReport: () => void;
}

// ── 상태 아이콘 설정 ─────────────────────────

const STATUS_CFG = {
  pass: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-500/20", label: "적합" },
  partial: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-500/20", label: "부분적합" },
  fail: { icon: <XCircle className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "부적합" },
  skipped: { icon: <Clock className="w-4 h-4" />, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", label: "미수행" },
} as const;

// ══════════════════════════════════════════════
// 메인 강평 세션 컴포넌트
// ══════════════════════════════════════════════

export default function PovReviewSession({
  report, procedure, videoUrl, onBack, onViewReport,
}: PovReviewSessionProps) {
  // ── 영상 제어 상태 ──
  const [seekTime, setSeekTime] = useState(0);
  const [seekKey, setSeekKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  // ── 강평 상태 ──
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [discussedSteps, setDiscussedSteps] = useState<Set<string>>(new Set());
  const [flaggedSteps, setFlaggedSteps] = useState<Set<string>>(new Set());
  const [overallFeedback, setOverallFeedback] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [newActionItem, setNewActionItem] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(procedure.sections.map((s) => s.id))
  );

  // 항목 스크롤 ref
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── 영상 seek ──
  const seekTo = useCallback((time: number, stepId?: string) => {
    setSeekTime(time);
    setSeekKey((k) => k + 1);
    if (stepId) {
      setActiveStepId(stepId);
      // 해당 항목으로 스크롤
      setTimeout(() => {
        itemRefs.current[stepId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, []);

  // ── 피드백 입력 ──
  const updateFeedback = useCallback((stepId: string, text: string) => {
    setFeedbacks((prev) => ({ ...prev, [stepId]: text }));
  }, []);

  // ── 논의완료 토글 ──
  const toggleDiscussed = useCallback((stepId: string) => {
    setDiscussedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
      return next;
    });
  }, []);

  // ── 후속조치 플래그 토글 ──
  const toggleFlagged = useCallback((stepId: string) => {
    setFlaggedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
      return next;
    });
  }, []);

  // ── 섹션 접기/펼치기 ──
  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── 후속조치 항목 관리 ──
  const addActionItem = useCallback(() => {
    if (!newActionItem.trim()) return;
    setActionItems((prev) => [...prev, newActionItem.trim()]);
    setNewActionItem("");
  }, [newActionItem]);

  const removeActionItem = useCallback((index: number) => {
    setActionItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── 미흡 항목 (빠른 이동용) ──
  const issueItems = useMemo(() =>
    report.stepEvaluations.filter((e) => e.status === "fail" || e.status === "partial"),
    [report.stepEvaluations]
  );

  // ── 필터링된 항목 ──
  const getFilteredEvals = useCallback((sectionStepIds: string[]) => {
    return report.stepEvaluations.filter((e) => {
      if (!sectionStepIds.includes(e.stepId)) return false;
      switch (filter) {
        case "fail": return e.status === "fail";
        case "partial": return e.status === "partial";
        case "undiscussed": return !discussedSteps.has(e.stepId) && (e.status === "fail" || e.status === "partial");
        case "flagged": return flaggedSteps.has(e.stepId);
        default: return true;
      }
    });
  }, [report.stepEvaluations, filter, discussedSteps, flaggedSteps]);

  // ── 통계 ──
  const stats = useMemo(() => {
    const total = report.stepEvaluations.length;
    const failCount = report.stepEvaluations.filter((e) => e.status === "fail").length;
    const partialCount = report.stepEvaluations.filter((e) => e.status === "partial").length;
    const issueCount = failCount + partialCount;
    const discussed = discussedSteps.size;
    const flagged = flaggedSteps.size;
    const feedbackCount = Object.values(feedbacks).filter((f) => f.trim()).length;
    return { total, failCount, partialCount, issueCount, discussed, flagged, feedbackCount };
  }, [report.stepEvaluations, discussedSteps, flaggedSteps, feedbacks]);

  const gradeInfo = getGradeForScore(report.overallScore);

  // ══════════════════════════════════════════
  // 렌더링
  // ══════════════════════════════════════════

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 animate-fade-in-up">
      {/* ── 세션 헤더 ── */}
      <div className="bg-white border border-amber-500/20 rounded-xl p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-amber-600 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> 강평 세션
              </h2>
              <span className={cn(
                "text-sm font-bold px-2 py-0.5 rounded",
                gradeInfo.bgColor, gradeInfo.color,
              )}>
                {gradeInfo.grade}등급
              </span>
              <span className="text-base font-mono text-slate-500">{report.overallScore}점</span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5 truncate">
              {report.procedureTitle} | {report.date}
            </p>
          </div>

          {/* 통계 뱃지 */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatBadge icon={<XCircle className="w-3 h-3" />} label="미흡" value={stats.issueCount} color="text-red-400" bg="bg-red-500/10" />
            <StatBadge icon={<CheckCircle2 className="w-3 h-3" />} label="논의완료" value={stats.discussed} color="text-teal-600" bg="bg-teal-50" />
            <StatBadge icon={<Flag className="w-3 h-3" />} label="후속조치" value={stats.flagged} color="text-amber-600" bg="bg-amber-50" />
            <StatBadge icon={<MessageSquare className="w-3 h-3" />} label="피드백" value={stats.feedbackCount} color="text-blue-400" bg="bg-blue-500/10" />
          </div>

          <button
            onClick={onViewReport}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" /> 리포트 보기
          </button>
        </div>
      </div>

      {/* ── 메인 2컬럼 레이아웃 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 왼쪽 — 영상 플레이어 + 빠른이동 */}
        <div className="lg:col-span-2 space-y-3">
          <div className="lg:sticky lg:top-4 space-y-3">
            {/* 비디오 플레이어 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <VideoPlayer
                src={videoUrl || undefined}
                startTime={seekTime}
                seekTrigger={seekKey}
                onTimeUpdate={setCurrentTime}
                autoPlayOnSeek
                className="w-full"
              />
              {/* 현재 재생 시간 표시 */}
              <div className="px-3 py-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Play className="w-3 h-3" />
                  현재: <span className="font-mono text-slate-700">{formatTime(currentTime)}</span>
                </span>
                {activeStepId && (
                  <span className="text-sm text-amber-600/70 font-mono">
                    ▸ {activeStepId}
                  </span>
                )}
              </div>
            </div>

            {/* 빠른 이동 — 미흡 항목만 */}
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                미흡 항목 빠른 이동 ({issueItems.length}건)
              </h4>
              <div className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-hide">
                {issueItems.map((item) => {
                  const cfg = STATUS_CFG[item.status];
                  const isActive = activeStepId === item.stepId;
                  const isDiscussed = discussedSteps.has(item.stepId);
                  return (
                    <button
                      key={item.stepId}
                      onClick={() => seekTo(item.timestamp || 0, item.stepId)}
                      className={cn(
                        "w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm",
                        isActive
                          ? "bg-amber-50 border border-amber-500/30"
                          : "hover:bg-slate-100 border border-transparent",
                        isDiscussed && "opacity-50",
                      )}
                    >
                      <span className={cn("shrink-0", cfg.color)}>{cfg.icon}</span>
                      <span className="font-mono text-amber-500/60 shrink-0 w-8">{item.stepId}</span>
                      <span className="text-slate-500 truncate flex-1">{item.description}</span>
                      <span className="font-mono text-slate-400 shrink-0">
                        {item.timestamp ? formatTime(item.timestamp) : "--:--"}
                      </span>
                      {isDiscussed && <CheckCircle2 className="w-3 h-3 text-teal-500 shrink-0" />}
                    </button>
                  );
                })}
                {issueItems.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">미흡 항목이 없습니다</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 — 평가 항목 리스트 + 필터 */}
        <div className="lg:col-span-3 space-y-3">
          {/* 필터 바 */}
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {(
              [
                { key: "all", label: "전체", count: stats.total },
                { key: "fail", label: "부적합", count: stats.failCount },
                { key: "partial", label: "부분적합", count: stats.partialCount },
                { key: "undiscussed", label: "미논의", count: stats.issueCount - stats.discussed },
                { key: "flagged", label: "후속조치", count: stats.flagged },
              ] as { key: ReviewFilter; label: string; count: number }[]
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-sm font-medium transition-all",
                  filter === f.key
                    ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                    : "text-slate-500 hover:text-slate-700 border border-transparent",
                )}
              >
                {f.label}
                <span className="ml-1 text-sm opacity-70">{f.count}</span>
              </button>
            ))}
          </div>

          {/* 섹션별 평가 항목 */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-hide pr-1">
            {procedure.sections.map((section) => {
              const sectionStepIds = section.steps.map((s) => s.id);
              const filtered = getFilteredEvals(sectionStepIds);
              if (filtered.length === 0 && filter !== "all") return null;

              const isExpanded = expandedSections.has(section.id);
              const sectionIssues = report.stepEvaluations.filter(
                (e) => sectionStepIds.includes(e.stepId) && (e.status === "fail" || e.status === "partial")
              ).length;

              return (
                <div key={section.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {/* 섹션 헤더 */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-100/50 transition-colors text-left"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    }
                    <span className="font-mono text-amber-500/60 text-sm shrink-0">{section.id}</span>
                    <span className="text-base font-medium text-slate-700 truncate">{section.title}</span>
                    <span className="ml-auto flex items-center gap-2 shrink-0">
                      {sectionIssues > 0 && (
                        <span className="text-sm px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                          미흡 {sectionIssues}
                        </span>
                      )}
                      <span className="text-sm text-slate-400">{filtered.length}건</span>
                    </span>
                  </button>

                  {/* 섹션 내 항목들 */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 divide-y divide-slate-200">
                      {filtered.map((evalItem) => (
                        <ReviewItem
                          key={evalItem.stepId}
                          evalItem={evalItem}
                          isActive={activeStepId === evalItem.stepId}
                          isDiscussed={discussedSteps.has(evalItem.stepId)}
                          isFlagged={flaggedSteps.has(evalItem.stepId)}
                          feedback={feedbacks[evalItem.stepId] || ""}
                          onSeek={(time) => seekTo(time, evalItem.stepId)}
                          onFeedbackChange={(text) => updateFeedback(evalItem.stepId, text)}
                          onToggleDiscussed={() => toggleDiscussed(evalItem.stepId)}
                          onToggleFlagged={() => toggleFlagged(evalItem.stepId)}
                          ref={(el) => { itemRefs.current[evalItem.stepId] = el; }}
                        />
                      ))}
                      {filtered.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-6">
                          현재 필터에 해당하는 항목이 없습니다
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 종합 강평 영역 ── */}
      <div className="bg-white border border-amber-500/20 rounded-xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-amber-600 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> 종합 강평
        </h3>

        {/* AI 소견 (읽기 전용) */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-3">
          <p className="text-sm text-slate-400 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI 종합 소견 (참고용)
          </p>
          <p className="text-sm text-slate-500 leading-relaxed">{report.summary}</p>
        </div>

        {/* 강사 종합 의견 입력 */}
        <div>
          <label className="text-sm text-slate-500 mb-1 block">강사/평가자 종합 의견</label>
          <textarea
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            placeholder="실습 수행에 대한 종합적인 강평을 입력하세요...&#10;&#10;예) 전반적으로 기본 절차를 숙지하고 있으나, 밸브 상태 확인 시 교차확인(Cross-Check) 기법의 적용이 부족합니다. 특히 1.1.3 단계의 경우..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 resize-y min-h-[120px] transition-colors"
          />
        </div>

        {/* 후속 조치 사항 */}
        <div>
          <label className="text-sm text-slate-500 mb-2 block flex items-center gap-1.5">
            <Flag className="w-3 h-3 text-amber-600" />
            후속 조치 사항 ({actionItems.length}건)
          </label>
          <div className="space-y-1.5 mb-2">
            {actionItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg group">
                <span className="text-sm text-amber-500/60 font-mono shrink-0">{i + 1}.</span>
                <span className="text-sm text-slate-700 flex-1">{item}</span>
                <button
                  onClick={() => removeActionItem(i)}
                  className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all p-1"
                  aria-label="삭제"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newActionItem}
              onChange={(e) => setNewActionItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addActionItem()}
              placeholder="후속 조치 항목 추가..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500/40 focus:outline-none transition-colors"
            />
            <button
              onClick={addActionItem}
              disabled={!newActionItem.trim()}
              className="px-3 py-2 rounded-lg bg-amber-50 text-amber-600 text-sm font-medium hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 추가
            </button>
          </div>
        </div>

        {/* 플래그된 항목 자동 포함 */}
        {stats.flagged > 0 && (
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
            <p className="text-sm text-red-400/70 mb-1.5 flex items-center gap-1">
              <Flag className="w-3 h-3" /> 후속조치 플래그된 평가 항목
            </p>
            <div className="space-y-1">
              {report.stepEvaluations
                .filter((e) => flaggedSteps.has(e.stepId))
                .map((e) => (
                  <div key={e.stepId} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-red-400/60">{e.stepId}</span>
                    <span className="text-slate-500 truncate">{e.description}</span>
                    {feedbacks[e.stepId] && (
                      <span className="text-blue-400/60 text-sm ml-auto shrink-0">피드백 있음</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 액션 바 ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* 진행 현황 */}
        <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
          <span>
            논의완료
            <span className="font-mono text-teal-600 ml-1">{stats.discussed}</span>
            <span className="text-slate-400">/{stats.issueCount}건</span>
          </span>
          <span>
            피드백 작성
            <span className="font-mono text-blue-400 ml-1">{stats.feedbackCount}</span>건
          </span>
          <span>
            후속조치
            <span className="font-mono text-amber-600 ml-1">{stats.flagged}</span>건
          </span>
          {/* 진행률 바 */}
          {stats.issueCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-slate-50 overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.round((stats.discussed / stats.issueCount) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-teal-600/70">
                {Math.round((stats.discussed / stats.issueCount) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={onViewReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" /> 평가 리포트
          </button>
          <button
            onClick={() => {
              // 강평 완료 — 데이터 정리 (추후 저장 API 연동)
              const sessionData = {
                reportId: report.id,
                feedbacks,
                discussedStepIds: Array.from(discussedSteps),
                flaggedStepIds: Array.from(flaggedSteps),
                overallFeedback,
                actionItems,
                completedAt: new Date().toISOString(),
              };
              console.log("[강평 세션 완료]", sessionData);
              // 추후: POST /api/pov/review-session
              alert("강평 세션이 저장되었습니다.");
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 text-sm font-semibold border border-amber-500/30 transition-all"
          >
            <Send className="w-3.5 h-3.5" /> 강평 완료 & 저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// 개별 평가 항목 카드 (강평용)
// ══════════════════════════════════════════════

import { forwardRef } from "react";

const ReviewItem = forwardRef<HTMLDivElement, {
  evalItem: StepEvaluation;
  isActive: boolean;
  isDiscussed: boolean;
  isFlagged: boolean;
  feedback: string;
  onSeek: (time: number) => void;
  onFeedbackChange: (text: string) => void;
  onToggleDiscussed: () => void;
  onToggleFlagged: () => void;
}>(function ReviewItem(
  { evalItem, isActive, isDiscussed, isFlagged, feedback, onSeek, onFeedbackChange, onToggleDiscussed, onToggleFlagged },
  ref,
) {
  const cfg = STATUS_CFG[evalItem.status];
  const [showFeedback, setShowFeedback] = useState(!!feedback || isActive);

  // active 될 때 피드백 입력란 자동 열기
  useEffect(() => {
    if (isActive) setShowFeedback(true);
  }, [isActive]);

  return (
    <div
      ref={ref}
      className={cn(
        "px-4 py-3 transition-all duration-300",
        isActive && "bg-amber-500/5 ring-1 ring-inset ring-amber-500/20",
        isDiscussed && !isActive && "bg-teal-500/[0.02]",
      )}
    >
      {/* 상단: 상태 + 설명 + 타임스탬프 */}
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0", cfg.color)}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-mono text-sm text-amber-500/60">{evalItem.stepId}</span>
            <span className={cn("text-sm px-1.5 py-0.5 rounded", cfg.bg, cfg.color)}>{cfg.label}</span>
            {isDiscussed && (
              <span className="text-sm px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> 논의완료
              </span>
            )}
            {isFlagged && (
              <span className="text-sm px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex items-center gap-0.5">
                <Flag className="w-2.5 h-2.5" /> 후속조치
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700">{evalItem.description}</p>
          {evalItem.note && (
            <p className="text-sm text-red-400/70 mt-1 flex items-start gap-1">
              <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
              {evalItem.note}
            </p>
          )}
        </div>

        {/* 타임스탬프 (클릭 → 영상 이동) */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {evalItem.timestamp !== undefined && (
            <button
              onClick={() => onSeek(evalItem.timestamp!)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-sm font-mono transition-all",
                "bg-slate-100 hover:bg-amber-500/15 hover:text-amber-600 text-slate-500",
                isActive && "bg-amber-500/15 text-amber-600",
              )}
              title="클릭하여 해당 시점으로 이동"
            >
              <Play className="w-3 h-3" />
              {formatTime(evalItem.timestamp)}
            </button>
          )}
          <span className="text-sm text-slate-400">
            신뢰도 {evalItem.confidence}%
          </span>
        </div>
      </div>

      {/* 하단: 피드백 입력 + 토글 버튼 */}
      <div className="mt-2 ml-7">
        {/* 피드백 토글 */}
        {!showFeedback ? (
          <button
            onClick={() => setShowFeedback(true)}
            className="text-sm text-blue-400/60 hover:text-blue-400 flex items-center gap-1 transition-colors"
          >
            <MessageSquare className="w-3 h-3" /> 피드백 작성
          </button>
        ) : (
          <div className="space-y-2 animate-fade-in-up">
            <textarea
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder="강사 피드백을 입력하세요..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-500/20 resize-y transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleDiscussed}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-medium transition-all border",
                  isDiscussed
                    ? "bg-teal-50 text-teal-600 border-teal-500/30"
                    : "bg-slate-100 text-slate-500 border-transparent hover:text-teal-600 hover:bg-teal-50",
                )}
              >
                <CheckCircle2 className="w-3 h-3" />
                {isDiscussed ? "논의완료" : "논의완료 처리"}
              </button>
              <button
                onClick={onToggleFlagged}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-medium transition-all border",
                  isFlagged
                    ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : "bg-slate-100 text-slate-500 border-transparent hover:text-red-400 hover:bg-red-500/10",
                )}
              >
                <Flag className="w-3 h-3" />
                {isFlagged ? "후속조치 해제" : "후속조치 지정"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════
// 통계 뱃지 서브 컴포넌트
// ══════════════════════════════════════════════

function StatBadge({ icon, label, value, color, bg }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", bg)}>
      <span className={color}>{icon}</span>
      <span className="text-sm text-slate-500">{label}</span>
      <span className={cn("text-sm font-bold font-mono", color)}>{value}</span>
    </div>
  );
}
