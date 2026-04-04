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
// 전사(Transcript) 관련 타입
// =============================================

export interface TranscriptSegment {
  value: string;
  start: number;
  end: number;
}

// 화자 추정이 포함된 전사 세그먼트 (디브리핑 대본용)
export interface AnnotatedTranscript {
  id: string;
  value: string;
  start: number;
  end: number;
  speaker?: string;
  speakerColor?: string;
  isHighlight?: boolean;
  competencyTag?: string;
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

// POV 평가 결과 — 절차별 스텝 단위
export interface StepEvaluation {
  stepId: string;
  description: string;
  status: "pass" | "fail" | "partial" | "skipped";
  confidence: number;    // 0-100 TwelveLabs 신뢰도
  timestamp?: number;    // 영상 내 수행 시점 (초)
  note?: string;         // AI 평가 코멘트
}

// HPO 기법 적용 평가
export interface HpoToolEvaluation {
  toolKey: string;
  label: string;
  applied: boolean;
  score: number;         // 0-100
  evidence?: string;     // 적용 근거
  timestamp?: number;
}

// 운전원 기본수칙 역량 점수
export interface FundamentalScore {
  key: string;
  label: string;
  score: number;         // 0-100
  feedback: string;
}

// 종합 POV 평가 리포트
export interface PovEvaluationReport {
  id: string;
  procedureId: string;
  procedureTitle: string;
  videoId: string;
  evaluatorName?: string;
  traineeInfo?: string;
  date: string;
  // 절차 수행 평가
  stepEvaluations: StepEvaluation[];
  procedureComplianceScore: number; // 0-100
  // HPO 기법 적용도
  hpoEvaluations: HpoToolEvaluation[];
  hpoOverallScore: number;          // 0-100
  // 5대 기본수칙 역량
  fundamentalScores: FundamentalScore[];
  // 종합
  overallScore: number;              // 0-100
  grade: string;
  deviations: SopDeviation[];
  strengths: string[];
  improvements: string[];
  summary: string;
  // AI 파이프라인 분석 결과 (선택적)
  handObjectEvents?: HandObjectEvent[];
  sequenceAlignment?: SequenceAlignment;
  hpoResults?: HpoToolResult[];
  embeddingComparison?: EmbeddingComparison;
  analysisMetadata?: {
    analyzedAt: string;
    pipelineVersion: string;
    totalApiCalls: number;
    processingTimeMs: number;
  };
}

// =============================================
// 공통 UI 타입
// =============================================

export type ServiceTab = "simulator" | "leadership" | "pov";

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: "uploading" | "processing" | "indexing" | "complete" | "error";
  error?: string;
  taskId?: string; // TwelveLabs 인덱싱 태스크 ID
  videoId?: string; // 인덱싱 완료 후 영상 ID
}

// 멀티파트 업로드 — 서버 응답 타입
export interface MultipartUploadInit {
  taskId: string;
  parts: MultipartPart[];
}

export interface MultipartPart {
  partIndex: number;
  startByte: number;
  endByte: number;
  presignedUrl: string;
}

// 인덱싱 태스크 상태
export type IndexingStatus = "pending" | "indexing" | "ready" | "failed";

export interface TaskStatusResponse {
  taskId: string;
  status: IndexingStatus;
  videoId?: string;
  estimatedTime?: string;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
}

// =============================================
// POV 분석 파이프라인 타입
// =============================================

export interface DetectedStep {
  stepId: string;
  status: 'pass' | 'fail' | 'partial';
  confidence: number;
  timestamp: number;
  endTime: number;
  searchScore: number;
  thumbnailUrl?: string;
  qualityAnalysis?: string;    // Pegasus 품질 분석 텍스트
}

export interface HandObjectEvent {
  stepId: string;
  timestamp: number;
  endTime: number;
  heldObject: string;
  targetEquipment: string;
  actionType: string;
  stateBefore: string;
  stateAfter: string;
  matchesSOP: boolean;
  confidence: number;
  rawDescription: string;
  qualityScore?: number;       // 0-100, 조작 품질 점수
  qualityFeedback?: string;    // 코칭 코멘트 ("밸브를 끝까지 열지 않음" 등)
}

export interface AlignmentPair {
  sopIndex: number;
  detectedIndex: number | null;
  cost: number;
}

export interface SequenceAlignment {
  sopSequence: string[];
  detectedSequence: string[];
  alignmentPath: AlignmentPair[];
  deviations: PovSopDeviation[];
  complianceScore: number;
  criticalDeviations: number;
}

export interface PovSopDeviation {
  type: 'swap' | 'skip' | 'insert' | 'delay';
  stepIds: string[];
  timestamp?: number;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  rootCause?: {
    category: 'knowledgeGap' | 'attentionLapse' | 'procedureUnclear' | 'hpoMissing' | 'techniqueError' | 'unknown';
    evidence: string;
    remediation: string;
    relatedFundamental?: string;  // 관련 운전원 기본수칙 ID
    relatedHpoTool?: string;     // 관련 HPO 도구 ID
  };
}

export interface HpoToolResult {
  toolId: string;
  toolName: string;
  category: 'fundamental' | 'conditional';
  detected: boolean;
  detectionCount: number;
  timestamps: number[];
  confidence: number;
}

export interface SegmentSimilarity {
  expertStart: number;
  expertEnd: number;
  traineeStart: number;
  traineeEnd: number;
  similarity: number;
}

export interface EmbeddingComparison {
  segmentPairs: SegmentSimilarity[];
  averageSimilarity: number;
  gapSegments: SegmentSimilarity[];
  heatmapData: number[];
}

export interface GoldStandard {
  id: string;
  procedureId: string;
  videoId: string;
  registeredBy: string;
  registeredAt: string;
  segmentRange?: { start: number; end: number };
  averageScore: number;
  embeddings?: number[][];
}

export interface AnalysisJob {
  id: string;
  videoId: string;
  procedureId: string;
  goldStandardId?: string;
  status: 'indexing' | 'analyzing' | 'scoring' | 'complete' | 'error';
  progress: number;
  stages: {
    stepDetection: StageStatus;
    handObject: StageStatus;
    sequenceMatch: StageStatus;
    hpoVerification: StageStatus;
    embeddingComparison: StageStatus;
    scoring: StageStatus;
  };
  result?: PovEvaluationReport;
  error?: string;
}

export type StageStatus = 'pending' | 'running' | 'done' | 'error';

export interface StepQueryTemplate {
  stepId: string;
  sopText: string;
  actionQuery: string;
  objectQuery: string;
  stateQuery: string;
}
