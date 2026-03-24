"use client";

import { BarChart3, Clock, Film, TrendingUp } from "lucide-react";
import type { ServiceTab } from "@/lib/types";
import { SERVICE_TABS } from "@/lib/constants";
import ServiceCard from "./ServiceCard";

interface DashboardProps {
  onNavigate: (tab: ServiceTab) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 animate-fade-in-up">
      {/* 전체 현황 요약 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">통합 관제 대시보드</h2>
        <p className="text-sm text-slate-400">KHNP Video AI Platform — 영상 기반 역량 평가 시스템</p>
        <div className="mt-3 h-px bg-gradient-to-r from-coral-500/60 via-teal-500/60 to-amber-500/60" />
      </div>

      {/* 상태 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: <Film className="w-4 h-4" />, label: "등록 영상", value: "0", unit: "건" },
          { icon: <BarChart3 className="w-4 h-4" />, label: "완료 분석", value: "0", unit: "건" },
          { icon: <TrendingUp className="w-4 h-4" />, label: "평균 역량", value: "—", unit: "점" },
          { icon: <Clock className="w-4 h-4" />, label: "최근 분석", value: "—", unit: "" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-800 border border-surface-700 rounded-lg p-4 transition-all duration-200 hover:border-surface-600 hover:bg-surface-800/80"
          >
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              {stat.icon}
              <span className="text-xs">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-white">{stat.value}</span>
              <span className="text-xs text-slate-500">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 서비스 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SERVICE_TABS.map((tab) => (
          <ServiceCard
            key={tab.key}
            tabKey={tab.key}
            label={tab.label}
            description={tab.description}
            color={tab.color}
            bgColor={tab.bgColor}
            borderColor={tab.borderColor}
            videoCount={0}
            onClick={() => onNavigate(tab.key)}
          />
        ))}
      </div>
    </div>
  );
}
