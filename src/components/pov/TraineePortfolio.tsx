'use client';

// =============================================
// HPO-14: 훈련생 포트폴리오 — 개인 종합 프로필 대시보드
// 훈련생 목록 관리 + 절차 진행 맵 + 역량 레이더 + 강점/성장 + 이력
// =============================================

import { useState, useEffect, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  X, UserCircle, Plus, Trash2, Lock, CheckCircle,
  AlertCircle, Award, ChevronRight, TrendingUp, TrendingDown,
  Minus, BarChart3, Target, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HPO_PROCEDURES } from '@/lib/pov-standards';
import { MASTERY_LABELS } from '@/lib/pov-competency-progression';
import type { PortfolioSummary, TraineeProfile } from '@/lib/pov-trainee-portfolio';
import type { PovEvaluationReport } from '@/lib/types';

// ── Props ─────────────────────────────────

interface Props {
  onClose: () => void;
  onViewReport?: (report: PovEvaluationReport) => void;
}

// ── 유틸 함수 ─────────────────────────────

function gradeColor(grade: string): string {
  if (grade === 'S') return 'text-emerald-600';
  if (grade === 'A') return 'text-blue-600';
  if (grade === 'B') return 'text-teal-600';
  if (grade === 'C') return 'text-amber-600';
  return 'text-red-500';
}

function gradeBg(grade: string): string {
  if (grade === 'S') return 'bg-emerald-50 border-emerald-300';
  if (grade === 'A') return 'bg-blue-50 border-blue-300';
  if (grade === 'B') return 'bg-teal-50 border-teal-300';
  if (grade === 'C') return 'bg-amber-50 border-amber-300';
  return 'bg-red-50 border-red-300';
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  } catch {
    return iso;
  }
}

function masteryBadge(level: number) {
  const m = MASTERY_LABELS[level as 0 | 1 | 2 | 3];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: m.color + '20', color: m.color, border: `1px solid ${m.color}40` }}
    >
      {m.label}
    </span>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

// ── 메인 컴포넌트 ─────────────────────────

