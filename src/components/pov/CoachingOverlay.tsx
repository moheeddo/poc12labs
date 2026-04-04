'use client';

import { useState, useMemo, useCallback } from 'react';
import type {
  PovEvaluationReport,
  PovSopDeviation,
  HandObjectEvent,
} from '@/lib/types';

// ── 타입 ─────────────────────────────────────────────────────────────

interface Props {
  report: PovEvaluationReport;
  currentTime: number;        // 현재 재생 시점 (초)
  videoDuration: number;      // 영상 전체 길이 (초), 0이면 마커 숨김
  isActive: boolean;          // 코칭 모드 활성화 여부
}

interface CoachingCue {
  id: string;
  startTime: number;
  endTime: number;
  type: 'deviation' | 'hpoMissing' | 'quality' | 'positive';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;           // 짧은 헤드라인
  message: string;         // 코칭 메시지
  askTrainee?: string;     // 훈련생에게 질문할 것
}

// ── severity별 스타일 ─────────────────────────────────────────────────

const SEVERITY_STYLES: Record<CoachingCue['severity'], string> = {
  critical: 'bg-red-500/15 border-red-500/30',
  warning:  'bg-amber-500/15 border-amber-500/30',
  info:     'bg-blue-500/15 border-blue-500/30',
  positive: 'bg-emerald-500/15 border-emerald-500/30',
};

const SEVERITY_ICONS: Record<CoachingCue['severity'], string> = {
  critical: '🚨',
  warning:  '⚠️',
  info:     '💡',
  positive: '✨',
};

// 타임라인 마커 색상
const MARKER_COLORS: Record<CoachingCue['severity'], string> = {
  critical: 'bg-red-500',
  warning:  'bg-amber-500',
  info:     'bg-blue-500',
  positive: 'bg-emerald-500',
};

// ── 코칭 큐 생성 유틸 ─────────────────────────────────────────────────

/**
 * 리포트 데이터에서 CoachingCue 배열을 자동 생성한다.
 * 1) 이탈 기반 (sequenceAlignment.deviations 또는 deviations)
 * 2) HPO 미적용 (hpoResults where detected=false, fundamental)
 * 3) 품질 저하 (handObjectEvents where qualityScore < 70)
 * 4) 긍정 강화 (confidence > 0.9 또는 HPO detected)
 */
