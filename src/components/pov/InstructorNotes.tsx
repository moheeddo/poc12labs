'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Flag, X, Plus, Trash2, Filter,
  BookOpen, AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InstructorNote } from '@/lib/pov-instructor-notes';

// ── Props ───────────────────────────────────

interface Props {
  reportId: string;
  stepId?: string;
  /** 오버라이드 자동 기록용 — 저장 시 overrideData 자동 첨부 */
  pendingOverride?: {
    originalStatus: string;
    newStatus: string;
    reason: string;
  };
  onClose?: () => void;
}

// ── 카테고리 설정 ────────────────────────────

const CATEGORY_CFG: Record<
  InstructorNote['category'],
  { label: string; color: string; bg: string; border: string }
> = {
  calibration: {
    label: '캘리브레이션',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-500/30',
  },
  workaround: {
    label: '편법/우회',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-500/30',
  },
  studentContext: {
    label: '훈련생 맥락',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-500/30',
  },
  ambiguousEvidence: {
    label: '증거 모호',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-500/30',
  },
  general: {
    label: '일반',
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
  },
};

// ── 메인 컴포넌트 ─────────────────────────────

export default function InstructorNotes({ reportId, stepId, pendingOverride, onClose }: Props) {
  const [notes, setNotes] = useState<InstructorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<InstructorNote['category'] | 'all'>('all');

  // 노트 작성 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState<InstructorNote['category']>('general');
  const [formContent, setFormContent] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formFlagged, setFormFlagged] = useState(false);

  // ── 노트 불러오기 ──
  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ reportId });
      if (stepId) params.set('stepId', stepId);
      const res = await fetch(`/api/twelvelabs/pov-instructor-notes?${params}`);
      if (res.ok) setNotes(await res.json());
    } catch {
      // 로드 실패 무시 (POC)
    } finally {
      setLoading(false);
    }
  }, [reportId, stepId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // 오버라이드가 있으면 캘리브레이션 카테고리로 자동 설정
  useEffect(() => {
    if (pendingOverride) {
      setFormCategory('calibration');
      setShowForm(true);
    }
  }, [pendingOverride]);

  // ── 노트 저장 ──
  const handleSave = useCallback(async () => {
    if (!formContent.trim()) return;
    setSaving(true);
    try {
      const body: Omit<InstructorNote, 'id' | 'createdAt'> = {
        reportId,
        stepId,
        authorName: formAuthor.trim() || '익명',
        category: formCategory,
        content: formContent.trim(),
        flagged: formFlagged,
        ...(pendingOverride && formCategory === 'calibration'
          ? { overrideData: pendingOverride }
          : {}),
      };
      const res = await fetch('/api/twelvelabs/pov-instructor-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setNotes((prev) => [created, ...prev]);
        setFormContent('');
        setFormFlagged(false);
        setShowForm(false);
      }
    } catch {
      // 저장 실패 무시 (POC)
    } finally {
      setSaving(false);
    }
  }, [reportId, stepId, formAuthor, formCategory, formContent, formFlagged, pendingOverride]);

  // ── 노트 삭제 ──
  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/twelvelabs/pov-instructor-notes?id=${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // 삭제 실패 무시 (POC)
    }
  }, []);

  // ── 필터링된 노트 ──
  const filteredNotes = categoryFilter === 'all'
    ? notes
    : notes.filter((n) => n.category === categoryFilter);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col max-h-[600px]">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
        <h3 className="text-sm font-semibold text-slate-700 flex-1">
          교수자 노트
          {stepId && (
            <span className="ml-1.5 font-mono text-amber-500/70 text-sm">{stepId}</span>
          )}
          <span className="ml-1.5 text-slate-400 font-normal">({notes.length}건)</span>
        </h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-medium transition-all border',
            showForm
              ? 'bg-blue-50 text-blue-600 border-blue-500/30'
              : 'bg-slate-100 text-slate-500 border-transparent hover:text-blue-600 hover:bg-blue-50',
          )}
        >
          <Plus className="w-3 h-3" /> 노트 추가
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
            aria-label="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 노트 추가 폼 */}
      {showForm && (
        <div className="p-4 border-b border-slate-200 bg-blue-50/30 space-y-3 shrink-0 animate-fade-in-up">
          {/* 카테고리 + 작성자 */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as InstructorNote['category'])}
              className="flex-1 min-w-[140px] bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-700 focus:border-blue-500/40 focus:outline-none"
            >
              {Object.entries(CATEGORY_CFG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <input
              value={formAuthor}
              onChange={(e) => setFormAuthor(e.target.value)}
              placeholder="작성자 (선택)"
              className="flex-1 min-w-[120px] bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500/40 focus:outline-none"
            />
          </div>

          {/* 오버라이드 자동 기록 안내 */}
          {pendingOverride && formCategory === 'calibration' && (
            <div className="bg-violet-50 border border-violet-500/20 rounded-lg px-3 py-2 text-sm text-violet-600 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                AI 판정 조정 내역이 자동 첨부됩니다 —{' '}
                <span className="font-mono">{pendingOverride.originalStatus}</span> →{' '}
                <span className="font-mono">{pendingOverride.newStatus}</span>
              </span>
            </div>
          )}

          {/* 내용 */}
          <textarea
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="노트 내용을 입력하세요..."
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-500/20 resize-y"
          />

          {/* 플래그 + 저장 */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formFlagged}
                onChange={(e) => setFormFlagged(e.target.checked)}
                className="rounded border-slate-300 text-orange-500 focus:ring-orange-500/30"
              />
              <Flag className="w-3 h-3 text-orange-500" />
              판정 어려운 단계로 플래그
            </label>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => { setShowForm(false); setFormContent(''); }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-500 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formContent.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 text-sm font-medium border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 필터 탭 */}
      <div className="flex gap-1 px-4 pt-3 pb-1 border-b border-slate-100 overflow-x-auto scrollbar-hide shrink-0">
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            'px-2.5 py-1 rounded-md text-sm font-medium transition-all whitespace-nowrap',
            categoryFilter === 'all'
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
          )}
        >
          <Filter className="w-3 h-3 inline mr-1" />
          전체 {notes.length}
        </button>
        {(Object.keys(CATEGORY_CFG) as InstructorNote['category'][]).map((cat) => {
          const count = notes.filter((n) => n.category === cat).length;
          if (count === 0) return null;
          const cfg = CATEGORY_CFG[cat];
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-2.5 py-1 rounded-md text-sm font-medium transition-all whitespace-nowrap',
                categoryFilter === cat
                  ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
              )}
            >
              {cfg.label} {count}
            </button>
          );
        })}
      </div>

      {/* 노트 목록 */}
      <div className="overflow-y-auto flex-1 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">노트 불러오는 중...</span>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
            <BookOpen className="w-6 h-6 opacity-50" />
            <p className="text-sm">노트가 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotes.map((note) => {
              const cfg = CATEGORY_CFG[note.category];
              return (
                <div key={note.id} className="px-4 py-3 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-start gap-2 mb-1.5">
                    {/* 카테고리 뱃지 */}
                    <span className={cn('text-sm px-1.5 py-0.5 rounded font-medium shrink-0', cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    {/* 플래그 */}
                    {note.flagged && (
                      <Flag className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                    )}
                    {/* 오버라이드 인디케이터 */}
                    {note.overrideData && (
                      <span className="text-sm bg-violet-50 text-violet-500 px-1.5 py-0.5 rounded font-mono shrink-0">
                        {note.overrideData.originalStatus} → {note.overrideData.newStatus}
                      </span>
                    )}
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="ml-auto p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="노트 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {/* 내용 */}
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  {/* 오버라이드 사유 */}
                  {note.overrideData?.reason && (
                    <p className="text-sm text-violet-500/70 mt-1 italic">사유: {note.overrideData.reason}</p>
                  )}
                  {/* 메타 */}
                  <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-400">
                    <span>{note.authorName}</span>
                    <span>·</span>
                    <span>{new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
