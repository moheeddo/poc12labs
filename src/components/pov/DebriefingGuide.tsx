'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, X, CheckCircle2,
  AlertTriangle, XCircle, Lightbulb, Target, Zap, Plus,
  MessageSquare, ArrowRight,
} from 'lucide-react';
import type { PovEvaluationReport } from '@/lib/types';
import { cn } from '@/lib/utils';

// ── SBI 피드백 아이템 타입 ──────────────────────────────

export interface StructuredFeedbackItem {
  stepId: string;
  situation: string;     // 어떤 상황에서
  behavior: string;      // 어떤 행동이 관찰되었고
  impact: string;        // 그 결과/영향은 무엇이며
  category: 'strength' | 'improvement' | 'critical';
  competencyKey?: string; // 관련 기본수칙
  hpoToolKey?: string;   // 관련 HPO 도구
  actionItem?: string;   // 구체적 개선 행동
}

type DiscussionTab = 'undiscussed' | 'strength' | 'improvement' | 'critical';

interface Props {
  report: PovEvaluationReport;
  onCreateFeedback: (feedback: StructuredFeedbackItem) => void;
  onClose: () => void;
  /** 이미 생성된 SBI 피드백 목록 (외부 상태) */
  feedbacks: StructuredFeedbackItem[];
}

// ── 탭별 설정 ──────────────────────────────────────────

