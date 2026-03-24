"use client";

import { Video, Users, Eye } from "lucide-react";
import type { ServiceTab } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ServiceTab, React.ReactNode> = {
  simulator: <Video className="w-6 h-6" />,
  leadership: <Users className="w-6 h-6" />,
  pov: <Eye className="w-6 h-6" />,
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
      className={cn(
        "text-left p-6 rounded-xl border transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20",
        "bg-surface-800",
        borderColor
      )}
    >
      {/* 아이콘 */}
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", bgColor, color)}>
        {ICONS[tabKey]}
      </div>

      {/* 제목 및 설명 */}
      <h3 className={cn("text-lg font-bold mb-2", color)}>{label}</h3>
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
      </div>
    </button>
  );
}
