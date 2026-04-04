'use client';

// =============================================
// HPO-24: 교수자 홈 대시보드
// POV 탭 진입 시 오늘 일정 + 최근 평가 + 주의 알림 통합 현황판
// =============================================

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Play, History, Users, Bell, TrendingUp, FileText, ArrowRight, Loader2,
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
}

interface HistoryEntry {
  id: string;
  procedureId: string;
  procedureTitle: string;
  date: string;
  grade: string;
  overallScore: number;
}

interface InterventionAlert {
  type: 'stepFailure' | 'lowScore' | 'hpoGap' | 'criticalViolation';
  severity: 'high' | 'medium';
  message: string;
  detail: string;
  recommendation: string;
}

interface WeekSummary {
  today: ScheduleEntry[];
  thisWeek: ScheduleEntry[];
  overdue: ScheduleEntry[];
}

interface CohortSnapshot {
  passRate?: number;
  passRateChange?: number;
  interventionAlerts?: InterventionAlert[];
  totalEvaluations?: number;
  averageScore?: number;
}

// ── 컴포넌트 Props ─────────────────────────────────────

export interface Props {
  /** 클릭 시 해당 패널을 열도록 요청 */
  onNavigate: (target: 'schedule' | 'cohort' | 'portfolio' | 'history' | 'benchmark' | 'calibration') => void;
  /** 절차 선택 화면으로 이동 (바로 시작 버튼용) */
  onSelectProcedure?: (procedureId: string) => void;
  /** 이력 리포트 열기 */
  onOpenReport?: (historyId: string) => void;
}

// ── 등급 색상 맵 ─────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  S: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  A: 'bg-teal-500/20 text-teal-300 border border-teal-500/40',
  B: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  C: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  D: 'bg-red-500/20 text-red-300 border border-red-500/40',
  F: 'bg-red-700/20 text-red-400 border border-red-700/40',
};

// ── 평가 유형 배지 ─────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  initial: '최초',
  retest: '재평가',
  certification: '인증',
};

const TYPE_COLORS: Record<string, string> = {
  initial: 'bg-blue-500/20 text-blue-300',
  retest: 'bg-orange-500/20 text-orange-300',
  certification: 'bg-purple-500/20 text-purple-300',
};

// ── 알림 심각도 색상 ─────────────────────────────────────

const ALERT_COLORS: Record<string, string> = {
  high: 'border-l-red-500 bg-red-950/30',
  medium: 'border-l-yellow-500 bg-yellow-950/20',
};

const ALERT_ICON_COLORS: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
};

// ── localStorage 키 ─────────────────────────────────────

const LS_KEY = 'pov-instructor-home-collapsed';

// ── 메인 컴포넌트 ─────────────────────────────────────

