"use client";

import { AlertTriangle, CheckCircle, Shield } from "lucide-react";
import type { FairnessReport, GroupDistribution } from "@/lib/fairness";

interface FairnessMonitorProps {
  report: FairnessReport | null;
  loading?: boolean;
}

// 4/5 비율 게이지 — 0.8 임계선 표시
function FourFifthsGauge({
  ratio,
  impacted,
}: {
  ratio: number;
  impacted: boolean;
}) {
  // 0~1.2 범위를 100% 폭으로 매핑
  const maxRatio = 1.2;
  const pct = Math.min(100, (ratio / maxRatio) * 100);
  const thresholdPct = (0.8 / maxRatio) * 100; // 66.67%

  const barColor = impacted ? "bg-red-500" : ratio >= 0.9 ? "bg-teal-500" : "bg-amber-500";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-white/50">
        <span>4/5 비율 (Adverse Impact)</span>
        <span className={impacted ? "text-red-400 font-semibold" : "text-teal-400 font-semibold"}>
          {ratio.toFixed(2)}
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
        {/* 진행 막대 */}
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
        {/* 0.8 임계선 */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/60"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
      <div
        className="text-[10px] text-white/30"
        style={{ marginLeft: `${thresholdPct}%`, transform: "translateX(-50%)" }}
      >
        ▲ 0.80 기준선
      </div>
    </div>
  );
}

// Cohen's d 효과 크기 레이블
function EffectSizeIndicator({ d }: { d: number }) {
  const abs = Math.abs(d);
  let label: string;
  let className: string;
  if (abs < 0.2) {
    label = "무시가능";
    className = "bg-white/10 text-white/40";
  } else if (abs < 0.5) {
    label = "소 (Small)";
    className = "bg-blue-500/15 text-blue-400";
  } else if (abs < 0.8) {
    label = "중 (Medium)";
    className = "bg-amber-500/15 text-amber-400";
  } else {
    label = "대 (Large)";
    className = "bg-red-500/15 text-red-400";
  }
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${className}`}>
      Cohen d={d.toFixed(2)} · {label}
    </span>
  );
}

// 변수별 분석 카드
function VariableCard({ dist }: { dist: GroupDistribution }) {
  const { variable, groups, scoreDistributions, adverseImpact } = dist;

  // 변수명 한국어 매핑
  const variableLabels: Record<string, string> = {
    gender: "성별",
    ageGroup: "연령대",
    department: "부서",
    experience: "경력",
    education: "학력",
  };
  const displayName = variableLabels[variable] ?? variable;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-white/80">{displayName}</h5>
        {adverseImpact.impacted ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
            <AlertTriangle className="h-3 w-3" />
            편향 감지
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400">
            <CheckCircle className="h-3 w-3" />
            공정
          </span>
        )}
      </div>

      {/* 4/5 비율 게이지 */}
      <FourFifthsGauge ratio={adverseImpact.fourFifthsRatio} impacted={adverseImpact.impacted} />

      {/* 그룹별 평균 ± SD */}
      <div className="space-y-2">
        <p className="text-xs text-white/40 uppercase tracking-widest">그룹별 점수 분포</p>
        {groups.map((g) => {
          const stats = scoreDistributions[g];
          if (!stats) return null;
          return (
            <div
              key={g}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2"
            >
              <span className="text-sm text-white/70 min-w-[80px]">{g}</span>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-white/60">
                  N = <span className="text-white/80">{stats.n}</span>
                </span>
                <span className="text-white/60">
                  M = <span className="text-white/80">{stats.mean.toFixed(2)}</span>
                </span>
                <span className="text-white/60">
                  SD = <span className="text-white/80">{stats.sd.toFixed(2)}</span>
                </span>
              </div>
              <EffectSizeIndicator d={stats.effectSize} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FairnessMonitor({ report, loading = false }: FairnessMonitorProps) {
  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-xl bg-white/10" />
        <div className="h-40 rounded-xl bg-white/10" />
        <div className="h-40 rounded-xl bg-white/10" />
      </div>
    );
  }

  // 데이터 없음
  if (!report) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 flex flex-col items-center gap-3 text-center">
        <Shield className="h-10 w-10 text-white/20" />
        <p className="text-sm text-white/40">
          편향 분석을 위해 최소 10명 이상의 데이터가 필요합니다.
        </p>
      </div>
    );
  }

  // 전체 공정성 배지 설정
  const fairnessConfig = {
    pass: {
      label: "PASS — 편향 없음",
      icon: <CheckCircle className="h-8 w-8 text-teal-400" />,
      className: "border-teal-500/30 bg-teal-500/10 text-teal-400",
      textSize: "text-2xl",
    },
    warning: {
      label: "WARNING — 주의 필요",
      icon: <AlertTriangle className="h-8 w-8 text-amber-400" />,
      className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      textSize: "text-2xl",
    },
    fail: {
      label: "FAIL — 편향 감지",
      icon: <AlertTriangle className="h-8 w-8 text-red-400" />,
      className: "border-red-500/30 bg-red-500/10 text-red-400",
      textSize: "text-2xl",
    },
  };

  const fc = fairnessConfig[report.overallFairness];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-teal-400" />
        <h3 className="text-base font-semibold text-white">공정성 모니터</h3>
      </div>

      {/* ① 전체 공정성 배지 — 크고 중앙 정렬 */}
      <div
        className={`rounded-xl border p-6 flex flex-col items-center gap-3 ${fc.className}`}
      >
        {fc.icon}
        <span className={`font-bold tracking-wide ${fc.textSize}`}>{fc.label}</span>
        <span className="text-sm opacity-70">
          {report.analyzedGroups.length}개 변수 분석 완료
        </span>
      </div>

      {/* ② 경고 알림 패널 */}
      {report.alerts.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h4 className="text-xs font-semibold uppercase tracking-widest text-amber-400/70">
              경고 목록
            </h4>
          </div>
          <ul className="space-y-1.5">
            {report.alerts.map((alert, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-300/80">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ③ 변수별 분석 카드 */}
      {report.analyzedGroups.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            변수별 상세 분석
          </h4>
          {report.analyzedGroups.map((dist) => (
            <VariableCard key={dist.variable} dist={dist} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-white/40">분석된 그룹 데이터가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