function buildCoachingCues(report: PovEvaluationReport): CoachingCue[] {
  const cues: CoachingCue[] = [];

  // ── 1. 이탈 기반 큐 ──────────────────────────────────────────────
  const povDeviations: PovSopDeviation[] =
    report.sequenceAlignment?.deviations ?? [];

  povDeviations.forEach((dev, idx) => {
    const ts = dev.timestamp ?? 0;
    const endTs = ts + 15; // 15초 표시 기본값

    if (dev.type === 'skip') {
      const stepId = dev.stepIds[0] ?? '?';
      cues.push({
        id: `dev-skip-${idx}`,
        startTime: ts,
        endTime: endTs,
        type: 'deviation',
        severity: dev.severity === 'critical' ? 'critical' : 'warning',
        title: `단계 ${stepId} 미수행`,
        message: dev.rootCause?.remediation
          ? dev.rootCause.remediation
          : `이 단계(${stepId})가 수행되지 않았습니다.`,
        askTrainee: `이 단계를 건너뛴 이유가 있었나요?`,
      });
    } else if (dev.type === 'swap') {
      const [id1, id2] = dev.stepIds;
      cues.push({
        id: `dev-swap-${idx}`,
        startTime: ts,
        endTime: endTs,
        type: 'deviation',
        severity: dev.severity === 'critical' ? 'critical' : 'warning',
        title: `단계 순서 오류: ${id1} ↔ ${id2}`,
        message: dev.rootCause?.remediation
          ? dev.rootCause.remediation
          : `단계 ${id1}과 ${id2}의 순서가 바뀌었습니다.`,
        askTrainee: `올바른 순서와 그 이유를 설명해보세요.`,
      });
    } else {
      // insert / delay 등 기타 이탈
      cues.push({
        id: `dev-other-${idx}`,
        startTime: ts,
        endTime: endTs,
        type: 'deviation',
        severity: dev.severity === 'critical' ? 'critical' : 'info',
        title: dev.description.length > 40
          ? dev.description.slice(0, 40) + '…'
          : dev.description,
        message: dev.rootCause?.remediation ?? dev.description,
        askTrainee: `이 시점에서 어떤 판단을 했는지 설명해보세요.`,
      });
    }
  });

  // legacy SopDeviation (report.deviations) — PovSopDeviation 없을 때 보완
  if (povDeviations.length === 0 && report.deviations.length > 0) {
    report.deviations.forEach((dev, idx) => {
      cues.push({
        id: `legacy-dev-${idx}`,
        startTime: dev.timestamp,
        endTime: dev.timestamp + 12,
        type: 'deviation',
        severity: dev.severity === 'critical' || dev.severity === 'high'
          ? 'critical'
          : 'warning',
        title: `이탈: ${dev.step}`,
        message: `예상: ${dev.expected} / 실제: ${dev.actual}`,
        askTrainee: `여기서 어떻게 판단하셨나요?`,
      });
    });
  }

  // ── 2. HPO 미적용 큐 ──────────────────────────────────────────────
  const hpoResults = report.hpoResults ?? [];
  hpoResults
    .filter((h) => h.category === 'fundamental' && !h.detected)
    .forEach((h, idx) => {
      // 관련 스텝 타임스탬프를 찾아서 가장 가까운 시점에 표시
      const relatedStep = report.stepEvaluations.find(
        (s) => s.timestamp !== undefined && s.timestamp > 0
      );
      const ts = relatedStep?.timestamp ?? 0;
      cues.push({
        id: `hpo-missing-${idx}`,
        startTime: ts,
        endTime: ts + 20,
        type: 'hpoMissing',
        severity: 'info',
        title: `HPO 미적용: ${h.toolName}`,
        message: `이 구간에서 ${h.toolName} 기법을 적용하면 어떨까요?`,
        askTrainee: `${h.toolName}을 언제 사용하면 좋을지 설명해보세요.`,
      });
    });

  // ── 3. 품질 저하 큐 ──────────────────────────────────────────────
  const handObjectEvents: HandObjectEvent[] = report.handObjectEvents ?? [];
  handObjectEvents
    .filter((e) => (e.qualityScore ?? 100) < 70)
    .forEach((e, idx) => {
      cues.push({
        id: `quality-${idx}`,
        startTime: e.timestamp,
        endTime: e.endTime,
        type: 'quality',
        severity: (e.qualityScore ?? 100) < 40 ? 'critical' : 'warning',
        title: `${e.targetEquipment} 조작 품질 저하`,
        message: e.qualityFeedback
          ? `${e.targetEquipment} 조작 품질이 ${e.qualityScore}점입니다. ${e.qualityFeedback}`
          : `${e.targetEquipment} 조작 품질이 ${e.qualityScore}점입니다.`,
        askTrainee: `이 조작에서 무엇을 개선할 수 있을까요?`,
      });
    });

  // ── 4. 긍정 강화 큐 ──────────────────────────────────────────────
  report.stepEvaluations
    .filter((s) => s.confidence > 90 && s.timestamp !== undefined && s.timestamp > 0)
    .slice(0, 5) // 최대 5개만 (과다 노출 방지)
    .forEach((s, idx) => {
      cues.push({
        id: `positive-step-${idx}`,
        startTime: s.timestamp!,
        endTime: s.timestamp! + 8,
        type: 'positive',
        severity: 'positive',
        title: `단계 ${s.stepId} 정확 수행`,
        message: `이 단계 수행이 매우 정확했습니다!`,
      });
    });

  hpoResults
    .filter((h) => h.detected && h.timestamps.length > 0)
    .slice(0, 3) // 최대 3개만
    .forEach((h, idx) => {
      const ts = h.timestamps[0];
      cues.push({
        id: `positive-hpo-${idx}`,
        startTime: ts,
        endTime: ts + 8,
        type: 'positive',
        severity: 'positive',
        title: `HPO 적용: ${h.toolName}`,
        message: `여기서 ${h.toolName}을 잘 적용했습니다.`,
      });
    });

  return cues;
}

// ══════════════════════════════════════════════════════════════════════
// CoachingOverlay 컴포넌트
// ══════════════════════════════════════════════════════════════════════

