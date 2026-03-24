"use client";

import { useEffect, useState } from "react";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dow = DAY_NAMES[d.getDay()];
  return `${y}년 ${m}월 ${day}일 (${dow})`;
}

function formatTime(d: Date): string {
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function formatTimeParts(d: Date): string[] {
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) =>
    String(n).padStart(2, "0"),
  );
}

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);

  // SSR / 첫 hydration 시에는 빈 자리표시자 렌더링
  if (!now) {
    return (
      <div className="text-right" aria-hidden>
        <div className="text-xs text-slate-500 font-mono">&nbsp;</div>
        <div className="text-lg text-white font-bold font-mono tabular-nums">
          --:--:--
        </div>
      </div>
    );
  }

  const [hh, mm, ss] = formatTimeParts(now);

  return (
    <time
      dateTime={now.toISOString()}
      className="text-right select-none"
      aria-label={`현재 시각 ${formatDate(now)} ${formatTime(now)}`}
    >
      <div className="text-xs text-slate-500 font-mono">{formatDate(now)}</div>
      <div className="text-lg text-white font-bold font-mono tabular-nums">
        {hh}
        <span className="animate-colon-blink" aria-hidden="true">:</span>
        {mm}
        <span className="animate-colon-blink" aria-hidden="true">:</span>
        {ss}
      </div>
    </time>
  );
}
