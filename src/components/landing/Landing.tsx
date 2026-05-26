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

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ═══ 배경: 소프트 그라데이션 블롭 ═══ */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#f5f7fa]" />
        {/* Teal 블롭 — 좌측 */}
        <div
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[70%] rounded-full transition-all duration-1000 ease-out"
          style={{
            background: "radial-gradient(circle, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0.04) 50%, transparent 70%)",
            transform: isLeadership ? "scale(1.15)" : "scale(1)",
          }}
        />
        {/* Emerald 블롭 — 중앙 상단 */}
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[50%] h-[50%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(0,99,65,0.08) 0%, transparent 60%)",
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

            {/* 서비스 카드 — 리더십 단독 */}
            <div className="max-w-[640px] mx-auto">

              {/* 리더십 - 역량진단 2.0 */}
              <button
                type="button"
                onClick={() => onNavigate("leadership")}
                onMouseEnter={() => setHovered("leadership")}
                onMouseLeave={() => setHovered(null)}
                className="block w-full group text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-4 rounded-3xl"
                style={{
                  opacity: ready ? 1 : 0,
                  transform: ready ? "none" : "translateY(24px)",
                  transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 200ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) 200ms",
                }}
                aria-label="리더십 역량진단 2.0 서비스"
              >
                <div
                  className="relative rounded-3xl p-10 md:p-12 transition-all duration-500 ease-out"
                  style={{
                    background: isLeadership
                      ? "rgba(255,255,255,0.78)"
                      : "rgba(255,255,255,0.5)",
                    backdropFilter: "blur(40px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(40px) saturate(1.4)",
                    border: isLeadership
                      ? "1px solid rgba(20,184,166,0.3)"
                      : "1px solid rgba(255,255,255,0.6)",
                    boxShadow: isLeadership
                      ? "0 24px 48px -12px rgba(20,184,166,0.14), 0 0 0 1px rgba(20,184,166,0.06), inset 0 1px 0 rgba(255,255,255,0.8)"
                      : "0 4px 16px -4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
                    transform: isLeadership ? "translateY(-4px)" : "none",
                  }}
                >
                  {/* 레이블 */}
                  <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-teal-600/70 block mb-6">
                    Leadership · v2.0
                  </span>

                  {/* 타이틀 */}
                  <h2 className="text-[1.8rem] md:text-[2.1rem] font-bold tracking-[-0.03em] leading-[1.2] text-slate-900 mb-1">
                    리더십
                  </h2>
                  <p
                    className="text-[1.2rem] font-semibold tracking-[-0.01em] mb-6 transition-colors duration-300"
                    style={{ color: isLeadership ? "#0d9488" : "#94a3b8" }}
                  >
                    역량진단 2.0
                  </p>

                  {/* 설명 */}
                  <p className="text-[14px] text-slate-500 leading-[1.7] mb-6">
                    비전제시·신뢰형성·구성원육성 3대 핵심 역량을 멀티모달 행동지표로 평가합니다.
                    <br />
                    M1~M5 항목별 시선·음성·자세·언어 신호를 정량 분석합니다.
                  </p>

                  {/* 태그 */}
                  <div className="flex flex-wrap gap-2">
                    {["멀티모달 행동지표", "M1~M5 평가", "근거 기반 피드백"].map((tag) => (
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
                    className="absolute top-10 md:top-12 right-10 md:right-12 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
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
