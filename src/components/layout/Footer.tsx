export default function Footer() {
  return (
    <footer className="border-t border-surface-700 bg-surface-900">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
        <span className="text-xs text-slate-500">
          &copy; 2026 KHNP Video AI Platform
        </span>
        <span className="text-xs text-slate-500">
          <kbd className="px-1.5 py-0.5 rounded bg-surface-700 text-slate-400 font-mono text-[11px]">
            ?
          </kbd>{" "}
          키보드 단축키
        </span>
      </div>
    </footer>
  );
}
