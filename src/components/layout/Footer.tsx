export default function Footer() {
  return (
    <footer className="border-t border-surface-700 bg-surface-900">
      {/* 그라데이션 구분선 */}
      <div className="h-px bg-gradient-to-r from-coral-500/30 via-teal-500/30 to-amber-500/30" />

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* 좌측: 로고 + 저작권 */}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-500">
              KHNP Video AI Platform
            </span>
            <span className="text-xs text-slate-600">
              &copy; 2024 한국수력원자력
            </span>
          </div>

          {/* 중앙: 빠른 링크 */}
          <nav className="flex items-center gap-4">
            <span className="text-xs text-slate-600">시뮬레이터 평가</span>
            <span className="text-xs text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-slate-600">리더십코칭</span>
            <span className="text-xs text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-slate-600">POV 분석</span>
          </nav>

          {/* 우측: 키보드 단축키 힌트 */}
          <span className="text-xs text-slate-500">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-700 text-slate-400 font-mono text-[11px]">
              ?
            </kbd>{" "}
            키보드 단축키
          </span>
        </div>
      </div>
    </footer>
  );
}
