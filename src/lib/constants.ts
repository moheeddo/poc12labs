import type { CompetencyKey, LeadershipCompetencyKey, ServiceTab } from "./types";

// TwelveLabs 인덱스 이름
export const TWELVELABS_INDEXES = {
  simulator: "khnp-nhpai-simulator",
  leadership: "khnp-leadership-coaching",
  pov: "khnp-pov-training",
} as const;

// 서비스 탭 정의
export const SERVICE_TABS: {
  key: ServiceTab;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    key: "simulator",
    label: "N-HPAI 시뮬레이터 평가",
    description: "원전 운전 시뮬레이터 훈련 영상을 분석하여 8대 핵심역량을 정량 평가합니다.",
    color: "text-coral-400",
    bgColor: "bg-coral-500/10",
    borderColor: "border-coral-500/30",
  },
  {
    key: "leadership",
    label: "리더십코칭 역량진단",
    description: "6인 토론 영상에서 개별 발표자의 역량을 자동 스코어링하고 피드백을 생성합니다.",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
  },
  {
    key: "pov",
    label: "훈련영상 POV 분석",
    description: "1인칭 시점 영상으로 SOP 절차 이탈을 탐지하고 숙련도를 비교 분석합니다.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
];

// 8대 핵심역량 라벨 (시뮬레이터 평가)
export const COMPETENCY_LABELS: Record<CompetencyKey, string> = {
  communication: "의사소통",
  situationAwareness: "상황인식",
  prudentOperation: "신중한운전",
  teamwork: "팀워크",
  decisionMaking: "의사결정",
  leadership: "리더십",
  procedureCompliance: "절차준수",
  emergencyResponse: "비상대응",
};

// 리더십 역량 라벨 및 가중치
export const LEADERSHIP_COMPETENCY_CONFIG: {
  key: LeadershipCompetencyKey;
  label: string;
  weight: number;
}[] = [
  { key: "communication", label: "의사소통", weight: 0.3 },
  { key: "logic", label: "논리력", weight: 0.25 },
  { key: "listening", label: "경청", weight: 0.2 },
  { key: "leadership", label: "리더십", weight: 0.15 },
  { key: "collaboration", label: "협업", weight: 0.1 },
];

// SOP 이탈 심각도 라벨
export const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "경미", color: "text-blue-400" },
  medium: { label: "보통", color: "text-amber-400" },
  high: { label: "심각", color: "text-orange-400" },
  critical: { label: "위험", color: "text-red-400" },
};
