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
  type: "individual" | "group"; // individual: 6개 개별, group: 1개 공용
  // individual일 때: memberId → videoId 매핑
  // group일 때: sharedVideoId에 저장
  memberVideos: Record<string, { videoId: string; fileName: string; blobUrl?: string }>;
  sharedVideoId?: string;
  sharedFileName?: string;
  sharedBlobUrl?: string;
  // 분석 결과
  memberScores: Record<string, {
    overallScore: number;
    bars: Record<string, number>; // 루브릭 항목별 점수
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
  // 수업 순서대로 4개 역량
  competencies: CompetencyVideoState[];
  // 현재 진행 중인 역량 인덱스 (0~3)
  currentStep: number;
}

// 수업 순서 정의
export const COMPETENCY_ORDER: {
  key: LeadershipCompetencyKey;
  label: string;
  type: "individual" | "group";
  activityType: string;
  color: string;
}[] = [
  { key: "visionPresentation", label: "비전제시", type: "individual", activityType: "발표", color: "#14b8a6" },
  { key: "trustBuilding", label: "신뢰형성", type: "group", activityType: "집단 토론", color: "#f59e0b" },
  { key: "memberDevelopment", label: "구성원육성", type: "individual", activityType: "역할 연기", color: "#ef4444" },
  { key: "rationalDecision", label: "합리적의사결정", type: "individual", activityType: "In-basket", color: "#3b82f6" },
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
  };
}
