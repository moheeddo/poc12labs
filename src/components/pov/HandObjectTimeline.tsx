'use client';
import { useState } from 'react';
import type { HandObjectEvent } from '@/lib/types';

interface Props {
  events: HandObjectEvent[];
  currentTime: number;
  onSeek: (time: number) => void;
}

// 초 → mm:ss 포맷
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 현재 시간에 해당하는 활성 이벤트 찾기
function findActiveEvent(events: HandObjectEvent[], currentTime: number): HandObjectEvent | null {
  return (
    events.find((e) => currentTime >= e.timestamp && currentTime <= e.endTime) ?? null
  );
}

export default function HandObjectTimeline({ events, currentTime, onSeek }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeEvent = findActiveEvent(events, currentTime);

  // 통계 계산
  const toolSet = new Set(events.map((e) => e.heldObject));
  const actionSet = new Set(events.map((e) => e.actionType));
  const stateChanges = events.filter(
    (e) => e.stateBefore && e.stateAfter && e.stateBefore !== e.stateAfter
  ).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* ── 왼쪽: 현재 프레임 분석 오버레이 ── */}
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">
            현재 프레임 분석{' '}
            <span className="font-mono text-xs text-zinc-500">
              ({formatTime(currentTime)})
            </span>
          </h3>

          {activeEvent ? (
            <div className="flex flex-col gap-3">
              {/* 쥔 물체 */}
              <div className="flex items-start gap-2 rounded bg-zinc-800 px-3 py-2">
                <span className="text-lg">🖐️</span>
                <div>
                  <div className="text-xs text-zinc-500 mb-0.5">쥔 물체</div>
                  <div className="text-sm text-zinc-100 font-medium">
                    {activeEvent.heldObject || '—'}
                  </div>
                </div>
              </div>

              {/* 대상 설비 */}
              <div className="flex items-start gap-2 rounded bg-zinc-800 px-3 py-2">
                <span className="text-lg">🎯</span>
                <div>
                  <div className="text-xs text-zinc-500 mb-0.5">대상 설비</div>
                  <div className="text-sm text-zinc-100 font-medium">
                    {activeEvent.targetEquipment || '—'}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    동작: {activeEvent.actionType}
                  </div>
                </div>
              </div>

              {/* 상태 변화 */}
              {activeEvent.stateBefore !== activeEvent.stateAfter && (
                <div className="flex items-start gap-2 rounded bg-zinc-800 px-3 py-2">
                  <span className="text-lg">🔄</span>
                  <div>
                    <div className="text-xs text-zinc-500 mb-0.5">상태 변화</div>
                    <div className="text-sm flex items-center gap-2">
                      <span className="text-red-400 font-mono">{activeEvent.stateBefore}</span>
                      <span className="text-zinc-500">→</span>
                      <span className="text-emerald-400 font-mono">{activeEvent.stateAfter}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SOP 일치 여부 */}
              <div
                className={`rounded px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                  activeEvent.matchesSOP
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                <span>{activeEvent.matchesSOP ? '✓' : '✗'}</span>
                <span>{activeEvent.matchesSOP ? 'SOP 절차 일치' : 'SOP 절차 불일치'}</span>
                <span className="ml-auto font-mono text-zinc-500">
                  신뢰도 {activeEvent.confidence}%
                </span>
              </div>

              {/* 품질 점수 + 코칭 코멘트 */}
              {activeEvent.qualityScore !== undefined && (
                <div className="flex flex-col gap-1.5 rounded bg-zinc-800 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">조작 품질</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        activeEvent.qualityScore >= 90
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : activeEvent.qualityScore >= 70
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {activeEvent.qualityScore}점
                    </span>
                  </div>
                  {activeEvent.qualityFeedback && (
                    <div className="text-[11px] text-zinc-400 italic leading-relaxed">
                      {activeEvent.qualityFeedback}
                    </div>
                  )}
                </div>
              )}

              {/* 원시 설명 */}
              {activeEvent.rawDescription && (
                <div className="text-xs text-zinc-500 leading-relaxed bg-zinc-800/50 rounded px-3 py-2">
                  {activeEvent.rawDescription}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
              <span className="text-3xl mb-2">🖐️</span>
              <div className="text-sm">이 구간에 감지된 이벤트 없음</div>
            </div>
          )}
        </div>

        {/* ── 하단 통계 ── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center">
            <div className="text-lg font-bold text-zinc-100">{toolSet.size}</div>
            <div className="text-xs text-zinc-500">도구 종류</div>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center">
            <div className="text-lg font-bold text-zinc-100">{actionSet.size}</div>
            <div className="text-xs text-zinc-500">동작 종류</div>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center">
            <div className="text-lg font-bold text-zinc-100">{stateChanges}</div>
            <div className="text-xs text-zinc-500">상태 변화</div>
          </div>
        </div>
      </div>

      {/* ── 오른쪽: 이벤트 타임라인 목록 ── */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-300">
          이벤트 목록{' '}
          <span className="text-xs text-zinc-500">({events.length}건)</span>
        </h3>

        <div className="overflow-y-auto max-h-[480px] flex flex-col gap-1.5 pr-1">
          {events.length === 0 ? (
            <div className="text-sm text-zinc-600 text-center py-8">
              분석된 이벤트가 없습니다.
            </div>
          ) : (
            events.map((event, i) => {
              const isActive =
                currentTime >= event.timestamp && currentTime <= event.endTime;
              const isHovered = hoveredId === `${event.stepId}-${i}`;

              return (
                <div
                  key={`${event.stepId}-${i}`}
                  className={`
                    rounded-lg border px-3 py-2 cursor-pointer transition-all text-xs
                    border-l-4
                    ${event.matchesSOP ? 'border-l-emerald-500' : 'border-l-red-500'}
                    ${isActive
                      ? 'bg-zinc-700 border-zinc-600'
                      : isHovered
                      ? 'bg-zinc-800 border-zinc-700'
                      : 'bg-zinc-900 border-zinc-800'
                    }
                  `}
                  onClick={() => onSeek(event.timestamp)}
                  onMouseEnter={() => setHoveredId(`${event.stepId}-${i}`)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* 시간 + 스텝 ID */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-zinc-400">
                      {formatTime(event.timestamp)} – {formatTime(event.endTime)}
                    </span>
                    <span className="font-mono text-zinc-500">#{event.stepId}</span>
                  </div>

                  {/* 도구 → 대상 + 동작 */}
                  <div className="flex items-center gap-1 text-zinc-200">
                    <span className="bg-zinc-800 rounded px-1.5 py-0.5 font-medium">
                      {event.heldObject || '도구 없음'}
                    </span>
                    <span className="text-zinc-500">→</span>
                    <span className="bg-zinc-800 rounded px-1.5 py-0.5 font-medium">
                      {event.targetEquipment || '대상 없음'}
                    </span>
                    <span className="text-zinc-400 ml-1">{event.actionType}</span>
                  </div>

                  {/* 상태 변화 */}
                  {event.stateBefore !== event.stateAfter && (
                    <div className="mt-1 flex items-center gap-1 text-zinc-400">
                      <span className="text-red-400 font-mono">{event.stateBefore}</span>
                      <span>→</span>
                      <span className="text-emerald-400 font-mono">{event.stateAfter}</span>
                    </div>
                  )}

                  {/* 품질 배지 + 코칭 코멘트 */}
                  {event.qualityScore !== undefined && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          event.qualityScore >= 90
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : event.qualityScore >= 70
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        품질 {event.qualityScore}
                      </span>
                      {event.qualityFeedback && (
                        <span className="text-[9px] text-zinc-500 italic truncate max-w-[200px]">
                          {event.qualityFeedback}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 신뢰도 */}
                  <div className="mt-1 text-zinc-600 font-mono text-right">
                    {event.confidence}%
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
