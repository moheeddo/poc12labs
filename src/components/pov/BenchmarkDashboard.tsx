'use client';

// ══════════════════════════════════════════════════════════
// BenchmarkDashboard — 교육과정 효과 벤치마킹 대시보드
// 기간별 점수 추이, 등급 분포, 개선 지표 카드, 자동 인사이트
// ══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell,
} from 'recharts';
import { X, TrendingUp, TrendingDown, Minus, BarChart3, Lightbulb, AlertCircle, Loader2 } from 'lucide-react';
import type { BenchmarkResult, PeriodMetrics } from '@/lib/pov-benchmark';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

// 등급 색상 매핑
const GRADE_COLORS: Record<string, string> = {
  S: '#059669',  // emerald
  A: '#0284c7',  // sky
  'B+': '#16a34a', // green
  B: '#2563eb',  // blue
  C: '#d97706',  // amber
  D: '#dc2626',  // red
  F: '#7f1d1d',  // dark red
};

// 합격 등급 목록
const PASS_GRADES = ['S', 'A', 'B+', 'B'];

// ── 개선 지표 카드 ────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  positive?: boolean; // true: 양수가 좋음, false: 음수가 좋음 (이탈 감소 등)
  digits?: number;
}

function MetricCard({ label, value, unit, positive = true, digits = 1 }: MetricCardProps) {
  // 방향 판단: positive=true면 양수가 좋음, positive=false면 음수(감소)가 좋음
  const isGood = positive ? value > 0 : value > 0;
  const isBad = positive ? value < 0 : value < 0;
  const isNeutral = value === 0;

  return (
    <div className={cn(
      'rounded-xl p-4 border flex flex-col gap-1',
      isNeutral
        ? 'bg-zinc-800/40 border-zinc-700'
        : isGood
          ? 'bg-teal-500/10 border-teal-500/20'
          : 'bg-red-500/10 border-red-500/20'
    )}>
      <div className="flex items-center gap-2">
        {isNeutral
          ? <Minus className="w-4 h-4 text-zinc-400" />
          : isGood
            ? <TrendingUp className="w-4 h-4 text-teal-400" />
            : <TrendingDown className="w-4 h-4 text-red-400" />
        }
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <div className={cn(
        'text-2xl font-bold font-mono tabular-nums',
        isNeutral ? 'text-zinc-300' : isGood ? 'text-teal-400' : 'text-red-400'
      )}>
        {value > 0 ? '+' : ''}{value.toFixed(digits)}{unit}
      </div>
    </div>
  );
}

// ── 등급 분포 스택드바 데이터 변환 ────────────────────────

function toStackedBarData(periods: PeriodMetrics[]) {
  return periods.map((p) => ({
    label: p.label,
    S: p.gradeDistribution['S'] || 0,
    A: p.gradeDistribution['A'] || 0,
    'B+': p.gradeDistribution['B+'] || 0,
    B: p.gradeDistribution['B'] || 0,
    C: p.gradeDistribution['C'] || 0,
    D: p.gradeDistribution['D'] || 0,
    F: p.gradeDistribution['F'] || 0,
  }));
}

// ── 메인 컴포넌트 ────────────────────────────────────────

