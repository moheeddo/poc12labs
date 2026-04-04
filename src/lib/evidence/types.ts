export interface EvidenceClip {
  rubricItemId: string;
  rubricItemText: string;
  videoTimestamp: { start: number; end: number };
  confidence: number;
  matchedText: string;
  searchQuery: string;
}
export interface EvidenceMap {
  competencyKey: string;
  score: number;
  clips: EvidenceClip[];
  coverageRate: number;
  overallConfidence: number;
}
