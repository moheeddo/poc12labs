'use client';
import type { DetectedStep, SequenceAlignment, PovSopDeviation } from '@/lib/types';
import type { Procedure, ProcedureStep } from '@/lib/pov-standards';

interface Props {
  detectedSteps: DetectedStep[];
  alignment: SequenceAlignment;
  procedure: Procedure;
  videoDuration: number;
  onSeek: (time: number) => void;
}

// 절차의 모든 스텝을 평탄화하여 반환
function flattenSteps(procedure: Procedure): ProcedureStep[] {
  const steps: ProcedureStep[] = [];
  for (const section of procedure.sections) {
    for (const step of section.steps) {
      steps.push(step);
      if (step.children) {
        steps.push(...step.children);
      }
    }
  }
  return steps;
}

// 상태별 색상 반환
function statusColor(status: DetectedStep['status'] | 'skipped'): string {
  switch (status) {
    case 'pass':    return 'bg-emerald-500';
    case 'fail':    return 'bg-red-500';
    case 'partial': return 'bg-amber-500';
    case 'skipped': return 'bg-zinc-600';
    default:        return 'bg-zinc-600';
  }
}

// 상태 배지 텍스트/색상
function StatusBadge({ status }: { status: DetectedStep['status'] | 'skipped' }) {
  const map: Record<string, { label: string; cls: string }> = {
    pass:    { label: '통과', cls: 'bg-emerald-900 text-emerald-300 border border-emerald-700' },
    fail:    { label: '실패', cls: 'bg-red-900 text-red-300 border border-red-700' },
    partial: { label: '부분', cls: 'bg-amber-900 text-amber-300 border border-amber-700' },
    skipped: { label: '누락', cls: 'bg-zinc-800 text-zinc-400 border border-zinc-600' },
  };
  const { label, cls } = map[status] ?? map.skipped;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// 이탈 유형 배지
function DeviationTypeBadge({ type }: { type: PovSopDeviation['type'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    swap:   { label: 'SWAP',   cls: 'bg-purple-900 text-purple-300 border border-purple-700' },
    skip:   { label: 'SKIP',   cls: 'bg-red-900 text-red-300 border border-red-700' },
    insert: { label: 'INSERT', cls: 'bg-orange-900 text-orange-300 border border-orange-700' },
    delay:  { label: 'DELAY',  cls: 'bg-yellow-900 text-yellow-300 border border-yellow-700' },
  };
  const { label, cls } = map[type] ?? { label: type.toUpperCase(), cls: 'bg-zinc-800 text-zinc-400' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${cls}`}>
      {label}
    </span>
  );
}

// 초 → mm:ss 포맷
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function StepsTimeline({
  detectedSteps,
  alignment,
  procedure,
  videoDuration,
  onSeek,
}: Props) {
  const allSteps = flattenSteps(procedure);
  // stepId → DetectedStep 맵
  const detectedMap = new Map<string, DetectedStep>(
    detectedSteps.map((ds) => [ds.stepId, ds])
  );
  // 이탈이 발생한 stepId 집합
  const deviationStepIds = new Set<string>(
    alignment.deviations.flatMap((d) => d.stepIds)
  );

  const duration = videoDuration > 0 ? videoDuration : 1;

  return (
    <div className="flex flex-col gap-4">
      {/* ── 타임라인 테이블 ── */}
      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="px-3 py-2 text-left w-16">스텝</th>
              <th className="px-3 py-2 text-left">설명</th>
              <th className="px-3 py-2 text-left w-40">타임라인</th>
              <th className="px-3 py-2 text-center w-20">상태</th>
              <th className="px-3 py-2 text-center w-20">신뢰도</th>
              <th className="px-3 py-2 text-center w-20">이탈</th>
            </tr>
          </thead>
          <tbody>
            {allSteps.map((step) => {
              const detected = detectedMap.get(step.id);
              const status = detected ? detected.status : 'skipped';
              const hasDeviation = deviationStepIds.has(step.id);
              const rowBg = hasDeviation
                ? 'bg-red-950/40 hover:bg-red-950/60'
                : 'hover:bg-zinc-800/50';

              // 타임라인 바 계산
              const barLeft = detected
                ? `${(detected.timestamp / duration) * 100}%`
                : '0%';
              const barWidth = detected
                ? `${Math.max(1, ((detected.endTime - detected.timestamp) / duration) * 100)}%`
                : '0%';

              return (
                <tr
                  key={step.id}
                  className={`border-b border-zinc-800 cursor-pointer transition-colors ${rowBg}`}
                  onClick={() => detected && onSeek(detected.timestamp)}
                >
                  {/* 스텝 ID + 중요 여부 */}
                  <td className="px-3 py-2 font-mono text-zinc-400 whitespace-nowrap">
                    {step.isCritical && (
                      <span className="text-yellow-400 mr-1" title="중요 단계">★</span>
                    )}
                    {step.id}
                  </td>

                  {/* 설명 */}
                  <td className="px-3 py-2 text-zinc-200 text-xs leading-snug">
                    <span>{step.description}</span>
                    {step.equipment && (
                      <span className="ml-1 text-zinc-500 font-mono">({step.equipment})</span>
                    )}
                  </td>

                  {/* 타임라인 바 */}
                  <td className="px-3 py-2">
                    <div className="relative h-4 bg-zinc-800 rounded overflow-hidden">
                      {detected && (
                        <div
                          className={`absolute top-0 bottom-0 rounded ${statusColor(status)} opacity-80`}
                          style={{ left: barLeft, width: barWidth }}
                          title={`${formatTime(detected.timestamp)} – ${formatTime(detected.endTime)}`}
                        />
                      )}
                    </div>
                    {detected && (
                      <div className="text-zinc-500 text-xs mt-0.5 font-mono">
                        {formatTime(detected.timestamp)}
                      </div>
                    )}
                  </td>

                  {/* 상태 배지 */}
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={status} />
                  </td>

                  {/* 신뢰도 */}
                  <td className="px-3 py-2 text-center text-xs font-mono text-zinc-300">
                    {detected ? `${detected.confidence}%` : '—'}
                  </td>

                  {/* 이탈 인디케이터 */}
                  <td className="px-3 py-2 text-center">
                    {hasDeviation && (
                      <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="이탈 발생" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 이탈 요약 섹션 ── */}
      {alignment.deviations.length > 0 && (
        <div className="rounded-lg border border-red-800/60 bg-red-950/20 p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
            절차 이탈 요약 ({alignment.deviations.length}건)
          </h3>
          <div className="flex flex-col gap-2">
            {alignment.deviations.map((dev, i) => (
              <div
                key={i}
                className="flex items-start gap-3 text-xs text-zinc-300 bg-zinc-900/50 rounded px-3 py-2"
              >
                <DeviationTypeBadge type={dev.type} />
                <div className="flex-1">
                  <span className="text-zinc-200">{dev.description}</span>
                  <div className="mt-0.5 text-zinc-500 font-mono">
                    스텝: {dev.stepIds.join(', ')}
                    {dev.timestamp != null && ` | ${formatTime(dev.timestamp)}`}
                  </div>
                </div>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                    dev.severity === 'critical'
                      ? 'border-red-600 text-red-400'
                      : dev.severity === 'major'
                      ? 'border-orange-600 text-orange-400'
                      : 'border-yellow-700 text-yellow-500'
                  }`}
                >
                  {dev.severity === 'critical' ? '심각' : dev.severity === 'major' ? '주요' : '경미'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            절차 준수율:{' '}
            <span className="font-mono text-zinc-300">{alignment.complianceScore.toFixed(1)}%</span>
            {alignment.criticalDeviations > 0 && (
              <span className="ml-3 text-red-400">
                심각 이탈 {alignment.criticalDeviations}건
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
