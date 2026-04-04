'use client';

// =============================================
// HPO-23: 마이크로 러닝 추천 컴포넌트
// 약점 역량 점수 기반 맞춤형 학습 모듈 표시
// localStorage로 학습 완료 상태 저장
// =============================================

import { useState, useMemo, useEffect } from 'react';
import {
  recommendModules,
  DIFFICULTY_LABELS,
  MODULE_TYPE_LABELS,
  type LearningModule,
} from '@/lib/pov-micro-learning';
import type { FundamentalScore } from '@/lib/types';
import { BookOpen, ChevronDown, ChevronUp, CheckCircle2, Circle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  fundamentalScores: FundamentalScore[];
}

// localStorage 키 상수
const COMPLETED_KEY = 'pov-learning-completed';

// ── 학습 완료 상태 관리 훅 ─────────────────

function useCompletedModules() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // 초기 로드: localStorage에서 완료 목록 복원
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMPLETED_KEY);
      if (stored) {
        setCompleted(new Set(JSON.parse(stored) as string[]));
      }
    } catch {
      // localStorage 접근 실패 시 무시
    }
  }, []);

  const toggle = (moduleId: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      // localStorage 저장
      try {
        localStorage.setItem(COMPLETED_KEY, JSON.stringify([...next]));
      } catch {
        // 저장 실패 시 무시
      }
      return next;
    });
  };

  return { completed, toggle };
}

// ── 개별 학습 모듈 카드 ────────────────────

interface ModuleCardProps {
  module: LearningModule;
  isCompleted: boolean;
  onToggleComplete: (id: string) => void;
}

function ModuleCard({ module, isCompleted, onToggleComplete }: ModuleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const diffInfo = DIFFICULTY_LABELS[module.difficulty];
  const typeInfo = MODULE_TYPE_LABELS[module.type];

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-all',
        isCompleted
          ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-slate-200 bg-white hover:border-amber-300'
      )}
    >
      {/* 카드 헤더 */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* 학습 완료 체크 버튼 */}
        <button
          onClick={() => onToggleComplete(module.id)}
          className={cn(
            'mt-0.5 shrink-0 transition-colors',
            isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'
          )}
          title={isCompleted ? '완료 취소' : '학습 완료 표시'}
          aria-label={isCompleted ? '학습 완료 취소' : '학습 완료로 표시'}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        {/* 메인 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            {/* 모듈 타입 아이콘 + 레이블 */}
            <span className="text-xs font-mono text-slate-400">
              [{typeInfo.icon}] {typeInfo.label}
            </span>
            {/* 난이도 배지 */}
            <span
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
              style={{ backgroundColor: diffInfo.color }}
            >
              {diffInfo.label}
            </span>
            {/* 소요 시간 */}
            <span className="text-[10px] text-slate-400 ml-auto">{module.duration}</span>
          </div>

          {/* 제목 */}
          <h5
            className={cn(
              'text-sm font-semibold leading-snug',
              isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
            )}
          >
            {module.title}
          </h5>
          {/* 설명 */}
          <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>

          {/* 관련 역량/HPO 배지 */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 border border-amber-200">
              기본수칙: {module.competencyId}
            </span>
            {module.hpoToolKey && (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 border border-blue-200">
                HPO: {module.hpoToolKey}
              </span>
            )}
          </div>
        </div>

        {/* 펼치기 버튼 */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
          aria-expanded={expanded}
          aria-label="상세 내용 펼치기"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 펼쳐진 상세 내용 */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50/60">
          {/* 학습 내용 */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              학습 내용
            </p>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white rounded-lg p-3 border border-slate-100">
              {module.content}
            </div>
          </div>

          {/* 실천 과제 */}
          {module.practiceTask && (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                실천 과제
              </p>
              <div className="text-xs text-amber-700 leading-relaxed bg-amber-50 rounded-lg p-3 border border-amber-100">
                {module.practiceTask}
              </div>
            </div>
          )}

          {/* 완료 버튼 */}
          <button
            onClick={() => onToggleComplete(module.id)}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
              isCompleted
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            )}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                완료됨 — 클릭하여 취소
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                학습 완료 표시
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── 메인 MicroLearning 컴포넌트 ───────────

export default function MicroLearning({ fundamentalScores }: Props) {
  const { completed, toggle } = useCompletedModules();

  // 약점 역량 기반 추천 모듈 (최대 5개)
  const recommendedModules: LearningModule[] = useMemo(() => {
    const scores = fundamentalScores.map((f) => ({ id: f.key, score: f.score }));
    return recommendModules(scores, 5);
  }, [fundamentalScores]);

  const completedCount = recommendedModules.filter((m) => completed.has(m.id)).length;
  const totalCount = recommendedModules.length;

  if (recommendedModules.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-semibold text-slate-700">맞춤형 마이크로 러닝</h4>
          <span className="text-xs text-slate-400 font-normal">— 약점 역량 기반 추천</span>
        </div>
        {/* 완료 진행률 */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-xs text-slate-400 tabular-nums">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* 추천 안내 문구 */}
      <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-100">
        <p className="text-[11px] text-amber-700 flex items-center gap-1">
          <BookOpen className="w-3 h-3 shrink-0" />
          점수가 낮은 역량 순서로 학습 난이도를 자동으로 조정하여 추천합니다.
          학습 완료 후 체크하면 진행률이 저장됩니다.
        </p>
      </div>

      {/* 추천 모듈 리스트 */}
      <div className="p-4 space-y-2">
        {recommendedModules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            isCompleted={completed.has(module.id)}
            onToggleComplete={toggle}
          />
        ))}
      </div>
    </div>
  );
}
