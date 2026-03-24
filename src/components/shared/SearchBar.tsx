"use client";

import { useState, useCallback, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  loading?: boolean;
  accentColor?: string;
  suggestions?: string[];
}

export default function SearchBar({
  placeholder = "영상 내 장면을 자연어로 검색...",
  onSearch,
  loading = false,
  accentColor = "coral",
  suggestions = [],
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) onSearch(query.trim());
    },
    [query, onSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Escape 키: 입력 내용 지우기
      if (e.key === "Escape") {
        setQuery("");
        inputRef.current?.blur();
        return;
      }
      // Ctrl+Enter: 검색 실행
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (query.trim()) onSearch(query.trim());
      }
    },
    [query, onSearch]
  );

  const borderColorMap: Record<string, string> = {
    coral: "focus-within:border-coral-500/50",
    teal: "focus-within:border-teal-500/50",
    amber: "focus-within:border-amber-500/50",
  };

  const ringColorMap: Record<string, string> = {
    coral: "focus-within:ring-1 focus-within:ring-coral-500/50",
    teal: "focus-within:ring-1 focus-within:ring-teal-500/50",
    amber: "focus-within:ring-1 focus-within:ring-amber-500/50",
  };

  const suggestionHoverMap: Record<string, string> = {
    coral: "hover:bg-coral-500/10 hover:text-coral-300 hover:border-coral-500/20",
    teal: "hover:bg-teal-500/10 hover:text-teal-300 hover:border-teal-500/20",
    amber: "hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/20",
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative" role="search" aria-busy={loading}>
        <div
          className={cn(
            "flex items-center gap-3 bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 transition-all duration-200",
            borderColorMap[accentColor],
            ringColorMap[accentColor]
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 text-slate-500 animate-spin shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-slate-500 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="p-1 text-slate-500 hover:text-white transition-colors duration-150"
              aria-label="검색어 지우기"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-slate-600 bg-surface-700 border border-surface-600 font-mono select-none">
              Enter
            </kbd>
          )}
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5",
              accentColor === "coral" && "bg-coral-600 hover:bg-coral-500 text-white",
              accentColor === "teal" && "bg-teal-600 hover:bg-teal-500 text-white",
              accentColor === "amber" && "bg-amber-600 hover:bg-amber-500 text-white",
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                분석 중...
              </>
            ) : (
              "검색"
            )}
          </button>
        </div>
      </form>

      {/* 추천 검색어 */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={s}
              onClick={() => { setQuery(s); onSearch(s); }}
              className={cn(
                "animate-fade-in-up px-3 py-1.5 rounded-full text-xs bg-surface-700 border border-transparent text-slate-400 transition-all duration-200 active:scale-95",
                suggestionHoverMap[accentColor]
              )}
              style={{
                animationDelay: `${i * 60}ms`,
                animationFillMode: "backwards",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
