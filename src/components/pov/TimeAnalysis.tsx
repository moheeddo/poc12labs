'use client';

// ══════════════════════════════════════════════
// HPO-15: 수행 시간 분석 — 단계별 소요시간 바차트 + 이상 구간 탐지
// ══════════════════════════════════════════════

import { useMemo } from 'react';
import { Clock, Timer, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import type { PovEvaluationReport, DetectedStep } from '@/lib/types';
import type { Procedure } from '@/lib/pov-standards';
import { cn } from '@/lib/utils';

// ── 타입 ─────────────────────────────────────

interface Props {
  report: PovEvaluationReport;
  procedure: Procedure;
}

interface StepTimingData {
  stepId: string;
  duration: number;     // 소요시간 (초)
  status: 'normal' | 'long' | 'short'; // 정상 | 비정상 장시간 | 비정상 단시간
}

// 커스텀 툴팁
function CustomTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: StepTimingData }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const statusLabel =
    d.status === 'long' ? '비정상 장시간' :
    d.status === 'short' ? '비정상 단시간' :
    '정상';
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-mono text-amber-500">{d.stepId}</p>
      <p className="text-slate-700">{d.duration}초</p>
      <p className={cn(
        'text-sm',
        d.status === 'long' ? 'text-red-400' :
        d.status === 'short' ? 'text-orange-400' :
        'text-teal-500',
      )}>{statusLabel}</p>
    </div>
  );
}

