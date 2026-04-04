// =============================================
// 6인 조 단위 관리 — 타입 정의
// 수업 순서: 비전제시(전원) → 신뢰형성(전원) → 구성원육성(전원) → 합리적의사결정(전원)
// =============================================

import type { LeadershipCompetencyKey } from "./types";

// 참가자
export interface GroupMember {
  id: string;
  name: string;
  position: string; // 직급 (부장, 차장 등)
  order: number;    // 1~6
}

// 역량별 영상 등록 상태
export interface CompetencyVideoState {
  competencyKey: LeadershipCompetencyKey;
  type: "individual" | "group" | "hybrid";
  // individual: memberId → videoId
  // group: sharedVideoId만
  // hybrid: memberId → videoId (개별 발언) + sharedVideoId (전체 경청)
  memberVideos: Record<string, { videoId: string; fileName: string; blobUrl?: string }>;
  sharedVideoId?: string;    // group/hybrid: 전체 영상
  sharedFileName?: string;
  sharedBlobUrl?: string;
  // 분석 결과
  memberScores: Record<string, {
    overallScore: number;
    bars: Record<string, number>;
    multimodal?: number;
    analyzed: boolean;
  }>;
}

// 조 전체 데이터
export interface GroupSession {
  id: string;
  name: string;
  createdAt: string;
  members: GroupMember[];
  competencies: CompetencyVideoState[];
  currentStep: number;
  // 개인별 피드백 메모 (memberId → 메모 텍스트)
  memberNotes: Record<string, string>;
}

// 수업 순서 정의
export const COMPETENCY_ORDER: {
  key: LeadershipCompetencyKey;
  label: string;
  type: "individual" | "group" | "hybrid";
  activityType: string;
  description: string; // 촬영 안내
  color: string;
}[] = [
  {
    key: "visionPresentation",
    label: "비전제시",
    type: "individual",
    activityType: "발표",
    description: "6명 각자 개별 발표 영상 업로드",
    color: "#14b8a6",
  },
  {
    key: "trustBuilding",
    label: "신뢰형성",
    type: "hybrid",
    activityType: "집단 토론",
    description: "개별 클로즈업(발언 분석) + 전체 와이드샷(경청 태도)",
    color: "#f59e0b",
  },
  {
    key: "memberDevelopment",
    label: "구성원육성",
    type: "individual",
    activityType: "역할 연기",
    description: "6명 각자 코칭 면담 영상 업로드",
    color: "#ef4444",
  },
  {
    key: "rationalDecision",
    label: "합리적의사결정",
    type: "individual",
    activityType: "In-basket",
    description: "6명 각자 의사결정 발표 영상 업로드",
    color: "#3b82f6",
  },
];

// 빈 조 생성 헬퍼
export function createEmptySession(name: string, members: { name: string; position: string }[]): GroupSession {
  return {
    id: `grp-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    members: members.map((m, i) => ({
      id: `m-${i + 1}`,
      name: m.name,
      position: m.position,
      order: i + 1,
    })),
    competencies: COMPETENCY_ORDER.map((c) => ({
      competencyKey: c.key,
      type: c.type,
      memberVideos: {},
      memberScores: {},
    })),
    currentStep: 0,
    memberNotes: {},
  };
}
