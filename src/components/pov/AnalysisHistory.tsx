'use client';

import { useEffect, useState } from 'react';
import { usePovHistory, type HistoryEntry } from '@/hooks/usePovHistory';
import { HPO_PROCEDURES } from '@/lib/pov-standards';
import type { PovEvaluationReport } from '@/lib/types';
import {
  X, Trash2, TrendingUp, Clock, FileText, ChevronDown,
} from 'lucide-react';
import ExportMenu from '@/components/pov/ExportMenu';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  procedureId?: string;
  onViewReport: (report: PovEvaluationReport) => void;
  onClose: () => void;
}

// 등급별 색상
function gradeColor(grade: string): string {
  if (grade === 'S' || grade === 'A') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (grade === 'B') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (grade === 'C') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

// 점수별 색상 (차트 dot용)
function scoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
}

// 날짜 포맷 (ISO → 한국식 간결)
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AnalysisHistory({ procedureId, onViewReport, onClose }: Props) {
  const { entries, trend, loading, fetchHistory, fetchTrend, deleteEntry } = usePovHistory();
  const [filterProcedure, setFilterProcedure] = useState<string>(procedureId || '');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 초기 로딩
  useEffect(() => {
    fetchHistory(filterProcedure || undefined);
    if (filterProcedure) {
      fetchTrend(filterProcedure);
    }
  }, [filterProcedure, fetchHistory, fetchTrend]);

  // 절차 옵션 (HPO_PROCEDURES에서 추출)
  const procedureOptions = HPO_PROCEDURES.map(p => ({
    id: p.id,
    label: `붙임${p.appendixNo}. ${p.title}`,
  }));

  async function handleDelete(id: string) {
    await deleteEntry(id);
    setConfirmDeleteId(null);
    // 추이 갱신
    if (filterProcedure) fetchTrend(filterProcedure);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">분석 이력</h2>
            <span className="text-xs text-slate-400 font-normal">
              ({entries.length}건)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 필터 ── */}
        <div className="px-6 py-3 border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">절차 필터:</label>
            <div className="relative flex-1 max-w-xs">
              <select
                value={filterProcedure}
                onChange={(e) => setFilterProcedure(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
              >
                <option value="">전체 절차</option>
                {procedureOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── 점수 추이 차트 ── */}
        {filterProcedure && trend.length >= 2 && (
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-slate-700">점수 추이</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v: string) => v.slice(5)} // MM-DD
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, _name: string, props) => {
                    const grade = (props as { payload?: { grade?: string } })?.payload?.grade || '';
                    return [`${value}점 (${grade}등급)`, '종합 점수'];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={(props: { cx: number; cy: number; payload: { score: number } }) => (
                    <circle
                      key={`dot-${props.cx}-${props.cy}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={scoreColor(props.payload.score)}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  )}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── 이력 목록 ── */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
              <span className="animate-spin">&#9696;</span>
              불러오는 중...
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-sm">
              <FileText className="w-8 h-8 text-slate-300" />
              <span>분석 이력이 없습니다.</span>
              <span className="text-xs text-slate-300">POV 분석을 실행하면 여기에 자동으로 기록됩니다.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map((entry: HistoryEntry) => (
                <div
                  key={entry.id}
                  className="group rounded-xl border border-slate-200 bg-white hover:border-amber-400/50 hover:shadow-md hover:shadow-amber-500/5 transition-all cursor-pointer px-4 py-3"
                  onClick={() => onViewReport(entry.report)}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* 왼쪽: 점수 + 정보 */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* 점수 원형 */}
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-sm"
                        style={{
                          background: `conic-gradient(${scoreColor(entry.overallScore)} ${entry.overallScore}%, #e2e8f0 0)`,
                          color: scoreColor(entry.overallScore),
                        }}
                      >
                        <span className="bg-white rounded-full w-8 h-8 flex items-center justify-center">
                          {entry.overallScore}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {entry.procedureTitle}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${gradeColor(entry.grade)}`}>
                            {entry.grade}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{formatDate(entry.createdAt)}</span>
                          <span className="text-slate-200">|</span>
                          <span className="font-mono">{entry.videoId.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: 삭제 */}
                    <div className="flex items-center gap-1 shrink-0">
                      {confirmDeleteId === entry.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(entry.id); }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                          title="이력 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 하단 안내 ── */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400 text-center">
            최근 50건 표시 | 분석 완료 시 자동 저장 | 서버 재시작 후에도 유지됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
