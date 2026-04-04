'use client';
// HPO-20: 경영진 요약 대시보드
// 프로그램 효과를 경영진에게 한 장으로 보고하기 위한 요약 대시보드 (A4 가로 인쇄 최적화)

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { X, Printer, TrendingUp, TrendingDown, Minus, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

// ── KPI 카드 데이터 ──

interface KpiCard {
  label: string;
  value: string | number;
  unit?: string;
  change: number;         // 전기 대비 변화량 (양수=증가, 음수=감소)
  changeLabel: string;   // "전분기 대비" 등
  positive: boolean;     // 변화가 긍정적인지 (증가가 좋은 경우 true)
  color: string;
}

// ── 등급별 색상 매핑 ──

const GRADE_COLORS: Record<string, string> = {
  S: '#f59e0b',   // gold
  A: '#10b981',   // emerald
  B: '#3b82f6',   // blue
  C: '#8b5cf6',   // purple
  D: '#f97316',   // orange
  F: '#ef4444',   // red
};

// ── 데모 데이터 생성 ──

function buildDemoData() {
  // KPI 카드 데이터
  const kpiCards: KpiCard[] = [
    {
      label: '총 평가 건수',
      value: 142,
      unit: '건',
      change: +18,
      changeLabel: '전분기 대비',
      positive: true,
      color: 'text-amber-600',
    },
    {
      label: '평균 점수',
      value: 76.4,
      unit: '점',
      change: +5.2,
      changeLabel: '전분기 대비',
      positive: true,
      color: 'text-blue-500',
    },
    {
      label: '합격률 (B+)',
      value: '68%',
      unit: '',
      change: +12,
      changeLabel: '전분기 대비',
      positive: true,
      color: 'text-teal-500',
    },
    {
      label: '인증 완료자',
      value: 34,
      unit: '명',
      change: +9,
      changeLabel: '전분기 대비',
      positive: true,
      color: 'text-emerald-500',
    },
    {
      label: '핵심 이탈 감소율',
      value: '23%',
      unit: '',
      change: +7,
      changeLabel: '전분기 대비',
      positive: true,
      color: 'text-purple-500',
    },
  ];

  // 등급 분포 파이 차트 데이터
  const gradeData = [
    { name: 'S', value: 8, color: GRADE_COLORS['S'] },
    { name: 'A', value: 22, color: GRADE_COLORS['A'] },
    { name: 'B', value: 47, color: GRADE_COLORS['B'] },
    { name: 'C', value: 38, color: GRADE_COLORS['C'] },
    { name: 'D', value: 19, color: GRADE_COLORS['D'] },
    { name: 'F', value: 8, color: GRADE_COLORS['F'] },
  ];

  // 월별 추이 라인 차트
  const trendData = [
    { month: '1월', avgScore: 64, passRate: 48 },
    { month: '2월', avgScore: 67, passRate: 52 },
    { month: '3월', avgScore: 69, passRate: 55 },
    { month: '4월', avgScore: 71, passRate: 58 },
    { month: '5월', avgScore: 73, passRate: 61 },
    { month: '6월', avgScore: 74, passRate: 63 },
    { month: '7월', avgScore: 76, passRate: 65 },
    { month: '8월', avgScore: 77, passRate: 67 },
    { month: '9월', avgScore: 76, passRate: 66 },
    { month: '10월', avgScore: 78, passRate: 68 },
    { month: '11월', avgScore: 79, passRate: 70 },
    { month: '12월', avgScore: 76, passRate: 68 },
  ];

  // 절차별 성과 요약 테이블
  const procedureRows = [
    { name: '냉각수 계통 기동', count: 38, avg: 82, best: 97, passRate: 79, change: +8 },
    { name: '냉각수 계통 정지', count: 35, avg: 78, best: 95, passRate: 71, change: +5 },
    { name: '순환수 계통 기동', count: 30, avg: 63, best: 88, passRate: 53, change: -3 },
    { name: '순환수 계통 정지', count: 28, avg: 69, best: 91, passRate: 57, change: +2 },
    { name: '온수 계통 교체운전', count: 11, avg: 74, best: 93, passRate: 64, change: +6 },
  ];

  // 핵심 인사이트
  const insights = [
    '전체 합격률이 전 분기 대비 12% 향상되었습니다.',
    '냉각수 계통 절차의 평균 점수가 82점으로 가장 우수합니다.',
    '순환수 계통 기동 절차의 합격률(53%)이 전 분기 대비 하락하여 집중 지원이 필요합니다.',
    'HPO 기법 중 STAR 기법의 적용률이 45%로 가장 낮습니다.',
    '인증 완료자가 34명으로, 상반기 목표의 87%를 달성하였습니다.',
  ];

  // 조치 권고
  const recommendations = [
    { priority: '高', message: '순환수 계통 교육 강화 권장 — 합격률 53%로 목표치(65%) 미달' },
    { priority: '中', message: 'STAR 기법 집중 훈련 프로그램 도입 필요 (현재 45% 적용률)' },
    { priority: '中', message: '인증 완료자 34명, 연간 목표(40명) 달성을 위한 잔여 일정 확인 요망' },
  ];

  return { kpiCards, gradeData, trendData, procedureRows, insights, recommendations };
}

// ── 변화량 배지 ──

function ChangeBadge({ change, positive }: { change: number; positive: boolean }) {
  const isGood = positive ? change >= 0 : change <= 0;
  const isNeutral = change === 0;

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
      isNeutral
        ? 'text-slate-500 bg-slate-100'
        : isGood
          ? 'text-emerald-700 bg-emerald-100'
          : 'text-red-700 bg-red-100'
    )}>
      {isNeutral ? (
        <Minus className="w-3 h-3" />
      ) : change > 0 ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {change > 0 ? `+${change}` : change}
    </span>
  );
}

