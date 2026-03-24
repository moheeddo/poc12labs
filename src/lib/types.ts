// =============================================
// TwelveLabs API 관련 타입
// =============================================

export interface TwelveLabsIndex {
  id: string;
  name: string;
  videoCount: number;
  createdAt: string;
}

export interface VideoMeta {
  id: string;
  indexId: string;
  title: string;
  duration: number;
  thumbnailUrl?: string;
  createdAt: string;
  status: "ready" | "indexing" | "failed";
}

export interface SearchResult {
  videoId: string;
  videoTitle: string;
  start: number;
  end: number;
  confidence: number;
  text?: string;
  thumbnailUrl?: string;
}

export interface VideoAnalysis {
  title: string;
  topics: string[];
  hashtags: string[];
  summary: string;
  chapters: Chapter[];
  highlights: Highlight[];
}

export interface Chapter {
  title: string;
  start: number;
  end: number;
}

export interface Highlight {
  text: string;
  start: number;
  end: number;
}

// =============================================
// 시뮬레이터 평가 (Tab 1) 관련 타입
// =============================================

export type CompetencyKey =
  | "communication"
  | "situationAwareness"
  | "prudentOperation"
  | "teamwork"
  | "decisionMaking"
  | "leadership"
  | "procedureCompliance"
  | "emergencyResponse";

export interface CompetencyScore {
  key: CompetencyKey;
  label: string;
  score: number; // 0-100
}

export interface SimulatorEvaluation {
  sessionId: string;
  operatorName: string;
  date: string;
  videoId: string;
  competencies: CompetencyScore[];
  overallScore: number;
  chapters: Chapter[];
}

// =============================================
// 리더십 코칭 (Tab 2) 관련 타입
// =============================================

export type LeadershipCompetencyKey =
  | "communication"
  | "logic"
  | "listening"
  | "leadership"
  | "collaboration";

export interface SpeakerSegment {
  speakerId: string;
  speakerName: string;
  start: number;
  end: number;
  text?: string;
}

export interface SpeakerScore {
  speakerId: string;
  speakerName: string;
  scores: Record<LeadershipCompetencyKey, number>; // 1-10
  totalScore: number;
  feedback: string;
}

export interface LeadershipSession {
  sessionId: string;
  date: string;
  videoId: string;
  speakers: SpeakerScore[];
  segments: SpeakerSegment[];
}

// =============================================
// POV 분석 (Tab 3) 관련 타입
// =============================================

export interface SopDeviation {
  step: string;
  expected: string;
  actual: string;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface PovComparison {
  expertVideoId: string;
  noviceVideoId: string;
  similarityScore: number; // 0-100
  deviations: SopDeviation[];
  bestPracticeHighlights: Highlight[];
}

// =============================================
// 공통 UI 타입
// =============================================

export type ServiceTab = "simulator" | "leadership" | "pov";

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: "uploading" | "processing" | "complete" | "error";
  error?: string;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
}
