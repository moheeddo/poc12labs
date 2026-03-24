"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CompetencyScore } from "@/lib/types";

interface CompetencyRadarProps {
  scores: CompetencyScore[];
}

export default function CompetencyRadar({ scores }: CompetencyRadarProps) {
  const data = scores.map((s) => ({
    subject: s.label,
    score: s.score,
    fullMark: 100,
  }));

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-4" role="img" aria-label="8대 핵심역량 레이더 차트">
      <h4 className="text-sm font-medium text-slate-300 mb-3">8대 핵심역량 평가</h4>
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
          <Tooltip
            contentStyle={{
              backgroundColor: "#111820",
              border: "1px solid #243044",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value}점`, "역량 점수"]}
            labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
          />
          <Radar
            name="역량 점수"
            dataKey="score"
            stroke="#ff6b47"
            fill="#ff6b47"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
