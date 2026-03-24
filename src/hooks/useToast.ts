"use client";

import { useState, useCallback } from "react";
import type { Toast } from "@/lib/types";

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (
      message: string,
      type: Toast["type"] = "info",
      title?: string,
    ): string => {
      const id = `toast-${++toastCounter}-${Date.now()}`;

      const defaultTitles: Record<Toast["type"], string> = {
        success: "성공",
        error: "오류",
        warning: "경고",
        info: "알림",
      };

      const toast: Toast = {
        id,
        type,
        title: title ?? defaultTitles[type],
        message,
      };

      setToasts((prev) => [...prev, toast]);
      return id;
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
