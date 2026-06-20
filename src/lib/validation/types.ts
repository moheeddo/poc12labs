export type SampleAdequacy = "insufficient" | "exploratory" | "adequate" | "robust";

export interface ItemAnalysisResult {
  competencyKey: string;
  itemTotalCorrelation: number;
  alphaIfDeleted: number;
}

export interface ReliabilityReport {
  cronbachAlpha: number;
  // computed=false: 짝지어진 인간 평가 < 3쌍으로 ICC 미산출(센티넬 0). UI는 이 경우 실측 0/저신뢰로 단정하지 말 것(fail-closed).
  icc: { type: "ICC(2,1)"; value: number; ci95: [number, number]; computed: boolean };
  itemAnalysis: ItemAnalysisResult[];
  sampleSize: number;
  adequacy: SampleAdequacy;
  recommendations: string[];
}

export interface NormGroupStats {
  groupName: string;
  n: number;
  percentiles: Record<string, { p10: number; p25: number; p50: number; p75: number; p90: number; mean: number; sd: number }>;
}

export interface NormTable {
  groupBy: string;
  groups: NormGroupStats[];
  lastUpdated: string;
}
