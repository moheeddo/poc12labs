'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Scale, X, Flag, TrendingUp, AlertTriangle, Loader2, BookOpen,
  CheckCircle2, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalibrationSummary, InstructorNote } from '@/lib/pov-instructor-notes';

// ── Props ────────────────────────────────────

interface Props {
  onClose: () => void;
}

// ── 카테고리 레이블 ──────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  calibration: '캘리브레이션',
  workaround: '편법/우회',
  studentContext: '훈련생 맥락',
  ambiguousEvidence: '증거 모호',
  general: '일반',
};

const CATEGORY_COLORS: Record<string, string> = {
  calibration: '#3b82f6',
  workaround: '#a855f7',
  studentContext: '#22c55e',
  ambiguousEvidence: '#f97316',
  general: '#94a3b8',
};

// ── 원형 게이지 (SVG) ────────────────────────

function AccuracyGauge({ value }: { value: number }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const filled = (value / 100) * circumference;
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="rotate-[-90deg]">
      {/* 배경 트랙 */}
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      {/* 진행 호 */}
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
    </svg>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────

export default function CalibrationDashboard({ onClose }: Props) {
  const [summary, setSummary] = useState<CalibrationSummary | null>(null);
  const [flaggedNotes, setFlaggedNotes] = useState<InstructorNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sumRes, flagRes] = await Promise.all([
          fetch('/api/twelvelabs/pov-instructor-notes?type=calibration'),
          fetch('/api/twelvelabs/pov-instructor-notes?type=flagged'),
        ]);
        if (sumRes.ok) setSummary(await sumRes.json());
        if (flagRes.ok) setFlaggedNotes(await flagRes.json());
      } catch {
        // 로드 실패 무시 (POC)
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 카테고리별 바 차트 데이터
  const categoryData = summary
    ? Object.entries(summary.overridesByCategory).map(([key, count]) => ({
        name: CATEGORY_LABELS[key] || key,
        count,
        color: CATEGORY_COLORS[key] || '#94a3b8',
      }))
    : [];

  // AI가 자주 틀리는 유형 인사이트
  const insights = summary
    ? generateInsights(summary)
    : [];

  return (
    // 모달 오버레이
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
          <Scale className="w-5 h-5 text-amber-600 shrink-0" />
          <h2 className="text-lg font-bold text-slate-800 flex-1">
            AI 캘리브레이션 대시보드
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6 scrollbar-hide">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">데이터 불러오는 중...</p>
            </div>
          ) : !summary ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <BookOpen className="w-8 h-8 opacity-50" />
              <p className="text-sm">캘리브레이션 데이터가 없습니다</p>
              <p className="text-sm text-slate-400">
                강평 세션에서 AI 판정을 조정하면 여기에 집계됩니다
              </p>
            </div>
          ) : (
            <>
              {/* ── 1. AI 정확도 게이지 ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 게이지 */}
                <div className="md:col-span-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-5">
                  <div className="relative">
                    <AccuracyGauge value={summary.aiAccuracyEstimate} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn(
                        'text-3xl font-black font-mono tabular-nums',
                        summary.aiAccuracyEstimate >= 80 ? 'text-green-500' :
                        summary.aiAccuracyEstimate >= 60 ? 'text-amber-500' : 'text-red-400',
                      )}>
                        {summary.aiAccuracyEstimate}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mt-1">AI 정확도 추정</p>
                  <p className="text-sm text-slate-400 text-center mt-0.5">
                    오버라이드 {summary.totalOverrides}건 / 전체 노트 기준
                  </p>
                </div>

                {/* 요약 수치 */}
                <div className="md:col-span-2 grid grid-cols-2 gap-3">
                  {[
                    {
                      label: '총 교수자 노트',
                      value: Object.values(summary.overridesByCategory).reduce((a, b) => a + b, 0),
                      icon: <BookOpen className="w-4 h-4" />,
                      color: 'text-blue-500',
                      bg: 'bg-blue-50',
                    },
                    {
                      label: 'AI 판정 오버라이드',
                      value: summary.totalOverrides,
                      icon: <AlertTriangle className="w-4 h-4" />,
                      color: 'text-violet-500',
                      bg: 'bg-violet-50',
                    },
                    {
                      label: '판정 어려운 단계',
                      value: flaggedNotes.length,
                      icon: <Flag className="w-4 h-4" />,
                      color: 'text-orange-500',
                      bg: 'bg-orange-50',
                    },
                    {
                      label: '오버라이드 多 단계',
                      value: summary.mostOverriddenSteps.length,
                      icon: <TrendingUp className="w-4 h-4" />,
                      color: 'text-red-400',
                      bg: 'bg-red-50',
                    },
                  ].map((item) => (
                    <div key={item.label} className={cn('rounded-xl p-4 flex flex-col gap-2', item.bg)}>
                      <span className={cn('flex items-center gap-1.5 text-sm font-medium', item.color)}>
                        {item.icon}
                        {item.label}
                      </span>
                      <span className={cn('text-3xl font-bold font-mono tabular-nums', item.color)}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 2. 카테고리별 노트 분포 ── */}
              {categoryData.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-600" /> 노트 카테고리 분포
                  </h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f8fafc', fontSize: 12 }}
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} name="노트 수">
                        {categoryData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── 3. 가장 많이 오버라이드된 단계 Top 10 ── */}
              {summary.mostOverriddenSteps.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    AI 판정 오버라이드 Top {summary.mostOverriddenSteps.length} 단계
                  </h3>
                  <div className="space-y-2">
                    {summary.mostOverriddenSteps.map((step, i) => (
                      <div key={step.stepId} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-red-400/15 text-red-400 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-sm text-amber-500/80">{step.stepId}</span>
                            <span className="text-sm text-red-400 font-semibold">×{step.count}</span>
                          </div>
                          {/* 사유 목록 */}
                          {step.reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {step.reasons.slice(0, 3).map((r, ri) => (
                                <span
                                  key={ri}
                                  className="text-sm bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded truncate max-w-[200px]"
                                  title={r}
                                >
                                  {r}
                                </span>
                              ))}
                              {step.reasons.length > 3 && (
                                <span className="text-sm text-slate-400">+{step.reasons.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {/* 미니 바 */}
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5 shrink-0">
                          <div
                            className="h-full bg-red-400 rounded-full"
                            style={{
                              width: `${Math.min(100, (step.count / (summary.mostOverriddenSteps[0]?.count || 1)) * 100)}%`,
                              transition: 'width 1s ease',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 4. 플래그된 노트 목록 ── */}
              {flaggedNotes.length > 0 && (
                <div className="bg-orange-50 border border-orange-200/60 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5" /> 판정 어려운 단계 플래그 목록 ({flaggedNotes.length}건)
                  </h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide">
                    {flaggedNotes.map((note) => (
                      <div key={note.id} className="bg-white rounded-lg px-3 py-2 text-sm border border-orange-100">
                        <div className="flex items-center gap-2 mb-0.5">
                          {note.stepId && (
                            <span className="font-mono text-amber-500/80">{note.stepId}</span>
                          )}
                          <span className="text-slate-400 text-sm">{note.authorName}</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 5. AI 인사이트 ── */}
              {insights.length > 0 && (
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI가 자주 틀리는 유형 인사이트
                  </h3>
                  <ul className="space-y-2">
                    {insights.map((text, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 인사이트 텍스트 생성 ──────────────────────

function generateInsights(summary: CalibrationSummary): string[] {
  const insights: string[] = [];
  const { overridesByCategory, totalOverrides, aiAccuracyEstimate, mostOverriddenSteps } = summary;

  if (aiAccuracyEstimate < 70) {
    insights.push('AI 정확도가 70% 미만입니다. SOP 쿼리 재보정이 필요할 수 있습니다.');
  } else if (aiAccuracyEstimate >= 90) {
    insights.push('AI 정확도가 90% 이상입니다. 캘리브레이션이 잘 되어 있습니다.');
  }

  if ((overridesByCategory['ambiguousEvidence'] || 0) > totalOverrides * 0.3) {
    insights.push('"증거 모호" 카테고리 노트가 30% 이상입니다. 카메라 앵글이나 조명 조건 개선을 검토하세요.');
  }

  if ((overridesByCategory['workaround'] || 0) > 0) {
    insights.push('"편법/우회" 패턴이 감지되었습니다. SOP 절차서 업데이트 또는 추가 강의가 필요할 수 있습니다.');
  }

  if (mostOverriddenSteps.length > 0) {
    const top = mostOverriddenSteps[0];
    insights.push(
      `단계 ${top.stepId}이(가) 가장 많이 오버라이드되었습니다(${top.count}회). 해당 단계의 AI 탐지 기준을 재검토하세요.`,
    );
  }

  if (insights.length === 0) {
    insights.push('현재까지 수집된 데이터가 적어 유의미한 패턴 분석이 어렵습니다. 강평 세션을 더 진행해 주세요.');
  }

  return insights;
}
