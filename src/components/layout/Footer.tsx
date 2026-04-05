import type { ServiceTab } from "@/lib/types";

interface FooterProps {
  onNavigate?: (tab: ServiceTab) => void;
}

const FOOTER_LINKS: { key: ServiceTab; label: string; color: string }[] = [
  { key: "leadership", label: "리더십코칭", color: "hover:text-teal-600" },
  { key: "pov", label: "POV 분석", color: "hover:text-amber-600" },
];

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-slate-200 no-print">
      {/* 멀티컬러 디바이더 */}
      <div className="h-px bg-gradient-to-r from-teal-500/20 via-khnp-emerald/10 to-amber-500/20" />

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* 좌측: 로고 + 저작권 */}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-600 tracking-[-0.01em]">
              KHNP HRDI
            </span>
            <span className="text-xs text-slate-400 font-mono">
              &copy; 2026 한국수력원자력 인재개발원
            </span>
          </div>

          {/* 중앙: 빠른 링크 */}
          <nav className="flex items-center gap-5" aria-label="서비스 바로가기">
            {FOOTER_LINKS.map((link, i) => (
              <span key={link.key} className="flex items-center gap-5">
                {i > 0 && (
                  <span className="text-[10px] text-slate-300" aria-hidden="true">/</span>
                )}
                <button
                  onClick={() => onNavigate?.(link.key)}
                  className={`text-sm text-slate-500 ${link.color} transition-colors duration-300`}
                >
                  {link.label}
                </button>
              </span>
            ))}
          </nav>

          {/* 우측: 단축키 힌트 */}
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[11px]">
              ?
            </kbd>
            <span className="text-slate-400">단축키</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
