"use client";

import { useEffect, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import type { Toast as ToastType } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────
   Static map — Tailwind CSS v4에서는 동적 클래스
   `bg-${color}-500` 형태를 사용할 수 없으므로
   타입별 정적 클래스를 매핑합니다.
   ────────────────────────────────────────────── */

const TOAST_STYLES: Record<
  ToastType["type"],
  { icon: React.ReactNode; border: string; accent: string }
> = {
  success: {
    icon: <CheckCircle className="w-[18px] h-[18px] text-teal-400" />,
    border: "border-teal-500/30",
    accent: "bg-teal-500",
  },
  error: {
    icon: <AlertCircle className="w-[18px] h-[18px] text-coral-400" />,
    border: "border-coral-500/30",
    accent: "bg-coral-500",
  },
  warning: {
    icon: <AlertTriangle className="w-[18px] h-[18px] text-amber-400" />,
    border: "border-amber-500/30",
    accent: "bg-amber-500",
  },
  info: {
    icon: <Info className="w-[18px] h-[18px] text-slate-400" />,
    border: "border-slate-500/30",
    accent: "bg-slate-500",
  },
};

/** 자동 닫기 시간 (ms) */
const AUTO_DISMISS_MS = 3000;
/** 퇴장 애니메이션 시간 (ms) — globals.css fadeOut과 동기 */
const EXIT_ANIMATION_MS = 250;

/* ──────────────────────────────────────────────
   단일 토스트 아이템
   ────────────────────────────────────────────── */

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const style = TOAST_STYLES[toast.type];

  /** 퇴장 애니메이션 후 실제 제거 */
  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), EXIT_ANIMATION_MS);
  }, [onDismiss, toast.id]);

  /** 3초 후 자동 닫기 */
  useEffect(() => {
    const timer = setTimeout(handleDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "relative flex items-start gap-3 overflow-hidden",
        "bg-white border rounded-lg p-3.5 pr-9",
        "shadow-lg shadow-slate-200/60",
        style.border,
        exiting ? "animate-fade-out" : "animate-fade-in-up",
      )}
    >
      {/* 하단 자동 닫기 카운트다운 바 */}
      <span
        className={cn(
          "absolute bottom-0 left-0 h-[2px] rounded-b-lg",
          style.accent,
        )}
        style={{
          animation: `toastCountdown ${AUTO_DISMISS_MS}ms linear forwards`,
        }}
        aria-hidden="true"
      />

      {/* 좌측 컬러 액센트 바 */}
      <span
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg",
          style.accent,
        )}
        aria-hidden="true"
      />

      {/* 아이콘 */}
      <div className="mt-0.5 shrink-0">{style.icon}</div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 leading-tight">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-[13px] text-slate-500 mt-0.5 leading-snug">
            {toast.message}
          </p>
        )}
      </div>

      {/* 닫기 버튼 */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="토스트 닫기"
        className={cn(
          "absolute top-2.5 right-2.5",
          "text-slate-400 hover:text-slate-700 transition-colors",
        )}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   토스트 컨테이너 — 하단 우측 스택
   ────────────────────────────────────────────── */

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="알림 목록"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
