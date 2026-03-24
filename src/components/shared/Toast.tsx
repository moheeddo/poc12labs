"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import type { Toast as ToastType } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  error: <AlertCircle className="w-4 h-4 text-red-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
};

const BORDERS = {
  success: "border-emerald-500/30",
  error: "border-red-500/30",
  info: "border-blue-500/30",
  warning: "border-amber-500/30",
};

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 bg-surface-800 border rounded-lg p-3 shadow-lg shadow-black/30 animate-in slide-in-from-right",
        BORDERS[toast.type]
      )}
    >
      <div className="mt-0.5">{ICONS[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.message && <p className="text-xs text-slate-400 mt-0.5">{toast.message}</p>}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-slate-500 hover:text-white">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// 토스트 컨테이너
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
