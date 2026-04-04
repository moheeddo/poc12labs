'use client';

import { useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell,
} from 'recharts';
import { X, TrendingUp, Award, BarChart3, Target, Activity } from 'lucide-react';
import { usePovHistory, type HistoryEntry } from '@/hooks/usePovHistory';
import { HPO_PROCEDURES, HPO_TOOLS, OPERATOR_FUNDAMENTALS } from '@/lib/pov-standards';

interface Props {
  onClose: () => void;
}

// 등급 색상 반환
function gradeColor(grade: string): string {
  if (grade === 'S') return '#10b981';
  if (grade === 'A') return '#3b82f6';
  if (grade === 'B') return '#14b8a6';
  if (grade === 'C') return '#f59e0b';
  return '#ef4444';
}

// 절차 색상 팔레트 (최대 6개)
const PROCEDURE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function TraineeProgressDashboard({ onClose }: Props) {
  const { entries, loading, fetchHistory } = usePovHistory();

  // 전체 이력 로딩 (절차 필터 없음)
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Section A: 절차별 점수 추이 데이터 ────────────────────────────
  const { procedureTrendData, procedureLines } = useMemo(() => {
    // 절차별로 그룹화
    const byProcedure = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
      const list = byProcedure.get(entry.procedureId) || [];
      list.push(entry);
      byProcedure.set(entry.procedureId, list);
    }

    // 최대 6개 절차만 표시 (가장 많이 기록된 순)
    const sorted = Array.from(byProcedure.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6);

    // 각 절차의 회차별 점수 (시간순 정렬)
    const procedureLines = sorted.map(([procId, procEntries], idx) => {
      const proc = HPO_PROCEDURES.find(p => p.id === procId);
      return {
        id: procId,
        label: proc ? `붙임${proc.appendixNo}` : procId.slice(0, 8),
        color: PROCEDURE_COLORS[idx % PROCEDURE_COLORS.length],
        entries: [...procEntries].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      };
    });

    // X축: 최대 회차 수
    const maxRounds = Math.max(...procedureLines.map(p => p.entries.length), 1);
    const trendData = Array.from({ length: maxRounds }, (_, i) => {
      const point: Record<string, string | number> = { round: `${i + 1}회차` };
      for (const proc of procedureLines) {
        if (proc.entries[i]) {
          point[proc.id] = proc.entries[i].overallScore;
          point[`${proc.id}_date`] = proc.entries[i].createdAt;
          point[`${proc.id}_grade`] = proc.entries[i].grade;
        }
      }
      return point;
    });

    return { procedureTrendData: trendData, procedureLines };
  }, [entries]);

  // ── Section B: 역량 성장 레이더 데이터 ────────────────────────────
  const radarData = useMemo(() => {
    if (entries.length === 0) return [];

    // 시간순 정렬
    const sorted = [...entries].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return OPERATOR_FUNDAMENTALS.map(f => ({
      subject: f.label.replace(/ \(.*\)/, ''), // 괄호 제거 (짧게)
      첫평가: first.report.fundamentalScores.find(fs => fs.key === f.key)?.score ?? 0,
      최근평가: last.report.fundamentalScores.find(fs => fs.key === f.key)?.score ?? 0,
    }));
  }, [entries]);

  // ── Section C: HPO 도구 적용률 변화 데이터 ────────────────────────
  const hpoBarData = useMemo(() => {
    if (entries.length === 0) return [];

    // 시간순 정렬 후 이전 3회 / 최근 3회 분리
    const sorted = [...entries].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const half = Math.max(Math.floor(sorted.length / 2), 1);
    const prev3 = sorted.slice(0, Math.min(half, 3));
    const recent3 = sorted.slice(-Math.min(sorted.length - half, 3) || -1);

    // 도구별 평균 점수 계산
    return HPO_TOOLS.map(tool => {
      const avgPrev = prev3.length > 0
        ? prev3.reduce((sum, e) => {
            const ev = e.report.hpoEvaluations.find(h => h.toolKey === tool.key);
            return sum + (ev?.score ?? 0);
          }, 0) / prev3.length
        : 0;

      const avgRecent = recent3.length > 0
        ? recent3.reduce((sum, e) => {
            const ev = e.report.hpoEvaluations.find(h => h.toolKey === tool.key);
            return sum + (ev?.score ?? 0);
          }, 0) / recent3.length
        : 0;

      return {
        label: tool.label,
        이전평균: Math.round(avgPrev),
        최근평균: Math.round(avgRecent),
        color: tool.color,
      };
    });
  }, [entries]);

  // ── Section D: 핵심 지표 카드 ──────────────────────────────────────
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return { total: 0, scoreDelta: 0, bestGrade: '-', deviationReduction: 0 };
    }

    const sorted = [...entries].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const scoreDelta = last.overallScore - first.overallScore;

    // 최고 등급 (S>A>B>C>D 순)
    const gradeOrder = ['S', 'A', 'B', 'C', 'D'];
    const bestGrade = entries.reduce((best, e) => {
      const bi = gradeOrder.indexOf(best);
      const ei = gradeOrder.indexOf(e.grade);
      return ei < bi ? e.grade : best;
    }, 'D');

    // 이탈 감소율: 첫 평가 vs 최근 평가 deviations 수 비교
    const firstDev = first.report.deviations?.length ?? 0;
    const lastDev = last.report.deviations?.length ?? 0;
    const deviationReduction = firstDev > 0
      ? Math.round(((firstDev - lastDev) / firstDev) * 100)
      : 0;

    return { total: entries.length, scoreDelta, bestGrade, deviationReduction };
  }, [entries]);

  // 빈 상태 플레이스홀더용 데이터
  const isEmptyState = entries.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-700/60 w-full max-w-6xl flex flex-col overflow-hidden animate-fade-in-up">

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">역량 진행 추이 대시보드</h2>
              <p className="text-xs text-zinc-500">전체 평가 이력 기반 역량 성장 분석</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full">
                {entries.length}건 분석
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-500 text-sm gap-2">
            <span className="animate-spin text-lg">⌛</span>
            이력 불러오는 중...
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-6">

            {/* ── Section D: 핵심 지표 카드 4종 ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* 총 평가 횟수 */}
              <div className="bg-zinc-800/70 border border-zinc-700/40 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-zinc-400">총 평가 횟수</span>
                </div>
                <div className="text-3xl font-bold text-zinc-100 font-mono tabular-nums">
                  {stats.total}
                  <span className="text-base text-zinc-500 ml-1">회</span>
                </div>
                <p className="text-xs text-zinc-500">누적 POV 분석 기록</p>
              </div>

              {/* 평균 점수 변화 */}
              <div className="bg-zinc-800/70 border border-zinc-700/40 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  <span className="text-xs text-zinc-400">점수 변화</span>
                </div>
                <div className={`text-3xl font-bold font-mono tabular-nums ${
                  stats.scoreDelta > 0 ? 'text-emerald-400' :
                  stats.scoreDelta < 0 ? 'text-red-400' : 'text-zinc-400'
                }`}>
                  {stats.scoreDelta > 0 ? '+' : ''}{stats.total < 2 ? '-' : stats.scoreDelta}
                  {stats.total >= 2 && <span className="text-base ml-0.5">점</span>}
                </div>
                <p className="text-xs text-zinc-500">첫 평가 → 최근 평가</p>
              </div>

              {/* 최고 등급 */}
              <div className="bg-zinc-800/70 border border-zinc-700/40 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-zinc-400">최고 등급</span>
                </div>
                <div
                  className="text-3xl font-black font-mono"
                  style={{ color: gradeColor(stats.bestGrade) }}
                >
                  {stats.bestGrade}
                </div>
                <p className="text-xs text-zinc-500">전체 이력 중 최고 성취</p>
              </div>

              {/* 핵심 이탈 감소율 */}
              <div className="bg-zinc-800/70 border border-zinc-700/40 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-400" />
                  <span className="text-xs text-zinc-400">이탈 감소율</span>
                </div>
                <div className={`text-3xl font-bold font-mono tabular-nums ${
                  stats.deviationReduction > 0 ? 'text-emerald-400' :
                  stats.deviationReduction < 0 ? 'text-red-400' : 'text-zinc-400'
                }`}>
                  {stats.total < 2 ? '-' : `${stats.deviationReduction > 0 ? '+' : ''}${stats.deviationReduction}%`}
                </div>
                <p className="text-xs text-zinc-500">SOP 이탈 개선도</p>
              </div>
            </div>

            {/* ── 2x2 그리드: Section A + B ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Section A: 절차별 점수 추이 */}
              <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-zinc-200">절차별 점수 추이</span>
                  <span className="text-xs text-zinc-500 ml-1">회차별 종합 점수</span>
                </div>
                {isEmptyState || procedureLines.length === 0 ? (
                  <EmptyChart message="평가 이력이 없습니다." />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={procedureTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                      <XAxis
                        dataKey="round"
                        tick={{ fontSize: 11, fill: '#71717a' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#71717a' }}
                        ticks={[0, 25, 50, 75, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #3f3f46',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#e4e4e7',
                        }}
                        formatter={(value: number, name: string) => {
                          const proc = procedureLines.find(p => p.id === name);
                          return [`${value}점`, proc?.label || name];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', color: '#a1a1aa', paddingTop: '8px' }}
                        formatter={(_value: string, entry: { dataKey?: string | number | ((obj: unknown) => unknown) }) => {
                          const key = typeof entry.dataKey === 'string' ? entry.dataKey : '';
                          const proc = procedureLines.find(p => p.id === key);
                          return proc?.label || key || '';
                        }}
                      />
                      {procedureLines.map(proc => (
                        <Line
                          key={proc.id}
                          type="monotone"
                          dataKey={proc.id}
                          stroke={proc.color}
                          strokeWidth={2}
                          dot={{ r: 4, fill: proc.color, stroke: '#18181b', strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Section B: 역량 성장 레이더 */}
              <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-semibold text-zinc-200">역량 성장 레이더</span>
                  <span className="text-xs text-zinc-500 ml-1">5대 기본수칙 비교</span>
                </div>
                {isEmptyState || radarData.length === 0 ? (
                  <EmptyChart message="역량 데이터가 없습니다." />
                ) : entries.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-[220px]">
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="#3f3f46" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#a1a1aa', fontSize: 10 }}
                        />
                        <PolarRadiusAxis
                          domain={[0, 100]}
                          tick={{ fill: '#71717a', fontSize: 9 }}
                          tickCount={4}
                        />
                        <Radar
                          name="첫 평가"
                          dataKey="첫평가"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.35}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="#3f3f46" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#a1a1aa', fontSize: 10 }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 100]}
                        tick={{ fill: '#71717a', fontSize: 9 }}
                        tickCount={4}
                      />
                      {/* 첫 평가 (반투명 파란색) */}
                      <Radar
                        name="첫 평가"
                        dataKey="첫평가"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.25}
                        strokeDasharray="4 2"
                      />
                      {/* 최근 평가 (실선 앰버) */}
                      <Radar
                        name="최근 평가"
                        dataKey="최근평가"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        fillOpacity={0.35}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', color: '#a1a1aa', paddingTop: '4px' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #3f3f46',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#e4e4e7',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
                {/* 역량별 델타 표시 */}
                {entries.length >= 2 && radarData.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {radarData.map(d => {
                      const delta = d['최근평가'] as number - (d['첫평가'] as number);
                      return (
                        <span
                          key={d.subject as string}
                          className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                            delta > 0
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : delta < 0
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-zinc-700/50 text-zinc-400'
                          }`}
                        >
                          {d.subject as string} {delta > 0 ? '+' : ''}{delta}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Section C: HPO 도구 적용률 변화 ── */}
            <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-zinc-200">HPO 도구 적용률 변화</span>
                <span className="text-xs text-zinc-500 ml-1">이전 3회 평균 vs 최근 3회 평균</span>
              </div>
              {isEmptyState || hpoBarData.length === 0 ? (
                <EmptyChart message="HPO 평가 데이터가 없습니다." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={hpoBarData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 40 }}
                    barCategoryGap="20%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9.5, fill: '#71717a' }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #3f3f46',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#e4e4e7',
                      }}
                      formatter={(value: number, name: string) => [`${value}점`, name]}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ fontSize: '11px', color: '#a1a1aa', paddingBottom: '8px' }}
                    />
                    {/* 이전 평균: 반투명 */}
                    <Bar dataKey="이전평균" fill="#6366f1" fillOpacity={0.5} radius={[3, 3, 0, 0]}>
                      {hpoBarData.map((_, index) => (
                        <Cell key={`prev-${index}`} fill="#6366f1" fillOpacity={0.5} />
                      ))}
                    </Bar>
                    {/* 최근 평균: 각 도구 고유 색상 */}
                    <Bar dataKey="최근평균" radius={[3, 3, 0, 0]}>
                      {hpoBarData.map((entry, index) => (
                        <Cell key={`recent-${index}`} fill={entry.color} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 빈 상태 안내 */}
            {isEmptyState && (
              <div className="bg-zinc-800/30 border border-dashed border-zinc-700 rounded-xl p-8 text-center">
                <TrendingUp className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 font-medium">아직 분석 이력이 없습니다</p>
                <p className="text-xs text-zinc-600 mt-1.5">
                  POV 분석을 실행하면 자동으로 이력이 저장되고, 여기서 역량 성장 추이를 확인할 수 있습니다.
                </p>
              </div>
            )}

          </div>
        )}

        {/* ── 하단 안내 ── */}
        <div className="px-6 py-3 border-t border-zinc-700/40 bg-zinc-800/30">
          <p className="text-xs text-zinc-600 text-center">
            전체 이력 기반 분석 | 최신 50건 반영 | 절차별 최대 6개 라인 표시
          </p>
        </div>
      </div>
    </div>
  );
}

// 빈 차트 플레이스홀더
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-zinc-600">
      <BarChart3 className="w-8 h-8 text-zinc-700" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
