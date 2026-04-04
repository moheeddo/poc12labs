'use client';

// =============================================
// 내보내기 드롭다운 메뉴 — CSV 다운로드 (결과/HPO/이력/코호트)
// =============================================

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
import type { PovEvaluationReport } from '@/lib/types';
import {
  reportToCSV,
  hpoToCSV,
  historyToCSV,
  cohortToCSV,
} from '@/lib/pov-export';
import type { HistoryEntry } from '@/lib/pov-analysis-history';
import type { CohortMetrics } from '@/lib/pov-cohort-analytics';

interface Props {
  /** 현재 리포트 — 평가 결과/HPO 내보내기에 사용 */
  report?: PovEvaluationReport;
  className?: string;
}

/** Blob → 즉시 다운로드 */
function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 오늘 날짜 (YYYY-MM-DD) */
function today() {
  return new Date().toISOString().split('T')[0];
}

export default function ExportMenu({ report, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null); // 로딩 중인 항목 키
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** 현재 리포트 — 단계별 결과 CSV */
  function exportReport() {
    if (!report) return;
    const filename = `pov-평가결과-${report.procedureId}-${today()}.csv`;
    downloadCSV(reportToCSV(report), filename);
    setOpen(false);
  }

  /** 현재 리포트 — HPO 도구 적용 현황 CSV */
  function exportHpo() {
    if (!report) return;
    const filename = `pov-HPO현황-${report.procedureId}-${today()}.csv`;
    downloadCSV(hpoToCSV(report), filename);
    setOpen(false);
  }

  /** 전체 평가 이력 — API 호출 후 CSV 변환 */
  async function exportHistory() {
    setLoading('history');
    try {
      const res = await fetch('/api/twelvelabs/pov-history?limit=200');
      if (!res.ok) throw new Error('이력 API 호출 실패');
      const entries: HistoryEntry[] = await res.json();
      downloadCSV(historyToCSV(entries), `pov-이력-${today()}.csv`);
    } catch (err) {
      console.error('[ExportMenu] 이력 내보내기 실패:', err);
      alert('이력 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  /** 코호트 분석 — API 호출 후 CSV 변환 */
  async function exportCohort() {
    setLoading('cohort');
    try {
      const res = await fetch('/api/twelvelabs/pov-cohort');
      if (!res.ok) throw new Error('코호트 API 호출 실패');
      const metrics: CohortMetrics = await res.json();
      downloadCSV(cohortToCSV(metrics), `pov-코호트-${today()}.csv`);
    } catch (err) {
      console.error('[ExportMenu] 코호트 내보내기 실패:', err);
      alert('코호트 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  const hasReport = Boolean(report);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* 드롭다운 토글 버튼 */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium border border-zinc-200 transition-all"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Download className="w-4 h-4" />
        내보내기
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* 드롭다운 메뉴 */}
      {open && (
        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-fade-in-up">
          {/* 평가 결과 — 리포트 있을 때만 활성 */}
          <button
            onClick={exportReport}
            disabled={!hasReport}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            평가 결과 (CSV)
          </button>

          {/* HPO 현황 — 리포트 있을 때만 활성 */}
          <button
            onClick={exportHpo}
            disabled={!hasReport}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            HPO 현황 (CSV)
          </button>

          <div className="border-t border-slate-100 my-1" />

          {/* 전체 이력 — 항상 활성 */}
          <button
            onClick={exportHistory}
            disabled={loading === 'history'}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-60 transition-colors"
          >
            {loading === 'history' ? (
              <Loader2 className="w-3.5 h-3.5 shrink-0 text-amber-500 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            )}
            전체 이력 (CSV)
          </button>

          {/* 코호트 분석 — 항상 활성 */}
          <button
            onClick={exportCohort}
            disabled={loading === 'cohort'}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-60 transition-colors"
          >
            {loading === 'cohort' ? (
              <Loader2 className="w-3.5 h-3.5 shrink-0 text-amber-500 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            )}
            코호트 분석 (CSV)
          </button>
        </div>
      )}
    </div>
  );
}
