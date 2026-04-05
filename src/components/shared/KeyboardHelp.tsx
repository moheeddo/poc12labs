"use client";

import { useEffect, useRef } from "react";
import { X, Keyboard } from "lucide-react";

interface KeyboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcutGroups = [
  {
    title: "서비스 전환",
    items: [
      { key: "1", description: "리더십 코칭" },
      { key: "2", description: "POV 분석" },
    ],
  },
  {
    title: "일반",
    items: [
      { key: "0", description: "대시보드 복귀" },
      { key: "Esc", description: "대시보드 복귀" },
      { key: "?", description: "단축키 도움말 토글" },
    ],
  },
] as const;

export default function KeyboardHelp({ isOpen, onClose }: KeyboardHelpProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape 키로 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleEsc, { capture: true });
  }, [isOpen, onClose]);

  // 모달 열릴 때 포커스 트랩
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 모달 */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="키보드 단축키"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-fade-in-up"
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-900">키보드 단축키</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* 단축키 그룹별 목록 */}
        <div className="space-y-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{group.title}</p>
              <ul className="space-y-2">
                {group.items.map(({ key, description }) => (
                  <li
                    key={key}
                    className="flex items-center justify-between text-sm py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors duration-150"
                  >
                    <span className="text-slate-700">{description}</span>
                    <kbd className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-teal-600">
                      {key}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 하단 안내 */}
        <p className="mt-5 text-center text-sm text-slate-400">
          입력 필드 포커스 시 단축키가 비활성됩니다
        </p>
      </div>
    </div>
  );
}
