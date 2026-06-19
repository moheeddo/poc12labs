"use client";
/* Hallmark · macrostructure: Asymmetric Split (headline-left / instrument-index-right)
 * genre: modern-minimal (editorial precision) · theme: KHNP brand (emerald #006341 · navy #002855 · warm paper)
 * nav: N6 masthead · tone: 신뢰·전문성·안전 (control-room) · pre-emit critique: P5 H5 E4 S5 R4 V5 */
import { useState, useEffect } from "react";
import type { ServiceTab } from "@/lib/types";
import KhnpLogo from "@/components/shared/KhnpLogo";

interface LandingProps {
  onNavigate: (tab: ServiceTab) => void;
}

// 진단 역량 인덱스 (계측 패널)
const COMPETENCY_INDEX = [
  { no: "01", label: "비전제시", task: "전략 브리핑 발표" },
  { no: "02", label: "신뢰형성", task: "협상형 그룹토의" },
  { no: "03", label: "구성원육성", task: "1:1 코칭 면담" },
];

const META = [
  ["측정 항목", "M1–M5"],
  ["척도", "9점 · 4밴드"],
  ["검증", "HITL · N차 일관성"],
  ["신호", "시선·음성·자세·언어"],
];

export default function Landing({ onNavigate }: LandingProps) {
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const reveal = (delay: number) => ({
    opacity: ready ? 1 : 0,
    transform: ready ? "none" : "translateY(14px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <div className="relative min-h-screen bg-[#f7f8f6] text-[#002855] overflow-x-clip">
      {/* 좌측 정밀 레일 — 브랜드 에메랄드 헤어라인 (제어실 계측감) */}
      <div className="fixed left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#006341]/25 to-transparent hidden md:block" aria-hidden />

      <div className="relative z-10 mx-auto max-w-[1240px] px-6 md:px-10 min-h-screen flex flex-col">
        {/* ── 마스트헤드 ── */}
        <header className="flex items-center justify-between py-6" style={reveal(0)}>
          <div className="flex items-center gap-3">
            <KhnpLogo size={26} />
            <div className="leading-tight">
              <p className="text-[13px] font-bold tracking-[-0.01em] text-[#002855]">KHNP 인재개발원</p>
              <p className="text-[10px] font-mono tracking-[0.18em] text-[#006341] uppercase">HRDI · Video AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#006341]/20 bg-white/50">
            <span className="inline-flex rounded-full w-1.5 h-1.5 bg-[#006341]" />
            <span className="text-[10px] font-mono tracking-[0.16em] text-[#006341]">SYSTEM ONLINE</span>
          </div>
        </header>

        {/* ── 본문: 비대칭 분할 ── */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-16 items-center py-10 lg:py-0">
          {/* 좌: 헤드라인 + 진입 */}
          <div className="lg:col-span-7">
            <p className="text-[12px] font-mono tracking-[0.1em] text-[#006341] mb-6" style={reveal(80)}>
              한수원 리더십 역량, 영상으로 측정한다
            </p>
            <h1
              className="font-bold tracking-[-0.045em] leading-[0.98] text-[#002855] text-[clamp(2.6rem,6.5vw,5rem)]"
              style={{ ...reveal(140), overflowWrap: "anywhere" }}
            >
              영상 AI<br />
              <span className="text-[#006341]">역량 진단</span>
            </h1>
            <p className="mt-7 max-w-[440px] text-[16px] leading-[1.7] text-[#475569]" style={reveal(220)}>
              발표·토의·면담 영상에서 멀티모달 행동지표를 추출해
              리더십 역량을 정량 평가합니다. 점수가 아니라 <span className="text-[#002855] font-semibold">행동 근거</span>로 말합니다.
            </p>

            {/* 진입 — 카드가 아닌 에디토리얼 행 */}
            <button
              type="button"
              onClick={() => onNavigate("leadership")}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className="group mt-10 inline-flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-[#006341] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7f8f6] rounded-sm"
              style={reveal(300)}
              aria-label="리더십 역량진단 2.0 시작"
            >
              <span className="flex items-baseline gap-4">
                <span className="text-[clamp(1.6rem,3.5vw,2.3rem)] font-bold tracking-[-0.03em] text-[#002855] group-hover:text-[#006341] transition-colors duration-300">
                  리더십 역량진단 2.0
                </span>
                <span
                  className="text-[#006341] text-2xl transition-transform duration-300"
                  style={{ transform: hovered ? "translateX(6px)" : "none" }}
                  aria-hidden
                >
                  →
                </span>
              </span>
              {/* 언더라인 grow */}
              <span className="mt-2 h-[2px] bg-[#006341] transition-all duration-400 ease-out" style={{ width: hovered ? "100%" : "44px" }} />
              <span className="mt-3 text-[13px] text-[#64748b] font-mono tracking-[0.02em]">
                3대 핵심 역량 · M1–M5 멀티모달 채점 · 근거 기반 피드백
              </span>
            </button>
          </div>

          {/* 우: 계측 인덱스 패널 */}
          <div className="lg:col-span-5 lg:border-l lg:border-[#002855]/10 lg:pl-12" style={reveal(380)}>
            <p className="text-[10px] font-mono tracking-[0.2em] text-[#64748b] uppercase mb-5">평가 역량 / Index</p>
            <ul>
              {COMPETENCY_INDEX.map((c, i) => (
                <li
                  key={c.no}
                  className="flex items-baseline gap-4 py-3.5"
                  style={{ borderTop: i === 0 ? "none" : "1px solid rgba(0,40,85,0.08)" }}
                >
                  <span className="text-[12px] font-mono text-[#006341] w-6 shrink-0">{c.no}</span>
                  <span className="text-[17px] font-semibold text-[#002855] tracking-[-0.01em]">{c.label}</span>
                  <span className="ml-auto text-[12px] text-[#64748b] font-mono">{c.task}</span>
                </li>
              ))}
            </ul>

            {/* 메타 그리드 */}
            <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[#002855]/10 pt-6">
              {META.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-mono tracking-[0.12em] text-[#64748b] uppercase">{k}</dt>
                  <dd className="text-[14px] font-semibold text-[#002855] mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </main>

        {/* ── 푸터 ── */}
        <footer className="flex items-center justify-between py-6 border-t border-[#002855]/8" style={reveal(480)}>
          <span className="text-[11px] text-[#64748b] font-mono">© 2026 한국수력원자력 인재개발원</span>
          <span className="text-[11px] text-[#64748b] font-mono hidden sm:block">Powered by TwelveLabs · Upstage Solar</span>
        </footer>
      </div>
    </div>
  );
}
