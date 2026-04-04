// ISO 10667 준수 — 삼각측정, 동의 관리, 코칭 피드백 타입 정의

export interface TriangulationConfig {
  weights: {
    ai: number;    // AI 점수 가중치 (예: 0.6)
    human: number; // 인간 평가자 점수 가중치 (예: 0.4)
  };
  minimumAgreement: number; // 동의로 간주할 최소 허용 차이 (예: 2)
  conflictResolution: "weighted" | "human_override" | "flag_for_review";
}

export interface TriangulatedScore {
  competencyKey: string;
  aiScore: number;
  humanScore: number;
  finalScore: number;
  agreement: "agree" | "minor_diff" | "major_diff";
  method: string; // 사용된 해결 방법 설명
}

export interface ConsentRecord {
  id: string;
  participantId: string;
  sessionId: string;
  consentType: "video_recording" | "ai_analysis" | "data_retention" | "report_sharing";
  agreed: boolean;
  timestamp: string;
  version: string;
}

export interface ConsentItem {
  type: "video_recording" | "ai_analysis" | "data_retention" | "report_sharing";
  label: string;
  description: string;
  required: boolean;
}

export interface CoachingFeedback {
  participantId: string;
  sessionId: string;
  generatedAt: string;
  strengths: {
    competencyKey: string;
    description: string;
    evidence: string;
  }[];
  developmentAreas: {
    competencyKey: string;
    currentLevel: string;
    targetLevel: string;
    actionItems: string[];
  }[];
  comparedToPrevious?: {
    improved: string[];
    maintained: string[];
    needsAttention: string[];
  };
}

export const DEFAULT_TRIANGULATION_CONFIG: TriangulationConfig = {
  weights: { ai: 0.6, human: 0.4 },
  minimumAgreement: 2,
  conflictResolution: "weighted",
};
