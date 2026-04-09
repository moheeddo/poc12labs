"use client";

import { useState, useCallback } from 'react';
import { Users, Plus, X, Link2, Play, Shield } from 'lucide-react';
import type { Procedure } from '@/lib/pov-standards';
import { HPO_PROCEDURES } from '@/lib/pov-standards';
import { cn } from '@/lib/utils';

interface Props {
  onStartSession: (params: {
    procedureId: string;
    procedureTitle: string;
    operators: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string }[];
    instructorVideoUrl?: string;
  }) => void;
  isCreating: boolean;
}

interface OperatorInput {
  name: string;
  videoUrl: string;
}

export default function SessionCreateForm({ onStartSession, isCreating }: Props) {
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [operatorA, setOperatorA] = useState<OperatorInput>({ name: '', videoUrl: '' });
  const [operatorB, setOperatorB] = useState<OperatorInput>({ name: '', videoUrl: '' });
  const [showOperatorB, setShowOperatorB] = useState(false);
  const [showInstructor, setShowInstructor] = useState(false);
  const [instructorUrl, setInstructorUrl] = useState('');

  const canStart = selectedProcedure && operatorA.name.trim() && operatorA.videoUrl.trim();

  const handleStart = useCallback(() => {
    if (!selectedProcedure || !canStart) return;
    const operators: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string }[] = [
      { role: 'operatorA', name: operatorA.name.trim(), videoUrl: operatorA.videoUrl.trim() },
    ];
    if (showOperatorB && operatorB.name.trim() && operatorB.videoUrl.trim()) {
      operators.push({ role: 'operatorB', name: operatorB.name.trim(), videoUrl: operatorB.videoUrl.trim() });
    }
    onStartSession({
      procedureId: selectedProcedure.id,
      procedureTitle: selectedProcedure.title,
      operators,
      instructorVideoUrl: showInstructor && instructorUrl.trim() ? instructorUrl.trim() : undefined,
    });
  }, [selectedProcedure, operatorA, operatorB, showOperatorB, showInstructor, instructorUrl, canStart, onStartSession]);

  const proceduresBySystem = new Map<string, Procedure[]>();
  HPO_PROCEDURES.forEach(p => {
    const list = proceduresBySystem.get(p.system) || [];
    list.push(p);
    proceduresBySystem.set(p.system, list);
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-amber-600" />
          새 훈련 세션
        </h3>

        {/* 절차 선택 */}
        <div className="mb-5">
          <label className="text-sm font-medium text-slate-600 mb-2 block">실습 절차</label>
          <select
            value={selectedProcedure?.id || ''}
            onChange={e => {
              const proc = HPO_PROCEDURES.find(p => p.id === e.target.value);
              setSelectedProcedure(proc || null);
            }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
          >
            <option value="">절차를 선택하세요</option>
            {Array.from(proceduresBySystem).map(([system, procs]) => (
              <optgroup key={system} label={system}>
                {procs.map(p => (
                  <option key={p.id} value={p.id}>붙임{p.appendixNo}. {p.title}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* 운전원 슬롯 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* 운전원 A (필수) */}
          <div className="border border-teal-200 bg-teal-50/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-semibold text-teal-700">운전원 A</span>
              <span className="text-xs text-teal-500">(필수)</span>
            </div>
            <input type="text" placeholder="이름 입력" value={operatorA.name}
              onChange={e => setOperatorA(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-teal-300" />
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input type="url" placeholder="영상 URL (Google Drive, S3 등)" value={operatorA.videoUrl}
                onChange={e => setOperatorA(prev => ({ ...prev, videoUrl: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
            </div>
          </div>

          {/* 운전원 B (선택) */}
          {showOperatorB ? (
            <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">운전원 B</span>
                </div>
                <button onClick={() => { setShowOperatorB(false); setOperatorB({ name: '', videoUrl: '' }); }}
                  className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <input type="text" placeholder="이름 입력" value={operatorB.name}
                onChange={e => setOperatorB(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-amber-300" />
              <div className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input type="url" placeholder="영상 URL" value={operatorB.videoUrl}
                  onChange={e => setOperatorB(prev => ({ ...prev, videoUrl: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
            </div>
          ) : (
            <button onClick={() => setShowOperatorB(true)}
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-amber-300 hover:text-amber-600 transition-all">
              <Plus className="w-5 h-5" /><span className="text-sm">운전원 B 추가</span>
            </button>
          )}
        </div>

        {/* 교관 영상 (옵션) */}
        {showInstructor ? (
          <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600">교관 관찰 영상 (비평가)</span>
              <button onClick={() => { setShowInstructor(false); setInstructorUrl(''); }}
                className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input type="url" placeholder="교관 영상 URL" value={instructorUrl}
                onChange={e => setInstructorUrl(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
          </div>
        ) : (
          <button onClick={() => setShowInstructor(true)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors mb-4 block">
            + 교관 관찰 영상 추가 (옵션)
          </button>
        )}

        {/* 분석 시작 */}
        <button onClick={handleStart} disabled={!canStart || isCreating}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
            canStart && !isCreating
              ? "bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}>
          {isCreating ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />세션 생성 중...</>
          ) : (
            <><Play className="w-4 h-4" />세션 분석 시작</>
          )}
        </button>
      </div>
    </div>
  );
}
