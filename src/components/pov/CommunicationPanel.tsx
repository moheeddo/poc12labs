'use client';
// HPO-21: 의사소통 분석 결과 패널
// 3-Way Communication, 보고, 확인 이벤트를 타임라인으로 표시하고
// 종합 피드백을 제공한다

import { Mic, Volume2, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/utils';
import type { CommunicationAnalysis, CommunicationEvent } from '@/lib/pov-communication-analysis';
import { COMM_EVENT_LABELS } from '@/lib/pov-communication-analysis';

interface Props {
  analysis?: CommunicationAnalysis;
  onSeek?: (time: number) => void;
}

// ── 이벤트 타입별 색상 ──

const EVENT_COLORS: Record<CommunicationEvent['type'], { bg: string; border: string; text: string; dot: string }> = {
  threeWay:     { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  report:       { bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',dot: 'bg-emerald-500'},
  confirmation: { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   dot: 'bg-teal-500'   },
  briefing:     { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  question:     { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  instruction:  { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-700',  dot: 'bg-slate-400'  },
};

// ── 통계 카드 ──

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}

function StatCard({ icon, label, value, unit = '', color = 'text-slate-700' }: StatCardProps) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={cn('text-xl font-bold tabular-nums mt-0.5', color)}>
          {value}<span className="text-sm font-normal text-slate-500 ml-0.5">{unit}</span>
        </p>
      </div>
    </div>
  );
}

// ── 이벤트 아이템 ──

function EventItem({ event, onSeek }: { event: CommunicationEvent; onSeek?: (t: number) => void }) {
  const colors = EVENT_COLORS[event.type];
  const duration = Math.round(event.endTime - event.timestamp);

  return (
    <button
      type="button"
      onClick={() => onSeek?.(event.timestamp)}
      className={cn(
        'w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all hover:shadow-sm',
        colors.bg, colors.border,
        onSeek ? 'cursor-pointer hover:brightness-95' : 'cursor-default'
      )}
    >
      {/* 타임스탬프 */}
      <span className="shrink-0 font-mono text-xs text-slate-500 mt-0.5 w-12 text-right">
        {formatTime(event.timestamp)}
      </span>

      {/* 이벤트 타입 배지 + 화자 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full', colors.text, colors.bg, 'border', colors.border)}>
            {COMM_EVENT_LABELS[event.type]}
          </span>
          <span className="text-xs text-slate-400">{event.speaker}</span>
          {duration > 0 && (
            <span className="text-xs text-slate-400 flex items-center gap-0.5 ml-auto">
              <Clock className="w-3 h-3" />{duration}초
            </span>
          )}
        </div>
        <p className="text-sm text-slate-700 mt-0.5 truncate">{event.content}</p>
        {event.feedback && (
          <p className="text-xs text-slate-400 mt-0.5 italic">{event.feedback}</p>
        )}
      </div>

      {/* 품질 점수 */}
      <span className={cn('shrink-0 text-sm font-bold tabular-nums', colors.text)}>
        {event.quality}
      </span>
    </button>
  );
}

// ── 메인 컴포넌트 ──

export default function CommunicationPanel({ analysis, onSeek }: Props) {
  // 분석 결과 없을 때 빈 상태 표시
  if (!analysis) {
    return (
      <div className="border border-slate-200 rounded-xl p-8 text-center bg-slate-50">
        <Mic className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">의사소통 분석 결과가 없습니다.</p>
        <p className="text-xs text-slate-400 mt-1">영상 분석 후 의사소통 분석 버튼을 클릭하세요.</p>
      </div>
    );
  }

  const { events, threeWayCount, reportCount, totalSpeakingTime, communicationScore, feedback } = analysis;

  // 점수에 따른 색상
  const scoreColor =
    communicationScore >= 80 ? 'text-emerald-600' :
    communicationScore >= 60 ? 'text-blue-600' :
    communicationScore >= 40 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* ── 통계 카드 4개 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Volume2 className="w-4 h-4" />}
          label="의사소통 점수"
          value={communicationScore}
          unit="점"
          color={scoreColor}
        />
        <StatCard
          icon={<MessageSquare className="w-4 h-4" />}
          label="3-Way Communication"
          value={threeWayCount}
          unit="회"
          color={threeWayCount >= 3 ? 'text-emerald-600' : threeWayCount >= 1 ? 'text-amber-600' : 'text-red-600'}
        />
        <StatCard
          icon={<Mic className="w-4 h-4" />}
          label="상태 보고 횟수"
          value={reportCount}
          unit="회"
          color={reportCount >= 2 ? 'text-emerald-600' : 'text-amber-600'}
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="총 발화 시간"
          value={totalSpeakingTime}
          unit="초"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ── 이벤트 타임라인 ── */}
        <div className="md:col-span-2 border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              의사소통 이벤트 타임라인
            </h3>
            <span className="text-xs text-slate-400">{events.length}건 탐지</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {events.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                탐지된 의사소통 이벤트가 없습니다.
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {events.map((event, i) => (
                  <EventItem key={i} event={event} onSeek={onSeek} />
                ))}
              </div>
            )}
          </div>

          {/* 범례 */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-3 flex-wrap">
            {[
              { type: 'threeWay' as const, label: '3-Way' },
              { type: 'report' as const, label: '보고' },
              { type: 'confirmation' as const, label: '확인' },
            ].map(({ type, label }) => (
              <span key={type} className="flex items-center gap-1 text-xs text-slate-500">
                <span className={cn('w-2 h-2 rounded-full', EVENT_COLORS[type].dot)} />
                {label}
              </span>
            ))}
            {onSeek && <span className="text-xs text-slate-400 ml-auto italic">클릭 시 해당 시점으로 이동</span>}
          </div>
        </div>

        {/* ── 종합 피드백 ── */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-500" />
              코칭 피드백
            </h3>
          </div>
          <div className="p-4 space-y-2.5">
            {feedback.map((fb, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>
                <span className="text-slate-700 leading-relaxed">{fb}</span>
              </div>
            ))}
          </div>

          {/* 의사소통 점수 게이지 */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>의사소통 품질</span>
              <span className={cn('font-semibold', scoreColor)}>{communicationScore}점</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  communicationScore >= 80 ? 'bg-emerald-500' :
                  communicationScore >= 60 ? 'bg-blue-500' :
                  communicationScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${communicationScore}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-300 mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