export default function CoachingOverlay({
  report,
  currentTime,
  videoDuration,
  isActive,
}: Props) {
  // 코칭 큐 자동 생성 (리포트 변경 시에만 재계산)
  const cues = useMemo(() => buildCoachingCues(report), [report]);

  // 닫힌 큐 ID 집합
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // 현재 시점에 해당하는 큐 (가장 마지막 매칭, 닫히지 않은 것 우선)
  const activeCue: CoachingCue | null = useMemo(() => {
    if (!isActive) return null;
    const matches = cues.filter(
      (c) =>
        currentTime >= c.startTime &&
        currentTime <= c.endTime &&
        !dismissedIds.has(c.id)
    );
    if (matches.length === 0) return null;
    // severity 우선순위: critical > warning > info > positive
    const priority: Record<CoachingCue['severity'], number> = {
      critical: 0, warning: 1, info: 2, positive: 3,
    };
    return matches.sort((a, b) => priority[a.severity] - priority[b.severity])[0];
  }, [cues, currentTime, isActive, dismissedIds]);

  // 큐 닫기
  const dismissCue = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  if (!isActive) return null;

  return (
    <div className="w-full space-y-1">
      {/* ── 코칭 큐 카드 (영상 하단 슬라이드업) ── */}
      <div className="relative min-h-[68px]">
        {activeCue ? (
          <div
            className={`rounded-xl p-3 backdrop-blur-sm border animate-fade-in-up ${SEVERITY_STYLES[activeCue.severity]}`}
          >
            <div className="flex items-start gap-2">
              {/* severity 아이콘 */}
              <span className="text-lg shrink-0 leading-none mt-0.5">
                {SEVERITY_ICONS[activeCue.severity]}
              </span>
              <div className="flex-1 min-w-0">
                {/* 헤드라인 */}
                <p className="text-xs font-semibold text-zinc-200 leading-tight">
                  {activeCue.title}
                </p>
                {/* 코칭 메시지 */}
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  {activeCue.message}
                </p>
                {/* 훈련생 질문 프롬프트 */}
                {activeCue.askTrainee && (
                  <p className="text-[10px] text-blue-400 mt-1 italic leading-snug">
                    💬 훈련생에게: &ldquo;{activeCue.askTrainee}&rdquo;
                  </p>
                )}
              </div>
              {/* 닫기 버튼 */}
              <button
                onClick={() => dismissCue(activeCue.id)}
                className="text-zinc-500 hover:text-zinc-300 text-xs shrink-0 leading-none px-1"
                aria-label="코칭 큐 닫기"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          /* 큐 없을 때 — 빈 공간 유지 (레이아웃 흔들림 방지) */
          <div className="rounded-xl p-3 border border-transparent bg-zinc-900/30 flex items-center justify-center">
            <span className="text-[11px] text-zinc-600">
              코칭 큐 대기 중 — 이탈 구간에서 자동 표시됩니다
            </span>
          </div>
        )}
      </div>

      {/* ── 타임라인 마커 바 ── */}
      {videoDuration > 0 && (
        <div
          className="relative h-1.5 bg-zinc-800 rounded-full mt-1"
          title="코칭 큐 타임라인"
        >
          {cues.map((cue) => (
            <div
              key={cue.id}
              className={`absolute h-1.5 rounded-full opacity-80 hover:opacity-100 transition-opacity ${MARKER_COLORS[cue.severity]}`}
              style={{
                left: `${(cue.startTime / videoDuration) * 100}%`,
                width: `${Math.max(
                  ((cue.endTime - cue.startTime) / videoDuration) * 100,
                  0.5
                )}%`,
              }}
              title={`[${cue.startTime}s] ${cue.title}`}
            />
          ))}
          {/* 현재 재생 위치 표시기 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-2 border-zinc-500 -translate-x-1/2 transition-all"
            style={{ left: `${(currentTime / videoDuration) * 100}%` }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* ── 큐 개수 요약 ── */}
      {cues.length > 0 && (
        <div className="flex items-center gap-2 px-1 pt-0.5 flex-wrap">
          {(
            [
              { key: 'critical', label: '위험', color: 'text-red-400' },
              { key: 'warning',  label: '경고', color: 'text-amber-400' },
              { key: 'info',     label: '정보', color: 'text-blue-400' },
              { key: 'positive', label: '긍정', color: 'text-emerald-400' },
            ] as { key: CoachingCue['severity']; label: string; color: string }[]
          ).map(({ key, label, color }) => {
            const count = cues.filter((c) => c.severity === key).length;
            if (count === 0) return null;
            return (
              <span key={key} className={`text-[10px] font-mono ${color}`}>
                {SEVERITY_ICONS[key]} {label} {count}
              </span>
            );
          })}
          <span className="text-[10px] text-zinc-600 ml-auto">
            총 {cues.length}개 큐
          </span>
        </div>
      )}
    </div>
  );
}
