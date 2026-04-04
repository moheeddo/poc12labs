'use client';

// =============================================
// HPO-22: 사고 사례 연계 라이브러리 UI
// 훈련생의 이탈 유형/역량과 연계된 실제 사고 사례를 표시
// 경각심과 학습 동기를 높이는 교수학적 컴포넌트
// =============================================

import { useState, useMemo } from 'react';
import {
  INCIDENT_LIBRARY,
  findRelatedIncidents,
  INES_LABELS,
  DEVIATION_TYPE_LABELS,
  type IncidentCase,
} from '@/lib/pov-incident-library';
import type { PovEvaluationReport } from '@/lib/types';
import { X, ChevronDown, ChevronUp, AlertTriangle, BookOpen } from 'lucide-react';

interface Props {
  /** 있으면 관련 사례만 필터링, 없으면 전체 라이브러리 표시 */
  report?: PovEvaluationReport;
  onClose?: () => void;
}

// ── 개별 사고 카드 (compact/full 모드) ────

interface IncidentCardProps {
  incident: IncidentCase;
  compact?: boolean;
  /** 리포트와의 연관 이탈 유형 (강조 표시용) */
  matchedDeviations?: string[];
}

export function IncidentCard({ incident, compact = false, matchedDeviations }: IncidentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const ines = INES_LABELS[incident.severity];

  if (compact) {
    // ── 컴팩트 카드 (StepsTimeline 이탈 요약 내부 삽입용) ──
    return (
      <div className="flex items-start gap-2 p-2 rounded bg-zinc-900/60 border border-zinc-700/60 text-[11px]">
        {/* INES 등급 배지 */}
        <span
          className="shrink-0 px-1.5 py-0.5 rounded font-bold text-white text-[10px]"
          style={{ backgroundColor: ines.color }}
        >
          INES {incident.severity.replace('level', '')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-200 truncate">{incident.title}</p>
          <p className="text-zinc-400 leading-snug mt-0.5 line-clamp-2">{incident.summary}</p>
        </div>
      </div>
    );
  }

  // ── 풀 카드 ──
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* 카드 헤더 */}
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {/* INES 등급 배지 */}
        <div className="shrink-0 mt-0.5">
          <span
            className="inline-block px-2 py-1 rounded-lg font-bold text-white text-xs"
            style={{ backgroundColor: ines.color }}
          >
            INES {incident.severity.replace('level', '')}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* 제목 + 발전소 */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-800">{incident.title}</h4>
            <span className="text-xs text-slate-400">{incident.date.slice(0, 4)}년</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{incident.plant}</p>

          {/* 요약 */}
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
            {incident.summary}
          </p>

          {/* 관련 이탈 유형 배지 */}
          {matchedDeviations && matchedDeviations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {matchedDeviations
                .filter((d) => incident.relatedDeviationTypes.includes(d))
                .map((d) => (
                  <span
                    key={d}
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700 border border-red-200"
                  >
                    {DEVIATION_TYPE_LABELS[d] ?? d.toUpperCase()}
                  </span>
                ))}
              <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                이 사례가 왜 관련되나요? &rarr; 같은 이탈 유형에서 발생
              </span>
            </div>
          )}
        </div>

        {/* 펼치기 아이콘 */}
        <div className="shrink-0 mt-0.5 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* 펼쳐진 상세 내용 */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50/50">
          {/* 근본 원인 */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              근본 원인
            </p>
            <p className="text-xs text-red-700 leading-relaxed">{incident.rootCause}</p>
          </div>

          {/* 교훈 */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              교훈
            </p>
            <p className="text-xs text-amber-700 font-medium leading-relaxed">{incident.lesson}</p>
          </div>

          {/* 재발 방지 */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              재발 방지 대책
            </p>
            <p className="text-xs text-emerald-700 leading-relaxed">{incident.preventionMeasure}</p>
          </div>

          {/* 관련 이탈/역량/HPO 배지 */}
          <div className="flex flex-wrap gap-1.5">
            {incident.relatedDeviationTypes.map((d) => (
              <span
                key={d}
                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700 border border-red-200"
              >
                {d.toUpperCase()}
              </span>
            ))}
            {incident.relatedCompetencies.map((c) => (
              <span
                key={c}
                className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 border border-purple-200"
              >
                기본수칙: {c}
              </span>
            ))}
            {incident.relatedHpoTools.map((h) => (
              <span
                key={h}
                className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 border border-blue-200"
              >
                HPO: {h}
              </span>
            ))}
          </div>

          {/* 출처 */}
          {incident.source && (
            <p className="text-[10px] text-slate-400">출처: {incident.source}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 라이브러리 컴포넌트 ──────────────

export default function IncidentLibrary({ report, onClose }: Props) {
  // 전체 보기 모드 토글
  const [showAll, setShowAll] = useState(false);

  // 리포트 기반 관련 이탈 유형 + 역량 추출
  const matchedDeviations = useMemo(() => {
    if (!report?.sequenceAlignment) return [];
    return [...new Set(report.sequenceAlignment.deviations.map((d) => d.type))];
  }, [report]);

  const weakCompetencies = useMemo(() => {
    if (!report?.fundamentalScores) return [];
    return report.fundamentalScores
      .filter((f) => f.score < 70)
      .map((f) => f.key);
  }, [report]);

  const weakHpoTools = useMemo(() => {
    if (!report?.hpoEvaluations) return [];
    return report.hpoEvaluations
      .filter((h) => !h.applied || h.score < 60)
      .map((h) => h.toolKey);
  }, [report]);

  // 표시할 사례 목록 결정
  const incidents: IncidentCase[] = useMemo(() => {
    if (showAll || !report) {
      return INCIDENT_LIBRARY;
    }
    // 리포트 기반 필터링
    const related = findRelatedIncidents(matchedDeviations, weakCompetencies, weakHpoTools);
    return related.length > 0 ? related : INCIDENT_LIBRARY;
  }, [showAll, report, matchedDeviations, weakCompetencies, weakHpoTools]);

  const isFiltered = !showAll && report !== undefined;
  const relatedCount = useMemo(() => {
    if (!report) return 0;
    return findRelatedIncidents(matchedDeviations, weakCompetencies, weakHpoTools).length;
  }, [report, matchedDeviations, weakCompetencies, weakHpoTools]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-slate-800">사고 사례 라이브러리</h2>
            {isFiltered && relatedCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                관련 {relatedCount}건
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="닫기"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>

        {/* 필터 상태 안내 */}
        {report && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <p className="text-xs text-amber-700">
              {isFiltered
                ? `현재 평가 결과의 이탈 유형(${matchedDeviations.map((d) => d.toUpperCase()).join(', ')})과 관련된 사례만 표시됩니다.`
                : '전체 라이브러리를 표시 중입니다.'}
            </p>
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-medium text-amber-600 hover:text-amber-800 underline underline-offset-2 shrink-0 ml-2"
            >
              {isFiltered ? '전체 보기' : '관련 사례만 보기'}
            </button>
          </div>
        )}

        {/* 사례 목록 */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {incidents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              관련 사고 사례가 없습니다.
            </p>
          ) : (
            incidents.map((inc) => (
              <IncidentCard
                key={inc.id}
                incident={inc}
                matchedDeviations={isFiltered ? matchedDeviations : undefined}
              />
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            INES 기반 {INCIDENT_LIBRARY.length}개 사례 수록 — IAEA/NRC/한수원 공식 자료 기반
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
