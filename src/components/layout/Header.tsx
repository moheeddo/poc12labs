"use client";

import { useCallback, useRef, useState } from "react";
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
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const allTabs: (ServiceTab | null)[] = [null, ...SERVICE_TABS.map(t => t.key)];
  const activeIdx = allTabs.indexOf(activeTab);

  const handleNavScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setScrolledToEnd(atEnd);
  }, []);

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
    <header className="border-b border-surface-700 bg-surface-900/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        {/* 상단 로고 영역 */}
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => onTabChange(null)}
            className="flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform duration-150"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral-500 via-teal-500 to-amber-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block">KHNP Video AI</span>
              <span className="text-[11px] text-slate-500 -mt-0.5 tracking-widest hidden sm:block">PLATFORM</span>
            </div>
          </button>

          <div className="flex items-center gap-2" title="모든 서비스가 정상 운영 중입니다">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-30" />
            </div>
            <span className="text-xs text-slate-400 font-mono tracking-wider hidden md:inline">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="relative">
          <nav ref={navRef} className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide" role="tablist" aria-label="서비스 탭" onKeyDown={handleTabKeyDown} onScroll={handleNavScroll}>
            <button
              role="tab"
              aria-selected={activeTab === null}
              tabIndex={activeTab === null ? 0 : -1}
              onClick={() => onTabChange(null)}
              className={cn(
                "relative px-4 py-3.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap",
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
                    "relative px-4 py-3.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap",
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
          {/* 모바일 스크롤 페이드 힌트 */}
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-surface-900/95 to-transparent pointer-events-none transition-opacity duration-200 md:hidden",
              scrolledToEnd ? "opacity-0" : "opacity-100"
            )}
            aria-hidden="true"
          />
        </div>
      </div>
    </header>
  );
}
