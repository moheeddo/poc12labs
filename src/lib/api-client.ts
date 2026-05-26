"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────
// 범용 API 호출 유틸리티
// non-ok 응답 시 서버의 body.error 필드를 메시지로 사용
// ─────────────────────────────────────────────

export async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    // 서버 에러 응답에서 error 필드 추출 시도
    let message = `API 오류 (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────
// 범용 폴링 훅 (exponential backoff + visibility 감지)
// url이 null이면 폴링을 시작하지 않음
// ─────────────────────────────────────────────

interface UseApiPollingOptions<T> {
  /** 초기 폴링 간격 (ms, 기본 5000) */
  interval?: number;
  /** 최대 폴링 간격 (ms, 기본 30000) */
  maxInterval?: number;
  /** 백오프 배수 (기본 1.5) */
  backoffFactor?: number;
  /** 최대 시도 횟수 (기본 360) */
  maxAttempts?: number;
  /** 폴링 중단 조건 — true 반환 시 폴링 종료 */
  shouldStop?: (data: T) => boolean;
  /** 데이터 수신 콜백 */
  onData?: (data: T) => void;
  /** 에러 발생 콜백 */
  onError?: (err: Error) => void;
}

interface UseApiPollingReturn<T> {
  data: T | null;
  stop: () => void;
  isPolling: boolean;
}

export function useApiPolling<T>(
  url: string | null,
  options?: UseApiPollingOptions<T>,
): UseApiPollingReturn<T> {
  const {
    interval = 5000,
    maxInterval = 30000,
    backoffFactor = 1.5,
    maxAttempts = 360,
    shouldStop,
    onData,
    onError,
  } = options ?? {};

  const [data, setData] = useState<T | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // ref로 최신 콜백 유지 (의존성 배열 변경 방지)
  const shouldStopRef = useRef(shouldStop);
  shouldStopRef.current = shouldStop;
  const onDataRef = useRef(onData);
  onDataRef.current = onData;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // 폴링 중단 플래그
  const stoppedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 수동 중단 함수
  const stop = useCallback(() => {
    stoppedRef.current = true;
    setIsPolling(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // url이 없으면 폴링 비활성화
    if (!url) {
      setIsPolling(false);
      return;
    }

    stoppedRef.current = false;
    setIsPolling(true);
    let attempts = 0;
    let currentInterval = interval;

    // 탭 가시성 추적 — 백그라운드 탭에서 폴링 일시 중지
    let isVisible = typeof document !== "undefined" ? !document.hidden : true;

    const handleVisibility = () => {
      isVisible = !document.hidden;
      // 탭이 다시 보이면 즉시 한 번 폴링 실행
      if (isVisible && !stoppedRef.current) {
        poll();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    async function poll() {
      if (stoppedRef.current) return;
      if (!isVisible) return; // 백그라운드 탭이면 건너뜀

      attempts++;

      try {
        const result = await apiCall<T>(url!);
        setData(result);
        onDataRef.current?.(result);

        // 중단 조건 확인
        if (shouldStopRef.current?.(result)) {
          stoppedRef.current = true;
          setIsPolling(false);
          return;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onErrorRef.current?.(error);
        // 에러 발생 시 백오프 적용
        currentInterval = Math.min(currentInterval * backoffFactor, maxInterval);
      }

      // 최대 시도 횟수 도달 시 중단
      if (attempts >= maxAttempts) {
        stoppedRef.current = true;
        setIsPolling(false);
        onErrorRef.current?.(new Error(`최대 폴링 횟수(${maxAttempts}회) 초과`));
        return;
      }

      // 다음 폴링 예약
      if (!stoppedRef.current) {
        timerRef.current = setTimeout(poll, currentInterval);
      }
    }

    // 첫 폴링 실행
    poll();

    // 클린업
    return () => {
      stoppedRef.current = true;
      setIsPolling(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
    // url 또는 interval 설정이 변경되면 폴링 재시작
  }, [url, interval, maxInterval, backoffFactor, maxAttempts, stop]);

  return { data, stop, isPolling };
}
