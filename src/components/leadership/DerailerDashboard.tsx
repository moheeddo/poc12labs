"use client";

import { useState } from "react";
import { PlayCircle, AlertTriangle, ShieldCheck, ShieldAlert, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DerailerProfile, DerailerPattern } from "@/lib/derailer";

// ─── 유틸 ───────────────────────────────────────────────────────────
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 위험 수준별 색상 클래스
function getRiskColors(level: DerailerPattern["riskLevel"]) {
  switch (level) {
    case "low":
      return {
        gauge: "#14b8a6",    // teal-500
        badge: "bg-teal-100 text-teal-700 border-teal-300",
        card: "border-teal-200/40 bg-teal-50/20",
        text: "text-teal-600",
        label: "낮음",
      };
    case "moderate":
      return {
        gauge: "#f59e0b",    // amber-500
        badge: "bg-amber-100 text-amber-700 border-amber-300",
        card: "border-amber-200/40 bg-amber-50/20",
        text: "text-amber-600",
        label: "보통",
      };
    case "high":
      return {
        gauge: "#f97316",    // orange-500
        badge: "bg-orange-100 text-orange-700 border-orange-300",
        card: "border-orange-200/40 bg-orange-50/20",
        text: "text-orange-600",
        label: "높음",
      };
    case "critical":
      return {
        gauge: "#ef4444",    // red-500
        badge: "bg-red-100 text-red-700 border-red-300",
        card: "border-red-200/40 bg-red-50/20",
        text: "text-red-500",
        label: "위험",
      };
  }
}

// 전체 위험 수준 배지
function getOverallRiskStyle(level: DerailerProfile["overallRiskLevel"]) {
  switch (level) {
    case "low":
      return { cls: "bg-teal-50 text-teal-700 border-teal-300", label: "낮음", Icon: ShieldCheck };
    case "moderate":
      return { cls: "bg-amber-50 text-amber-700 border-amber-300", label: "보통", Icon: Shield };
    case "high":
      return { cls: "bg-red-50 text-red-700 border-red-300", label: "높음", Icon: ShieldAlert };
  }
}

// ─── 반원형 게이지 (CSS only, conic-gradient) ───────────────────────
interface GaugeProps {
  score: number;   // 0–10
  color: string;   // hex
  size?: number;   // px
}

