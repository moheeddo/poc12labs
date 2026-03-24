"use client";

import { Video, Users, Eye } from "lucide-react";
import type { ServiceTab } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ServiceTab, React.ReactNode> = {
  simulator: <Video className="w-6 h-6" />,
  leadership: <Users className="w-6 h-6" />,
  pov: <Eye className="w-6 h-6" />,
};

/* ── Tailwind v4: 동적 클래스 불가 → static map ── */
const GRADIENT_LINE: Record<ServiceTab, string> = {
  simulator: "bg-gradient-to-r from-coral-400 via-coral-500 to-coral-600",
  leadership: "bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600",
  pov: "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600",
};

const ICON_BG: Record<ServiceTab, string> = {
  simulator: "bg-coral-500/10 group-hover:bg-coral-500/20",
  leadership: "bg-teal-500/10 group-hover:bg-teal-500/20",
  pov: "bg-amber-500/10 group-hover:bg-amber-500/20",
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
  onClick: () => void;
}

export default function ServiceCard({
  tabKey,
  label,
  description,
  color,
  bgColor,
  borderColor,
  videoCount,
  lastAnalysis,
  onClick,
}: ServiceCardProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`${label} 서비스로 이동 — ${description}`}
      className={cn(
        "group relative text-left rounded-xl border overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30",
        "active:scale-[0.98] active:shadow-none active:translate-y-0",
        "bg-surface-800",
        borderColor
      )}
    >
      {/* 상단 그라데이션 라인 — hover 시 두께 확대 */}
      <div
        className={cn(
          "h-0.5 group-hover:h-1 transition-all duration-300",
          GRADIENT_LINE[tabKey]
        )}
      />

      <div className="p-6">
        {/* 제목 및 설명 */}
        <div className="flex items-center gap-3 mb-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-300",
              ICON_BG[tabKey],
              color
            )}
          >
            {ICONS[tabKey]}
          </span>
          <h3 className={cn("text-lg font-bold", color)}>{label}</h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">{description}</p>

        {/* 통계 */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", bgColor.replace("/10", ""))} />
            <span className="font-mono">{videoCount}개 영상</span>
          </div>
          {lastAnalysis && (
            <span className="font-mono">최근 분석: {lastAnalysis}</span>
          )}
          <span
            className={cn(
              "ml-auto opacity-0 group-hover:opacity-60",
              "transition-all duration-300",
              "translate-x-0 group-hover:translate-x-0.5",
              "text-sm",
              color
            )}
          >
            →
          </span>
        </div>
      </div>
    </button>
  );
}
