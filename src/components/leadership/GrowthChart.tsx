"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertCircle, Zap, AlertTriangle } from "lucide-react";
import type { GrowthTimeline, CompetencyTrend } from "@/lib/growth";
import { cn } from "@/lib/utils";

// ─── Props ───
interface GrowthChartProps {
  timeline: GrowthTimeline | null;
  loading?: boolean;
}

// ─── 역량 색상 팔레트 ───
const COMPETENCY_COLORS: Record<string, string> = {
  visionPresentation:  "#14b8a6",
  visionPractice:      "#06b6d4",
  trustBuilding:       "#f59e0b",
  communication:       "#8b5cf6",
  memberDevelopment:   "#ef4444",
  selfDevelopment:     "#10b981",
  rationalDecision:    "#3b82f6",
  problemSolving:      "#f97316",
};

const DEFAULT_LINE_COLORS = [
  "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#10b981", "#f97316", "#06b6d4",
];

const COMPETENCY_LABELS: Record<string, string> = {
  visionPresentation:  "비전제시",
  visionPractice:      "비전실천",
  trustBuilding:       "신뢰형성",
  communication:       "의사소통",
  memberDevelopment:   "구성원육성",
  selfDevelopment:     "자기개발",
  rationalDecision:    "합리적의사결정",
  problemSolving:      "문제해결",
};

// ─── 추이 배지 방향 아이콘 + 색상 ───
function TrendIcon({ direction }: { direction: CompetencyTrend["direction"] }) {
  if (direction === "improving")
    return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (direction === "declining")
    return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

function trendBadgeColor(direction: CompetencyTrend["direction"]) {
  if (direction === "improving") return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  if (direction === "declining") return "bg-red-500/15 border-red-500/30 text-red-300";
  return "bg-slate-700/50 border-slate-600/40 text-slate-400";
}

// ─── 커스텀 툴팁 ───
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-600/50 bg-slate-900/95 backdrop-blur-sm p-3 shadow-xl min-w-[160px]">
      <p className="text-xs font-mono text-slate-400 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-slate-300">
                {COMPETENCY_LABELS[entry.name] ?? entry.name}
              </span>
            </div>
            <span className="text-xs font-bold font-mono" style={{ color: entry.color }}>
              {entry.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ───
export default function GrowthChart({ timeline, loading = false }: GrowthChartProps) {
  // 훅은 조건문 전에 모두 선언 (Rules of Hooks)
  const dataPoints = timeline?.dataPoints ?? [];
  const trends = timeline?.trends ?? [];
  const plateauCompetencies = timeline?.plateauCompetencies ?? [];
  const breakthroughCompetencies = timeline?.breakthroughCompetencies ?? [];

  // recharts용 데이터 변환
  const chartData = useMemo(
    () =>
      dataPoints.map((dp) => ({
        date: dp.date.slice(0, 10), // ISO → YYYY-MM-DD
        ...dp.competencyScores,
      })),
    [dataPoints]
  );

  // 존재하는 역량 키 추출
  const competencyKeys = useMemo(
    () => Array.from(new Set(dataPoints.flatMap((dp) => Object.keys(dp.competencyScores)))),
    [dataPoints]
  );

  const plateauSet = useMemo(() => new Set(plateauCompetencies), [plateauCompetencies]);
  const breakthroughSet = useMemo(() => new Set(breakthroughCompetencies), [breakthroughCompetencies]);

  // 예측 점수 맵
  const projectedMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of trends) {
      m[t.competencyKey] = t.projectedScore;
    }
    return m;
  }, [trends]);

  // 로딩
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">성장 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 데이터 없음 또는 포인트 부족
  if (!timeline || dataPoints.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle className="w-10 h-10 text-slate-600" />
        <p className="text-sm text-slate-500">2회 이상 평가 데이터가 필요합니다</p>
        {timeline && dataPoints.length === 1 && (
          <p className="text-xs text-slate-600">현재 1회 데이터만 있습니다</p>
        )}
      </div>
    );
  }

  const { employeeName } = timeline;

  return (
    <div className="space-y-6">
      {/* ─── 헤더 ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">{employeeName}</h4>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {dataPoints.length}회 평가 · {dataPoints[0]?.date?.slice(0, 10)} ~ {dataPoints[dataPoints.length - 1]?.date?.slice(0, 10)}
          </p>
        </div>
      </div>

      {/* ─── 라인 차트 ─── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              domain={[1, 9]}
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
              tick={{ fill: "#64748b", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-slate-400">
                  {COMPETENCY_LABELS[value] ?? value}
                </span>
              )}
              wrapperStyle={{ paddingTop: 12 }}
            />
            {competencyKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={COMPETENCY_COLORS[key] ?? DEFAULT_LINE_COLORS[idx % DEFAULT_LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ─── 추이 배지 ─── */}
      {trends.length > 0 && (
        <div>
          <h5 className="text-xs uppercase tracking-widest text-slate-500 mb-3">역량별 추이</h5>
          <div className="flex flex-wrap gap-2">
            {trends.map((trend) => {
              const isPlateau = plateauSet.has(trend.competencyKey);
              const isBreakthrough = breakthroughSet.has(trend.competencyKey);

              return (
                <div
                  key={trend.competencyKey}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
                    trendBadgeColor(trend.direction)
                  )}
                >
                  <TrendIcon direction={trend.direction} />
                  <span>{COMPETENCY_LABELS[trend.competencyKey] ?? trend.competencyKey}</span>
                  <span className="font-mono opacity-75">
                    {trend.changeRate >= 0 ? "+" : ""}
                    {trend.changeRate.toFixed(2)}
                  </span>
                  {isPlateau && (
                    <span className="inline-flex items-center gap-0.5 ml-0.5 px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 text-[10px]">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      정체
                    </span>
                  )}
                  {isBreakthrough && (
                    <span className="inline-flex items-center gap-0.5 ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                      <Zap className="w-2.5 h-2.5" />
                      돌파
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 예측 점수 섹션 ─── */}
      {Object.keys(projectedMap).length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <h5 className="text-xs uppercase tracking-widest text-slate-500 mb-3">다음 세션 예측 점수</h5>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(projectedMap).map(([key, score]) => {
              const color = COMPETENCY_COLORS[key] ?? "#64748b";
              const trend = trends.find((t) => t.competencyKey === key);
              const direction = trend?.direction ?? "stable";

              return (
                <div
                  key={key}
                  className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-3 text-center"
                >
                  <div className="text-[11px] text-slate-500 mb-1 truncate">
                    {COMPETENCY_LABELS[key] ?? key}
                  </div>
                  <div
                    className="text-xl font-bold font-mono"
                    style={{ color }}
                  >
                    {score.toFixed(1)}
                  </div>
                  <div className="flex justify-center mt-1">
                    <TrendIcon direction={direction} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
