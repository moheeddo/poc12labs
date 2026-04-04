export type SampleAdequacy = "insufficient" | "exploratory" | "adequate" | "robust";

export interface ItemAnalysisResult {
  competencyKey: string;
  itemTotalCorrelation: number;
  alphaIfDeleted: number;
}

export interface ReliabilityReport {
  cronbachAlpha: number;
  icc: { type: "ICC(2,1)"; value: number; ci95: [number, number] };
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
