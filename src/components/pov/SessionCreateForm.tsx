"use client";

import { useState, useCallback, useRef } from 'react';
import { Users, Plus, X, Link2, Play, Shield, Upload, FileVideo, Eye } from 'lucide-react';
import type { Procedure } from '@/lib/pov-standards';
import { HPO_PROCEDURES } from '@/lib/pov-standards';
import { cn, formatFileSize } from '@/lib/utils';

interface Props {
  onStartSession: (params: {
    procedureId: string;
    procedureTitle: string;
    operators: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string; file?: File }[];
    instructorVideoUrl?: string;
    instructorFile?: File;
  }) => void;
  isCreating: boolean;
}

interface SlotInput {
  name: string;
  videoUrl: string;
  file: File | null;
  mode: 'file' | 'url';
}

const EMPTY_SLOT: SlotInput = { name: '', videoUrl: '', file: null, mode: 'file' };

/* ── 영상 업로드 슬롯 (파일 드래그앤드롭 + URL 전환) ── */
function VideoSlot({
  slot, onChange, accentColor, label, required,
}: {
  slot: SlotInput;
  onChange: (patch: Partial<SlotInput>) => void;
  accentColor: 'teal' | 'amber' | 'slate';
  label: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const colorMap = {
    teal: { border: 'border-teal-200', bg: 'bg-teal-50/30', text: 'text-teal-700', icon: 'text-teal-600', ring: 'focus:ring-teal-300', dropBorder: 'border-teal-400', dropBg: 'bg-teal-50' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50/30', text: 'text-amber-700', icon: 'text-amber-600', ring: 'focus:ring-amber-300', dropBorder: 'border-amber-400', dropBg: 'bg-amber-50' },
    slate: { border: 'border-slate-200', bg: 'bg-slate-50/50', text: 'text-slate-600', icon: 'text-slate-500', ring: 'focus:ring-slate-300', dropBorder: 'border-slate-400', dropBg: 'bg-slate-100' },
  };
  const c = colorMap[accentColor];

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('video/')) {
      onChange({ file, mode: 'file', videoUrl: '' });
    }
  }, [onChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onChange({ file, mode: 'file', videoUrl: '' });
  }, [onChange]);

  const hasVideo = slot.file || slot.videoUrl.trim();

  return (
    <div className={cn('rounded-xl p-4', c.border, c.bg, 'border')}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        {accentColor === 'slate' ? <Eye className={cn('w-4 h-4', c.icon)} /> : <Users className={cn('w-4 h-4', c.icon)} />}
        <span className={cn('text-sm font-semibold', c.text)}>{label}</span>
        {required && <span className="text-xs text-slate-400">(필수)</span>}
      </div>

      {/* 이름 입력 (교관 제외) */}
      {accentColor !== 'slate' && (
        <input
          type="text"
          placeholder="이름 입력"
          value={slot.name}
          onChange={e => onChange({ name: e.target.value })}
          className={cn('w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2', c.ring)}
        />
      )}

      {/* 모드 토글 */}
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => onChange({ mode: 'file' })}
          className={cn('text-xs px-2.5 py-1 rounded-md transition-all',
            slot.mode === 'file' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'
          )}
        >
          파일
        </button>
        <button
          type="button"
          onClick={() => onChange({ mode: 'url' })}
          className={cn('text-xs px-2.5 py-1 rounded-md transition-all',
            slot.mode === 'url' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'
          )}
        >
          URL
        </button>
      </div>

      {/* 파일 모드 */}
      {slot.mode === 'file' && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {slot.file ? (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <FileVideo className={cn('w-4 h-4 shrink-0', c.icon)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{slot.file.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(slot.file.size)}</p>
              </div>
              <button onClick={() => onChange({ file: null })} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex flex-col items-center gap-1.5 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all text-center',
                dragging ? cn(c.dropBorder, c.dropBg, 'scale-[1.02]') : 'border-slate-200 hover:border-slate-300 hover:bg-white/50'
              )}
            >
              <Upload className={cn('w-5 h-5', dragging ? c.icon : 'text-slate-400')} />
              <span className="text-xs text-slate-500">
                클릭 또는 드래그앤드롭
              </span>
              <span className="text-[10px] text-slate-400">MP4, AVI, MOV</span>
            </label>
          )}
        </>
      )}

      {/* URL 모드 */}
      {slot.mode === 'url' && (
        <div className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="url"
            placeholder="영상 URL (Google Drive, S3 등)"
            value={slot.videoUrl}
            onChange={e => onChange({ videoUrl: e.target.value, file: null })}
            className={cn('w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2', c.ring)}
          />
        </div>
      )}

      {/* 상태 인디케이터 */}
      {hasVideo && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-emerald-600 font-medium">영상 준비됨</span>
        </div>
      )}
    </div>
  );
}

