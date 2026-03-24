"use client";

import { useState, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) onSearch(query.trim());
    },
    [query, onSearch]
  );

  const borderColorMap: Record<string, string> = {
    coral: "focus-within:border-coral-500/50",
    teal: "focus-within:border-teal-500/50",
    amber: "focus-within:border-amber-500/50",
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "flex items-center gap-3 bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 transition-colors",
            borderColorMap[accentColor]
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 text-slate-500 animate-spin shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-slate-500 shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-30",
              accentColor === "coral" && "bg-coral-600 hover:bg-coral-500 text-white",
              accentColor === "teal" && "bg-teal-600 hover:bg-teal-500 text-white",
              accentColor === "amber" && "bg-amber-600 hover:bg-amber-500 text-white",
            )}
          >
            검색
          </button>
        </div>
      </form>

      {/* 추천 검색어 */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => { setQuery(s); onSearch(s); }}
              className="px-2.5 py-1 rounded-full text-xs bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
