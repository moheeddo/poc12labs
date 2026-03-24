"use client";

import { Activity } from "lucide-react";
import type { ServiceTab } from "@/lib/types";
import { SERVICE_TABS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeTab: ServiceTab | null;
  onTabChange: (tab: ServiceTab | null) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="border-b border-surface-700 bg-surface-900 sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* 상단 로고 영역 */}
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => onTabChange(null)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral-500 via-teal-500 to-amber-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">KHNP Video AI</h1>
              <p className="text-[10px] text-slate-500 -mt-0.5 tracking-widest">PLATFORM</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-mono">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <nav className="flex gap-1 -mb-px">
          {SERVICE_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200",
                  isActive
                    ? `${tab.color} border-current`
                    : "text-slate-500 border-transparent hover:text-slate-300 hover:border-surface-600"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
