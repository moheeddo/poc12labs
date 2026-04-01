"use client";

import { ArrowUpRight, BarChart3, ChevronRight, Clock, ClipboardCheck, Film, ScanSearch, TrendingUp, UploadCloud } from "lucide-react";
import type { ServiceTab } from "@/lib/types";
import { SERVICE_TABS } from "@/lib/constants";
import ServiceCard from "./ServiceCard";
import LiveClock from "./LiveClock";
import { cn } from "@/lib/utils";

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
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-12 animate-fade-in-up">
      {/* ═══ 히어로 섹션 ═══ */}
      <div className="mb-12 md:mb-16">
        <div className="flex items-start justify-between">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle text-[11px] font-mono text-khnp-emerald tracking-wider mb-4"
              style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-khnp-emerald animate-pulse" />
              INTEGRATED CONTROL
            </div>
            <h2
              className="animate-fade-in-up text-3xl md:text-4xl font-bold text-white mb-2 tracking-[-0.03em] leading-tight"
              style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
            >
              통합 관제 대시보드
            </h2>
            <p
              className="animate-fade-in-up text-base text-slate-400/80"
              style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
            >
              영상 AI 기반 역량 평가 시스템
            </p>
          </div>
          <LiveClock />
        </div>

        {/* 그라데이션 디바이더 */}
        <div
          className="animate-fade-in-up mt-6 h-px bg-gradient-to-r from-khnp-emerald/40 via-teal-500/20 to-transparent animate-gradient-pulse"
          style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
        />
      </div>

      {/* ═══ 상태 카드 그리드 ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-12 md:mb-16">
        {[
          {
            icon: <Film className="w-5 h-5" />,
            label: "등록 영상",
            value: "0",
            unit: "건",
            accentColor: "text-coral-400/70",
            borderHover: "hover:border-coral-500/15",
          },
          {
            icon: <BarChart3 className="w-5 h-5" />,
            label: "완료 분석",
            value: "0",
            unit: "건",
            accentColor: "text-teal-400/70",
            borderHover: "hover:border-teal-500/15",
          },
          {
            icon: <TrendingUp className="w-5 h-5" />,
            label: "평균 역량",
            value: "—",
            unit: "점",
            accentColor: "text-amber-400/70",
            borderHover: "hover:border-amber-500/15",
            trend: { direction: "up", label: "전월 대비" },
          },
          {
            icon: <Clock className="w-5 h-5" />,
            label: "최근 분석",
            value: "—",
            unit: "",
            accentColor: "text-slate-400/50",
            borderHover: "hover:border-surface-500",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              "animate-fade-in-up glass glass-shine rounded-xl p-5",
              "transition-all duration-300",
              stat.borderHover,
            )}
            style={{ animationDelay: `${250 + i * 60}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className={stat.accentColor}>{stat.icon}</span>
              <span className="text-[13px] text-slate-400 font-medium">{stat.label}</span>
              {stat.trend && (
                <span className="ml-auto flex items-center gap-0.5 text-[11px] font-mono text-emerald-400/80">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.trend.label}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-mono text-white tabular-nums tracking-tight">{stat.value}</span>
              <span className="text-[13px] text-slate-500">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ 서비스 카드 ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {SERVICE_TABS.map((tab, i) => (
          <div
            key={tab.key}
            className="animate-fade-in-up"
            style={{ animationDelay: `${500 + i * 100}ms`, animationFillMode: "backwards" }}
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

      {/* ═══ 시작하기 가이드 ═══ */}
      <div className="mt-16 md:mt-20">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="animate-fade-in-up h-px flex-1 bg-gradient-to-r from-surface-600 to-transparent"
            style={{ animationDelay: "800ms", animationFillMode: "backwards" }}
          />
          <h3
            className="animate-fade-in-up text-[13px] font-mono text-slate-500 tracking-[0.15em] uppercase"
            style={{ animationDelay: "800ms", animationFillMode: "backwards" }}
          >
            Quick Start
          </h3>
          <div
            className="animate-fade-in-up h-px flex-1 bg-gradient-to-l from-surface-600 to-transparent"
            style={{ animationDelay: "800ms", animationFillMode: "backwards" }}
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-0">
          {[
            {
              step: 1,
              title: "영상 업로드",
              desc: "평가 대상 영상을 등록합니다",
              icon: <UploadCloud className="w-5 h-5" />,
              iconColor: "text-coral-400",
            },
            {
              step: 2,
              title: "AI 분석",
              desc: "멀티모달 AI가 자동으로 분석합니다",
              icon: <ScanSearch className="w-5 h-5" />,
              iconColor: "text-teal-400",
            },
            {
              step: 3,
              title: "리포트 확인",
              desc: "역량 평가 리포트를 확인합니다",
              icon: <ClipboardCheck className="w-5 h-5" />,
              iconColor: "text-amber-400",
            },
          ].map((item, i) => (
            <div key={item.step} className="flex flex-col md:flex-row items-center md:flex-1">
              <div
                className="animate-fade-in-up w-full glass glass-shine rounded-xl p-5 transition-all duration-300 hover:border-white/[0.06]"
                style={{ animationDelay: `${900 + i * 100}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.05]", item.iconColor)}>
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 tracking-wider">
                    STEP {item.step}
                  </span>
                </div>
                <h4 className="text-[15px] text-white font-semibold mb-1 tracking-[-0.01em]">{item.title}</h4>
                <p className="text-[13px] text-slate-400/80 leading-relaxed">{item.desc}</p>
              </div>

              {i < 2 && (
                <>
                  <div className="animate-fade-in-up hidden md:flex items-center justify-center px-3 text-slate-700" style={{ animationDelay: `${950 + i * 100}ms`, animationFillMode: "backwards" }}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <div className="animate-fade-in-up flex md:hidden items-center justify-center py-1 text-slate-700" style={{ animationDelay: `${950 + i * 100}ms`, animationFillMode: "backwards" }}>
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 최근 활동 ═══ */}
      <div className="mt-16">
        <h3
          className="animate-fade-in-up flex items-center gap-2.5 text-[13px] font-mono text-slate-500 tracking-[0.1em] uppercase mb-5"
          style={{ animationDelay: "1200ms", animationFillMode: "backwards" }}
        >
          <Clock className="w-4 h-4 text-slate-500" />
          Recent Activity
        </h3>

        <div
          className="animate-fade-in-up glass glass-shine rounded-2xl p-6 md:p-8"
          style={{ animationDelay: "1250ms", animationFillMode: "backwards" }}
        >
          {/* 데모 타임라인 */}
          <div className="space-y-0">
            {[
              { time: "10분 전", service: "시뮬레이터 훈련 멀티모달 분석", desc: "운전원A 훈련 영상 분석 완료", color: "coral", tab: "simulator" as ServiceTab },
              { time: "2시간 전", service: "리더십코칭", desc: "3월 토론 세션 역량 진단", color: "teal", tab: "leadership" as ServiceTab },
              { time: "어제", service: "POV 분석", desc: "비상절차 SOP 이탈 2건 탐지", color: "amber", tab: "pov" as ServiceTab },
            ].map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigate(item.tab)}
                className="animate-fade-in-up flex items-start gap-4 relative w-full text-left rounded-lg -mx-2 px-2 hover:bg-white/[0.02] transition-all duration-300 group cursor-pointer"
                style={{ animationDelay: `${1300 + i * 80}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex flex-col items-center pt-1.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-150",
                    item.color === "coral" ? "bg-coral-500" : item.color === "teal" ? "bg-teal-500" : "bg-amber-500",
                  )} />
                  {i < 2 && <div className="w-px h-10 border-l border-dashed border-white/[0.06] mt-1.5" />}
                </div>

                <div className={cn("pb-5", i === 2 && "pb-0")}>
                  <span className="font-mono text-xs text-slate-500">{item.time}</span>
                  <span className={cn(
                    "ml-2 text-[13px] font-semibold",
                    item.color === "coral" ? "text-coral-400" : item.color === "teal" ? "text-teal-400" : "text-amber-400",
                  )}>{item.service}</span>
                  <p className="text-[14px] text-slate-300/80 mt-0.5 group-hover:text-white transition-colors duration-300">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="h-px bg-white/[0.03] my-6" />

          {/* 빈 상태 CTA */}
          <div
            className="animate-fade-in-up flex flex-col items-center text-center py-6"
            style={{ animationDelay: "1500ms", animationFillMode: "backwards" }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-5">
              <UploadCloud className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-[15px] text-slate-400 mb-1 font-medium">아직 활동 내역이 없습니다</p>
            <p className="text-sm text-slate-400/80 mb-6 leading-relaxed">
              영상을 업로드하면 분석 활동이 여기에 표시됩니다
            </p>
            <div className="flex items-center gap-2.5">
              {[
                { tab: "simulator" as ServiceTab, label: "시뮬레이터", border: "border-coral-500/20 text-coral-400 hover:bg-coral-500/5" },
                { tab: "leadership" as ServiceTab, label: "리더십", border: "border-teal-500/20 text-teal-400 hover:bg-teal-500/5" },
                { tab: "pov" as ServiceTab, label: "POV", border: "border-amber-500/20 text-amber-400 hover:bg-amber-500/5" },
              ].map((btn) => (
                <button
                  key={btn.tab}
                  type="button"
                  onClick={() => onNavigate(btn.tab)}
                  className={cn(
                    "text-[13px] px-4 py-2 rounded-lg border transition-all duration-300",
                    "active:scale-[0.97]",
                    btn.border,
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
