// growth 모듈 — barrel exports

export type {
  GrowthDataPoint,
  CompetencyTrend,
  GrowthTimeline,
  SimilarityReport,
} from "./types";

export { calculateTrend, buildGrowthTimeline } from "./growth-tracker";

export {
  cosineSimilarity,
  interpretSimilarity,
  compareEmbeddings,
} from "./embedding-compare";