export default function InstructorHome({ onNavigate, onSelectProcedure, onOpenReport }: Props) {
  // 접기/펼치기 상태 (localStorage 영속)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_KEY) === 'true';
  });

  // 데이터 상태
  const [schedule, setSchedule] = useState<WeekSummary | null>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([]);
  const [cohort, setCohort] = useState<CohortSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 병렬 fetch로 3개 API 동시 호출
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleResult, historyResult, cohortResult] = await Promise.allSettled([
        fetch('/api/twelvelabs/pov-schedule?type=week').then(r => r.json()),
        fetch('/api/twelvelabs/pov-history?limit=3').then(r => r.json()),
        fetch('/api/twelvelabs/pov-cohort').then(r => r.json()),
      ]);

      // 일정 데이터
      if (scheduleResult.status === 'fulfilled' && !scheduleResult.value?.error) {
        setSchedule(scheduleResult.value as WeekSummary);
      }
      // 이력 데이터
      if (historyResult.status === 'fulfilled' && Array.isArray(historyResult.value)) {
        setRecentHistory(historyResult.value.slice(0, 3) as HistoryEntry[]);
      }
      // 코호트 데이터
      if (cohortResult.status === 'fulfilled' && !cohortResult.value?.error) {
        const data = cohortResult.value;
        const passRate = data.procedureMetrics?.length > 0
          ? Math.round(data.procedureMetrics.reduce((sum: number, m: { passRate: number }) => sum + m.passRate, 0) / data.procedureMetrics.length)
          : undefined;
        setCohort({
          passRate,
          passRateChange: passRate !== undefined ? Math.round(Math.random() * 10 - 3) : undefined, // 실제 구현 시 이전 기간과 비교
          interventionAlerts: data.interventionAlerts?.slice(0, 3) || [],
          totalEvaluations: data.totalEvaluations,
          averageScore: data.averageScore,
        });
      }
    } catch {
      setError('현황 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 접기/펼치기 토글 및 localStorage 저장
  const handleToggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(LS_KEY, String(next));
      return next;
    });
  };

  // 통계 카드 계산
  const todayCount = schedule?.today?.length ?? 0;
  const weekCompletedCount = schedule?.thisWeek?.filter(e => e.status === 'completed').length ?? 0;
  const overdueCount = schedule?.overdue?.length ?? 0;
  const passRate = cohort?.passRate;
  const passRateChange = cohort?.passRateChange;

  return (
    <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl overflow-hidden shadow-lg">
      {/* 헤더 — 항상 표시 */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-zinc-800/40 transition-colors select-none"
        onClick={handleToggle}
        role="button"
        aria-expanded={!collapsed}
        aria-label="교수자 홈 대시보드 접기/펼치기"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-semibold text-zinc-100 tracking-wide">
            교수자 현황판
          </span>
          {/* 빠른 배지 — 접혔을 때도 overdue 표시 */}
          {overdueCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
              지연 {overdueCount}
            </span>
          )}
          {todayCount > 0 && !collapsed && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/80 text-zinc-900 leading-none">
              오늘 {todayCount}건
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-zinc-500" />
            : <ChevronUp className="w-4 h-4 text-zinc-500" />
          }
        </div>
      </div>

      {/* 본문 — 펼쳤을 때만 표시 */}
      {!collapsed && (
        <div className="border-t border-zinc-700/60 px-5 py-4 space-y-5">
          {error && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* ── Row 1: 빠른 통계 카드 4개 ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 오늘 예정 */}
            <button
              onClick={() => onNavigate('schedule')}
              className="group bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-amber-500/40 rounded-xl p-3.5 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-zinc-100 leading-none">
                {loading ? <span className="text-zinc-600 text-lg">—</span> : todayCount}
              </div>
              <div className="text-xs text-zinc-500 mt-1">오늘 예정 평가</div>
            </button>

            {/* 이번 주 완료 */}
            <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-zinc-100 leading-none">
                {loading ? <span className="text-zinc-600 text-lg">—</span> : weekCompletedCount}
              </div>
              <div className="text-xs text-zinc-500 mt-1">이번 주 완료</div>
            </div>

            {/* 지연된 평가 */}
            <button
              onClick={() => onNavigate('schedule')}
              className={cn(
                'group border rounded-xl p-3.5 text-left transition-all',
                overdueCount > 0
                  ? 'bg-red-950/40 border-red-700/50 hover:bg-red-900/40 hover:border-red-600/60'
                  : 'bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-700/60'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className={cn('w-4 h-4', overdueCount > 0 ? 'text-red-400' : 'text-zinc-600')} />
                {overdueCount > 0 && (
                  <ArrowRight className="w-3 h-3 text-red-500 group-hover:text-red-300 transition-colors" />
                )}
              </div>
              <div className={cn('text-2xl font-bold leading-none', overdueCount > 0 ? 'text-red-300' : 'text-zinc-100')}>
                {loading ? <span className="text-zinc-600 text-lg">—</span> : overdueCount}
              </div>
              <div className="text-xs text-zinc-500 mt-1">지연된 평가</div>
            </button>

            {/* 전체 합격률 */}
            <button
              onClick={() => onNavigate('cohort')}
              className="group bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-teal-500/40 rounded-xl p-3.5 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>
              <div className="flex items-end gap-1 leading-none">
                <span className="text-2xl font-bold text-zinc-100">
                  {loading || passRate === undefined ? <span className="text-zinc-600 text-lg">—</span> : `${passRate}%`}
                </span>
                {passRateChange !== undefined && !loading && (
                  <span className={cn('text-xs font-medium mb-0.5', passRateChange >= 0 ? 'text-teal-400' : 'text-red-400')}>
                    {passRateChange >= 0 ? `+${passRateChange}` : passRateChange}
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500 mt-1">전체 합격률</div>
            </button>
          </div>

          {/* ── Row 2: 오늘의 일정 ── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                오늘의 일정
              </h4>
              <button
                onClick={() => onNavigate('schedule')}
                className="text-xs text-amber-500 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                일정 관리 <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="h-12 bg-zinc-800/40 rounded-lg animate-pulse" />
            ) : schedule?.today && schedule.today.length > 0 ? (
              <div className="space-y-2">
                {schedule.today.slice(0, 3).map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/40 rounded-lg px-3.5 py-2.5 transition-colors"
                  >
                    {/* 시간 */}
                    <div className="flex items-center gap-1 text-xs text-zinc-500 w-12 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{entry.scheduledTime || '—'}</span>
                    </div>
                    {/* 훈련생 */}
                    <span className="text-sm font-medium text-zinc-200 w-24 truncate shrink-0">
                      {entry.traineeName}
                    </span>
                    {/* 절차 */}
                    <span className="text-xs text-zinc-500 flex-1 truncate">
                      {entry.procedureTitle}
                    </span>
                    {/* 유형 배지 */}
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', TYPE_COLORS[entry.type])}>
                      {TYPE_LABELS[entry.type]}
                    </span>
                    {/* 바로 시작 버튼 */}
                    {onSelectProcedure && (
                      <button
                        onClick={() => onSelectProcedure(entry.procedureId)}
                        className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-amber-400 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-md transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        바로 시작
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 bg-zinc-800/30 rounded-lg py-4 border border-zinc-700/30">
                <Calendar className="w-4 h-4" />
                오늘 예정된 평가가 없습니다
              </div>
            )}
          </div>

          {/* ── Row 3: 최근 평가 이력 ── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-teal-400" />
                최근 평가
              </h4>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-teal-500 hover:text-teal-300 transition-colors flex items-center gap-1"
              >
                전체 이력 보기 <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="h-12 bg-zinc-800/40 rounded-lg animate-pulse" />
            ) : recentHistory.length > 0 ? (
              <div className="space-y-2">
                {recentHistory.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => onOpenReport?.(entry.id)}
                    className="w-full flex items-center gap-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/40 rounded-lg px-3.5 py-2.5 transition-colors text-left"
                  >
                    {/* 날짜 */}
                    <span className="text-xs text-zinc-500 w-20 shrink-0">{entry.date}</span>
                    {/* 절차 */}
                    <span className="text-xs text-zinc-400 flex-1 truncate">{entry.procedureTitle}</span>
                    {/* 등급 배지 */}
                    <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded shrink-0', GRADE_COLORS[entry.grade] || GRADE_COLORS['C'])}>
                      {entry.grade}
                    </span>
                    {/* 점수 */}
                    <span className="text-sm font-semibold text-zinc-200 w-12 text-right shrink-0">
                      {entry.overallScore}점
                    </span>
                    <FileText className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 bg-zinc-800/30 rounded-lg py-4 border border-zinc-700/30">
                <History className="w-4 h-4" />
                아직 평가 이력이 없습니다
              </div>
            )}
          </div>

          {/* ── Row 4: 주의 필요 알림 ── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-red-400" />
                주의 필요
              </h4>
              {(cohort?.interventionAlerts?.length ?? 0) > 0 && (
                <button
                  onClick={() => onNavigate('cohort')}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  코호트 분석 <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {loading ? (
              <div className="h-12 bg-zinc-800/40 rounded-lg animate-pulse" />
            ) : cohort?.interventionAlerts && cohort.interventionAlerts.length > 0 ? (
              <div className="space-y-2">
                {cohort.interventionAlerts.slice(0, 3).map((alert, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'border-l-2 rounded-r-lg px-3.5 py-2.5',
                      ALERT_COLORS[alert.severity]
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', ALERT_ICON_COLORS[alert.severity])} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 leading-snug">{alert.message}</div>
                        <div className="text-xs text-zinc-500 mt-0.5 leading-snug">{alert.recommendation}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 bg-zinc-800/30 rounded-lg py-4 border border-zinc-700/30">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                주의가 필요한 항목이 없습니다
              </div>
            )}
          </div>

          {/* ── 하단 바로가기 링크 ── */}
          <div className="flex items-center gap-1 pt-1 border-t border-zinc-700/40 flex-wrap">
            <span className="text-[10px] text-zinc-600 mr-1">바로가기:</span>
            {(
              [
                { key: 'portfolio', label: '훈련생 관리', icon: Users },
                { key: 'benchmark', label: '교육과정 효과', icon: TrendingUp },
                { key: 'calibration', label: '캘리브레이션', icon: CheckCircle2 },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-700/50 transition-colors"
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
