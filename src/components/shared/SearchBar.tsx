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
    coral: "hover:bg-coral-50 hover:text-coral-600 hover:border-coral-200",
    teal: "hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200",
    amber: "hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200",
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative" role="search" aria-busy={loading}>
        <div
          className={cn(
            "flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3.5 transition-all duration-200 shadow-sm",
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
            className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="p-1 text-slate-400 hover:text-slate-700 transition-colors duration-150"
              aria-label="검색어 지우기"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] text-slate-400 bg-slate-100 border border-slate-200 font-mono select-none">
              Enter
            </kbd>
          )}
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 hover:scale-105 active:scale-95 hover:shadow-md",
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
                "animate-fade-in-up px-3 py-1.5 rounded-full text-sm bg-slate-100 border border-slate-200 text-slate-500 transition-all duration-200 active:scale-95",
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
