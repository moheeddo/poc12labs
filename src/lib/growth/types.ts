// 역량 성장 추이 추적 모듈 — 타입 정의

/** 단일 세션의 역량 평가 데이터 포인트 */
export interface GrowthDataPoint {
  sessionId: string;
  date: string; // ISO 8601 형식 (예: "2025-03-15")
  competencyScores: Record<string, number>; // 역량키 → 점수 (1-10)
  overallScore: number; // 전체 종합 점수
  videoId?: string; // TwelveLabs 비디오 ID (선택)
}

/** 단일 역량의 추이 분석 결과 */
export interface CompetencyTrend {
  competencyKey: string; // 역량 식별키 (예: "communication")
  direction: "improving" | "stable" | "declining"; // 추이 방향
  changeRate: number; // 세션당 평균 변화율 (양수: 향상, 음수: 하락)
  projectedScore: number; // 다음 세션 예측 점수 (선형 회귀 기반)
}

/** 직원별 성장 타임라인 전체 */
export interface GrowthTimeline {
  employeeId: string;
  employeeName: string;
  dataPoints: GrowthDataPoint[]; // 날짜 오름차순 정렬
  trends: CompetencyTrend[]; // 역량별 추이
  plateauCompetencies: string[]; // 정체 역량 (3회 이상 연속 변화 < 0.5)
  breakthroughCompetencies: string[]; // 돌파 역량 (마지막 변화 >= 1점)
}

/** 두 영상 임베딩 간 유사도 비교 보고서 */
export interface SimilarityReport {
  videoId1: string;
  videoId2: string;
  overallSimilarity: number; // 코사인 유사도 (0-1)
  interpretation: string; // 한국어 해석 문자열
}
