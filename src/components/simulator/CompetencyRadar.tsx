"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
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