export default function BenchmarkDashboard({ onClose }: Props) {
  const [data, setData] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 벤치마킹 데이터 로드
  useEffect(() => {
    setLoading(true);
    fetch('/api/twelvelabs/pov-benchmark')
      .then((r) => {
        if (!r.ok) throw new Error(`서버 오류 (${r.status})`);
        return r.json() as Promise<BenchmarkResult>;
      })
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '데이터 로드 실패');
      })
      .finally(() => setLoading(false));
  }, []);

  // 추이 차트 데이터
  const trendData = data?.periods.map((p) => ({
    label: p.label,
    avgScore: p.averageScore,
    passRate: p.passRate,
    hpoRate: p.hpoAdoptionRate,
    count: p.evaluationCount,
  })) ?? [];

  // 스택드바 데이터
  const barData = data ? toStackedBarData(data.periods) : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl animate-fade-in-up">

        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-zinc-100">교육과정 효과 벤치마킹</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                기간별 성과 추이 및 교육 개입 효과 분석
                {data?.dataRange && (
                  <span className="ml-2 text-zinc-600">
                    ({data.dataRange.from} ~ {data.dataRange.to})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">벤치마킹 데이터 로드 중...</span>
          </div>
        )}

        {/* 에러 */}
        {!loading && error && (
          <div className="flex items-center gap-2 p-5 text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* 데이터 없음 */}
        {!loading && !error && data && data.periods.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
            <BarChart3 className="w-8 h-8 opacity-40" />
            <p className="text-sm">{data.insights[0]}</p>
          </div>
        )}

        {/* 데이터 표시 */}
        {!loading && !error && data && data.periods.length > 0 && (
          <div className="p-5 space-y-6">

            {/* 요약 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                <div className="text-2xl font-bold text-amber-500 font-mono">{data.totalEvaluations}</div>
                <div className="text-xs text-zinc-500 mt-0.5">총 평가 건수</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                <div className="text-2xl font-bold text-zinc-100 font-mono">
                  {data.periods[data.periods.length - 1].averageScore}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">최근 기간 평균</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                <div className={cn(
                  'text-2xl font-bold font-mono',
                  data.periods[data.periods.length - 1].passRate >= 60 ? 'text-teal-400' : 'text-amber-500'
                )}>
                  {data.periods[data.periods.length - 1].passRate}%
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">최근 합격률</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                <div className={cn(
                  'text-2xl font-bold font-mono',
                  data.improvement.trend === 'improving' ? 'text-teal-400'
                    : data.improvement.trend === 'declining' ? 'text-red-400'
                    : 'text-zinc-300'
                )}>
                  {data.improvement.trend === 'improving' ? '↑' : data.improvement.trend === 'declining' ? '↓' : '→'}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {data.improvement.trend === 'improving' ? '개선중'
                    : data.improvement.trend === 'declining' ? '하락중'
                    : '안정'}
                </div>
              </div>
            </div>

            {/* 개선 지표 카드 (기간 2개 이상인 경우만) */}
            {data.periods.length >= 2 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  전기간 대비 변화 ({data.periods[data.periods.length - 2].label} → {data.periods[data.periods.length - 1].label})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    label="평균 점수"
                    value={data.improvement.scoreChange}
                    unit="점"
                    positive={true}
                  />
                  <MetricCard
                    label="합격률"
                    value={data.improvement.passRateChange}
                    unit="%p"
                    positive={true}
                  />
                  <MetricCard
                    label="핵심 이탈 감소"
                    value={data.improvement.criticalReduction}
                    unit="건"
                    positive={true}  // 이탈 감소 = 양수 = 좋음
                  />
                  <MetricCard
                    label="HPO 적용률"
                    value={data.improvement.hpoImprovement}
                    unit="%p"
                    positive={true}
                  />
                </div>
              </div>
            )}

            {/* 기간별 추이 LineChart */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                기간별 성과 추이
              </h3>
              <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={{ stroke: '#52525b' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                      itemStyle={{ color: '#a1a1aa' }}
                      formatter={(val: number, name: string) => {
                        const labels: Record<string, string> = {
                          avgScore: '평균 점수',
                          passRate: '합격률 (%)',
                          hpoRate: 'HPO 적용률 (%)',
                        };
                        return [`${val}`, labels[name] || name];
                      }}
                    />
                    <Legend
                      formatter={(val) => {
                        const labels: Record<string, string> = {
                          avgScore: '평균 점수',
                          passRate: '합격률',
                          hpoRate: 'HPO 적용률',
                        };
                        return <span style={{ color: '#a1a1aa', fontSize: 11 }}>{labels[val] || val}</span>;
                      }}
                    />
                    <Line
                      type="monotone" dataKey="avgScore"
                      stroke="#f59e0b" strokeWidth={2.5}
                      dot={{ fill: '#f59e0b', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone" dataKey="passRate"
                      stroke="#0d9488" strokeWidth={2}
                      dot={{ fill: '#0d9488', r: 3 }}
                      strokeDasharray="5 3"
                    />
                    <Line
                      type="monotone" dataKey="hpoRate"
                      stroke="#8b5cf6" strokeWidth={1.5}
                      dot={{ fill: '#8b5cf6', r: 3 }}
                      strokeDasharray="3 3"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 등급 분포 StackedBarChart */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                기간별 등급 분포
              </h3>
              <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={{ stroke: '#52525b' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Legend
                      formatter={(val) => (
                        <span style={{ color: '#a1a1aa', fontSize: 11 }}>{val}등급</span>
                      )}
                    />
                    {/* 합격 등급 먼저, 불합격 등급은 아래 */}
                    {PASS_GRADES.map((g) => (
                      <Bar key={g} dataKey={g} stackId="grade" fill={GRADE_COLORS[g] || '#6b7280'} />
                    ))}
                    {['C', 'D', 'F'].map((g) => (
                      <Bar key={g} dataKey={g} stackId="grade" fill={GRADE_COLORS[g] || '#6b7280'} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 기간별 수치 테이블 */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">기간별 상세 메트릭</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left px-3 py-2 text-zinc-400 font-semibold">기간</th>
                      <th className="text-center px-3 py-2 text-zinc-400 font-semibold">건수</th>
                      <th className="text-center px-3 py-2 text-zinc-400 font-semibold">평균 점수</th>
                      <th className="text-center px-3 py-2 text-zinc-400 font-semibold">합격률</th>
                      <th className="text-center px-3 py-2 text-zinc-400 font-semibold">핵심 이탈</th>
                      <th className="text-center px-3 py-2 text-zinc-400 font-semibold">HPO 적용률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.periods.map((p, i) => (
                      <tr
                        key={p.label}
                        className={cn(
                          'border-b border-zinc-800/80 transition-colors',
                          i === data.periods.length - 1 ? 'bg-amber-500/5' : 'hover:bg-zinc-800/40'
                        )}
                      >
                        <td className="px-3 py-2 font-mono font-semibold text-zinc-200">
                          {p.label}
                          {i === data.periods.length - 1 && (
                            <span className="ml-2 text-amber-500 text-xs">최근</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-300">{p.evaluationCount}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold">
                          <span className={cn(
                            p.averageScore >= 80 ? 'text-teal-400'
                              : p.averageScore >= 60 ? 'text-zinc-200'
                              : 'text-amber-500'
                          )}>
                            {p.averageScore}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          <span className={p.passRate >= 60 ? 'text-teal-400' : 'text-amber-500'}>
                            {p.passRate}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-zinc-300">
                          {p.criticalViolationRate}건
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          <span className={p.hpoAdoptionRate >= 50 ? 'text-teal-400' : 'text-amber-500'}>
                            {p.hpoAdoptionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 자동 인사이트 */}
            {data.insights.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  자동 분석 인사이트
                </h3>
                <div className="space-y-2">
                  {data.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-zinc-800/40 border border-zinc-700/50 rounded-lg px-3.5 py-2.5">
                      <span className="text-amber-500 text-xs mt-0.5 shrink-0">▸</span>
                      <p className="text-sm text-zinc-300 leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
