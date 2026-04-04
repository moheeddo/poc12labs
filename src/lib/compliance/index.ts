// compliance 모듈 barrel exports
// ISO 10667 준수 — 삼각측정, 동의 관리, 즉시 코칭 엔진

export type {
  TriangulationConfig,
  TriangulatedScore,
  ConsentRecord,
  ConsentItem,
  CoachingFeedback,
} from "./types";

export { DEFAULT_TRIANGULATION_CONFIG } from "./types";

export { triangulate } from "./triangulation";

export {
  getConsentItems,
  createConsentRecord,
  checkAllRequiredConsents,
} from "./consent-manager";

export { generateCoachingFeedback } from "./coaching-engine";
