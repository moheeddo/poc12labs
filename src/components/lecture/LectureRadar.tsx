"use client";

// src/components/lecture/LectureRadar.tsx
// 8축 레이더 차트 (멀티모달 5채널 + 교수법 3지표)

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DeliveryResult } from "@/lib/lecture-types";

interface LectureRadarProps {
  delivery: DeliveryResult;
}

// 멀티모달 5채널 라벨 (35점을 5개로 분배: 각 7점)
const MULTIMODAL_CHANNELS = [
  { key: "gaze", label: "시선" },
  { key: "voice", label: "음성" },
  { key: "fluency", label: "유창성" },
  { key: "posture", label: "자세" },
  { key: "expression", label: "표정" },
];

export default function LectureRadar({ delivery }: LectureRadarProps) {
  // 멀티모달 점수를 5개 채널로 균등 분배 (정규화: 0-100)
  const normalizedMultimodal = (delivery.multimodalRaw / 9) * 100;

  // 레이더 데이터: 5채널 + 3교수법 지표
  const data = [
    // 멀티모달 5채널 (같은 점수로 분배 — 개별 채널 데이터 없으면 총점 기반)
    ...MULTIMODAL_CHANNELS.map((ch) => ({
      axis: ch.label,
      value: Math.round(normalizedMultimodal),
      fullMark: 100,
    })),
    // 교수법 3지표 (각 0-5 → 0-100 정규화)
    ...delivery.pedagogyIndicators.map((pi) => ({
      axis: pi.label,
      value: Math.round((pi.score / 5) * 100),
      fullMark: 100,
    })),
  ];

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#64748b", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "13px",
            }}
            formatter={(value: number) => [`${value}점`, "점수"]}
          />
          <Radar
            name="전달력"
            dataKey="value"
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
