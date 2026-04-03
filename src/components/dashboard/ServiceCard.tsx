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
    gradient: "from-coral-50 to-transparent",
    iconBg: "bg-coral-50 group-hover:bg-coral-100 border-coral-200 group-hover:border-coral-300",
    glowHover: "group-hover:shadow-coral-200/40",
    accentLine: "from-coral-400 via-coral-500 to-coral-600",
    dotColor: "bg-coral-500",
  },
  leadership: {
    gradient: "from-teal-50 to-transparent",
    iconBg: "bg-teal-50 group-hover:bg-teal-100 border-teal-200 group-hover:border-teal-300",
    glowHover: "group-hover:shadow-teal-200/40",
    accentLine: "from-teal-400 via-teal-500 to-teal-600",
    dotColor: "bg-teal-500",
  },
  pov: {
    gradient: "from-amber-50 to-transparent",
    iconBg: "bg-amber-50 group-hover:bg-amber-100 border-amber-200 group-hover:border-amber-300",
    glowHover: "group-hover:shadow-amber-200/40",
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
        "bg-white border border-slate-200 shadow-sm",
        "transition-all duration-500 ease-out",
        "hover:-translate-y-2 hover:shadow-xl",
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
          "w-7 h-7 rounded-md",
          "bg-slate-100 border border-slate-200 text-slate-400",
          "font-mono text-[11px]",
          "transition-all duration-300",
          "group-hover:text-khnp-emerald group-hover:border-khnp-emerald/30 group-hover:bg-khnp-emerald/5"
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
          <h3 className={cn("text-xl font-bold tracking-[-0.02em]", color)}>
            {label}
          </h3>
        </div>

        {/* 설명 */}
        <p className="text-[15px] text-slate-500 leading-relaxed mb-6">
          {description}
        </p>

        {/* 하단 메타 + 화살표 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full", theme.dotColor, "opacity-60")} />
              <span className="font-mono">{videoCount}건</span>
            </div>
            {lastAnalysis && (
              <span className="font-mono text-slate-400">· {lastAnalysis}</span>
            )}
          </div>

          {/* 시작하기 CTA — 호버 시 슬라이드 */}
          <span className={cn(
            "flex items-center gap-1 text-sm font-medium opacity-0 -translate-x-2",
            "group-hover:opacity-70 group-hover:translate-x-0",
            "transition-all duration-400",
            color,
          )}>
            시작하기 &rarr;
          </span>
        </div>
      </div>
    </button>
  );
}