const TAB_CFG: Record<DiscussionTab, { label: string; color: string; bg: string; border: string }> = {
  undiscussed: { label: '미논의',   color: 'text-slate-500',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20' },
  strength:    { label: '강점',     color: 'text-teal-500',   bg: 'bg-teal-500/10',   border: 'border-teal-500/30' },
  improvement: { label: '개선',     color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
  critical:    { label: '핵심위반', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
};

// ── 역량/HPO 레이블 ────────────────────────────────────

const FUNDAMENTAL_LABELS: Record<string, string> = {
  monitor: '감시',
  control: '제어',
  conservativeBias: '보수적 판단',
  teamwork: '팀워크',
  knowledge: '지식',
};

const HPO_LABELS: Record<string, string> = {
  situationAwareness: '상황인식',
  selfCheck: '자기진단(STAR)',
  communication: '효과적 의사소통',
  procedureCompliance: '절차서 준수',
  preJobBriefing: '작업전회의',
  verificationTechnique: '확인기법',
  peerCheck: '동료점검',
  labeling: '인식표',
  stepMarkup: '수행단계 표시',
  turnover: '인수인계',
  postJobReview: '작업후 평가',
};

// ── 메인 컴포넌트 ─────────────────────────────────────

export default function DebriefingGuide({ report, onCreateFeedback, onClose, feedbacks }: Props) {
  const [tab, setTab] = useState<DiscussionTab>('undiscussed');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // SBI 편집 중인 항목 상태
  const [editing, setEditing] = useState<Record<string, Partial<StructuredFeedbackItem>>>({});

  // fail/partial 스텝만 추출
  const issueSteps = useMemo(() => {
    return report.stepEvaluations.filter(
      (e) => e.status === 'fail' || e.status === 'partial'
    );
  }, [report.stepEvaluations]);

  // 이미 피드백이 생성된 stepId 세트
  const feedbackedStepIds = useMemo(
    () => new Set(feedbacks.map((f) => f.stepId)),
    [feedbacks]
  );

  // 논의완료 진행률
  const discussedCount = feedbackedStepIds.size;
  const totalIssue = issueSteps.length;
  const progressPct = totalIssue > 0 ? Math.round((discussedCount / totalIssue) * 100) : 0;

  // 탭별 목록
  const tabItems = useMemo(() => {
    if (tab === 'undiscussed') {
      return issueSteps.filter((e) => !feedbackedStepIds.has(e.stepId));
    }
    return feedbacks.filter((f) => f.category === tab);
  }, [tab, issueSteps, feedbackedStepIds, feedbacks]);

  // RCA 연계 — deviation에서 stepId 매칭하여 rootCause 가져오기
  const getRootCause = (stepId: string) => {
    if (!report.sequenceAlignment) return null;
    return report.sequenceAlignment.deviations.find(
      (d) => d.stepIds.includes(stepId)
    )?.rootCause ?? null;
  };

  // SBI 편집 값 업데이트
  const updateEditing = (stepId: string, field: keyof StructuredFeedbackItem, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], stepId, [field]: value },
    }));
  };

  // 피드백 추가 핸들러
  const handleAdd = (stepId: string, category: StructuredFeedbackItem['category']) => {
    const base = editing[stepId] ?? {};
    const evalItem = report.stepEvaluations.find((e) => e.stepId === stepId);
    const rootCause = getRootCause(stepId);

    const feedback: StructuredFeedbackItem = {
      stepId,
      situation: base.situation ?? `${stepId} 단계 수행 시`,
      behavior: base.behavior ?? evalItem?.note ?? '행동 미기재',
      impact: base.impact ?? '',
      category,
      competencyKey: base.competencyKey ?? rootCause?.relatedFundamental,
      hpoToolKey: base.hpoToolKey ?? rootCause?.relatedHpoTool,
      actionItem: base.actionItem,
    };
    onCreateFeedback(feedback);
    // 편집 상태 초기화 + 다음 항목으로 확장
    setEditing((prev) => { const n = { ...prev }; delete n[stepId]; return n; });
    setExpandedStep(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-amber-500/20 rounded-xl overflow-hidden shadow-2xl">
      {/* ── 헤더 ──────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-2 bg-slate-800/60">
        <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-semibold text-amber-300 text-sm">SBI 디브리핑 가이드</span>

        {/* 진행률 */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-slate-400">
            <span className="font-mono text-teal-400">{discussedCount}</span>
            <span className="text-slate-500">/{totalIssue}</span> 항목 논의 완료
          </span>
          <div className="w-14 h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-teal-400">{progressPct}%</span>
        </div>

        <button
          onClick={onClose}
          className="ml-2 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── SBI 모델 설명 ─────────────────────── */}
      <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/10">
        <p className="text-xs text-amber-400/70">
          <span className="font-semibold text-amber-400">S</span>ituation (상황) →{' '}
          <span className="font-semibold text-amber-400">B</span>ehavior (행동) →{' '}
          <span className="font-semibold text-amber-400">I</span>mpact (영향) 모델로 구조화된 피드백을 제공하세요.
        </p>
      </div>

      {/* ── 탭 ───────────────────────────────── */}
      <div className="flex gap-1 px-3 py-2 border-b border-slate-700/60">
        {(Object.keys(TAB_CFG) as DiscussionTab[]).map((t) => {
          const cfg = TAB_CFG[t];
          const count = t === 'undiscussed'
            ? issueSteps.filter((e) => !feedbackedStepIds.has(e.stepId)).length
            : feedbacks.filter((f) => f.category === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all border',
                tab === t ? `${cfg.color} ${cfg.bg} ${cfg.border}` : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-700/50',
              )}
            >
              {cfg.label}
              <span className={cn('ml-1 font-mono', tab === t ? cfg.color : 'text-slate-600')}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── 항목 목록 ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {tabItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-600">
            <CheckCircle2 className="w-8 h-8" />
            <p className="text-sm">
              {tab === 'undiscussed' ? '모든 항목이 논의되었습니다' : '이 카테고리에 피드백이 없습니다'}
            </p>
          </div>
        )}

        {/* 미논의 탭: StepEvaluation 기반 SBI 작성 UI */}
        {tab === 'undiscussed' &&
          (tabItems as typeof issueSteps).map((evalItem) => {
            const isExpanded = expandedStep === evalItem.stepId;
            const isFail = evalItem.status === 'fail';
            const rootCause = getRootCause(evalItem.stepId);
            const edit = editing[evalItem.stepId] ?? {};

            return (
              <div key={evalItem.stepId} className="border-b border-slate-800">
                {/* 항목 헤더 */}
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : evalItem.stepId)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-800/50 transition-colors text-left"
                >
                  {isFail
                    ? <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  }
                  <span className="font-mono text-amber-500/60 text-xs shrink-0">{evalItem.stepId}</span>
                  <span className="text-xs text-slate-400 truncate flex-1">{evalItem.description}</span>
                  {isExpanded
                    ? <ChevronDown className="w-3 h-3 text-slate-600 shrink-0" />
                    : <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                  }
                </button>

                {/* SBI 작성 폼 */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 bg-slate-800/20">
                    {/* RCA 연계 배지 */}
                    {rootCause && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rootCause.relatedFundamental && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            기본수칙: {FUNDAMENTAL_LABELS[rootCause.relatedFundamental] ?? rootCause.relatedFundamental}
                          </span>
                        )}
                        {rootCause.relatedHpoTool && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            HPO: {HPO_LABELS[rootCause.relatedHpoTool] ?? rootCause.relatedHpoTool}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Situation */}
                    <div>
                      <label className="text-xs text-slate-500 flex items-center gap-1 mb-0.5">
                        <span className="font-bold text-amber-400">S</span> 상황
                      </label>
                      <input
                        type="text"
                        value={edit.situation ?? `${evalItem.stepId} 단계 수행 시`}
                        onChange={(e) => updateEditing(evalItem.stepId, 'situation', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none transition-colors"
                        placeholder="어떤 상황에서..."
                      />
                    </div>

                    {/* Behavior */}
                    <div>
                      <label className="text-xs text-slate-500 flex items-center gap-1 mb-0.5">
                        <span className="font-bold text-amber-400">B</span> 행동
                      </label>
                      <input
                        type="text"
                        value={edit.behavior ?? evalItem.note ?? ''}
                        onChange={(e) => updateEditing(evalItem.stepId, 'behavior', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none transition-colors"
                        placeholder="어떤 행동이 관찰되었는지..."
                      />
                    </div>

                    {/* Impact */}
                    <div>
                      <label className="text-xs text-slate-500 flex items-center gap-1 mb-0.5">
                        <span className="font-bold text-amber-400">I</span> 영향
                      </label>
                      <input
                        type="text"
                        value={edit.impact ?? ''}
                        onChange={(e) => updateEditing(evalItem.stepId, 'impact', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none transition-colors"
                        placeholder="그 결과/영향은..."
                      />
                    </div>

                    {/* 개선 행동 */}
                    <div>
                      <label className="text-xs text-slate-500 flex items-center gap-1 mb-0.5">
                        <ArrowRight className="w-3 h-3 text-teal-400" /> 개선 행동
                      </label>
                      <input
                        type="text"
                        value={edit.actionItem ?? rootCause?.remediation ?? ''}
                        onChange={(e) => updateEditing(evalItem.stepId, 'actionItem', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-teal-500/40 focus:outline-none transition-colors"
                        placeholder="구체적 개선 행동..."
                      />
                    </div>

                    {/* 빠른 분류 버튼 */}
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => handleAdd(evalItem.stepId, 'strength')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs hover:bg-teal-500/20 transition-colors"
                      >
                        <Lightbulb className="w-3 h-3" /> 강점으로 추가
                      </button>
                      <button
                        onClick={() => handleAdd(evalItem.stepId, 'improvement')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
                      >
                        <Target className="w-3 h-3" /> 개선으로 추가
                      </button>
                      {isFail && (
                        <button
                          onClick={() => handleAdd(evalItem.stepId, 'critical')}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                        >
                          <Zap className="w-3 h-3" /> 핵심 위반
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        }

        {/* 강점/개선/핵심위반 탭: 기존 피드백 목록 표시 */}
        {tab !== 'undiscussed' &&
          (tabItems as StructuredFeedbackItem[]).map((fb) => (
            <div key={`${fb.stepId}-${fb.category}`} className="px-3 py-2.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-mono text-amber-500/60 text-xs">{fb.stepId}</span>
                {fb.competencyKey && (
                  <span className="text-xs px-1 py-0.5 rounded bg-blue-500/10 text-blue-400">
                    {FUNDAMENTAL_LABELS[fb.competencyKey] ?? fb.competencyKey}
                  </span>
                )}
                {fb.hpoToolKey && (
                  <span className="text-xs px-1 py-0.5 rounded bg-purple-500/10 text-purple-400">
                    {HPO_LABELS[fb.hpoToolKey] ?? fb.hpoToolKey}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-amber-400 font-bold">S</span> {fb.situation} ·{' '}
                <span className="text-amber-400 font-bold">B</span> {fb.behavior}
                {fb.impact && <> · <span className="text-amber-400 font-bold">I</span> {fb.impact}</>}
              </p>
              {fb.actionItem && (
                <p className="text-xs text-teal-400/80 mt-0.5 flex items-center gap-1">
                  <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                  {fb.actionItem}
                </p>
              )}
            </div>
          ))
        }
      </div>

      {/* ── 하단: 추가 직접 입력 버튼 (미논의 탭에서만) ── */}
      {tab === 'undiscussed' && issueSteps.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-700/60 bg-slate-800/30">
          <p className="text-xs text-slate-600 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            항목을 클릭해 SBI 피드백을 작성하고 논의 완료로 기록하세요
          </p>
        </div>
      )}
    </div>
  );
}

// ── 작은 추가 버튼 (외부에서 가이드 토글용) ──────────────

export function DebriefingGuideToggleButton({
  onClick,
  isOpen,
  discussedCount,
  totalCount,
}: {
  onClick: () => void;
  isOpen: boolean;
  discussedCount: number;
  totalCount: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
        isOpen
          ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/25'
          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
      )}
    >
      <BookOpen className="w-3.5 h-3.5" />
      SBI 디브리핑 가이드
      {totalCount > 0 && (
        <span className={cn(
          'text-xs font-mono px-1 py-0.5 rounded',
          isOpen ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-200 text-slate-500',
        )}>
          {discussedCount}/{totalCount}
        </span>
      )}
      {!isOpen && <Plus className="w-3 h-3" />}
    </button>
  );
}
