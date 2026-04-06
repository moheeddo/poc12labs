"use client";

import { useState, useEffect } from "react";
import type { ServiceTab } from "@/lib/types";
import KhnpLogo from "@/components/shared/KhnpLogo";

interface LandingProps {
  onNavigate: (tab: ServiceTab) => void;
}

const STATIONS = [
  {
    key: "leadership" as ServiceTab,
    number: "01",
    title: "리더십코칭",
    subtitle: "역량진단",
    tagline: "BARS + 멀티모달 AI 행동분석",
    description: "6인 토론 영상에서 개별 발표자의 리더십 역량을 자동 스코어링하고, 근거 기반 피드백 리포트를 생성합니다.",
    features: [
      "BARS 4역량 19항목 정밀 평가",
      "5채널 멀티모달 행동 신호 분석",
      "개인별 AI 피드백 리포트",
      "조별 비교 분석 + 성장 추이",
    ],
    accentColor: "var(--color-teal-500)",
    bgTint: "var(--color-teal-50)",
    borderAccent: "var(--color-teal-200)",
    hoverBg: "var(--color-teal-100)",
    textAccent: "var(--color-teal-700)",
    textLight: "var(--color-teal-600)",
    dotColor: "bg-teal-500",
    btnClass: "bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-400",
  },
  {
    key: "pov" as ServiceTab,
    number: "02",
    title: "훈련영상",
    subtitle: "POV 분석",
    tagline: "SOP 절차 준수 + 숙련도 비교",
    description: "1인칭 시점 영상으로 SOP 절차 이탈을 자동 탐지하고, 숙련자 대비 격차를 정량 분석합니다.",
    features: [
      "SOP 단계별 자동 이탈 탐지",
      "손-기기 조작 타임라인 추적",
      "숙련자 vs 훈련생 유사도 비교",
      "HPO 기법 적용도 + 근본원인 분석",
    ],
    accentColor: "var(--color-amber-500)",
    bgTint: "var(--color-amber-50)",
    borderAccent: "var(--color-amber-200)",
    hoverBg: "var(--color-amber-100)",
    textAccent: "var(--color-amber-700)",
    textLight: "var(--color-amber-600)",
    dotColor: "bg-amber-500",
    btnClass: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-400",
  },
  {
    key: "lecture" as ServiceTab,
    number: "03",
    title: "교수자",
    subtitle: "강의평가",
    tagline: "전달력 + 내용 충실도 듀얼 분석",
    description: "강의 영상과 강의안(PPT)을 AI로 분석하여 전달력과 강의 내용 전달 충실도를 정량 평가합니다.",
    features: [
      "PPT 슬라이드별 커버리지 분석",
      "핵심 개념 의미론적 매칭",
      "멀티모달 5채널 전달력 평가",
      "교수법 특화 지표 (질문유도·포인팅·전환)",
    ],
    accentColor: "var(--color-coral-500)",
    bgTint: "var(--color-coral-50)",
    borderAccent: "var(--color-coral-200)",
    hoverBg: "var(--color-coral-100)",
    textAccent: "var(--color-coral-700)",
    textLight: "var(--color-coral-600)",
    dotColor: "bg-coral-500",
    btnClass: "bg-coral-600 hover:bg-coral-700 focus-visible:ring-coral-400",
  },
] as const;

