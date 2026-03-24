"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ChartTooltip from "@/components/shared/ChartTooltip";
import type { CompetencyScore } from "@/lib/types";

interface CompetencyRadarProps {
  scores: CompetencyScore[];
  /** 목표 점수 (기본 80) — 기준선 오버레이용 */
  targetScore?: number;
}

export default function CompetencyRadar({ scores, targetScore = 80 }: CompetencyRadarProps) {
  const data = scores.map((s) => ({
    subject: s.label,
    score: s.score,
    target: targetScore,
    fullMark: 100,
  }));

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-4" role="img" aria-label="8대 핵심역량 레이더 차트">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-300">8대 핵심역량 평가</h4>
        <span className="text-xs text-slate-600 font-mono">목표 {targetScore}점</span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="#243044" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip unit="점" />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: "11px", paddingBottom: "4px" }}
            formatter={(value: string) => (
              <span style={{ color: value === "목표" ? "#475569" : "#ff6b47" }}>{value}</span>
            )}
          />
          {/* 목표 기준선 — 은은한 점선 레이어 */}
          <Radar
            name="목표"
            dataKey="target"
            stroke="#475569"
            fill="none"
            strokeWidth={1}
            strokeDasharray="4 3"
            animationBegin={0}
            animationDuration={600}
          />
          {/* 실제 역량 점수 */}
          <Radar
            name="역량 점수"
            dataKey="score"
            stroke="#ff6b47"
            fill="#ff6b47"
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{ r: 3, fill: "#ff6b47", stroke: "#0a0e14", strokeWidth: 2 }}
            animationBegin={200}
            animationDuration={800}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
