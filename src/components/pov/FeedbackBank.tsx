'use client';

// ══════════════════════════════════════════════
// HPO-16: 피드백 뱅크 UI — 검색·카테고리 필터 + 삽입 + CRUD
// ══════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  BookMarked, Search, X, Plus, Trash2,
  ChevronDown, Star, Flame, Shield, AlertTriangle, MessageSquare,
} from 'lucide-react';
import type { FeedbackTemplate } from '@/lib/pov-feedback-bank';
import { cn } from '@/lib/utils';

// ── 타입 ─────────────────────────────────────

type Category = 'all' | 'strength' | 'improvement' | 'critical' | 'hpo' | 'general';

interface Props {
  onInsert: (text: string) => void; // 선택한 피드백 텍스트를 부모에 전달
  filterCategory?: Category;
  onClose: () => void;
}

// ── 카테고리 메타 ─────────────────────────────

const CATEGORY_META: Record<Category, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  all:         { label: '전체',     color: 'text-slate-600',   bg: 'bg-slate-100',      icon: <BookMarked className="w-3 h-3" /> },
  strength:    { label: '강점',     color: 'text-teal-600',    bg: 'bg-teal-50',        icon: <Star className="w-3 h-3" /> },
  improvement: { label: '개선',     color: 'text-amber-600',   bg: 'bg-amber-50',       icon: <ChevronDown className="w-3 h-3" /> },
  critical:    { label: '핵심위반', color: 'text-red-500',     bg: 'bg-red-50',         icon: <AlertTriangle className="w-3 h-3" /> },
  hpo:         { label: 'HPO',      color: 'text-blue-500',    bg: 'bg-blue-50',        icon: <Shield className="w-3 h-3" /> },
  general:     { label: '일반',     color: 'text-slate-500',   bg: 'bg-slate-100',      icon: <MessageSquare className="w-3 h-3" /> },
};

// ── 서브 컴포넌트: 새 템플릿 추가 폼 ──────────

interface AddFormProps {
  onAdd: (template: Omit<FeedbackTemplate, 'id' | 'useCount' | 'createdAt'>) => void;
  onCancel: () => void;
}

