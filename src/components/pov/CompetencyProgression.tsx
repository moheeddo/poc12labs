'use client';

// =============================================
// HPO-7: 역량 기반 진행 모델 UI
// 숙달 배지 + 진행 바 + 훈련 처방 체크리스트
// =============================================

import { CheckCircle2, ArrowRight, BookOpen, ClipboardList, Target, TrendingUp, Lock, Unlock } from 'lucide-react';
import { generatePrescription, MASTERY_LABELS, type MasteryLevel, type CompetencyMastery, type PrescriptionStep } from '@/lib/pov-competency-progression';
import type { FundamentalScore } from '@/lib/types';
import { cn } from '@/lib/utils';
import MicroLearning from '@/components/pov/MicroLearning';

interface Props {
  fundamentals: FundamentalScore[];
  procedureId: string;
  overallScore: number;
}

/** 숙달 수준 배지 */
function MasteryBadge({ level }: { level: MasteryLevel }) {
  const info = MASTERY_LABELS[level];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white shrink-0"
      style={{ backgroundColor: info.color }}
    >
      {info.label}
    </span>
  );
}

/** 역량 카드 — 현재 수준 + 다음 목표 진행 바 */
function CompetencyCard({ mastery }: { mastery: CompetencyMastery }) {
  const current = MASTERY_LABELS[mastery.currentLevel];
  const progressToNext =
    mastery.nextLevel !== null
      ? Math.min(
          100,
          Math.round(
            ((mastery.currentScore - current.minScore) /
              (MASTERY_LABELS[mastery.nextLevel].minScore - current.minScore)) *
              100,
          ),
        )
      : 100;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
      {/* 역량명 + 배지 */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700 truncate">
          {mastery.competencyName}
        </span>
        <MasteryBadge level={mastery.currentLevel} />
      </div>

      {/* 점수 + 진행 바 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono tabular-nums font-semibold" style={{ color: current.color }}>
            {mastery.currentScore}점
          </span>
          {mastery.nextLevel !== null ? (
            <span className="flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              <span style={{ color: MASTERY_LABELS[mastery.nextLevel].color }}>
                {MASTERY_LABELS[mastery.nextLevel].label} ({mastery.targetScore}점)
              </span>
            </span>
          ) : (
            <span className="text-emerald-500 font-semibold">최고 수준 달성</span>
          )}
        </div>

        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressToNext}%`,
              backgroundColor: current.color,
            }}
          />
        </div>

        {mastery.gap > 0 && (
          <p className="text-xs text-slate-400">
            +{mastery.gap}점 필요 — {mastery.suggestedPractice[0]}
          </p>
        )}
      </div>
    </div>
  );
}

/** 처방 단계 타입별 아이콘 + 색상 */
const STEP_CONFIG: Record<
  PrescriptionStep['type'],
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  review: {
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-200',
    label: '학습',
  },
  practice: {
    icon: <ClipboardList className="w-3.5 h-3.5" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    label: '실습',
  },
  assessment: {
    icon: <Target className="w-3.5 h-3.5" />,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-200',
    label: '평가',
  },
  advancement: {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-200',
    label: '진급',
  },
};

export default function CompetencyProgression({ fundamentals, procedureId, overallScore }: Props) {
  const prescription = generatePrescription(fundamentals, procedureId, overallScore);
  const overallInfo = MASTERY_LABELS[prescription.overallLevel];

  // 다음 절차 절차 ID → 붙임 번호 변환 (appendix-N → 붙임N)
  const nextProcLabel = prescription.nextRecommendedProcedure
    ? prescription.nextRecommendedProcedure.replace('appendix-', '붙임')
    : null;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-amber-600" />
        <h4 className="text-base font-semibold text-slate-700">역량 기반 진행 모델</h4>
        <span
          className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: overallInfo.color }}
        >
          종합: {overallInfo.label}
        </span>
      </div>

      {/* 역량별 숙달 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {prescription.competencies.map((mastery) => (
          <CompetencyCard key={mastery.competencyId} mastery={mastery} />
        ))}
      </div>

      {/* 다음 절차 선행조건 */}
      {nextProcLabel && (
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg border text-sm',
            prescription.prerequisitesMet
              ? 'bg-emerald-500/5 border-emerald-200 text-emerald-700'
              : 'bg-red-500/5 border-red-200 text-red-600',
          )}
        >
          {prescription.prerequisitesMet ? (
            <Unlock className="w-4 h-4 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 shrink-0" />
          )}
          <div>
            {prescription.prerequisitesMet ? (
              <span>
                <strong>다음 절차 진행 가능</strong> — {nextProcLabel} 선행 역량 충족 ✓
              </span>
            ) : (
              <span>
                <strong>선행 역량 미충족</strong> — {nextProcLabel} 진행 전 역량 보완 필요
                {prescription.competencies
                  .filter((c) => c.gap > 0 && c.currentLevel < 2)
                  .slice(0, 2)
                  .map((c) => (
                    <span key={c.competencyId} className="ml-1 font-mono text-xs">
                      ({c.competencyName} Level {c.currentLevel + 1} 필요)
                    </span>
                  ))}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 훈련 처방 단계 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h5 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4 text-amber-600" /> 훈련 처방
          <span className="text-slate-400 font-normal ml-1">— 권장 순서대로 진행</span>
        </h5>

        <ol className="space-y-2">
          {prescription.prescriptionSteps.map((step) => {
            const conf = STEP_CONFIG[step.type];
            return (
              <li
                key={step.order}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-lg border text-sm',
                  conf.bg,
                )}
              >
                {/* 순서 번호 */}
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-white',
                  )}
                  style={{
                    backgroundColor:
                      step.type === 'review'
                        ? '#3b82f6'
                        : step.type === 'practice'
                          ? '#f59e0b'
                          : step.type === 'assessment'
                            ? '#8b5cf6'
                            : '#10b981',
                  }}
                >
                  {step.order}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn('flex items-center gap-1', conf.color)}>
                      {conf.icon}
                      <span className="text-xs font-semibold">{conf.label}</span>
                    </span>
                    {step.estimatedDuration && (
                      <span className="text-xs text-slate-400 ml-auto">{step.estimatedDuration}</span>
                    )}
                  </div>
                  <p className="text-slate-600 leading-snug">{step.description}</p>
                </div>

                {/* 완료 체크박스 (인터랙션 없음, 시각적 처방 표현) */}
                <CheckCircle2 className="w-4 h-4 text-slate-200 shrink-0 mt-0.5" />
              </li>
            );
          })}
        </ol>
      </div>

      {/* HPO-23: 마이크로 러닝 추천 (약점 역량 기반) */}
      <MicroLearning fundamentalScores={fundamentals} />
    </div>
  );
}
