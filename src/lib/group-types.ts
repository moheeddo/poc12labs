// =============================================
// 6인 조 단위 관리 — 타입 정의
// 수업 순서: 비전제시(전원) → 신뢰형성(전원) → 구성원육성(전원)
// NOTE: 합리적의사결정은 평가항목에서 제외됨 (v0.9 루브릭 기준)
// =============================================

import type { LeadershipCompetencyKey } from "./types";
import { LEADERSHIP_COMPETENCY_COLOR } from "./constants";

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
    // 전문가(코치) 확정 여부 — false/undefined면 AI 초안. dohan 1·3원칙(AI=화자, 인간 확정):
    // 확정 전 점수는 대시보드·순위·CSV에서 'AI 초안 · 전문가 확정 필요'로 라벨해야 한다.
    confirmed?: boolean;
    coachName?: string;
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
    color: LEADERSHIP_COMPETENCY_COLOR.visionPresentation,
  },
  {
    key: "trustBuilding",
    label: "신뢰형성",
    type: "hybrid",
    activityType: "집단 토론",
    description: "개별 클로즈업(발언 분석) + 전체 와이드샷(경청 태도)",
    color: LEADERSHIP_COMPETENCY_COLOR.trustBuilding,
  },
  {
    key: "memberDevelopment",
    label: "구성원육성",
    type: "individual",
    activityType: "역할 연기",
    description: "6명 각자 코칭 면담 영상 업로드",
    color: LEADERSHIP_COMPETENCY_COLOR.memberDevelopment,
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