// ── 메인 컴포넌트 ──

export default function ExecutiveSummary({ onClose }: Props) {
  const [data, setData] = useState<ReturnType<typeof buildDemoData> | null>(null);
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  // 실제 운영 시에는 pov-cohort + pov-benchmark API를 호출해 채운다
  useEffect(() => {
    async function load() {
      try {
        const [cohortRes, benchmarkRes] = await Promise.all([
          fetch('/api/twelvelabs/pov-cohort'),
          fetch('/api/twelvelabs/pov-benchmark'),
        ]);
        // 현재는 데모 데이터를 기본으로 사용; API 결과를 받으면 병합 가능
        // 실제 데이터가 있으면 여기서 setData(mergeApiData(cohortData, benchmarkData)) 호출
        void cohortRes; void benchmarkRes;
      } catch { /* API 실패 시 데모 데이터 유지 */ }
      setData(buildDemoData());
    }
    load();
  }, []);

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-slate-600 text-sm">데이터 로딩 중...</div>
      </div>
    );
  }

  const { kpiCards, gradeData, trendData, procedureRows, insights, recommendations } = data;
  const totalGrade = gradeData.reduce((s, g) => s + g.value, 0);

  return (
    <>
      {/* 화면 오버레이 */}
      <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-6 print:hidden">
        <div className="w-full max-w-5xl mx-4">
          {/* 닫기 / 인쇄 버튼 */}
          <div className="flex justify-end gap-2 mb-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> 인쇄 / PDF 저장
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 보고서 본문 */}
          <div id="executive-report" className="bg-white rounded-xl shadow-2xl overflow-hidden executive-report">
            {/* ── A. 헤더 ── */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Briefcase className="w-6 h-6 text-amber-400" />
                <div>
                  <h1 className="text-lg font-bold tracking-tight">HPO센터 POV 훈련 프로그램 효과 보고서</h1>
                  <p className="text-xs text-slate-300 mt-0.5">한국수력원자력 원전 운전원 훈련평가 시스템 — 경영진 요약</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-300">
                <p>{today} 기준</p>
                <p className="mt-0.5 text-slate-400">보고 주기: 분기</p>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">

              {/* ── B. KPI 카드 5개 ── */}
              <section>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">핵심 성과 지표</h2>
                <div className="grid grid-cols-5 gap-3">
                  {kpiCards.map((kpi) => (
                    <div key={kpi.label} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-xs text-slate-500 leading-tight">{kpi.label}</p>
                      <p className={cn('text-2xl font-bold mt-1 tabular-nums', kpi.color)}>
                        {kpi.value}<span className="text-sm font-normal text-slate-500 ml-0.5">{kpi.unit}</span>
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <ChangeBadge change={kpi.change} positive={kpi.positive} />
                        <span className="text-xs text-slate-400">{kpi.changeLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── C. 등급 분포 + 월별 추이 ── */}
              <div className="grid grid-cols-5 gap-4">
                {/* 등급 분포 파이 차트 */}
                <section className="col-span-2">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">등급 분포</h2>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gradeData}
                          cx="45%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={72}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name} ${Math.round((value / totalGrade) * 100)}%`}
                          labelLine={false}
                          fontSize={11}
                        >
                          {gradeData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                        />
                        <Tooltip formatter={(value: number) => [`${value}건 (${Math.round((value / totalGrade) * 100)}%)`, '평가 건수']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* 월별 추이 이중 축 차트 */}
                <section className="col-span-3">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">월별 추이</h2>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="score" domain={[50, 100]} tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="rate" orientation="right" domain={[30, 100]} tick={{ fontSize: 10 }} unit="%" />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === 'avgScore' ? `${value}점` : `${value}%`,
                            name === 'avgScore' ? '평균 점수' : '합격률',
                          ]}
                        />
                        <Line yAxisId="score" type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={2} dot={false} name="avgScore" />
                        <Line yAxisId="rate" type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="4 2" name="passRate" />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-1 justify-center">
                      <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-6 h-0.5 bg-blue-500 inline-block" /> 평균 점수</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-6 h-0.5 bg-emerald-500 inline-block border-dashed border-t-2" /> 합격률</span>
                    </div>
                  </div>
                </section>
              </div>

              {/* ── D. 절차별 성과 요약 테이블 ── */}
              <section>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">절차별 성과 요약</h2>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">절차명</th>
                        <th className="px-4 py-2.5 text-center font-semibold">평가수</th>
                        <th className="px-4 py-2.5 text-center font-semibold">평균</th>
                        <th className="px-4 py-2.5 text-center font-semibold">최고</th>
                        <th className="px-4 py-2.5 text-center font-semibold">합격률</th>
                        <th className="px-4 py-2.5 text-center font-semibold">변화</th>
                      </tr>
                    </thead>
                    <tbody>
                      {procedureRows.map((row, i) => {
                        const isGood = row.passRate >= 65;
                        const isBad = row.passRate < 55;
                        return (
                          <tr
                            key={row.name}
                            className={cn(
                              'border-t border-slate-100',
                              i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                              isGood ? 'bg-emerald-50/40' : isBad ? 'bg-red-50/40' : '',
                            )}
                          >
                            <td className={cn('px-4 py-2.5 font-medium', isGood ? 'text-emerald-700' : isBad ? 'text-red-700' : 'text-slate-700')}>
                              {row.name}
                            </td>
                            <td className="px-4 py-2.5 text-center text-slate-600">{row.count}</td>
                            <td className={cn('px-4 py-2.5 text-center font-semibold tabular-nums', isGood ? 'text-emerald-600' : isBad ? 'text-red-600' : 'text-slate-700')}>
                              {row.avg}
                            </td>
                            <td className="px-4 py-2.5 text-center text-slate-600 tabular-nums">{row.best}</td>
                            <td className={cn('px-4 py-2.5 text-center font-semibold tabular-nums', isGood ? 'text-emerald-600' : isBad ? 'text-red-600' : 'text-slate-700')}>
                              {row.passRate}%
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <ChangeBadge change={row.change} positive />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── E. 핵심 인사이트 + F. 조치 권고 ── */}
              <div className="grid grid-cols-2 gap-4">
                <section>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">핵심 인사이트</h2>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                    {insights.map((ins, i) => (
                      <div key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-amber-500 shrink-0 font-bold">{i + 1}.</span>
                        <span>{ins}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">조치 권고</h2>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-2.5 text-sm">
                        <span className={cn(
                          'shrink-0 px-1.5 py-0.5 rounded text-xs font-bold',
                          rec.priority === '高' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {rec.priority}
                        </span>
                        <span className="text-slate-700 leading-relaxed">{rec.message}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* 푸터 */}
              <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs text-slate-400">
                <span>KHNP HPO센터 — 운전원 훈련평가 AI 시스템 (POC)</span>
                <span>{today} 생성</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 인쇄 전용 스타일 (A4 가로 최적화) ── */}
      <style>{`
        @media print {
          body > *:not(#executive-report),
          .print\\:hidden {
            display: none !important;
          }
          #executive-report {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            border-radius: 0;
            box-shadow: none;
            overflow: visible;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          .executive-report {
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
}