function SemiGauge({ score, color, size = 72 }: GaugeProps) {
  // 반원(180deg) 범위에서 score/10 비율만큼 채움
  // conic-gradient: 12시 방향 기준, 180deg 반원
  // 좌→우 방향 반원을 만들기 위해 overflow:hidden + rotate 기법 사용
  const pct = Math.min(Math.max(score / 10, 0), 1);
  const deg = pct * 180; // 0~180

  const half = size / 2;
  const trackColor = "#e2e8f0"; // slate-200

  return (
    <div
      className="relative overflow-hidden shrink-0"
      style={{ width: size, height: half + 4 }} // 반원 높이만
      aria-label={`위험 점수 ${score}/10`}
    >
      {/* 배경 반원 (전체 트랙) */}
      <div
        className="absolute inset-0"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(from 180deg at 50% 50%, ${trackColor} 0deg, ${trackColor} 180deg, transparent 180deg)`,
        }}
      />
      {/* 채워진 반원 (점수) */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(from 180deg at 50% 50%, ${color} 0deg, ${color} ${deg}deg, transparent ${deg}deg)`,
        }}
      />
      {/* 중앙 구멍 (도넛 효과) */}
      <div
        className="absolute bg-white rounded-full"
        style={{
          width: size * 0.58,
          height: size * 0.58,
          top: size * 0.21,
          left: size * 0.21,
        }}
      />
      {/* 점수 텍스트 (반원 하단 중앙) */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center"
        style={{ bottom: -2 }}
      >
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

// ─── 개별 패턴 카드 (그리드용) ──────────────────────────────────────
interface PatternCardProps {
  pattern: DerailerPattern;
  onSeekVideo?: (ts: number) => void;
}

function PatternCard({ pattern, onSeekVideo }: PatternCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = getRiskColors(pattern.riskLevel);

  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex flex-col gap-2 transition-all",
        colors.card
      )}
    >
      {/* 게이지 + 이름 */}
      <div className="flex flex-col items-center gap-1">
        <SemiGauge score={pattern.score} color={colors.gauge} size={68} />
        <p className="text-xs font-semibold text-slate-700 text-center leading-tight mt-0.5">
          {pattern.name}
        </p>
        <p className="text-[10px] text-slate-400 text-center">{pattern.hoganScale}</p>
        <span
          className={cn(
            "text-[10px] font-medium border rounded px-1.5 py-0.5",
            colors.badge
          )}
        >
          {colors.label}
        </span>
      </div>

      {/* 증거 있으면 펼치기 */}
      {pattern.evidence.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors py-0.5"
          >
            증거 {pattern.evidence.length}건
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {expanded && (
            <ul className="space-y-1 mt-1">
              {pattern.evidence.map((ev, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSeekVideo?.(ev.timestamp.start)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-mono text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded px-1.5 py-1 min-h-[28px] transition-colors whitespace-nowrap shrink-0"
                  >
                    <PlayCircle className="w-2.5 h-2.5" />
                    {formatTime(ev.timestamp.start)}
                  </button>
                  <span className="text-[10px] text-slate-500 truncate">{ev.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 스켈레톤 ───────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 bg-slate-200/60 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200/60 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[...Array(11)].map((_, i) => (
          <div key={i} className="h-36 bg-slate-200/60 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────
interface DerailerDashboardProps {
  profile: DerailerProfile | null;
  onSeekVideo?: (timestamp: number) => void;
  loading?: boolean;
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function DerailerDashboard({
  profile,
  onSeekVideo,
  loading = false,
}: DerailerDashboardProps) {
  // 로딩 상태
  if (loading) {
    return (
      <div className="p-4">
        <Skeleton />
      </div>
    );
  }

  // 데이터 없음
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100/60 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-base font-medium text-slate-500">탈선 패턴 분석 대기 중</p>
        <p className="text-sm text-slate-400 mt-1.5">
          AI 분석 실행 후 Hogan HDS 11가지 탈선 패턴이 표시됩니다
        </p>
      </div>
    );
  }

  const overallStyle = getOverallRiskStyle(profile.overallRiskLevel);
  const OverallIcon = overallStyle.Icon;

  return (
    <div className="space-y-5">
      {/* ── 전체 위험 수준 헤더 ── */}
      <div className="flex items-center gap-3 bg-white/50 border border-slate-200/40 rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-slate-100/60 flex items-center justify-center shrink-0">
          <OverallIcon className="w-5 h-5 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Hogan HDS 탈선 위험 종합</p>
          <p className="text-sm font-semibold text-slate-800">
            {profile.scenarioType === "emergency" ? "비상 상황" : "정상 운전"} 시나리오
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold",
            overallStyle.cls
          )}
        >
          <OverallIcon className="w-4 h-4" />
          전체 위험 {overallStyle.label}
        </span>
      </div>

      {/* ── Top 3 고위험 패턴 ── */}
      {profile.topRisks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            상위 위험 패턴 (Top {profile.topRisks.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {profile.topRisks.map((p, rank) => {
              const colors = getRiskColors(p.riskLevel);
              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-xl border p-4 flex flex-col gap-2",
                    colors.card
                  )}
                >
                  {/* 순위 + 이름 */}
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono font-bold text-white bg-slate-500 rounded px-1.5 py-0.5 shrink-0">
                      #{rank + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.hoganScale}</p>
                    </div>
                    <div className="ml-auto shrink-0 text-right">
                      <p className={cn("text-lg font-bold font-mono tabular-nums", colors.text)}>
                        {p.score.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-slate-400">/ 10</p>
                    </div>
                  </div>

                  {/* 점수 바 */}
                  <div className="h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(p.score / 10) * 100}%`,
                        backgroundColor: colors.gauge,
                      }}
                    />
                  </div>

                  {/* 개발 제언 */}
                  <p className="text-xs text-slate-600 leading-relaxed">{p.developmentTip}</p>

                  {/* 증거 타임스탬프 */}
                  {p.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-200/30">
                      {p.evidence.slice(0, 3).map((ev, i) => (
                        <button
                          key={i}
                          onClick={() => onSeekVideo?.(ev.timestamp.start)}
                          className="inline-flex items-center gap-0.5 text-[10px] font-mono text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded px-1.5 py-1 min-h-[28px] transition-colors"
                          title={ev.description}
                        >
                          <PlayCircle className="w-2.5 h-2.5" />
                          {formatTime(ev.timestamp.start)}
                        </button>
                      ))}
                      {p.evidence.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{p.evidence.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 11개 전체 패턴 그리드 ── */}
      <div>
        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-2">
          11개 탈선 패턴 전체
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {profile.patterns.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              onSeekVideo={onSeekVideo}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
