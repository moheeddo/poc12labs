'use client';
// =============================================
// SOP 관리 UI — 절차 조회 + 쿼리 템플릿 편집
// 평가관이 현재 등록된 SOP 절차와 TwelveLabs 검색 쿼리를 확인·수정
// =============================================

import { useState, useEffect, useMemo } from 'react';
import {
  X, ChevronRight, ChevronDown, Settings2, RotateCcw,
  FileText, AlertTriangle, CheckCircle2, Edit3, Save,
  Activity, Zap, Shield, GitCompare, Search,
} from 'lucide-react';
import { HPO_PROCEDURES, SYSTEM_COLORS } from '@/lib/pov-standards';
import type { Procedure, ProcedureStep } from '@/lib/pov-standards';
import { getQueryTemplates } from '@/lib/pov-query-templates';
import {
  getOverrides,
  setOverride,
  removeOverride,
  getOverrideCount,
} from '@/lib/pov-query-overrides';
import type { StepQueryTemplate } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

// ── 계통별 아이콘 ─────────────────────────
const systemIcons: Record<string, React.ReactNode> = {
  냉각수: <Activity className="w-3.5 h-3.5" />,
  순환수: <GitCompare className="w-3.5 h-3.5" />,
  온수: <Zap className="w-3.5 h-3.5" />,
  공정수: <Shield className="w-3.5 h-3.5" />,
};

// ── 스텝 평탄화 ───────────────────────────
function flattenSteps(steps: ProcedureStep[]): ProcedureStep[] {
  const result: ProcedureStep[] = [];
  for (const step of steps) {
    result.push(step);
    if (step.children && step.children.length > 0) {
      result.push(...flattenSteps(step.children));
    }
  }
  return result;
}

// ── 쿼리 편집 패널 ───────────────────────
interface QueryEditPanelProps {
  step: ProcedureStep;
  template: StepQueryTemplate;
  isOverridden: boolean;
  onSave: (stepId: string, data: Partial<StepQueryTemplate>) => void;
  onReset: (stepId: string) => void;
}