export default function TraineePortfolio({ onClose, onViewReport }: Props) {
  const [trainees, setTrainees] = useState<TraineeProfile[]>([]);
  const [selected, setSelected] = useState<TraineeProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // 추가 폼 상태
  const [addName, setAddName] = useState('');
  const [addDept, setAddDept] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // 훈련생 목록 로드
  const fetchTrainees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/twelvelabs/pov-portfolio');
      if (res.ok) setTrainees(await res.json());
    } catch {
      // 네트워크 에러 시 빈 목록 유지
    } finally {
      setLoading(false);
    }
  }, []);

  // 포트폴리오 로드
  const fetchPortfolio = useCallback(async (id: string) => {
    setPortfolioLoading(true);
    setPortfolio(null);
    try {
      const res = await fetch(`/api/twelvelabs/pov-portfolio?id=${id}`);
      if (res.ok) setPortfolio(await res.json());
    } catch {
      // 에러 시 null 유지
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainees();
  }, [fetchTrainees]);

  // 훈련생 선택
  const handleSelect = useCallback((t: TraineeProfile) => {
    setSelected(t);
    fetchPortfolio(t.id);
  }, [fetchPortfolio]);

  // 훈련생 추가
  const handleAdd = useCallback(async () => {
    if (!addName.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/twelvelabs/pov-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim(), department: addDept.trim() || undefined }),
      });
      if (res.ok) {
        setAddName('');
        setAddDept('');
        await fetchTrainees();
      }
    } catch {
      // 에러 무시
    } finally {
      setIsAdding(false);
    }
  }, [addName, addDept, fetchTrainees]);

  // 훈련생 삭제
  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 훈련생을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/twelvelabs/pov-portfolio?id=${id}`, { method: 'DELETE' });
      if (selected?.id === id) { setSelected(null); setPortfolio(null); }
      await fetchTrainees();
    } catch {
      // 에러 무시
    }
  }, [selected, fetchTrainees]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] h-[90vh] flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-800">훈련생 포트폴리오</h2>
            <span className="text-sm text-slate-500">— 개인 종합 프로필 대시보드</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 본문: 좌측 패널 + 우측 포트폴리오 */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── 좌측: 훈련생 목록 ────────────── */}
          <div className="w-64 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
            {/* 추가 폼 */}
            <div className="p-4 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">훈련생 추가</p>
              <input
                type="text"
                placeholder="이름"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded-lg mb-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                placeholder="부서 (선택)"
                value={addDept}
                onChange={e => setAddDept(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={handleAdd}
                disabled={isAdding || !addName.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAdding ? '추가 중...' : '추가'}
              </button>
            </div>

            {/* 훈련생 목록 */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-4">로딩 중...</p>
              ) : trainees.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 leading-relaxed">
                  훈련생이 없습니다.<br />위에서 추가해주세요.
                </p>
              ) : (
                trainees.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-xl mb-1 flex items-center justify-between group transition-all',
                      selected?.id === t.id
                        ? 'bg-amber-50 border border-amber-300 shadow-sm'
                        : 'hover:bg-white hover:shadow-sm border border-transparent',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCircle className={cn('w-4 h-4 shrink-0', selected?.id === t.id ? 'text-amber-600' : 'text-slate-400')} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.name}</p>
                        {t.department && (
                          <p className="text-xs text-slate-500 truncate">{t.department}</p>
                        )}
                        <p className="text-xs text-slate-400">{shortDate(t.startDate)} 시작</p>
                      </div>
                    </div>
                    <button
                      onClick={e => handleDelete(t.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-all"
                      aria-label="삭제"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── 우측: 포트폴리오 대시보드 ────── */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">좌측에서 훈련생을 선택하세요</p>
              </div>
            ) : portfolioLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">포트폴리오 로딩 중...</p>
              </div>
            ) : portfolio ? (
              <PortfolioDashboard
                portfolio={portfolio}
                onViewReport={onViewReport}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <AlertCircle className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">포트폴리오를 불러올 수 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 포트폴리오 대시보드 (우측 패널) ────────

function PortfolioDashboard({
  portfolio,
  onViewReport,
}: {
  portfolio: PortfolioSummary;
  onViewReport?: (report: PovEvaluationReport) => void;
}) {
  const masterLevel = MASTERY_LABELS[portfolio.overallMasteryLevel as 0 | 1 | 2 | 3];

  return (
    <div className="p-6 space-y-6">

      {/* ── Section A: 프로필 헤더 ─────────────────── */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <UserCircle className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{portfolio.trainee.name}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                {portfolio.trainee.department && (
                  <span>{portfolio.trainee.department}</span>
                )}
                <span>훈련 시작: {portfolio.trainee.startDate}</span>
                <span>총 평가: {portfolio.totalEvaluations}회</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {masteryBadge(portfolio.overallMasteryLevel)}
                <span className="text-xs text-slate-500">{masterLevel.description}</span>
              </div>
            </div>
          </div>

          {/* 인증 준비 상태 */}
          <div className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium shrink-0',
            portfolio.certificationReady
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-slate-100 border-slate-300 text-slate-600',
          )}>
            {portfolio.certificationReady ? (
              <>
                <Award className="w-4 h-4" />
                인증 가능
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                {portfolio.proceduresNotStarted.length + portfolio.proceduresInProgress.length}개 절차 미완
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Section B: 절차 진행 맵 ──────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" />
          절차 진행 맵
          <span className="text-xs font-normal text-slate-500">
            완료 {portfolio.proceduresCompleted.length} / {HPO_PROCEDURES.length}개
          </span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {HPO_PROCEDURES.map(proc => {
            const isCompleted = portfolio.proceduresCompleted.includes(proc.id);
            const isInProgress = portfolio.proceduresInProgress.includes(proc.id);
            const scoreEntry = portfolio.latestScores.find(s => s.procedureId === proc.id);

            return (
              <div
                key={proc.id}
                className={cn(
                  'relative p-3 rounded-xl border text-left transition-all',
                  isCompleted
                    ? 'bg-emerald-50 border-emerald-300'
                    : isInProgress
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-slate-50 border-slate-200 opacity-70',
                )}
              >
                {/* 상태 아이콘 */}
                <div className="absolute top-2 right-2">
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : isInProgress ? (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {/* 절차 정보 */}
                <p className="text-xs font-mono text-slate-500 mb-0.5">붙임{proc.appendixNo}</p>
                <p className="text-xs font-medium text-slate-700 leading-snug pr-5">{proc.title}</p>

                {/* 점수/등급 */}
                {scoreEntry && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={cn('text-sm font-bold tabular-nums', gradeColor(scoreEntry.grade))}>
                      {scoreEntry.score}점
                    </span>
                    <span className={cn(
                      'text-xs font-medium px-1.5 py-0.5 rounded border',
                      gradeBg(scoreEntry.grade),
                      gradeColor(scoreEntry.grade),
                    )}>
                      {scoreEntry.grade}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section C: 역량 프로필 (레이더 + 목록) ───── */}
      {portfolio.competencyProfile.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 레이더 차트 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">역량 레이더</h4>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart
                data={portfolio.competencyProfile.map(c => ({
                  subject: c.name,
                  점수: c.avgScore,
                  fullMark: 100,
                }))}
              >
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Radar
                  name="역량"
                  dataKey="점수"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 역량 목록 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">역량별 숙달 현황</h4>
            <div className="space-y-2.5">
              {portfolio.competencyProfile.map(c => {
                const m = MASTERY_LABELS[c.level as 0 | 1 | 2 | 3];
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-16 text-sm font-medium text-slate-700 shrink-0">{c.name}</div>
                    {/* 점수 바 */}
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${c.avgScore}%`, backgroundColor: m.color }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-mono tabular-nums" style={{ color: m.color }}>
                        {c.avgScore}
                      </span>
                      <TrendIcon trend={c.trend} />
                      {masteryBadge(c.level)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Section D: 강점 & 성장 영역 ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 강점 */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            강점
          </h4>
          {portfolio.strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {portfolio.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-600 opacity-60">평가 이력이 없습니다</p>
          )}
        </div>

        {/* 성장 영역 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            성장 영역
          </h4>
          {portfolio.areasForGrowth.length > 0 ? (
            <ul className="space-y-1.5">
              {portfolio.areasForGrowth.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-amber-600 opacity-60">성장 영역 없음</p>
          )}

          {/* 다음 권장 행동 */}
          {portfolio.nextRecommendation && (
            <div className="mt-3 pt-3 border-t border-amber-200">
              <p className="text-xs text-amber-600 font-medium mb-1">다음 권장 행동</p>
              <div className="flex items-center gap-1.5 text-sm text-amber-800 font-medium">
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                {portfolio.nextRecommendation}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section E: 최근 평가 이력 ──────────────────── */}
      {portfolio.latestScores.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            최근 평가 이력 (절차별 최고 점수)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left pb-2 font-medium">날짜</th>
                  <th className="text-left pb-2 font-medium">절차</th>
                  <th className="text-right pb-2 font-medium">점수</th>
                  <th className="text-right pb-2 font-medium">등급</th>
                  <th className="w-8 pb-2" />
                </tr>
              </thead>
              <tbody>
                {[...portfolio.latestScores]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((s, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2 text-slate-500 text-xs">{shortDate(s.date)}</td>
                      <td className="py-2 text-slate-700 font-medium max-w-[200px] truncate pr-2">
                        {s.procedureTitle}
                      </td>
                      <td className={cn('py-2 text-right font-mono font-semibold tabular-nums', gradeColor(s.grade))}>
                        {s.score}
                      </td>
                      <td className="py-2 text-right">
                        <span className={cn(
                          'inline-block px-2 py-0.5 rounded text-xs font-semibold border',
                          gradeBg(s.grade),
                          gradeColor(s.grade),
                        )}>
                          {s.grade}
                        </span>
                      </td>
                      <td className="py-2 pl-2">
                        {onViewReport && (
                          <button
                            onClick={() => {
                              // 리포트 조회 기능은 AnalysisHistory에서 상세 구현
                              // 여기서는 안내 제공
                            }}
                            className="opacity-30 hover:opacity-70 transition-opacity"
                            title="분석 이력에서 상세 리포트를 확인하세요"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 평가 이력 없음 안내 */}
      {portfolio.totalEvaluations === 0 && (
        <div className="text-center py-8 text-slate-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">아직 평가 이력이 없습니다.</p>
          <p className="text-xs mt-1">POV 분석을 시작하면 여기에 결과가 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}