/* ── 메인 폼 ── */
export default function SessionCreateForm({ onStartSession, isCreating }: Props) {
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [operatorA, setOperatorA] = useState<SlotInput>({ ...EMPTY_SLOT });
  const [operatorB, setOperatorB] = useState<SlotInput>({ ...EMPTY_SLOT });
  const [showOperatorB, setShowOperatorB] = useState(false);
  const [showInstructor, setShowInstructor] = useState(false);
  const [showObserver, setShowObserver] = useState(false);
  const [instructor, setInstructor] = useState<SlotInput>({ ...EMPTY_SLOT, mode: 'file' });
  const [observer, setObserver] = useState<SlotInput>({ ...EMPTY_SLOT, mode: 'file' });

  const hasVideoA = operatorA.file || operatorA.videoUrl.trim();
  const canStart = selectedProcedure && operatorA.name.trim() && hasVideoA;

  const handleStart = useCallback(() => {
    if (!selectedProcedure || !canStart) return;

    const operators: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string; file?: File }[] = [
      {
        role: 'operatorA',
        name: operatorA.name.trim(),
        videoUrl: operatorA.file ? URL.createObjectURL(operatorA.file) : operatorA.videoUrl.trim(),
        file: operatorA.file || undefined,
      },
    ];

    const hasB = showOperatorB && operatorB.name.trim() && (operatorB.file || operatorB.videoUrl.trim());
    if (hasB) {
      operators.push({
        role: 'operatorB',
        name: operatorB.name.trim(),
        videoUrl: operatorB.file ? URL.createObjectURL(operatorB.file) : operatorB.videoUrl.trim(),
        file: operatorB.file || undefined,
      });
    }

    const instructorUrl = showInstructor && (instructor.file || instructor.videoUrl.trim())
      ? (instructor.file ? URL.createObjectURL(instructor.file) : instructor.videoUrl.trim())
      : undefined;

    onStartSession({
      procedureId: selectedProcedure.id,
      procedureTitle: selectedProcedure.title,
      operators,
      instructorVideoUrl: instructorUrl,
      instructorFile: showInstructor ? (instructor.file || undefined) : undefined,
    });
  }, [selectedProcedure, operatorA, operatorB, showOperatorB, showInstructor, instructor, canStart, onStartSession]);

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
          <VideoSlot
            slot={operatorA}
            onChange={patch => setOperatorA(prev => ({ ...prev, ...patch }))}
            accentColor="teal"
            label="운전원 A"
            required
          />

          {showOperatorB ? (
            <div className="relative">
              <button
                onClick={() => { setShowOperatorB(false); setOperatorB({ ...EMPTY_SLOT }); }}
                className="absolute top-3 right-3 z-10 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
              <VideoSlot
                slot={operatorB}
                onChange={patch => setOperatorB(prev => ({ ...prev, ...patch }))}
                accentColor="amber"
                label="운전원 B"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowOperatorB(true)}
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-amber-300 hover:text-amber-600 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm">운전원 B 추가</span>
            </button>
          )}
        </div>

        {/* 추가 영상 옵션 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* 교관 영상 */}
          {showInstructor ? (
            <div className="w-full relative">
              <button
                onClick={() => { setShowInstructor(false); setInstructor({ ...EMPTY_SLOT }); }}
                className="absolute top-3 right-3 z-10 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
              <VideoSlot
                slot={instructor}
                onChange={patch => setInstructor(prev => ({ ...prev, ...patch }))}
                accentColor="slate"
                label="교관 관찰 영상 (비평가)"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowInstructor(true)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 교관 관찰 영상
            </button>
          )}

          {/* 3자 관찰자 뷰 */}
          {showObserver ? (
            <div className="w-full relative">
              <button
                onClick={() => { setShowObserver(false); setObserver({ ...EMPTY_SLOT }); }}
                className="absolute top-3 right-3 z-10 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
              <VideoSlot
                slot={observer}
                onChange={patch => setObserver(prev => ({ ...prev, ...patch }))}
                accentColor="slate"
                label="3자 관찰자 뷰 (전체 상황)"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowObserver(true)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 3자 관찰자 뷰
            </button>
          )}
        </div>

        {/* 분석 시작 */}
        <button
          onClick={handleStart}
          disabled={!canStart || isCreating}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
            canStart && !isCreating
              ? "bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
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
