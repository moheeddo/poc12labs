// =============================================
// 교수자 강의평가 전용 타입
// =============================================

// PPT 파싱 결과
export interface ParsedSlide {
  index: number;
  title: string;
  bodyText: string;
  notes: string;
  keyConcepts?: string[];
}

export interface ParsedPpt {
  fileName: string;
  slideCount: number;
  slides: ParsedSlide[];
  totalNotesLength: number;
}

// 내용 충실도 — Layer 1: 슬라이드별 커버리지
export interface SlideCoverage {
  slideIndex: number;
  slideTitle: string;
  coveragePercent: number;
  matchedSegments: { start: number; end: number; text: string }[];
}

// 내용 충실도 — Layer 2: 핵심 개념 매칭
export interface ConceptMatch {
  concept: string;
  definition: string;
  slideIndex: number;
  status: "found" | "partial" | "missing";
  timestamp?: number;
  evidence?: string;
}

// 내용 충실도 — Layer 3: 전달 품질
export interface DeliveryQuality {
  conceptOrSlide: string;
  exampleUsage: number;       // 0-3
  repetitionSummary: number;  // 0-3
  learnerInteraction: number; // 0-3
  logicalConnection: number;  // 0-3
  totalScore: number;         // 0-12
}

// 내용 충실도 통합
export interface ContentFidelityResult {
  slideCoverages: SlideCoverage[];
  conceptMatches: ConceptMatch[];
  deliveryQualities: DeliveryQuality[];
  overallCoveragePercent: number;
  conceptMatchRate: number;
  deliveryQualityAvg: number;
  score: number; // 0-50
}

// 교수법 확장 지표
export interface PedagogyIndicator {
  key: "learnerEngagement" | "slidePointing" | "transitionSignal";
  label: string;
  score: number;  // 0-5
  count: number;
  evidence: string[];
}

// 전달력 통합 (멀티모달 + 교수법)
export interface DeliveryResult {
  multimodalScore: number;     // 0-35 (기존 0-9 → 35점 변환)
  multimodalRaw: number;       // 0-9 원본
  pedagogyIndicators: PedagogyIndicator[];
  pedagogyScore: number;       // 0-15
  score: number;               // 0-50
}

// 강의평가 종합 결과
export interface LectureEvaluationResult {
  id: string;
  videoId: string;
  instructorName: string;
  courseName: string;
  date: string;
  hasPpt: boolean;
  // 듀얼 엔진 결과
  delivery: DeliveryResult;
  contentFidelity: ContentFidelityResult | null; // PPT 없으면 null
  // 통합
  totalScore: number;  // 0-100
  grade: string;       // 탁월/우수/보통/미흡
  report?: string;     // Solar 리포트
  // 타임라인 하이라이트
  highlights: LectureHighlight[];
  analyzedAt: string;
}

export interface LectureHighlight {
  timestamp: number;
  type: "positive" | "warning" | "negative";
  category: "content" | "delivery" | "pedagogy";
  description: string;
}

// 분석 Job
export type LectureAnalysisStage =
  | "transcription"
  | "pptParsing"
  | "contentFidelity"
  | "multimodal"
  | "pedagogy"
  | "scoring"
  | "reporting";

export type StageStatus = "pending" | "running" | "done" | "skipped" | "error";

export interface LectureAnalysisJob {
  id: string;
  videoId: string;
  pptData: ParsedPpt | null;
  instructorName: string;
  courseName: string;
  status: "analyzing" | "complete" | "error";
  progress: number;
  stages: Record<LectureAnalysisStage, StageStatus>;
  result?: LectureEvaluationResult;
  error?: string;
}
