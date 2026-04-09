"use client";

import { useState, type ReactNode } from 'react';
import { Users, BarChart3, ArrowLeft } from 'lucide-react';
import type { TrainingSession } from '@/lib/session-types';
import type { PovEvaluationReport } from '@/lib/types';
import { cn, getGrade } from '@/lib/utils';

// ── Props ──
interface Props {
  session: TrainingSession;
  renderReport: (report: PovEvaluationReport, operatorName: string, transcription?: { start: number; end: number; text: string; speaker?: string }[]) => ReactNode;
  onBack: () => void;
}

// ── 세션 종합 뷰 (서브 컴포넌트) ──
function SessionSummaryView({ session }: { session: TrainingSession }) {
  const completedOps = session.operators.filter(op => op.status === 'complete' && op.report);

  return (
    <div className="space-y-6">
      {/* 운전원별 점수 비교 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {completedOps.map((op) => {
          const score = op.report!.overallScore;
          const { grade, color } = getGrade(score);
          return (
            <div
              key={op.role}
              className={cn(
                "bg-white border rounded-xl p-5",
                op.role === 'operatorA' ? "border-teal-200" : "border-amber-200"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    op.role === 'operatorA' ? "bg-teal-500" : "bg-amber-500"
                  )} />
                  <span className="text-sm font-semibold text-slate-700">{op.name}</span>
                  <span className="text-xs text-slate-400">({op.role === 'operatorA' ? '운전원 A' : '운전원 B'})</span>
                </div>
                <span className={cn("text-lg font-bold", color)}>{grade}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-extrabold text-slate-800">{score}</span>
                <span className="text-sm text-slate-400 mb-1">/ 100</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                <div>
                  <span className="block text-slate-400">절차준수</span>
                  <span className="font-semibold text-slate-700">{op.report!.procedureComplianceScore}점</span>
                </div>
                <div>
                  <span className="block text-slate-400">HPO 기법</span>
                  <span className="font-semibold text-slate-700">{op.report!.hpoOverallScore}점</span>
                </div>
                <div>
                  <span className="block text-slate-400">기본수칙</span>
                  <span className="font-semibold text-slate-700">
                    {Math.round(op.report!.fundamentalScores.reduce((s, f) => s + f.score, 0) / (op.report!.fundamentalScores.length || 1))}점
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 동기화 정보 */}
      {session.syncResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> 영상 동기화 결과
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-400 block text-xs">A→B 오프셋</span>
              <span className="font-semibold text-slate-700">{session.syncResult.offsetAtoB.toFixed(1)}초</span>
            </div>
            {session.syncResult.offsetAtoInst != null && (
              <div>
                <span className="text-slate-400 block text-xs">A→교관 오프셋</span>
                <span className="font-semibold text-slate-700">{session.syncResult.offsetAtoInst.toFixed(1)}초</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block text-xs">신뢰도</span>
              <span className="font-semibold text-slate-700">{session.syncResult.confidence}%</span>
            </div>
          </div>
          {session.syncResult.matchedPhrases.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-slate-400 block mb-1">매칭된 발화 구간</span>
              <div className="flex flex-wrap gap-1.5">
                {session.syncResult.matchedPhrases.slice(0, 5).map((mp, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    &quot;{mp.phrase}&quot;
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 비교 인사이트 */}
      {session.summary && session.summary.comparisonHighlights.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">비교 분석 인사이트</h4>
          <ul className="space-y-2">
            {session.summary.comparisonHighlights.map((hl, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-amber-500 mt-0.5">•</span>
                {hl}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──
export default function SessionReport({ session, renderReport, onBack }: Props) {
  const completedOps = session.operators.filter(op => op.status === 'complete' && op.report);
  const isSingle = completedOps.length <= 1;

  // 탭: 운전원별 + "세션 종합"
  const [activeTab, setActiveTab] = useState<string>(completedOps[0]?.role || 'summary');

  // 1명일 때는 탭 없이 리포트 직접 렌더
  if (isSingle && completedOps.length === 1) {
    const op = completedOps[0];
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 세션 목록으로
        </button>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {session.procedureTitle} — {op.name}
          </h3>
          <p className="text-xs text-slate-400 mb-4">단일 운전원 분석 결과</p>
          {renderReport(op.report!, op.name, op.transcription)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 뒤로가기 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 세션 목록으로
      </button>

      {/* 세션 제목 */}
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-bold text-slate-800">{session.procedureTitle}</h2>
        <span className="text-xs text-slate-400 ml-auto">{session.createdAt}</span>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-slate-200">
        {completedOps.map((op) => (
          <button
            key={op.role}
            onClick={() => setActiveTab(op.role)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px",
              activeTab === op.role
                ? op.role === 'operatorA'
                  ? "border-teal-500 text-teal-700"
                  : "border-amber-500 text-amber-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <span className={cn(
              "inline-block w-2 h-2 rounded-full mr-1.5",
              op.role === 'operatorA' ? "bg-teal-500" : "bg-amber-500"
            )} />
            {op.name}
          </button>
        ))}
        {completedOps.length >= 2 && (
          <button
            onClick={() => setActiveTab('summary')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px",
              activeTab === 'summary'
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" />
            세션 종합
          </button>
        )}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[200px]">
        {activeTab === 'summary' ? (
          <SessionSummaryView session={session} />
        ) : (
          completedOps
            .filter(op => op.role === activeTab)
            .map(op => (
              <div key={op.role}>
                {renderReport(op.report!, op.name, op.transcription)}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
