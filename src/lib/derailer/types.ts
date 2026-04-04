// Hogan HDS(Hogan Development Survey) 탈선 요인 탐지 모듈 타입 정의

/**
 * 탈선 행동 증거 단위
 * 영상에서 관찰된 특정 시간대의 탈선 신호
 */
export interface DerailerEvidence {
  /** 증거가 관찰된 영상 구간 (초 단위) */
  timestamp: {
    start: number;
    end: number;
  };
  /** 관찰된 행동/언어에 대한 설명 */
  description: string;
  /** 신호 유형: 언어적/음성적/표정/자세 */
  signal: "verbal" | "vocal" | "facial" | "postural";
}

/**
 * 개별 탈선 패턴 분석 결과
 * 11가지 Hogan HDS 척도 중 하나에 대한 평가
 */
export interface DerailerPattern {
  /** 탈선 패턴 식별자 (예: "bold", "cautious") */
  id: string;
  /** 한국어 패턴 명칭 */
  name: string;
  /** 대응하는 Hogan HDS 척도명 */
  hoganScale: string;
  /** 위험 수준: 0-3=low, 4-6=moderate, 7-8=high, 9-10=critical */
  riskLevel: "low" | "moderate" | "high" | "critical";
  /** 탈선 위험 점수 (0~10) */
  score: number;
  /** 해당 패턴을 뒷받침하는 영상 내 증거 목록 */
  evidence: DerailerEvidence[];
  /** 해당 탈선 패턴에 대한 개발 제언 */
  developmentTip: string;
}

/**
 * 참여자 전체 탈선 프로파일
 * 11개 패턴을 종합한 개인별 탈선 위험 분석 결과
 */
export interface DerailerProfile {
  /** 분석 대상 참여자 ID */
  participantId: string;
  /** 분석 시나리오 유형: 정상 운전 / 비상 상황 */
  scenarioType: "normal" | "emergency";
  /** 11개 탈선 패턴 분석 결과 (점수 내림차순 정렬) */
  patterns: DerailerPattern[];
  /** 상위 3개 고위험 탈선 패턴 */
  topRisks: DerailerPattern[];
  /** 전체 탈선 위험 수준 */
  overallRiskLevel: "low" | "moderate" | "high";
}