function AddForm({ onAdd, onCancel }: AddFormProps) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Exclude<Category, 'all'>>('general');
  const [subcategory, setSubcategory] = useState('');
  const [competencyKey, setCompetencyKey] = useState('');
  const [hpoToolKey, setHpoToolKey] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd({
      category,
      text: text.trim(),
      subcategory: subcategory.trim() || undefined,
      competencyKey: competencyKey.trim() || undefined,
      hpoToolKey: hpoToolKey.trim() || undefined,
    });
  };

  return (
    <div className="border-t border-slate-200 pt-3 mt-2 space-y-2 animate-fade-in-up">
      <p className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5" /> 새 피드백 템플릿 추가
      </p>
      {/* 카테고리 선택 */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500 w-16 shrink-0">카테고리</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Exclude<Category, 'all'>)}
          className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none focus:border-amber-500/40"
        >
          <option value="strength">강점</option>
          <option value="improvement">개선</option>
          <option value="critical">핵심위반</option>
          <option value="hpo">HPO</option>
          <option value="general">일반</option>
        </select>
      </div>
      {/* 소분류 */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500 w-16 shrink-0">소분류</label>
        <input
          type="text"
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
          placeholder="STAR, 밸브조작, 감시..."
          className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-500/40"
        />
      </div>
      {/* 피드백 텍스트 */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="피드백 내용을 입력하세요..."
        rows={2}
        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-500/40 resize-none"
      />
      {/* 역량/HPO 키 (선택) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1">
          <label className="text-sm text-slate-400 shrink-0">역량키</label>
          <input
            type="text"
            value={competencyKey}
            onChange={(e) => setCompetencyKey(e.target.value)}
            placeholder="control, monitor..."
            className="flex-1 min-w-0 bg-white border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-500/40"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-sm text-slate-400 shrink-0">HPO키</label>
          <input
            type="text"
            value={hpoToolKey}
            onChange={(e) => setHpoToolKey(e.target.value)}
            placeholder="selfCheck, peerCheck..."
            className="flex-1 min-w-0 bg-white border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-500/40"
          />
        </div>
      </div>
      {/* 버튼 */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="px-3 py-1.5 rounded-lg text-sm bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          추가
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// 메인 피드백 뱅크 컴포넌트
// ══════════════════════════════════════════════

export default function FeedbackBank({ onInsert, filterCategory, onClose }: Props) {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>(filterCategory || 'all');
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // ── 목록 불러오기 ──
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/twelvelabs/pov-feedback-bank${activeCategory !== 'all' ? `?category=${activeCategory}` : ''}`,
      );
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── 텍스트 검색 필터 ──
  const filtered = templates.filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      t.text.toLowerCase().includes(q) ||
      (t.subcategory?.toLowerCase().includes(q) ?? false) ||
      (t.competencyKey?.toLowerCase().includes(q) ?? false) ||
      (t.hpoToolKey?.toLowerCase().includes(q) ?? false)
    );
  });

  // ── 삽입 ──
  const handleInsert = async (tmpl: FeedbackTemplate) => {
    // useCount 증가
    await fetch('/api/twelvelabs/pov-feedback-bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'use', id: tmpl.id }),
    });
    onInsert(tmpl.text);
  };

  // ── 삭제 ──
  const handleDelete = async (id: string) => {
    await fetch(`/api/twelvelabs/pov-feedback-bank?id=${id}`, { method: 'DELETE' });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // ── 추가 ──
  const handleAdd = async (data: Omit<FeedbackTemplate, 'id' | 'useCount' | 'createdAt'>) => {
    const res = await fetch('/api/twelvelabs/pov-feedback-bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created: FeedbackTemplate = await res.json();
      setTemplates((prev) => [created, ...prev]);
      setShowAddForm(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col w-full max-w-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <BookMarked className="w-4 h-4 text-amber-500 shrink-0" />
        <h3 className="text-sm font-semibold text-slate-700 flex-1">피드백 뱅크</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-0.5 px-3 pt-2.5 pb-1.5 overflow-x-auto scrollbar-hide">
        {(Object.entries(CATEGORY_META) as [Category, (typeof CATEGORY_META)[Category]][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-sm whitespace-nowrap transition-all font-medium',
              activeCategory === key
                ? `${meta.bg} ${meta.color} ring-1 ring-inset ring-current/20`
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50',
            )}
          >
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {/* 검색 바 */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="피드백 검색..."
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 템플릿 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 space-y-1.5 pb-2 max-h-72">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-6">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">검색 결과가 없습니다</p>
        ) : (
          filtered.map((tmpl) => {
            const meta = CATEGORY_META[tmpl.category] || CATEGORY_META.general;
            return (
              <div
                key={tmpl.id}
                className="group flex items-start gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-amber-500/30 hover:bg-amber-50/40 transition-all"
              >
                <div className="flex-1 min-w-0">
                  {/* 배지 */}
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={cn('text-sm px-1.5 py-0.5 rounded flex items-center gap-0.5', meta.bg, meta.color)}>
                      {meta.icon} {meta.label}
                    </span>
                    {tmpl.subcategory && (
                      <span className="text-sm px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {tmpl.subcategory}
                      </span>
                    )}
                    {tmpl.useCount > 0 && (
                      <span className="text-sm px-1.5 py-0.5 rounded bg-amber-50 text-amber-500 flex items-center gap-0.5 ml-auto">
                        <Flame className="w-2.5 h-2.5" /> {tmpl.useCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-snug">{tmpl.text}</p>
                  {/* 역량/HPO 키 */}
                  {(tmpl.competencyKey || tmpl.hpoToolKey) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {tmpl.competencyKey && (
                        <span className="text-sm text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded">
                          역량: {tmpl.competencyKey}
                        </span>
                      )}
                      {tmpl.hpoToolKey && (
                        <span className="text-sm text-teal-400 bg-teal-50 px-1.5 py-0.5 rounded">
                          HPO: {tmpl.hpoToolKey}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* 삽입 / 삭제 버튼 */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <button
                    onClick={() => handleInsert(tmpl)}
                    className="px-2 py-1 rounded-md bg-amber-50 text-amber-600 text-sm font-medium border border-amber-200 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                    title="피드백 삽입"
                  >
                    삽입
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="p-1 rounded-md text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="삭제"
                    aria-label="삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 새 템플릿 추가 */}
      <div className="px-3 pb-3">
        {showAddForm ? (
          <AddForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-400 hover:text-amber-600 hover:border-amber-500/40 hover:bg-amber-50/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> 새 피드백 템플릿 추가
          </button>
        )}
      </div>
    </div>
  );
}
