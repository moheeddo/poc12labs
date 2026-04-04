'use client';

// =============================================
// HPO-19: 평가 일정 캘린더
// 일정 등록 + 월별 뷰 + 주간 요약 + 상태 필터
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { HPO_PROCEDURES } from '@/lib/pov-standards';
import {
  Calendar, Clock, AlertTriangle, CheckCircle2,
  Plus, X, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── 타입 ─────────────────────────────────────

interface ScheduleEntry {
  id: string;
  traineeName: string;
  procedureId: string;
  procedureTitle: string;
  scheduledDate: string;
  scheduledTime?: string;
  type: 'initial' | 'retest' | 'certification';
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  notes?: string;
  previousReportId?: string;
  createdAt: string;
}

interface WeekSummary {
  today: ScheduleEntry[];
  thisWeek: ScheduleEntry[];
  overdue: ScheduleEntry[];
}

type StatusFilter = 'all' | 'scheduled' | 'completed' | 'overdue';

interface Props {
  onClose: () => void;
  onStartEvaluation?: (procedureId: string) => void;
}

// ── 상수 ─────────────────────────────────────

const TYPE_LABELS: Record<ScheduleEntry['type'], string> = {
  initial: '초기평가',
  retest: '재평가',
  certification: '인증평가',
};

const TYPE_COLORS: Record<ScheduleEntry['type'], string> = {
  initial: 'bg-slate-100 text-slate-600',
  retest: 'bg-amber-500/15 text-amber-600',
  certification: 'bg-purple-500/15 text-purple-600',
};

const STATUS_LABELS: Record<ScheduleEntry['status'], string> = {
  scheduled: '예정',
  completed: '완료',
  cancelled: '취소',
  overdue: '지연',
};

const STATUS_COLORS: Record<ScheduleEntry['status'], string> = {
  scheduled: 'bg-blue-500/15 text-blue-500',
  completed: 'bg-teal-500/15 text-teal-500',
  cancelled: 'bg-slate-100 text-slate-500',
  overdue: 'bg-red-500/15 text-red-500',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// ══════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════

export default function EvaluationSchedule({ onClose, onStartEvaluation }: Props) {
  // ── 데이터 상태 ──
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [weekSummary, setWeekSummary] = useState<WeekSummary>({ today: [], thisWeek: [], overdue: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // ── 등록 폼 상태 ──
  const [form, setForm] = useState({
    traineeName: '',
    procedureId: '',
    scheduledDate: '',
    scheduledTime: '',
    type: 'initial' as ScheduleEntry['type'],
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // ── 캘린더 상태 ──
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed

  // ── 데이터 로드 ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, weekRes] = await Promise.all([
        fetch('/api/twelvelabs/pov-schedule'),
        fetch('/api/twelvelabs/pov-schedule?type=week'),
      ]);
      const [list, week] = await Promise.all([listRes.json(), weekRes.json()]);
      setEntries(Array.isArray(list) ? list : []);
      setWeekSummary(week);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── 일정 등록 ──
  const handleSubmit = useCallback(async () => {
    setFormError('');
    if (!form.traineeName.trim()) { setFormError('훈련생 이름을 입력하세요'); return; }
    if (!form.procedureId) { setFormError('절차를 선택하세요'); return; }
    if (!form.scheduledDate) { setFormError('날짜를 선택하세요'); return; }

    const proc = HPO_PROCEDURES.find(p => p.id === form.procedureId);
    if (!proc) { setFormError('유효하지 않은 절차입니다'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/twelvelabs/pov-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traineeName: form.traineeName.trim(),
          procedureId: form.procedureId,
          procedureTitle: `붙임${proc.appendixNo}. ${proc.title}`,
          scheduledDate: form.scheduledDate,
          scheduledTime: form.scheduledTime || undefined,
          type: form.type,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); setFormError(e.error || '등록 실패'); return; }

      // 폼 초기화 후 데이터 갱신
      setForm({ traineeName: '', procedureId: '', scheduledDate: '', scheduledTime: '', type: 'initial', notes: '' });
      await loadData();
    } catch {
      setFormError('네트워크 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  }, [form, loadData]);

  // ── 상태 업데이트 ──
  const handleUpdateStatus = useCallback(async (id: string, status: ScheduleEntry['status']) => {
    try {
      await fetch('/api/twelvelabs/pov-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', id, status }),
      });
      await loadData();
    } catch { /* 무시 */ }
  }, [loadData]);

  // ── 일정 삭제 ──
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/twelvelabs/pov-schedule?id=${id}`, { method: 'DELETE' });
      await loadData();
    } catch { /* 무시 */ }
  }, [loadData]);

  // ── 필터링된 목록 ──
  const filteredEntries = entries.filter(e => {
    if (statusFilter === 'all') return true;
    return e.status === statusFilter;
  });

  // ── 캘린더 날짜 그리드 생성 ──
  const calDates = useCallback(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startPad = firstDay.getDay(); // 0=일
    const cells: Array<{ date: number | null; fullDate: string | null }> = [];

    // 앞쪽 빈 셀
    for (let i = 0; i < startPad; i++) cells.push({ date: null, fullDate: null });

    // 날짜 셀
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const mm = String(calMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ date: d, fullDate: `${calYear}-${mm}-${dd}` });
    }

    return cells;
  }, [calYear, calMonth]);

  // 날짜별 일정 수 집계
  const scheduleCountByDate = useCallback((fullDate: string) => {
    return entries.filter(e => e.scheduledDate === fullDate && e.status !== 'cancelled').length;
  }, [entries]);

  const overdueCountByDate = useCallback((fullDate: string) => {
    return entries.filter(e => e.scheduledDate === fullDate && e.status === 'overdue').length;
  }, [entries]);

  const todayStr = today.toISOString().split('T')[0];

  // ══════════════════════════════════════════════
  // 렌더링
  // ══════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── 헤더 ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
          <Calendar className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-slate-800">평가 일정 관리</h2>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* ════ Section A: 이번 주 요약 카드 ════ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 오늘 예정 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-blue-600">오늘 예정</span>
              </div>
              <p className="text-3xl font-bold text-blue-600 font-mono">{weekSummary.today.length}</p>
              <p className="text-xs text-blue-400 mt-1">건</p>
            </div>

            {/* 이번 주 */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-teal-500" />
                <span className="text-sm font-semibold text-teal-600">이번 주</span>
              </div>
              <p className="text-3xl font-bold text-teal-600 font-mono">{weekSummary.thisWeek.length}</p>
              <p className="text-xs text-teal-400 mt-1">건 (7일 이내)</p>
            </div>

            {/* 지연 */}
            <div className={cn(
              "border rounded-xl p-4",
              weekSummary.overdue.length > 0
                ? "bg-red-50 border-red-200"
                : "bg-slate-50 border-slate-200"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={cn(
                  "w-4 h-4",
                  weekSummary.overdue.length > 0 ? "text-red-500 animate-pulse" : "text-slate-400"
                )} />
                <span className={cn(
                  "text-sm font-semibold",
                  weekSummary.overdue.length > 0 ? "text-red-600" : "text-slate-500"
                )}>지연</span>
              </div>
              <p className={cn(
                "text-3xl font-bold font-mono",
                weekSummary.overdue.length > 0 ? "text-red-600" : "text-slate-400"
              )}>
                {weekSummary.overdue.length}
              </p>
              <p className={cn(
                "text-xs mt-1",
                weekSummary.overdue.length > 0 ? "text-red-400" : "text-slate-400"
              )}>건 미수행</p>
            </div>
          </div>

          {/* ════ Section B: 일정 등록 폼 ════ */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-600" /> 새 일정 등록
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 훈련생 이름 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">훈련생 이름 *</label>
                <input
                  type="text"
                  value={form.traineeName}
                  onChange={e => setForm(f => ({ ...f, traineeName: e.target.value }))}
                  placeholder="예) 김철수"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-colors"
                />
              </div>

              {/* 절차 선택 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">실습 절차 *</label>
                <select
                  value={form.procedureId}
                  onChange={e => setForm(f => ({ ...f, procedureId: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-colors"
                >
                  <option value="">절차 선택...</option>
                  {HPO_PROCEDURES.map(p => (
                    <option key={p.id} value={p.id}>
                      붙임{p.appendixNo}. {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 날짜 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">날짜 *</label>
                <input
                  type="date"
                  value={form.scheduledDate}
                  onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-colors"
                />
              </div>

              {/* 시간 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">시간 (선택)</label>
                <input
                  type="time"
                  value={form.scheduledTime}
                  onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-colors"
                />
              </div>

              {/* 평가 유형 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">평가 유형 *</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as ScheduleEntry['type'] }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-colors"
                >
                  <option value="initial">초기평가</option>
                  <option value="retest">재평가</option>
                  <option value="certification">인증평가</option>
                </select>
              </div>

              {/* 메모 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">메모 (선택)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="특이사항..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-colors"
                />
              </div>
            </div>

            {/* 에러 메시지 */}
            {formError && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {formError}
              </p>
            )}

            {/* 등록 버튼 */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {submitting ? '등록 중...' : '일정 등록'}
              </button>
            </div>
          </div>

          {/* ════ Section C + D: 일정 목록 & 캘린더 (나란히) ════ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── Section C: 일정 목록 (3/5) ── */}
            <div className="lg:col-span-3 space-y-3">
              {/* 필터 */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                {((['all', 'scheduled', 'completed', 'overdue'] as StatusFilter[])).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                      statusFilter === f
                        ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                        : "text-slate-500 hover:text-slate-700 border-transparent hover:border-slate-200",
                    )}
                  >
                    {f === 'all' ? '전체' : STATUS_LABELS[f as ScheduleEntry['status']]}
                    {f !== 'all' && (
                      <span className="ml-1 opacity-70">
                        {entries.filter(e => e.status === f).length}
                      </span>
                    )}
                  </button>
                ))}
                <span className="ml-auto text-xs text-slate-400">총 {filteredEntries.length}건</span>
              </div>

              {/* 목록 */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-hide pr-1">
                {loading ? (
                  <div className="text-center py-8 text-sm text-slate-400">불러오는 중...</div>
                ) : filteredEntries.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400">
                    {statusFilter === 'all' ? '등록된 일정이 없습니다' : `${STATUS_LABELS[statusFilter as ScheduleEntry['status']]} 일정이 없습니다`}
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <ScheduleItem
                      key={entry.id}
                      entry={entry}
                      onUpdateStatus={handleUpdateStatus}
                      onDelete={handleDelete}
                      onStartEvaluation={onStartEvaluation}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ── Section D: 월별 캘린더 뷰 (2/5) ── */}
            <div className="lg:col-span-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                {/* 캘린더 헤더 */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                      else setCalMonth(m => m - 1);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
                    aria-label="이전 달"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </button>
                  <span className="text-sm font-semibold text-slate-700">
                    {calYear}년 {calMonth + 1}월
                  </span>
                  <button
                    onClick={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                      else setCalMonth(m => m + 1);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
                    aria-label="다음 달"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map(day => (
                    <div key={day} className={cn(
                      "text-center text-[10px] font-semibold py-1",
                      day === '일' ? 'text-red-400' : day === '토' ? 'text-blue-400' : 'text-slate-400'
                    )}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 gap-0.5">
                  {calDates().map((cell, i) => {
                    if (!cell.date || !cell.fullDate) {
                      return <div key={`pad-${i}`} className="h-9" />;
                    }
                    const isToday = cell.fullDate === todayStr;
                    const count = scheduleCountByDate(cell.fullDate);
                    const overdueCount = overdueCountByDate(cell.fullDate);
                    const colIdx = i % 7;
                    const isSun = colIdx === 0;
                    const isSat = colIdx === 6;

                    return (
                      <div
                        key={cell.fullDate}
                        className={cn(
                          "h-9 flex flex-col items-center justify-center rounded-lg relative transition-colors",
                          isToday ? "bg-amber-500 text-white font-bold" : "hover:bg-slate-100",
                          !isToday && isSun ? "text-red-400" : "",
                          !isToday && isSat ? "text-blue-400" : "",
                          !isToday && !isSun && !isSat ? "text-slate-700" : "",
                        )}
                      >
                        <span className="text-[11px] leading-none">{cell.date}</span>
                        {count > 0 && (
                          <span className={cn(
                            "absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center leading-none",
                            overdueCount > 0
                              ? "bg-red-500 text-white"
                              : isToday
                              ? "bg-white text-amber-600"
                              : "bg-amber-500 text-white"
                          )}>
                            {count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 범례 */}
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-4 text-[10px] text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 일정 있음
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> 지연 포함
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                    <span className="w-3 h-3 rounded-full border border-amber-500 inline-block" /> 오늘
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// 일정 항목 서브 컴포넌트
// ══════════════════════════════════════════════

interface ScheduleItemProps {
  entry: ScheduleEntry;
  onUpdateStatus: (id: string, status: ScheduleEntry['status']) => void;
  onDelete: (id: string) => void;
  onStartEvaluation?: (procedureId: string) => void;
}

function ScheduleItem({ entry, onUpdateStatus, onDelete, onStartEvaluation }: ScheduleItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "bg-white border rounded-xl overflow-hidden transition-colors",
      entry.status === 'overdue'
        ? "border-red-200"
        : entry.status === 'completed'
        ? "border-teal-200"
        : "border-slate-200",
    )}>
      {/* 메인 행 */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {/* 날짜 */}
        <div className="shrink-0 text-center min-w-[48px]">
          <p className="text-xs text-slate-400 font-mono leading-tight">
            {entry.scheduledDate.substring(5)}
          </p>
          {entry.scheduledTime && (
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5 justify-center">
              <Clock className="w-2.5 h-2.5" /> {entry.scheduledTime}
            </p>
          )}
        </div>

        {/* 구분선 */}
        <div className="w-px h-8 bg-slate-200 shrink-0" />

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{entry.traineeName}</p>
          <p className="text-xs text-slate-500 truncate">{entry.procedureTitle}</p>
        </div>

        {/* 배지들 */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", TYPE_COLORS[entry.type])}>
            {TYPE_LABELS[entry.type]}
          </span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_COLORS[entry.status])}>
            {STATUS_LABELS[entry.status]}
          </span>
        </div>
      </div>

      {/* 펼쳐진 액션 영역 */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 space-y-2">
          {/* 메모 */}
          {entry.notes && (
            <p className="text-xs text-slate-500 italic">{entry.notes}</p>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 평가 시작 */}
            {entry.status !== 'cancelled' && entry.status !== 'completed' && onStartEvaluation && (
              <button
                onClick={() => onStartEvaluation(entry.procedureId)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-500/15 text-amber-600 rounded-lg hover:bg-amber-500/25 transition-colors font-medium"
              >
                평가 시작
              </button>
            )}

            {/* 완료 처리 */}
            {(entry.status === 'scheduled' || entry.status === 'overdue') && (
              <button
                onClick={() => onUpdateStatus(entry.id, 'completed')}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-teal-500/15 text-teal-600 rounded-lg hover:bg-teal-500/25 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" /> 완료
              </button>
            )}

            {/* 취소 처리 */}
            {entry.status === 'scheduled' && (
              <button
                onClick={() => onUpdateStatus(entry.id, 'cancelled')}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
            )}

            {/* 삭제 */}
            <button
              onClick={() => onDelete(entry.id)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors ml-auto"
            >
              <X className="w-3 h-3" /> 삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
