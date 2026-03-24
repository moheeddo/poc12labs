"use client";

import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, ChevronRight, Clock, ClipboardCheck, Film, Minus, ScanSearch, TrendingUp, UploadCloud } from "lucide-react";
import type { ServiceTab } from "@/lib/types";
import { SERVICE_TABS } from "@/lib/constants";
import ServiceCard from "./ServiceCard";
import LiveClock from "./LiveClock";

interface DashboardProps {
  onNavigate: (tab: ServiceTab) => void;
}

const SHORTCUT_KEYS: Record<ServiceTab, string> = {
  simulator: "1",
  leadership: "2",
  pov: "3",
};

export default function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 md:py-8 animate-fade-in-up">
      {/* 전체 현황 요약 */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">통합 관제 대시보드</h2>
            <p className="text-sm text-slate-400">KHNP Video AI Platform — 영상 기반 역량 평가 시스템</p>
          </div>
          <LiveClock />
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-coral-500/60 via-teal-500/60 to-amber-500/60 animate-gradient-pulse" />
      </div>

      {/* 상태 카드 — 스태거 등장 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { icon: <Film className="w-4 h-4" />, label: "등록 영상", value: "0", unit: "건", iconColor: "text-coral-500/60", trend: "neutral" as const, trendLabel: "" },
          { icon: <BarChart3 className="w-4 h-4" />, label: "완료 분석", value: "0", unit: "건", iconColor: "text-teal-500/60", trend: "neutral" as const, trendLabel: "" },
          { icon: <TrendingUp className="w-4 h-4" />, label: "평균 역량", value: "—", unit: "점", iconColor: "text-amber-500/60", trend: "up" as const, trendLabel: "전월 대비" },
          { icon: <Clock className="w-4 h-4" />, label: "최근 분석", value: "—", unit: "", iconColor: "text-slate-400/60", trend: "neutral" as const, trendLabel: "" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="animate-fade-in-up bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 rounded-lg p-4 transition-all duration-200 hover:border-surface-600 hover:from-surface-800/80 hover:to-surface-900/80"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={stat.iconColor}>{stat.icon}</span>
              <span className="text-xs text-slate-500">{stat.label}</span>
              {stat.trend !== "neutral" && (
                <span className={`ml-auto flex items-center gap-0.5 text-[10px] font-mono ${
                  stat.trend === "up" ? "text-teal-500" : "text-red-400"
                }`}>
                  {stat.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trendLabel}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-white tabular-nums">{stat.value}</span>
              <span className="text-xs text-slate-500">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 서비스 카드 3개 — 시차 입장 애니메이션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {SERVICE_TABS.map((tab, i) => (
          <div
            key={tab.key}
            className="animate-fade-in-up"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
          >
            <ServiceCard
              tabKey={tab.key}
              label={tab.label}
              description={tab.description}
              color={tab.color}
              bgColor={tab.bgColor}
              borderColor={tab.borderColor}
              videoCount={0}
              shortcutKey={SHORTCUT_KEYS[tab.key] ?? String(i + 1)}
              onClick={() => onNavigate(tab.key)}
            />
          </div>
        ))}
      </div>

      {/* 빠른 시작 가이드 */}
      <div className="mt-10">
        <h3
          className="text-lg font-semibold text-white mb-1 animate-fade-in-up"
          style={{ animationDelay: "350ms", animationFillMode: "backwards" }}
        >
          시작하기
        </h3>
        <p
          className="text-sm text-slate-500 mb-5 animate-fade-in-up"
          style={{ animationDelay: "400ms", animationFillMode: "backwards" }}
        >
          3단계로 영상 기반 역량 평가를 시작하세요
        </p>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-0">
          {[
            {
              step: 1,
              title: "영상 업로드",
              desc: "평가 대상 영상을 시스템에 등록합니다.",
              icon: <UploadCloud className="w-6 h-6" />,
              iconColor: "text-coral-400",
              hoverBorder: "hover:border-coral-500/30",
            },
            {
              step: 2,
              title: "AI 분석",
              desc: "Twelve Labs AI가 영상을 자동으로 분석합니다.",
              icon: <ScanSearch className="w-6 h-6" />,
              iconColor: "text-teal-400",
              hoverBorder: "hover:border-teal-500/30",
            },
            {
              step: 3,
              title: "리포트 확인",
              desc: "역량 평가 리포트를 확인하고 공유합니다.",
              icon: <ClipboardCheck className="w-6 h-6" />,
              iconColor: "text-amber-400",
              hoverBorder: "hover:border-amber-500/30",
            },
          ].map((item, i) => (
            <div key={item.step} className="flex flex-col md:flex-row items-center md:flex-1">
              {/* 스텝 카드 */}
              <div
                className={`animate-fade-in-up w-full bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 rounded-lg p-5 transition-all duration-200 ${item.hoverBorder} hover:from-surface-800/80 hover:to-surface-900/80 cursor-default`}
                style={{
                  animationDelay: `${450 + i * 120}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-surface-900 border border-surface-700 ${item.iconColor}`}>
                    {item.icon}
                  </div>
                  <span className="text-xs font-mono text-slate-500 tracking-wider">
                    STEP {item.step}
                  </span>
                </div>
                <h4 className="text-white font-medium mb-1">{item.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>

              {/* 화살표 연결선 (마지막 스텝 제외) */}
              {i < 2 && (
                <div
                  className="animate-fade-in-up hidden md:flex items-center justify-center px-3 text-slate-600"
                  style={{
                    animationDelay: `${510 + i * 120}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
              {i < 2 && (
                <div
                  className="animate-fade-in-up flex md:hidden items-center justify-center py-1 text-slate-600"
                  style={{
                    animationDelay: `${510 + i * 120}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 최근 활동 타임라인 */}
      <div className="mt-8">
        <h3
          className="flex items-center gap-2 text-lg font-semibold text-white mb-4 animate-fade-in-up"
          style={{ animationDelay: "800ms", animationFillMode: "backwards" }}
        >
          <Clock className="w-5 h-5 text-slate-400" />
          최근 활동
        </h3>

        <div
          className="animate-fade-in-up bg-surface-800 border border-surface-700 rounded-xl p-6"
          style={{ animationDelay: "860ms", animationFillMode: "backwards" }}
        >
          {/* 데모 활동 항목 */}
          <div className="space-y-0">
            {[
              {
                time: "10분 전",
                service: "시뮬레이터 평가",
                desc: "운전원A 훈련 영상 분석 완료",
                color: "coral",
                tab: "simulator" as ServiceTab,
              },
              {
                time: "2시간 전",
                service: "리더십코칭",
                desc: "3월 토론 세션 역량 진단",
                color: "teal",
                tab: "leadership" as ServiceTab,
              },
              {
                time: "어제",
                service: "POV 분석",
                desc: "비상절차 SOP 이탈 2건 탐지",
                color: "amber",
                tab: "pov" as ServiceTab,
              },
            ].map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigate(item.tab)}
                className="animate-fade-in-up flex items-start gap-4 relative w-full text-left rounded-lg -mx-2 px-2 hover:bg-surface-700/30 transition-all duration-200 group cursor-pointer"
                style={{
                  animationDelay: `${920 + i * 100}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {/* 타임라인 라인 + dot */}
                <div className="flex flex-col items-center pt-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-125 ${
                      item.color === "coral"
                        ? "bg-coral-500"
                        : item.color === "teal"
                          ? "bg-teal-500"
                          : "bg-amber-500"
                    }`}
                  />
                  {i < 2 && (
                    <div className="w-px h-10 border-l border-dashed border-surface-600 mt-1" />
                  )}
                </div>

                {/* 내용 */}
                <div className={`pb-5 ${i === 2 ? "pb-0" : ""}`}>
                  <span className="font-mono text-xs text-slate-500">{item.time}</span>
                  <span
                    className={`ml-2 text-xs font-medium ${
                      item.color === "coral"
                        ? "text-coral-400"
                        : item.color === "teal"
                          ? "text-teal-400"
                          : "text-amber-400"
                    }`}
                  >
                    {item.service}
                  </span>
                  <p className="text-sm text-slate-300 mt-0.5 group-hover:text-white transition-colors duration-200">{item.desc}</p>
                </div>
                <span className={`ml-auto mt-1 opacity-0 group-hover:opacity-60 transition-all duration-200 text-xs ${
                  item.color === "coral" ? "text-coral-400" : item.color === "teal" ? "text-teal-400" : "text-amber-400"
                }`}>→</span>
              </button>
            ))}
          </div>

          {/* 구분선 */}
          <div className="h-px bg-surface-700 my-5" />

          {/* 빈 상태 안내 */}
          <div
            className="animate-fade-in-up flex flex-col items-center text-center py-4"
            style={{ animationDelay: "1220ms", animationFillMode: "backwards" }}
          >
            <Activity className="w-8 h-8 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400 mb-1">아직 활동 내역이 없습니다</p>
            <p className="text-xs text-slate-500 mb-4">
              영상을 업로드하면 분석 활동이 여기에 표시됩니다
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate("simulator")}
                className="text-xs px-3 py-1.5 rounded-md border border-coral-500/30 text-coral-400 hover:bg-coral-500/10 transition-colors"
              >
                시뮬레이터
              </button>
              <button
                type="button"
                onClick={() => onNavigate("leadership")}
                className="text-xs px-3 py-1.5 rounded-md border border-teal-500/30 text-teal-400 hover:bg-teal-500/10 transition-colors"
              >
                리더십
              </button>
              <button
                type="button"
                onClick={() => onNavigate("pov")}
                className="text-xs px-3 py-1.5 rounded-md border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                POV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
