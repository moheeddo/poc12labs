'use client';

// =============================================
// 코호트 분석 대시보드 — 전체 훈련생 체계적 약점 탐지
// 5개 섹션: 핵심지표, 절차별 히트맵, 취약단계 Top10,
//           HPO 적용률, 개입 권고 알림
// =============================================

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  X, Users, AlertTriangle, TrendingUp, TrendingDown,
  Minus, ShieldAlert, Target, BarChart3, Activity,
} from 'lucide-react';
import type {
  CohortMetrics,
  ProcedureMetric,
  WeakStep,
  HpoAdoption,
  InterventionAlert,
} from '@/lib/pov-cohort-analytics';

interface Props {
  onClose: () => void;
}

// ── 유틸: 점수 → 배경색 클래스 (히트맵용) ──

function scoreHeatColor(score: number): string {
  if (score >= 85) return 'bg-emerald-100 text-emerald-800';
  if (score >= 70) return 'bg-teal-100 text-teal-800';
  if (score >= 55) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function scoreBarColor(score: number): string {
  if (score >= 85) return '#10b981';
  if (score >= 70) return '#14b8a6';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

// 적용률 → 색상 (초록/주황/빨강)
function adoptionColor(rate: number): string {
  if (rate >= 70) return '#10b981';
  if (rate >= 40) return '#f59e0b';
  return '#ef4444';
}

// 추세 아이콘
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

// 등급 분포 요약 텍스트
function gradeDistText(dist: Record<string, number>): string {
  const parts: string[] = [];
  for (const g of ['S', 'A', 'B', 'C', 'D', 'F']) {
    if (dist[g]) parts.push(`${g}:${dist[g]}`);
  }
  return parts.join(' / ');
}

export default function CohortAnalytics({ onClose }: Props) {
  const [metrics, setMetrics] = useState<CohortMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/twelvelabs/pov-cohort');
        if (!res.ok) throw new Error('API 호출 실패');
        const data: CohortMetrics = await res.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">코호트 분석</h2>
            <span className="text-xs text-slate-400 font-normal">전체 훈련생 대상 체계적 약점 탐지</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 본문 ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
              <span className="animate-spin">&#9696;</span>
              코호트 메트릭 집계 중...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-16 text-red-500 text-sm gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {!loading && !error && metrics && metrics.totalEvaluations === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-sm">
              <Users className="w-8 h-8 text-slate-300" />
              <span>분석 이력이 없습니다.</span>
              <span className="text-xs text-slate-300">POV 분석을 실행하면 코호트 데이터가 축적됩니다.</span>
            </div>
          )}

          {!loading && !error && metrics && metrics.totalEvaluations > 0 && (
            <>
              {/* ═══ Section A: 핵심 지표 카드 ═══ */}
              <section>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    label="총 평가 수"
                    value={`${metrics.totalEvaluations}건`}
                    sub={gradeDistText(metrics.gradeDistribution)}
                    icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
                  />
                  <MetricCard
                    label="평균 점수"
                    value={`${metrics.averageScore}점`}
                    sub={metrics.averageScore >= 70 ? '양호 구간' : '개선 필요'}
                    icon={<Target className="w-4 h-4 text-teal-500" />}
                    highlight={metrics.averageScore < 60}
                  />
                  <MetricCard
                    label="합격률 (B+)"
                    value={`${metrics.procedureMetrics.length > 0
                      ? Math.round(metrics.procedureMetrics.reduce((s, p) => s + p.passRate, 0) / metrics.procedureMetrics.length)
                      : 0}%`}
                    sub="70점 이상 비율"
                    icon={<Activity className="w-4 h-4 text-emerald-500" />}
                  />
                  <MetricCard
                    label="개입 필요"
                    value={`${metrics.interventionAlerts.filter(a => a.severity === 'high').length}건`}
                    sub={`전체 ${metrics.interventionAlerts.length}건 알림`}
                    icon={<ShieldAlert className="w-4 h-4 text-red-500" />}
                    highlight={metrics.interventionAlerts.filter(a => a.severity === 'high').length > 0}
                  />
                </div>
              </section>

              {/* ═══ Section B: 절차별 성과 히트맵 ═══ */}
              <section>
                <SectionHeader title="절차별 성과 현황" icon={<BarChart3 className="w-4 h-4 text-amber-500" />} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-slate-500 font-medium">절차명</th>
                        <th className="text-center py-2 px-2 text-slate-500 font-medium w-16">평가수</th>
                        <th className="text-center py-2 px-2 text-slate-500 font-medium w-16">평균</th>
                        <th className="text-center py-2 px-2 text-slate-500 font-medium w-20">합격률</th>
                        <th className="text-left py-2 px-3 text-slate-500 font-medium">주요 이탈 유형</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.procedureMetrics.map((pm: ProcedureMetric) => (
                        <tr key={pm.procedureId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-slate-800 font-medium text-xs">{pm.procedureTitle}</td>
                          <td className="py-2.5 px-2 text-center text-slate-600">{pm.evaluationCount}</td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${scoreHeatColor(pm.averageScore)}`}>
                              {pm.averageScore}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`text-xs font-medium ${pm.passRate >= 70 ? 'text-emerald-600' : pm.passRate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                              {pm.passRate}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex gap-1 flex-wrap">
                              {pm.commonDeviations.length > 0
                                ? pm.commonDeviations.map((d, i) => (
                                    <span key={i} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                      {d.type} ({d.count})
                                    </span>
                                  ))
                                : <span className="text-xs text-slate-300">-</span>
                              }
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ═══ Section C: 취약 단계 Top 10 ═══ */}
              <section>
                <SectionHeader title="취약 단계 Top 10" icon={<AlertTriangle className="w-4 h-4 text-red-500" />} />
                {metrics.weakestSteps.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">취약 단계가 없습니다.</p>
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={metrics.weakestSteps.map((s: WeakStep) => ({
                          name: s.description.length > 35 ? s.description.slice(0, 35) + '...' : s.description,
                          failRate: s.failRate,
                          isCritical: s.isCritical,
                        }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: '#94a3b8' }}
                          tickFormatter={(v: number) => `${v}%`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          width={250}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number) => [`${value}%`, '실패율']}
                        />
                        <Bar dataKey="failRate" radius={[0, 4, 4, 0]}>
                          {metrics.weakestSteps.map((step: WeakStep, idx: number) => (
                            <Cell
                              key={idx}
                              fill={step.isCritical ? '#ef4444' : step.failRate > 60 ? '#f97316' : '#f59e0b'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {/* 범례 */}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> 중요단계</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" /> 실패율 60%+</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> 기타</span>
                </div>
              </section>

              {/* ═══ Section D: HPO 도구 적용률 ═══ */}
              <section>
                <SectionHeader title="HPO 인적오류예방기법 적용률" icon={<Target className="w-4 h-4 text-teal-500" />} />
                {/* 기본적 vs 조건부 그룹 구분 */}
                {(['fundamental', 'conditional'] as const).map(cat => {
                  const items = metrics.hpoAdoptionRates.filter((h: HpoAdoption) => h.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className="mb-4">
                      <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                        {cat === 'fundamental' ? '기본적 예방기법' : '조건부 예방기법'}
                      </h4>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={items.map((h: HpoAdoption) => ({
                              name: h.toolName,
                              adoptionRate: h.adoptionRate,
                              category: h.category,
                            }))}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              type="number"
                              domain={[0, 100]}
                              tick={{ fontSize: 11, fill: '#94a3b8' }}
                              tickFormatter={(v: number) => `${v}%`}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              width={160}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: number) => [`${value}%`, '적용률']}
                            />
                            <Bar dataKey="adoptionRate" radius={[0, 4, 4, 0]}>
                              {items.map((h: HpoAdoption, idx: number) => (
                                <Cell key={idx} fill={adoptionColor(h.adoptionRate)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* 추세 표시 */}
                      <div className="flex flex-wrap gap-3 mt-1">
                        {items.map((h: HpoAdoption) => (
                          <span key={h.toolId} className="flex items-center gap-1 text-xs text-slate-500">
                            {h.toolName} <TrendIcon trend={h.trend} />
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* 범례 */}
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> 70%+</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> 40-70%</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> &lt;40%</span>
                </div>
              </section>

              {/* ═══ Section E: 개입 권고 알림 ═══ */}
              <section>
                <SectionHeader title="개입 권고 알림" icon={<ShieldAlert className="w-4 h-4 text-red-500" />} />
                {metrics.interventionAlerts.length === 0 ? (
                  <div className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">
                    현재 개입이 필요한 항목이 없습니다. 모든 지표가 양호합니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {metrics.interventionAlerts.map((alert: InterventionAlert, idx: number) => (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 ${
                          alert.severity === 'high'
                            ? 'border-red-200 bg-red-50/50'
                            : 'border-amber-200 bg-amber-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* 심각도 배지 */}
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold mt-0.5 ${
                            alert.severity === 'high'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {alert.severity === 'high' ? '높음' : '보통'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{alert.message}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{alert.detail}</p>
                            <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
                              <Target className="w-3 h-3 shrink-0" />
                              {alert.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ═══ 기본수칙 역량 평균 (보조) ═══ */}
              <section>
                <SectionHeader title="운전원 기본수칙 역량 평균" icon={<Activity className="w-4 h-4 text-blue-500" />} />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {metrics.fundamentalAverages.map(f => (
                    <div key={f.id} className="border border-slate-200 rounded-lg p-3 text-center hover:border-blue-300 transition-colors">
                      <p className="text-xs text-slate-500 truncate">{f.name}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: scoreBarColor(f.avgScore) }}>
                        {f.avgScore}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <TrendIcon trend={f.trend} />
                        <span className="text-[10px] text-slate-400">
                          {f.trend === 'up' ? '상승' : f.trend === 'down' ? '하락' : '유지'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        {/* ── 하단 안내 ── */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <p className="text-xs text-slate-400 text-center">
            전체 분석 이력 기반 집계 | 개입 권고: 단계실패율&gt;40%, 평균&lt;60, HPO적용&lt;30%, 중요단계위반&gt;20%
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 서브 컴포넌트: 지표 카드 ──

function MetricCard({
  label,
  value,
  sub,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`border rounded-xl p-4 ${highlight ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

// ── 서브 컴포넌트: 섹션 헤더 ──

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {icon}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
  );
}
