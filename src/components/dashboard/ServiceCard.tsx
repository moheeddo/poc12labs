"use client";

import { Video, Users, Eye } from "lucide-react";
import type { ServiceTab } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ServiceTab, React.ReactNode> = {
  simulator: <Video className="w-6 h-6" />,
  leadership: <Users className="w-6 h-6" />,
  pov: <Eye className="w-6 h-6" />,
};

/* 서비스별 그라데이션/글로우 정적 매핑 */
const CARD_THEME: Record<ServiceTab, {
  gradient: string;
  iconBg: string;
  glowHover: string;
  accentLine: string;
  dotColor: string;
}> = {
  simulator: {
    gradient: "from-coral-500/5 to-transparent",
    iconBg: "bg-coral-500/8 group-hover:bg-coral-500/15 border-coral-500/10 group-hover:border-coral-500/25",
    glowHover: "group-hover:shadow-coral-500/8",
    accentLine: "from-coral-400 via-coral-500 to-coral-600",
    dotColor: "bg-coral-500",
  },
  leadership: {
    gradient: "from-teal-500/5 to-transparent",
    iconBg: "bg-teal-500/8 group-hover:bg-teal-500/15 border-teal-500/10 group-hover:border-teal-500/25",
    glowHover: "group-hover:shadow-teal-500/8",
    accentLine: "from-teal-400 via-teal-500 to-teal-600",
    dotColor: "bg-teal-500",
  },
  pov: {
    gradient: "from-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/8 group-hover:bg-amber-500/15 border-amber-500/10 group-hover:border-amber-500/25",
    glowHover: "group-hover:shadow-amber-500/8",
    accentLine: "from-amber-400 via-amber-500 to-amber-600",
    dotColor: "bg-amber-500",
  },
};

interface ServiceCardProps {
  tabKey: ServiceTab;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  videoCount: number;
  lastAnalysis?: string;
  shortcutKey?: string;
  onClick: () => void;
}

export default function ServiceCard({
  tabKey,
  label,
  description,
  color,
  videoCount,
  lastAnalysis,
  shortcutKey,
  onClick,
}: ServiceCardProps) {
  const theme = CARD_THEME[tabKey];

  return (
    <button
      onClick={onClick}
      aria-label={`${label} 서비스로 이동 — ${description}`}
      className={cn(
        "group relative text-left rounded-2xl overflow-hidden",
        "glass glass-shine",
        "transition-all duration-500 ease-out",
        "hover:-translate-y-1.5 hover:shadow-2xl",
        theme.glowHover,
        "active:scale-[0.98] active:shadow-none active:translate-y-0",
      )}
    >
      {/* 상단 액센트 라인 */}
      <div className={cn(
        "h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-500",
        "bg-gradient-to-r",
        theme.accentLine,
      )} />

      {/* 배경 그라데이션 */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700",
        theme.gradient,
      )} />

      {/* 단축키 배지 */}
      {shortcutKey && (
        <kbd className={cn(
          "hidden md:flex items-center justify-center",
          "absolute top-4 right-4 z-10",
          "w-6 h-6 rounded-md",
          "bg-white/[0.03] border border-white/[0.06] text-slate-500",
          "font-mono text-[10px]",
          "transition-all duration-300",
          "group-hover:text-khnp-green-light group-hover:border-khnp-green-light/30 group-hover:bg-khnp-green/5"
        )}>
          {shortcutKey}
        </kbd>
      )}

      <div className="relative p-6 md:p-7">
        {/* 아이콘 + 제목 */}
        <div className="flex items-center gap-4 mb-5">
          <span className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl border",
            "transition-all duration-500",
            theme.iconBg,
            color,
          )}>
            {ICONS[tabKey]}
          </span>
          <h3 className={cn("text-lg font-bold tracking-[-0.02em]", color)}>
            {label}
          </h3>
        </div>

        {/* 설명 */}
        <p className="text-[14px] text-slate-400/90 leading-relaxed mb-6">
          {description}
        </p>

        {/* 하단 메타 + 화살표 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[13px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full", theme.dotColor, "opacity-60")} />
              <span className="font-mono">{videoCount}건</span>
            </div>
            {lastAnalysis && (
              <span className="font-mono text-slate-600">· {lastAnalysis}</span>
            )}
          </div>

          {/* 화살표 — 호버 시 슬라이드 */}
          <span className={cn(
            "text-[13px] font-mono opacity-0 -translate-x-2",
            "group-hover:opacity-50 group-hover:translate-x-0",
            "transition-all duration-400",
            color,
          )}>
            &rarr;
          </span>
        </div>
      </div>
    </button>
  );
}
