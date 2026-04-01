"use client";

import { useCallback, useRef, useState } from "react";
import type { ServiceTab } from "@/lib/types";
import { SERVICE_TABS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import KhnpLogo from "@/components/shared/KhnpLogo";

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

  /* 활성 탭 글로우 라인 색상 */
  const glowColorMap: Record<string, string> = {
    simulator: "from-coral-500/80 via-coral-400/30 to-transparent",
    leadership: "from-teal-500/80 via-teal-400/30 to-transparent",
    pov: "from-amber-500/80 via-amber-400/30 to-transparent",
  };
  const activeGlow = activeTab ? glowColorMap[activeTab] : null;

  /* 탭 언더라인 색상 매핑 */
  const underlineColorMap: Record<string, string> = {
    "text-coral-400": "after:bg-coral-400",
    "text-teal-400": "after:bg-teal-400",
    "text-amber-400": "after:bg-amber-400",
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/[0.04]">
      {/* 활성 서비스 상단 글로우 라인 */}
      {activeGlow ? (
        <div className={`h-[2px] bg-gradient-to-r ${activeGlow} transition-all duration-700`} />
      ) : (
        <div className="h-[2px] bg-gradient-to-r from-khnp-emerald/50 via-khnp-emerald-light/20 to-transparent transition-all duration-700" />
      )}

      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        {/* 상단 로고 영역 */}
        <div className="flex items-center justify-between h-[72px]">
          <button
            onClick={() => onTabChange(null)}
            className="flex items-center gap-3.5 group"
          >
            <div className="relative">
              <KhnpLogo size={38} />
              {/* 로고 주변 미세 글로우 */}
              <div className="absolute inset-0 rounded-full bg-khnp-emerald/10 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-[-0.02em] text-white leading-tight group-hover:text-khnp-emerald-light transition-colors duration-300">
                KHNP HRDI
              </span>
              <span className="text-[10px] text-khnp-emerald/70 font-mono font-medium tracking-[0.15em] uppercase leading-tight hidden sm:block">
                Video AI Platform
              </span>
            </div>
          </button>

          {/* 시스템 상태 인디케이터 */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle">
              <div className="relative flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-40" />
              </div>
              <span className="text-[11px] text-slate-400 font-mono tracking-wider">
                SYSTEM ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="relative">
          <nav
            ref={navRef}
            className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-hide"
            role="tablist"
            aria-label="서비스 탭"
            onKeyDown={handleTabKeyDown}
            onScroll={handleNavScroll}
          >
            <button
              role="tab"
              aria-selected={activeTab === null}
              tabIndex={activeTab === null ? 0 : -1}
              onClick={() => onTabChange(null)}
              className={cn(
                "relative px-5 py-3.5 text-[14px] font-semibold transition-all duration-300 whitespace-nowrap tracking-[-0.01em]",
                "after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:rounded-full after:transition-all after:duration-300 after:ease-out",
                activeTab === null
                  ? "text-white after:bg-white after:scale-x-100"
                  : "text-slate-500 after:bg-transparent after:scale-x-0 hover:text-slate-300"
              )}
            >
              대시보드
            </button>
            {SERVICE_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onTabChange(tab.key)}
                  className={cn(
                    "relative px-5 py-3.5 text-[14px] font-semibold transition-all duration-300 whitespace-nowrap tracking-[-0.01em]",
                    "after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:rounded-full after:transition-all after:duration-300 after:ease-out",
                    isActive
                      ? `${tab.color} ${underlineColorMap[tab.color] || "after:bg-current"} after:scale-x-100`
                      : "text-slate-500 after:bg-transparent after:scale-x-0 hover:text-slate-300"
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
              "absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-surface-900/95 to-transparent pointer-events-none transition-opacity duration-200 md:hidden",
              scrolledToEnd ? "opacity-0" : "opacity-100"
            )}
            aria-hidden="true"
          />
        </div>
      </div>
    </header>
  );
}