// 초 → "분:초" 문자열 포맷
function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s}초`;
  return `${m}분 ${s}초`;
}

// ══════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════

export default function TimeAnalysis({ report, procedure }: Props) {

  // ── 단계별 소요시간 계산 ──
  const timingData = useMemo<StepTimingData[]>(() => {
    // stepEvaluations에서 timestamp, endTime을 가져오기
    // report.stepEvaluations 에는 timestamp 있고 endTime은 없으므로
    // 실제 파이프라인 결과(handObjectEvents / 직접 DetectedStep)에서 endTime 보완 시도
    const detectedMap = new Map<string, Pick<DetectedStep, 'timestamp' | 'endTime'>>();

    // handObjectEvents에서 각 stepId별 endTime 보완
    if (report.handObjectEvents) {
      for (const ev of report.handObjectEvents) {
        const existing = detectedMap.get(ev.stepId);
        if (!existing || ev.endTime > existing.endTime) {
          detectedMap.set(ev.stepId, { timestamp: ev.timestamp, endTime: ev.endTime });
        }
      }
    }

    return report.stepEvaluations
      .filter((se) => se.timestamp !== undefined)
      .map((se): StepTimingData => {
        // endTime 우선순위: handObjectEvents → stepEvaluations 다음 항목 추정 → timestamp + 20s
        const detected = detectedMap.get(se.stepId);
        let endTime: number;
        if (detected && detected.endTime > (se.timestamp || 0)) {
          endTime = detected.endTime;
        } else {
          // 다음 단계의 timestamp로 추정
          const idx = report.stepEvaluations.findIndex((x) => x.stepId === se.stepId);
          const next = report.stepEvaluations[idx + 1];
          endTime = (next?.timestamp !== undefined && next.timestamp > (se.timestamp || 0))
            ? next.timestamp
            : (se.timestamp || 0) + 20;
        }
        const duration = Math.max(1, Math.round(endTime - (se.timestamp || 0)));
        return { stepId: se.stepId, duration, status: 'normal' }; // status 아래서 재계산
      });
  }, [report.stepEvaluations, report.handObjectEvents]);

  // ── 평균 소요시간 및 이상 분류 ──
  const { avgDuration, annotated, totalActual } = useMemo(() => {
    if (!timingData.length) return { avgDuration: 0, annotated: [], totalActual: 0 };
    const avg = timingData.reduce((s, d) => s + d.duration, 0) / timingData.length;
    const annotatedData: StepTimingData[] = timingData.map((d) => ({
      ...d,
      status: d.duration > avg * 2
        ? 'long'
        : d.duration < 3
          ? 'short'
          : 'normal',
    }));
    const total = timingData.reduce((s, d) => s + d.duration, 0);
    return { avgDuration: Math.round(avg), annotated: annotatedData, totalActual: total };
  }, [timingData]);

  // ── 기준 시간 ──
  const baselineSeconds = procedure.estimatedMinutes * 60;

  // ── 효율성 점수 ──
  const efficiencyPct = totalActual > 0
    ? Math.round((baselineSeconds / totalActual) * 100)
    : 100;
  const efficiencyLevel =
    efficiencyPct >= 80 && efficiencyPct <= 120 ? 'good' :
    efficiencyPct < 80 ? 'fast' : 'slow';

  // ── 이상 구간 목록 ──
  const anomalies = useMemo(() =>
    annotated.filter((d) => d.status !== 'normal'),
  [annotated]);

  // ── 차트용 색상 ──
  const barColor = (d: StepTimingData) =>
    d.status === 'long' ? '#f87171' : d.status === 'short' ? '#fb923c' : '#94a3b8';

  if (!annotated.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-400 text-center">
        <Timer className="w-5 h-5 mx-auto mb-2 opacity-40" />
        시간 분석 데이터가 없습니다 (타임스탬프 정보 필요)
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-amber-500 shrink-0" />
        <h3 className="text-base font-semibold text-slate-800">수행 시간 분석</h3>
      </div>

      {/* ── Section A: 전체 시간 요약 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 실제 소요시간 */}
        <div className="bg-slate-50 rounded-lg px-4 py-3">
          <p className="text-sm text-slate-400 mb-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> 실제 소요
          </p>
          <p className="text-base font-bold font-mono text-slate-800">
            {formatSeconds(totalActual)}
          </p>
        </div>

        {/* 기준 시간 */}
        <div className="bg-slate-50 rounded-lg px-4 py-3">
          <p className="text-sm text-slate-400 mb-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> 기준 시간
          </p>
          <p className="text-base font-bold font-mono text-slate-800">
            {formatSeconds(baselineSeconds)}
          </p>
        </div>

        {/* 기준 대비 */}
        <div className={cn(
          'rounded-lg px-4 py-3',
          totalActual > baselineSeconds ? 'bg-red-50' : 'bg-teal-50',
        )}>
          <p className={cn(
            'text-sm mb-0.5',
            totalActual > baselineSeconds ? 'text-red-400' : 'text-teal-500',
          )}>기준 대비</p>
          <p className={cn(
            'text-base font-bold font-mono',
            totalActual > baselineSeconds ? 'text-red-500' : 'text-teal-600',
          )}>
            {totalActual > baselineSeconds
              ? `+${formatSeconds(totalActual - baselineSeconds)}`
              : totalActual === baselineSeconds
                ? '±0초'
                : `-${formatSeconds(baselineSeconds - totalActual)}`}
          </p>
        </div>

        {/* 효율성 점수 */}
        <div className={cn(
          'rounded-lg px-4 py-3',
          efficiencyLevel === 'good' ? 'bg-teal-50' : 'bg-amber-50',
        )}>
          <p className={cn(
            'text-sm mb-0.5',
            efficiencyLevel === 'good' ? 'text-teal-500' : 'text-amber-500',
          )}>시간 효율</p>
          <p className={cn(
            'text-base font-bold font-mono',
            efficiencyLevel === 'good' ? 'text-teal-600' : 'text-amber-600',
          )}>
            {efficiencyPct}%
            <span className="ml-1 text-sm font-normal">
              {efficiencyLevel === 'good' ? '양호' : efficiencyLevel === 'fast' ? '빠름' : '초과'}
            </span>
          </p>
        </div>
      </div>

      {/* ── Section B: 단계별 소요시간 BarChart ── */}
      <div>
        <p className="text-sm text-slate-500 mb-2 font-medium">단계별 소요시간 (초)</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={annotated}
              margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
              barCategoryGap="20%"
            >
              <XAxis
                dataKey="stepId"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval={Math.floor(annotated.length / 12)}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* 평균 기준선 */}
              <ReferenceLine
                y={avgDuration}
                stroke="#f59e0b"
                strokeDasharray="4 3"
                label={{ value: `평균 ${avgDuration}s`, position: 'right', fontSize: 10, fill: '#f59e0b' }}
              />
              <Bar dataKey="duration" radius={[3, 3, 0, 0]}>
                {annotated.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={barColor(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* 범례 */}
        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" /> 정상
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> 장시간(평균×2 초과)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" /> 단시간(3초 미만)
          </span>
          <span className="flex items-center gap-1.5 ml-auto">
            <span className="w-5 h-px bg-amber-400 inline-block border-t-2 border-dashed border-amber-400" />
            <span>평균 기준선</span>
          </span>
        </div>
      </div>

      {/* ── Section C: 이상 구간 목록 ── */}
      {anomalies.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            이상 구간 탐지 ({anomalies.length}건)
          </p>
          <div className="space-y-1.5">
            {anomalies.map((d) => (
              <div
                key={d.stepId}
                className={cn(
                  'flex items-start gap-2 px-3 py-2 rounded-lg text-sm border',
                  d.status === 'long'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-orange-50 border-orange-200 text-orange-700',
                )}
              >
                <AlertTriangle className={cn(
                  'w-3.5 h-3.5 mt-0.5 shrink-0',
                  d.status === 'long' ? 'text-red-400' : 'text-orange-400',
                )} />
                <span>
                  <span className="font-mono font-semibold">단계 {d.stepId}</span>
                  {d.status === 'long'
                    ? ` — ${d.duration}초 소요 (평균 ${avgDuration}초) — 조작 미숙 또는 절차 혼동 가능성`
                    : ` — ${d.duration}초 소요 — 확인 절차 생략 가능성`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-teal-50 border border-teal-200 text-sm text-teal-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          모든 단계가 정상 시간 범위 내에서 수행되었습니다
        </div>
      )}

      {/* ── Section D: 효율성 요약 ── */}
      <div className={cn(
        'rounded-lg px-4 py-3 flex items-center gap-3 border text-sm',
        efficiencyLevel === 'good'
          ? 'bg-teal-50 border-teal-200 text-teal-700'
          : 'bg-amber-50 border-amber-200 text-amber-700',
      )}>
        <TrendingUp className="w-4 h-4 shrink-0" />
        <div>
          <span className="font-semibold">효율성 평가: </span>
          {efficiencyLevel === 'good'
            ? `기준 시간(${procedure.estimatedMinutes}분) 대비 ${efficiencyPct}%로 양호합니다.`
            : efficiencyLevel === 'fast'
              ? `기준 시간보다 빠르게 완료했습니다 (${efficiencyPct}%). 확인 절차를 충분히 수행했는지 검토하세요.`
              : `기준 시간(${procedure.estimatedMinutes}분)을 초과했습니다 (${efficiencyPct}%). 이상 구간 단계에 대한 추가 훈련이 권장됩니다.`}
          <span className="ml-2 text-sm opacity-60">
            (80-120% = 양호)
          </span>
        </div>
      </div>
    </div>
  );
}
