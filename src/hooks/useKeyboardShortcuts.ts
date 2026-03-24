"use client";

import { useEffect, useCallback } from "react";
import type { ServiceTab } from "@/lib/types";

interface UseKeyboardShortcutsOptions {
  onTabChange: (tab: ServiceTab | null) => void;
  onToggleHelp: () => void;
}

/**
 * 키보드 단축키 훅
 * - 1: 시뮬레이터 평가
 * - 2: 리더십 코칭
 * - 3: POV 분석
 * - 0 / Escape: 대시보드 복귀
 * - ?: 도움말 모달 토글
 *
 * input, textarea, [contenteditable] 포커스 시 비활성
 */
export function useKeyboardShortcuts({
  onTabChange,
  onToggleHelp,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 입력 필드 포커스 시 단축키 비활성
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable
      ) {
        return;
      }

      // 수정자 키(Ctrl, Alt, Meta)가 눌린 경우 무시
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      switch (e.key) {
        case "1":
          e.preventDefault();
          onTabChange("simulator");
          break;
        case "2":
          e.preventDefault();
          onTabChange("leadership");
          break;
        case "3":
          e.preventDefault();
          onTabChange("pov");
          break;
        case "0":
          e.preventDefault();
          onTabChange(null);
          break;
        case "Escape":
          onTabChange(null);
          break;
        case "?":
          e.preventDefault();
          onToggleHelp();
          break;
        default:
          break;
      }
    },
    [onTabChange, onToggleHelp],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