function QueryEditPanel({ step, template, isOverridden, onSave, onReset }: QueryEditPanelProps) {
  const [editing, setEditing] = useState(false);
  const [actionQuery, setActionQuery] = useState(template.actionQuery);
  const [objectQuery, setObjectQuery] = useState(template.objectQuery);
  const [stateQuery, setStateQuery] = useState(template.stateQuery);

  // template 변경 시 로컬 상태 동기화
  useEffect(() => {
    setActionQuery(template.actionQuery);
    setObjectQuery(template.objectQuery);
    setStateQuery(template.stateQuery);
  }, [template.actionQuery, template.objectQuery, template.stateQuery]);

  function handleSave() {
    onSave(step.id, { actionQuery, objectQuery, stateQuery });
    setEditing(false);
  }

  function handleReset() {
    onReset(step.id);
    setEditing(false);
  }

  return (
    <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 space-y-3">
      {/* 단계 정보 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-amber-400">{step.id}</span>
          {step.isCritical && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-900/60 text-red-400 border border-red-700/40">
              핵심단계
            </span>
          )}
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{step.description}</p>
          {step.equipment && (
            <span className="text-xs text-zinc-500 mt-1 inline-block">장비: {step.equipment}</span>
          )}
          {step.expectedState && (
            <span className="text-xs text-zinc-500 ml-3 inline-block">기대상태: {step.expectedState}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isOverridden && (
            <button
              onClick={handleReset}
              title="기본값으로 복원"
              className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {editing ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs transition-colors"
            >
              <Save className="w-3 h-3" /> 저장
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 text-xs transition-colors"
            >
              <Edit3 className="w-3 h-3" /> 편집
            </button>
          )}
        </div>
      </div>

      {/* 쿼리 필드 */}
      <div className="space-y-2">
        {[
          { label: 'Action Query', icon: <Activity className="w-3 h-3" />, value: actionQuery, setter: setActionQuery, field: 'actionQuery' as const, placeholder: 'operator pressing button...' },
          { label: 'Object Query', icon: <Search className="w-3 h-3" />, value: objectQuery, setter: setObjectQuery, field: 'objectQuery' as const, placeholder: 'valve labeled VG-003...' },
          { label: 'State Query', icon: <CheckCircle2 className="w-3 h-3" />, value: stateQuery, setter: setStateQuery, field: 'stateQuery' as const, placeholder: 'valve in open state...' },
        ].map(({ label, icon, value, setter, placeholder }) => (
          <div key={label}>
            <label className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 mb-1">
              {icon} {label}
            </label>
            {editing ? (
              <input
                value={value}
                onChange={e => setter(e.target.value)}
                className="w-full text-xs bg-zinc-900 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 font-mono"
                placeholder={placeholder}
              />
            ) : (
              <div className="text-xs font-mono text-zinc-300 bg-zinc-900/60 border border-zinc-700/50 rounded px-2.5 py-1.5 leading-relaxed break-all">
                {value}
              </div>
            )}
          </div>
        ))}
      </div>

      {isOverridden && !editing && (
        <div className="flex items-center gap-1 text-[10px] text-amber-400/70">
          <Edit3 className="w-3 h-3" /> 오버라이드 적용됨
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────
export default function SopManager({ onClose }: Props) {
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(HPO_PROCEDURES[0]);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [overrides, setOverridesState] = useState<Record<string, Partial<StepQueryTemplate>>>({});
  const [overrideCount, setOverrideCount] = useState(0);

  // 마운트 시 localStorage 오버라이드 로드
  useEffect(() => {
    setOverridesState(getOverrides());
    setOverrideCount(getOverrideCount());
  }, []);

  // 오버라이드 업데이트 후 상태 동기화
  function refreshOverrides() {
    setOverridesState(getOverrides());
    setOverrideCount(getOverrideCount());
  }

  // 오버라이드 저장 핸들러
  function handleSave(stepId: string, data: Partial<StepQueryTemplate>) {
    setOverride(stepId, data);
    refreshOverrides();
  }

  // 오버라이드 제거 핸들러
  function handleReset(stepId: string) {
    removeOverride(stepId);
    refreshOverrides();
  }

  // 선택된 절차의 쿼리 템플릿 (오버라이드 적용)
  const templates = useMemo(() => {
    if (!selectedProcedure) return [];
    const base = getQueryTemplates(selectedProcedure.id);
    // 오버라이드를 직접 적용 (클라이언트 상태 기반)
    return base.map(t => {
      const override = overrides[t.stepId];
      if (!override) return t;
      return {
        ...t,
        actionQuery: override.actionQuery ?? t.actionQuery,
        objectQuery: override.objectQuery ?? t.objectQuery,
        stateQuery: override.stateQuery ?? t.stateQuery,
      };
    });
  }, [selectedProcedure, overrides]);

  // 전체 통계 계산
  const stats = useMemo(() => {
    const totalProcedures = HPO_PROCEDURES.length;
    const totalSteps = HPO_PROCEDURES.reduce((sum, p) =>
      sum + p.sections.reduce((s2, sec) => s2 + flattenSteps(sec.steps).length, 0), 0);
    const criticalSteps = HPO_PROCEDURES.reduce((sum, p) =>
      sum + p.sections.reduce((s2, sec) =>
        s2 + flattenSteps(sec.steps).filter(st => st.isCritical).length, 0), 0);
    return { totalProcedures, totalSteps, criticalSteps, overrideCount };
  }, [overrideCount]);

  // 계통별 그룹핑
  const proceduresBySystem = useMemo(() => {
    const map = new Map<string, Procedure[]>();
    HPO_PROCEDURES.forEach(p => {
      const list = map.get(p.system) || [];
      list.push(p);
      map.set(p.system, list);
    });
    return map;
  }, []);

  // 현재 절차의 플랫 스텝 목록
  const flatSteps = useMemo(() => {
    if (!selectedProcedure) return [] as ProcedureStep[];
    return selectedProcedure.sections.flatMap(sec => flattenSteps(sec.steps));
  }, [selectedProcedure]);

  // 템플릿 맵 (stepId → template)
  const templateMap = useMemo(() => {
    const map = new Map<string, StepQueryTemplate>();
    templates.forEach(t => map.set(t.stepId, t));
    return map;
  }, [templates]);

  return (
    // 오버레이
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* 모달 패널 */}
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">SOP 절차 관리 &amp; 쿼리 템플릿</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── 통계 바 ── */}
        <div className="flex items-center gap-5 px-5 py-3 bg-zinc-800/60 border-b border-zinc-700/50 shrink-0 text-sm">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-500">총 절차</span>
            <span className="font-mono font-semibold text-amber-400">{stats.totalProcedures}</span>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="flex items-center gap-1.5 text-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-500">총 단계</span>
            <span className="font-mono font-semibold text-emerald-400">{stats.totalSteps}</span>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="flex items-center gap-1.5 text-zinc-300">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-zinc-500">핵심 단계</span>
            <span className="font-mono font-semibold text-red-400">{stats.criticalSteps}</span>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-500">쿼리 오버라이드</span>
            <span className={cn(
              "font-mono font-semibold",
              stats.overrideCount > 0 ? "text-amber-400" : "text-zinc-500"
            )}>
              {stats.overrideCount}
            </span>
          </div>
          {stats.overrideCount > 0 && (
            <div className="ml-auto">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {stats.overrideCount}개 단계 쿼리 커스텀됨
              </span>
            </div>
          )}
        </div>

        {/* ── 본문 (좌: 절차 목록, 우: 단계 상세) ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── 좌측: 절차 목록 ── */}
          <div className="w-64 shrink-0 border-r border-zinc-700 overflow-y-auto bg-zinc-900/50">
            <div className="p-3 space-y-4">
              {Array.from(proceduresBySystem.entries()).map(([system, procs]) => {
                const sc = SYSTEM_COLORS[system] || SYSTEM_COLORS['냉각수'];
                return (
                  <div key={system}>
                    <div className={cn(
                      "flex items-center gap-1.5 text-xs font-semibold mb-1.5 px-1",
                      sc.primary
                    )}>
                      {systemIcons[system]}
                      {system}계통
                    </div>
                    <div className="space-y-0.5">
                      {procs.map(proc => {
                        const isSelected = selectedProcedure?.id === proc.id;
                        // 이 절차에서 오버라이드된 스텝이 있는지 확인
                        const procTemplates = getQueryTemplates(proc.id);
                        const hasOverride = procTemplates.some(t => !!overrides[t.stepId]);
                        return (
                          <button
                            key={proc.id}
                            onClick={() => {
                              setSelectedProcedure(proc);
                              setExpandedStepId(null);
                            }}
                            className={cn(
                              "w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all",
                              isSelected
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] opacity-70 shrink-0">
                                붙임{proc.appendixNo}
                              </span>
                              {hasOverride && (
                                <Edit3 className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              )}
                            </div>
                            <div className="mt-0.5 leading-tight line-clamp-2">
                              {proc.title}
                            </div>
                            <div className="mt-1 text-[10px] opacity-60">
                              {proc.totalSteps}단계 · ~{proc.estimatedMinutes}분
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 우측: 단계 테이블 + 쿼리 편집 ── */}
          <div className="flex-1 overflow-y-auto">
            {selectedProcedure ? (
              <div className="p-4 space-y-3">
                {/* 절차 헤더 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      붙임{selectedProcedure.appendixNo}. {selectedProcedure.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {selectedProcedure.system}계통 {selectedProcedure.operation} |{' '}
                      {selectedProcedure.target}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                      {flatSteps.length}단계
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                      {flatSteps.filter(s => s.isCritical).length}개 핵심
                    </span>
                  </div>
                </div>

                {/* 단계 목록 */}
                <div className="space-y-1">
                  {/* 테이블 헤더 */}
                  <div className="grid grid-cols-[80px_1fr_100px_80px_40px] gap-2 px-3 py-1.5 text-[10px] font-mono text-zinc-600 uppercase tracking-wide border-b border-zinc-700/50">
                    <span>단계 ID</span>
                    <span>설명</span>
                    <span>장비</span>
                    <span>기대상태</span>
                    <span></span>
                  </div>

                  {flatSteps.map(step => {
                    const template = templateMap.get(step.id);
                    const isExpanded = expandedStepId === step.id;
                    const isOverridden = !!overrides[step.id];

                    return (
                      <div key={step.id}>
                        {/* 스텝 행 */}
                        <button
                          onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                          className={cn(
                            "w-full grid grid-cols-[80px_1fr_100px_80px_40px] gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all",
                            isExpanded
                              ? "bg-zinc-800 border border-zinc-600"
                              : "hover:bg-zinc-800/50",
                            step.isCritical && !isExpanded && "border-l-2 border-red-500/50"
                          )}
                        >
                          {/* 단계 ID */}
                          <span className={cn(
                            "font-mono text-[11px] self-start mt-0.5",
                            step.isCritical ? "text-red-400" : "text-amber-400/70"
                          )}>
                            {step.id}
                          </span>
                          {/* 설명 */}
                          <span className="text-zinc-300 leading-relaxed line-clamp-2 text-left">
                            {step.description}
                          </span>
                          {/* 장비 */}
                          <span className="font-mono text-[11px] text-zinc-500 self-start mt-0.5 truncate">
                            {step.equipment || '—'}
                          </span>
                          {/* 기대상태 */}
                          <span className={cn(
                            "text-[11px] self-start mt-0.5",
                            step.expectedState === '열림' || step.expectedState === '개방' ? 'text-emerald-400' :
                            step.expectedState === '닫힘' || step.expectedState === '폐쇄' ? 'text-red-400' :
                            step.expectedState === '기동중' ? 'text-blue-400' :
                            step.expectedState === '정지' ? 'text-zinc-500' :
                            'text-zinc-400'
                          )}>
                            {step.expectedState || '—'}
                          </span>
                          {/* 토글 */}
                          <span className="flex items-center justify-center self-start mt-0.5">
                            {isOverridden && <Edit3 className="w-2.5 h-2.5 text-amber-400 mr-0.5" />}
                            {isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                              : <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
                          </span>
                        </button>

                        {/* 확장: 쿼리 편집 패널 */}
                        {isExpanded && template && (
                          <div className="ml-4 mr-1 mb-2">
                            <QueryEditPanel
                              step={step}
                              template={template}
                              isOverridden={isOverridden}
                              onSave={handleSave}
                              onReset={handleReset}
                            />
                          </div>
                        )}
                        {isExpanded && !template && (
                          <div className="ml-4 mr-1 mb-2 text-xs text-zinc-600 px-3 py-2 bg-zinc-800/40 rounded-lg">
                            이 단계에 대한 쿼리 템플릿이 없습니다.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 섹션 구분선 — 섹션별 제목 안내 */}
                <div className="pt-3 border-t border-zinc-700/30 text-xs text-zinc-600">
                  <span className="font-mono">이 절차는 {selectedProcedure.sections.length}개 섹션으로 구성됩니다. |</span>
                  {selectedProcedure.sections.map((sec, i) => (
                    <span key={sec.id} className="ml-2">
                      {i + 1}. {sec.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                좌측에서 절차를 선택하세요
              </div>
            )}
          </div>
        </div>

        {/* ── 푸터 ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-700 bg-zinc-900/80 shrink-0 text-xs text-zinc-500">
          <span>
            절차 데이터는 <span className="font-mono text-zinc-400">pov-standards.ts</span>에 하드코딩됩니다.
            쿼리 오버라이드는 브라우저 localStorage에 저장됩니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
