"use client";
// v3 glass redesign
import { useState, useEffect } from "react";
import type { ServiceTab } from "@/lib/types";
import KhnpLogo from "@/components/shared/KhnpLogo";

interface LandingProps {
  onNavigate: (tab: ServiceTab) => void;
}

export default function Landing({ onNavigate }: LandingProps) {
  const [hovered, setHovered] = useState<ServiceTab | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const isLeadership = hovered === "leadership";
  const isPov = hovered === "pov";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ═══ 배경: 소프트 그라데이션 블롭 ═══ */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#f5f7fa]" />
        {/* Teal 블롭 — 좌측 */}
        <div
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[70%] rounded-full transition-all duration-1000 ease-out"
          style={{
            background: "radial-gradient(circle, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0.03) 50%, transparent 70%)",
            transform: isLeadership ? "scale(1.15)" : "scale(1)",
            opacity: isPov ? 0.3 : 1,
          }}
        />
        {/* Amber 블롭 — 우측 */}
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[70%] rounded-full transition-all duration-1000 ease-out"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.02) 50%, transparent 70%)",
            transform: isPov ? "scale(1.15)" : "scale(1)",
            opacity: isLeadership ? 0.3 : 1,
          }}
        />
        {/* Emerald 블롭 — 중앙 상단 */}
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[40%] h-[40%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(0,99,65,0.06) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* ═══ 콘텐츠 ═══ */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* 헤더 */}
        <header
          className="px-6 md:px-12 py-5"
          style={{
            opacity: ready ? 1 : 0,
            transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="max-w-[1280px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KhnpLogo size={28} />
              <span className="text-[14px] font-semibold tracking-[-0.01em] text-slate-700">
                KHNP HRDI
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
              <span className="text-[11px] font-mono text-slate-400 tracking-[0.12em]">
                ONLINE
              </span>
            </div>
          </div>
        </header>

        {/* 메인 */}
        <main className="flex-1 flex flex-col justify-center px-6 md:px-12 py-8 md:py-0">
          <div className="max-w-[1280px] mx-auto w-full">

            {/* 타이틀 */}
            <div
              className="text-center mb-12 md:mb-16"
              style={{
                opacity: ready ? 1 : 0,
                transform: ready ? "none" : "translateY(16px)",
                transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 100ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) 100ms",
              }}
            >
              <p className="text-[12px] font-mono text-slate-400 tracking-[0.3em] uppercase mb-5">
                Video AI Platform
              </p>
              <h1 className="text-[clamp(2.2rem,6vw,4rem)] font-extrabold tracking-[-0.05em] leading-[1.05] text-slate-900">
                영상 AI 역량 평가
              </h1>
              <p className="mt-4 text-[16px] text-slate-400 leading-relaxed">
                분석할 서비스를 선택하세요
              </p>
            </div>

            {/* 서비스 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[960px] mx-auto">

              {/* 리더십코칭 */}
              <button
                type="button"
                onClick={() => onNavigate("leadership")}
                onMouseEnter={() => setHovered("leadership")}
                onMouseLeave={() => setHovered(null)}
                className="group text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-4 rounded-3xl"
                style={{
                  opacity: ready ? 1 : 0,
                  transform: ready ? "none" : "translateY(24px)",
                  transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 200ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) 200ms",
                }}
                aria-label="리더십코칭 역량진단 서비스"
              >
                <div
                  className="relative rounded-3xl p-8 md:p-10 transition-all duration-500 ease-out"
                  style={{
                    background: isLeadership
                      ? "rgba(255,255,255,0.72)"
                      : "rgba(255,255,255,0.45)",
                    backdropFilter: "blur(40px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(40px) saturate(1.4)",
                    border: isLeadership
                      ? "1px solid rgba(20,184,166,0.3)"
                      : "1px solid rgba(255,255,255,0.6)",
                    boxShadow: isLeadership
                      ? "0 24px 48px -12px rgba(20,184,166,0.12), 0 0 0 1px rgba(20,184,166,0.06), inset 0 1px 0 rgba(255,255,255,0.8)"
                      : "0 4px 16px -4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
                    transform: isLeadership ? "translateY(-4px)" : isPov ? "scale(0.98)" : "none",
                    opacity: isPov ? 0.5 : 1,
                  }}
                >
                  {/* 레이블 */}
                  <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-teal-600/70 block mb-6">
                    01
                  </span>

                  {/* 타이틀 */}
                  <h2 className="text-[1.6rem] md:text-[1.85rem] font-bold tracking-[-0.03em] leading-[1.2] text-slate-900 mb-1">
                    리더십코칭
                  </h2>
                  <p
                    className="text-[1.1rem] font-semibold tracking-[-0.01em] mb-5 transition-colors duration-300"
                    style={{ color: isLeadership ? "#0d9488" : "#94a3b8" }}
                  >
                    역량진단
                  </p>

                  {/* 설명 */}
                  <p className="text-[14px] text-slate-500 leading-[1.7] mb-6">
                    BARS 기반 4역량 19항목 정밀 평가.
                    <br />
                    6인 토론 영상에서 멀티모달 AI가 행동을 분석합니다.
                  </p>

                  {/* 태그 */}
                  <div className="flex flex-wrap gap-2">
                    {["행동 신호 분석", "AI 피드백", "성장 추이"].map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: isLeadership ? "rgba(20,184,166,0.1)" : "rgba(0,0,0,0.03)",
                          color: isLeadership ? "#0f766e" : "#94a3b8",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* 화살표 */}
                  <div
                    className="absolute top-8 md:top-10 right-8 md:right-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: isLeadership ? "rgba(20,184,166,0.12)" : "transparent",
                      transform: isLeadership ? "translateX(2px)" : "none",
                    }}
                  >
                    <svg
                      className="w-4 h-4 transition-colors duration-300"
                      style={{ color: isLeadership ? "#0d9488" : "#cbd5e1" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* HPO센터 */}
              <button
                type="button"
                onClick={() => onNavigate("pov")}
                onMouseEnter={() => setHovered("pov")}
                onMouseLeave={() => setHovered(null)}
                className="group text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 rounded-3xl"
                style={{
                  opacity: ready ? 1 : 0,
                  transform: ready ? "none" : "translateY(24px)",
                  transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 300ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) 300ms",
                }}
                aria-label="HPO센터 영상분석 서비스"
              >
                <div
                  className="relative rounded-3xl p-8 md:p-10 transition-all duration-500 ease-out"
                  style={{
                    background: isPov
                      ? "rgba(255,255,255,0.72)"
                      : "rgba(255,255,255,0.45)",
                    backdropFilter: "blur(40px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(40px) saturate(1.4)",
                    border: isPov
                      ? "1px solid rgba(245,158,11,0.3)"
                      : "1px solid rgba(255,255,255,0.6)",
                    boxShadow: isPov
                      ? "0 24px 48px -12px rgba(245,158,11,0.12), 0 0 0 1px rgba(245,158,11,0.06), inset 0 1px 0 rgba(255,255,255,0.8)"
                      : "0 4px 16px -4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
                    transform: isPov ? "translateY(-4px)" : isLeadership ? "scale(0.98)" : "none",
                    opacity: isLeadership ? 0.5 : 1,
                  }}
                >
                  <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-amber-600/70 block mb-6">
                    02
                  </span>

                  <h2 className="text-[1.6rem] md:text-[1.85rem] font-bold tracking-[-0.03em] leading-[1.2] text-slate-900 mb-1">
                    HPO센터
                  </h2>
                  <p
                    className="text-[1.1rem] font-semibold tracking-[-0.01em] mb-5 transition-colors duration-300"
                    style={{ color: isPov ? "#d97706" : "#94a3b8" }}
                  >
                    영상분석
                  </p>

                  <p className="text-[14px] text-slate-500 leading-[1.7] mb-6">
                    SOP 절차 이탈 자동 탐지.
                    <br />
                    숙련자 대비 격차를 1인칭 시점으로 정량 분석합니다.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {["절차 이탈 탐지", "숙련도 비교", "조작 추적"].map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: isPov ? "rgba(245,158,11,0.1)" : "rgba(0,0,0,0.03)",
                          color: isPov ? "#b45309" : "#94a3b8",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div
                    className="absolute top-8 md:top-10 right-8 md:right-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: isPov ? "rgba(245,158,11,0.12)" : "transparent",
                      transform: isPov ? "translateX(2px)" : "none",
                    }}
                  >
                    <svg
                      className="w-4 h-4 transition-colors duration-300"
                      style={{ color: isPov ? "#d97706" : "#cbd5e1" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </main>

        {/* 푸터 */}
        <footer
          className="px-6 md:px-12 py-5"
          style={{
            opacity: ready ? 1 : 0,
            transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 500ms",
          }}
        >
          <div className="max-w-[1280px] mx-auto flex items-center justify-between">
            <span className="text-[11px] text-slate-300 font-mono">
              &copy; 2026 한국수력원자력 인재개발원
            </span>
            <span className="text-[11px] text-slate-300 font-mono hidden sm:block">
              Powered by TwelveLabs
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
