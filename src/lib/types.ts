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
// — KHNP 전직급 리더십 역량 정의 및 행동지표 기준
// =============================================

// 8대 리더십 역량 (KHNP 표준)
export type LeadershipCompetencyKey =
  | "visionPresentation"   // 비전제시
  | "visionPractice"       // 비전실천 (4직급)
  | "trustBuilding"        // 신뢰형성
  | "communication"        // 의사소통 (4직급)
  | "memberDevelopment"    // 구성원육성
  | "selfDevelopment"      // 자기개발 (4직급)
  | "rationalDecision"     // 합리적의사결정
  | "problemSolving";      // 문제해결 (4직급)

// 직급 (1직급=임원, 2직급=부장, 3직급=차장/과장, 4직급=대리/사원)
export type JobLevel = 1 | 2 | 3 | 4;

// 하위요소 및 행동지표
export interface SubElement {
  name: string;
  behaviorIndicator: string;
}

// 평가 루브릭 항목 (9점 척도 기반)
export interface RubricItem {
  criteria: string;
  description: string;
}

// 역량 정의 (표준 문서 기반)
export interface LeadershipCompetencyDef {
  key: LeadershipCompetencyKey;
  label: string;
  definition: string;
  color: string;           // 차트/UI 색상
  subElements: Partial<Record<JobLevel, SubElement[]>>;
  rubric?: RubricItem[];   // 신임부장 평가 루브릭 (PPTX 기준)
}

// 개별 역량 루브릭 점수 (9점 척도)
export interface RubricScore {
  criteriaIndex: number;
  score: number;  // 1-9
  note?: string;  // 평가자 메모
}

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
  jobLevel: JobLevel;
  scores: Partial<Record<LeadershipCompetencyKey, number>>; // 1-9 (직급별 4개 역량만)
  rubricScores?: Partial<Record<LeadershipCompetencyKey, RubricScore[]>>; // 세부 루브릭
  totalScore: number;
  feedback: string;
  strengths?: string[];  // 강점 피드백
  improvements?: string[]; // 개선점 피드백
}

export interface LeadershipSession {
  sessionId: string;
  date: string;
  videoId: string;
  jobLevel: JobLevel;
  speakers: SpeakerScore[];
  segments: SpeakerSegment[];
}

export interface SegmentFeedback {
  segmentIndex: number;
  title: string;
  start: number;
  end: number;
  feedback: string;
  rating?: number; // 1-9 (9점 척도)
}

export interface FeedbackSession {
  videoId: string;
  videoTitle: string;
  videoUrl?: string;
  chapters: Chapter[];
  highlights: Highlight[];
  summary: string;
  feedbacks: SegmentFeedback[];
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
