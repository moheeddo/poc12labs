'use client';

// =============================================
// HPO-8: 학습목표 매트릭스 UI
// 사전 목표 안내 (upload phase) + 사후 달성 여부 (report phase)
// =============================================

import { CheckCircle2, XCircle, BookOpen, Target, Shield } from 'lucide-react';
import {
  generateLearningObjectives,
  assessObjectiveAchievement,
  FUNDAMENTAL_SHORT,
  HPO_TOOL_SHORT,
  type LearningObjective,
  type ObjectiveAssessment,
} from '@/lib/pov-learning-objectives';
import type { Procedure } from '@/lib/pov-standards';
import type { PovEvaluationReport } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  procedure: Procedure;
  report?: PovEvaluationReport | null; // null = 사전 목표 안내, 정의됨 = 사후 달성도
}

/** 뱃지 — 기본수칙 or HPO 도구 key */
function FundamentalBadge({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      {FUNDAMENTAL_SHORT[id] ?? id}
    </span>
  );
}

function HpoToolBadge({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
      {HPO_TOOL_SHORT[id] ?? id}
    </span>
  );
}

/** 사전 목표 행 */
function PreAnalysisRow({ objective, index }: { objective: LearningObjective; index: number }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-3 align-top">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-sm text-slate-700 leading-snug">{objective.description}</span>
        </div>
      </td>
      <td className="py-2.5 pr-3 align-top">
        <div className="flex flex-wrap gap-1">
          {objective.fundamentals.map((f) => (
            <FundamentalBadge key={f} id={f} />
          ))}
        </div>
      </td>
      <td className="py-2.5 align-top">
        <div className="flex flex-wrap gap-1">
          {objective.hpoTools.map((t) => (
            <HpoToolBadge key={t} id={t} />
          ))}
        </div>
      </td>
    </tr>
  );
}

/** 사후 달성 행 */
function PostAnalysisRow({ assessment, index }: { assessment: ObjectiveAssessment; index: number }) {
  const { objective, achieved, score, detail } = assessment;

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-3 align-top">
        <div className="flex items-center gap-2">
          {achieved ? (
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
          )}
          <span className={cn('text-sm leading-snug', achieved ? 'text-slate-700' : 'text-slate-500')}>
            {objective.description}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-3 align-top whitespace-nowrap">
        <span
          className={cn(
            'inline-block px-2 py-0.5 rounded-full text-xs font-bold font-mono',
            achieved
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-red-500/10 text-red-500',
          )}
        >
          {score}점
        </span>
        <p className="text-xs text-slate-400 mt-0.5">{detail}</p>
      </td>
      <td className="py-2.5 align-top">
        <div className="flex flex-wrap gap-1">
          {objective.fundamentals.map((f) => (
            <FundamentalBadge key={f} id={f} />
          ))}
          {objective.hpoTools.map((t) => (
            <HpoToolBadge key={t} id={t} />
          ))}
        </div>
      </td>
    </tr>
  );
}

export default function LearningObjectivesMatrix({ procedure, report }: Props) {
  const objectives = generateLearningObjectives(procedure);
  const isPostAnalysis = report != null;

  // 사후 분석 시 달성도 계산
  let assessments: ObjectiveAssessment[] = [];
  if (isPostAnalysis && report) {
    const hpoResults = report.hpoEvaluations.map((h) => ({
      toolId: h.toolKey,
      detected: h.applied,
    }));
    const stepEvaluations = report.stepEvaluations.map((se) => {
      // 해당 stepId가 procedure 내 critical step인지 확인
      const original = procedure.sections
        .flatMap((s) => s.steps)
        .find((st) => st.id === se.stepId);
      return {
        status: se.status,
        isCritical: original?.isCritical ?? false,
      };
    });

    assessments = assessObjectiveAchievement(
      objectives,
      report.procedureComplianceScore,
      hpoResults,
      stepEvaluations,
    );
  }

  // 달성 요약 수치
  const achievedCount = assessments.filter((a) => a.achieved).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in-up">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-base font-semibold text-slate-700 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-amber-600" />
          {isPostAnalysis ? '학습목표 달성도' : '이 절차에서 평가할 학습목표'}
        </h4>
        {isPostAnalysis ? (
          <span
            className={cn(
              'text-sm font-bold px-2.5 py-1 rounded-full',
              achievedCount === objectives.length
                ? 'bg-emerald-500/10 text-emerald-600'
                : achievedCount >= objectives.length / 2
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-500/10 text-red-500',
            )}
          >
            {achievedCount}/{objectives.length} 달성
          </span>
        ) : (
          <span className="text-sm text-slate-400">{objectives.length}개 목표</span>
        )}
      </div>

      {/* 범례 */}
      {!isPostAnalysis && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <BookOpen className="w-3 h-3" /> 기본수칙 역량
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <Shield className="w-3 h-3" /> HPO 기법
          </span>
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="pb-2 pr-3">학습목표</th>
              {isPostAnalysis ? (
                <>
                  <th className="pb-2 pr-3">결과</th>
                  <th className="pb-2">연관 역량/기법</th>
                </>
              ) : (
                <>
                  <th className="pb-2 pr-3">기본수칙</th>
                  <th className="pb-2">HPO 기법</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {isPostAnalysis
              ? assessments.map((assessment, i) => (
                  <PostAnalysisRow
                    key={assessment.objective.id}
                    assessment={assessment}
                    index={i}
                  />
                ))
              : objectives.map((obj, i) => (
                  <PreAnalysisRow key={obj.id} objective={obj} index={i} />
                ))}
          </tbody>
        </table>
      </div>

      {/* 사전: 평가 기준 안내 */}
      {!isPostAnalysis && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400 leading-relaxed">
            POV 영상 업로드 후 AI가 각 목표의 달성 여부를 자동 평가합니다. 절차 준수·HPO 기법 적용은
            모든 훈련에 공통 적용되며, 나머지 목표는 해당 절차의 구성에 따라 자동 선별됩니다.
          </p>
        </div>
      )}

      {/* 사후: 미달성 목표 개선 안내 */}
      {isPostAnalysis && assessments.some((a) => !a.achieved) && (
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <p className="text-xs font-semibold text-slate-600">미달성 목표 개선 방향</p>
          {assessments
            .filter((a) => !a.achieved)
            .map((a) => (
              <div
                key={a.objective.id}
                className="flex items-start gap-2 text-xs text-slate-500"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-600">{a.objective.description.slice(0, 30)}…</strong> —
                  {' '}{a.objective.assessmentCriteria}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