export default function Landing({ onNavigate }: LandingProps) {
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-[calc(100vh-180px)] flex flex-col">
      {/* 브랜딩 헤더 */}
      <div
        className="pt-12 pb-8 md:pt-16 md:pb-10 px-4 md:px-6 max-w-[1440px] mx-auto w-full"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(8px)",
          transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="flex items-center gap-4 mb-3">
          <KhnpLogo size={32} />
          <div className="h-5 w-px bg-slate-300" />
          <span className="text-xs font-mono text-slate-400 tracking-[0.2em] uppercase">
            Video AI Platform
          </span>
        </div>
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-[-0.03em] leading-[1.15] text-slate-900">
          영상 AI 역량 평가
        </h1>
        <p className="mt-2 text-lg text-slate-500 max-w-xl leading-relaxed">
          분석할 서비스를 선택하세요
        </p>
      </div>

      {/* 스테이션 패널 */}
      <div className="flex-1 px-4 md:px-6 pb-12 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {STATIONS.map((station, i) => {
            const isHovered = hoveredStation === station.key;
            const otherHovered = hoveredStation !== null && !isHovered;

            return (
              <button
                key={station.key}
                type="button"
                onClick={() => onNavigate(station.key)}
                onMouseEnter={() => setHoveredStation(station.key)}
                onMouseLeave={() => setHoveredStation(null)}
                className="group relative text-left rounded-2xl overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex flex-col"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "none" : "translateY(16px)",
                  transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${150 + i * 120}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${150 + i * 120}ms`,
                }}
                aria-label={`${station.title} ${station.subtitle} 서비스로 이동`}
              >
                {/* 배경 레이어 */}
                <div
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{
                    backgroundColor: isHovered ? station.hoverBg : station.bgTint,
                    borderColor: isHovered ? station.accentColor : station.borderAccent,
                  }}
                />

                {/* 보더 */}
                <div
                  className="absolute inset-0 rounded-2xl border-2 transition-all duration-500"
                  style={{
                    borderColor: isHovered ? station.accentColor : station.borderAccent,
                    opacity: otherHovered ? 0.5 : 1,
                  }}
                />

                {/* 상단 액센트 라인 */}
                <div
                  className="absolute top-0 left-0 right-0 h-[3px] transition-all duration-500"
                  style={{
                    backgroundColor: station.accentColor,
                    opacity: isHovered ? 1 : 0.4,
                    transform: isHovered ? "scaleX(1)" : "scaleX(0.3)",
                    transformOrigin: "left",
                  }}
                />

                {/* 콘텐츠 */}
                <div
                  className="relative z-10 p-7 md:p-9 transition-opacity duration-400 flex-1 flex flex-col"
                  style={{ opacity: otherHovered ? 0.55 : 1 }}
                >
                  {/* 스테이션 번호 + 태그 */}
                  <div className="flex items-center justify-between mb-6">
                    <span
                      className="font-mono text-[11px] tracking-[0.25em] uppercase font-semibold"
                      style={{ color: station.textLight }}
                    >
                      Station {station.number}
                    </span>
                    <kbd className="hidden md:inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-mono font-semibold border border-slate-300 text-slate-400 bg-white/60 group-hover:border-current group-hover:bg-white/80 transition-all duration-300"
                      style={{ color: isHovered ? station.textLight : undefined }}
                    >
                      {i + 1}
                    </kbd>
                  </div>

                  {/* 타이틀 */}
                  <div className="mb-2">
                    <h2 className="text-[2rem] md:text-[2.5rem] font-bold tracking-[-0.03em] leading-[1.1] text-slate-900">
                      {station.title}
                    </h2>
                    <h2
                      className="text-[2rem] md:text-[2.5rem] font-bold tracking-[-0.03em] leading-[1.1]"
                      style={{ color: station.textAccent }}
                    >
                      {station.subtitle}
                    </h2>
                  </div>

                  {/* 태그라인 */}
                  <p
                    className="text-sm font-mono tracking-wide mb-5"
                    style={{ color: station.textLight }}
                  >
                    {station.tagline}
                  </p>

                  {/* 디바이더 */}
                  <div
                    className="h-px mb-5 transition-all duration-500"
                    style={{
                      background: isHovered
                        ? `linear-gradient(90deg, ${station.accentColor}, transparent)`
                        : `linear-gradient(90deg, ${station.borderAccent}, transparent)`,
                    }}
                  />

                  {/* 설명 */}
                  <p className="text-[15px] text-slate-600 leading-relaxed mb-6">
                    {station.description}
                  </p>

                  {/* 기능 목록 */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {station.features.map((feature, fi) => (
                      <li
                        key={fi}
                        className="flex items-start gap-2.5 text-sm text-slate-700"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-[7px] shrink-0 ${station.dotColor} transition-transform duration-300`}
                          style={{
                            transform: isHovered ? "scale(1.3)" : "scale(1)",
                          }}
                        />
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="flex items-center gap-3 mt-auto pt-2">
                    <span
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-300 ${station.btnClass}`}
                      style={{
                        transform: isHovered ? "translateX(4px)" : "none",
                      }}
                    >
                      시작하기
                      <svg
                        className="w-4 h-4 transition-transform duration-300"
                        style={{ transform: isHovered ? "translateX(3px)" : "none" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 하단 상태 바 */}
      <div
        className="px-4 md:px-6 pb-6 max-w-[1440px] mx-auto w-full"
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1) 500ms",
        }}
      >
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-40" />
            </div>
            <span className="font-mono tracking-wider">SYSTEM ONLINE</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="font-mono tracking-wider">한국수력원자력 인재개발원</span>
          <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
        </div>
      </div>
    </div>
  );
}
