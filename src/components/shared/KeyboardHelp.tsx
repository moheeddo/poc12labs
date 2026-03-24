"use client";

import { useEffect, useRef } from "react";

interface KeyboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: "1", description: "시뮬레이터 평가" },
  { key: "2", description: "리더십 코칭" },
  { key: "3", description: "POV 분석" },
  { key: "0", description: "대시보드 복귀" },
  { key: "Esc", description: "대시보드 복귀" },
  { key: "?", description: "단축키 도움말 토글" },
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
        className="relative w-full max-w-md rounded-xl border border-surface-600 bg-surface-800 p-6 shadow-2xl animate-fade-in-up"
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">키보드 단축키</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-surface-700 hover:text-white"
            aria-label="닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 단축키 목록 */}
        <ul className="space-y-3">
          {shortcuts.map(({ key, description }) => (
            <li
              key={key}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-300">{description}</span>
              <kbd className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-surface-600 bg-surface-700 px-2 py-1 font-mono text-xs font-medium text-teal-400">
                {key}
              </kbd>
            </li>
          ))}
        </ul>

        {/* 하단 안내 */}
        <p className="mt-5 text-center text-xs text-gray-500">
          입력 필드 포커스 시 단축키가 비활성됩니다
        </p>
      </div>
    </div>
  );
}
