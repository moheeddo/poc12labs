"use client";

import { useCallback, useRef } from "react";
import { Activity } from "lucide-react";
import type { ServiceTab } from "@/lib/types";
import { SERVICE_TABS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeTab: ServiceTab | null;
  onTabChange: (tab: ServiceTab | null) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  const navRef = useRef<HTMLElement>(null);
  const allTabs: (ServiceTab | null)[] = [null, ...SERVICE_TABS.map(t => t.key)];
  const activeIdx = allTabs.indexOf(activeTab);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next = activeIdx;
    if (e.key === "ArrowRight") next = (activeIdx + 1) % allTabs.length;
    else if (e.key === "ArrowLeft") next = (activeIdx - 1 + allTabs.length) % allTabs.length;
    else return;
    e.preventDefault();
    onTabChange(allTabs[next]);
    const buttons = navRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }, [activeIdx, allTabs, onTabChange]);

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
              <span className="text-sm font-bold tracking-tight text-white block">KHNP Video AI</span>
              <span className="text-[11px] text-slate-500 -mt-0.5 tracking-widest block">PLATFORM</span>
            </div>
          </button>

          <div className="flex items-center gap-2" title="모든 서비스가 정상 운영 중입니다">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-mono">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <nav ref={navRef} className="flex gap-1 -mb-px" role="tablist" aria-label="서비스 탭" onKeyDown={handleTabKeyDown}>
          <button
            role="tab"
            aria-selected={activeTab === null}
            tabIndex={activeTab === null ? 0 : -1}
            onClick={() => onTabChange(null)}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors duration-200",
              "after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:transition-transform after:duration-300 after:ease-out",
              activeTab === null
                ? "text-white after:bg-white after:scale-x-100"
                : "text-slate-500 after:bg-surface-600 after:scale-x-0 hover:text-slate-300 hover:after:scale-x-100"
            )}
          >
            대시보드
          </button>
          {SERVICE_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            /* 탭별 언더라인 색상 정적 매핑 */
            const underlineColorMap: Record<string, string> = {
              "text-coral-400": "after:bg-coral-400",
              "text-teal-400": "after:bg-teal-400",
              "text-amber-400": "after:bg-amber-400",
            };
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-colors duration-200",
                  "after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:transition-transform after:duration-300 after:ease-out",
                  isActive
                    ? `${tab.color} ${underlineColorMap[tab.color] || "after:bg-current"} after:scale-x-100`
                    : "text-slate-500 after:bg-surface-600 after:scale-x-0 hover:text-slate-300 hover:after:scale-x-100"
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
