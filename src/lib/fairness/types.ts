export interface GroupDistribution {
  variable: string;
  groups: string[];
  scoreDistributions: Record<string, { n: number; mean: number; sd: number; effectSize: number }>;
  adverseImpact: { fourFifthsRatio: number; impacted: boolean };
}

export interface FairnessReport {
  analyzedGroups: GroupDistribution[];
  overallFairness: "pass" | "warning" | "fail";
  alerts: string[];
}
