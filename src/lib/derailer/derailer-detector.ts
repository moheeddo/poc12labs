// 탈선 요인 탐지 핵심 로직
// TwelveLabs AI 응답을 파싱하여 DerailerPattern / DerailerProfile 생성

import type { DerailerEvidence, DerailerPattern, DerailerProfile } from "./types";
import type { DerailerPatternDef } from "./derailer-patterns";

// ============================================================
// buildDerailerPrompt
// ============================================================

/**
 * 특정 탈선 패턴 탐지를 위한 TwelveLabs generate 프롬프트 생성
 *
 * 프롬프트 구조:
 * 1. 역할 설정 (원전 리더십 전문가)
 * 2. 패턴 정의 + Hogan HDS 맥락
 * 3. 관찰 지시 (3가지 검색 쿼리 기반)
 * 4. 출력 형식 명시 (점수: N, MM:SS 타임스탬프)
 */
export function buildDerailerPrompt(patternDef: DerailerPatternDef): string {
  const queriesList = patternDef.searchQueries
    .map((q, i) => `  ${i + 1}. ${q}`)
    .join("\n");

  return `당신은 원전 리더십 역량 진단 전문가입니다. Hogan HDS(Hogan Development Survey) ${patternDef.hoganScale} 척도 기반으로 이 영상에서 "${patternDef.name}" 탈선 패턴을 분석해주세요.

## 패턴 설명
${patternDef.description}

## 관찰 포인트
다음 행동들이 영상에 나타나는지 주의 깊게 확인하세요:
${queriesList}

## 분석 지침
- 언어적(verbal), 음성적(vocal), 표정(facial), 자세(postural) 신호를 모두 관찰하세요.
- 스트레스 상황과 정상 상황을 구분하여 행동 패턴을 파악하세요.
- 단발성 행동이 아닌 반복되는 패턴에 집중하세요.

## 출력 형식 (반드시 준수)
다음 형식으로 정확히 응답하세요:

점수: [0-10 사이의 정수]

증거:
[타임스탬프] [신호유형] [행동 설명]

예시:
점수: 7

증거:
02:15 verbal 팀원의 제안을 듣지 않고 일방적으로 결정을 내림
05:43 vocal 스트레스 상황에서 목소리가 높아지며 명령조로 발언
11:20 facial 반대 의견에 표정이 굳으며 부정적 반응을 보임

타임스탬프는 MM:SS 형식으로 기재하세요. 증거가 없으면 "증거 없음"으로 기재하세요.`;
}

// ============================================================
// parseDerailerResponse
// ============================================================

/**
 * MM:SS 형식 타임스탬프를 초(number)로 변환
 * 예: "02:15" → 135
 */
function parseTimestamp(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) {
    const [min, sec] = parts;
    return min * 60 + sec;
  }
  if (parts.length === 3) {
    const [hr, min, sec] = parts;
    return hr * 3600 + min * 60 + sec;
  }
  return 0;
}

/**
 * 신호 유형 문자열을 DerailerEvidence.signal 타입으로 변환
 */
function parseSignalType(raw: string): DerailerEvidence["signal"] {
  const normalized = raw.toLowerCase();
  if (normalized.includes("vocal") || normalized.includes("음성")) return "vocal";
  if (normalized.includes("facial") || normalized.includes("표정")) return "facial";
  if (normalized.includes("postural") || normalized.includes("자세")) return "postural";
  return "verbal";
}

/**
 * 0~10 점수를 위험 수준으로 변환
 * 0-3: low, 4-6: moderate, 7-8: high, 9-10: critical
 */
function scoreToRiskLevel(score: number): DerailerPattern["riskLevel"] {
  if (score <= 3) return "low";
  if (score <= 6) return "moderate";
  if (score <= 8) return "high";
  return "critical";
}

/**
 * TwelveLabs generate API 응답을 파싱하여 DerailerPattern 생성
 *
 * @param patternDef 탈선 패턴 정의
 * @param aiResponse AI가 반환한 텍스트 응답
 * @param scenarioType 분석 시나리오 유형 (정상/비상)
 * @returns 파싱된 DerailerPattern
 */
export function parseDerailerResponse(
  patternDef: DerailerPatternDef,
  aiResponse: string,
  scenarioType: "normal" | "emergency"
): DerailerPattern {
  // 1. 점수 추출: "점수: N" 패턴 매칭
  const scoreMatch = aiResponse.match(/점수[:\s]+(\d+)/);
  let rawScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

  // 점수 범위 클램핑 (0~10)
  rawScore = Math.max(0, Math.min(10, rawScore));

  // 2. 시나리오별 가중치 적용
  // 비상 상황은 탈선이 더 위험하므로 높은 가중치 적용
  const weight =
    scenarioType === "emergency"
      ? patternDef.emergencyWeight
      : patternDef.normalWeight;

  // 가중치 적용 후 정수 변환 (반올림)
  const weightedScore = Math.round(rawScore * weight);
  const finalScore = Math.max(0, Math.min(10, weightedScore));

  // 3. 타임스탬프 증거 추출
  // 형식: MM:SS [신호유형] [설명] 또는 HH:MM:SS [신호유형] [설명]
  const evidence: DerailerEvidence[] = [];

  // "증거 없음" 체크
  const noEvidencePattern = /증거\s*없음/;
  if (!noEvidencePattern.test(aiResponse)) {
    // MM:SS 또는 HH:MM:SS 패턴으로 시작하는 줄 파싱
    const timestampLineRegex =
      /(\d{1,2}:\d{2}(?::\d{2})?)\s+(verbal|vocal|facial|postural|언어적|음성적|음성|표정|자세)\s+(.+)/gi;

    let match;
    while ((match = timestampLineRegex.exec(aiResponse)) !== null) {
      const [, tsStr, signalRaw, description] = match;
      const startSec = parseTimestamp(tsStr);

      evidence.push({
        timestamp: {
          start: startSec,
          // 증거 구간은 기본 30초로 설정 (영상 길이를 알 수 없으므로)
          end: startSec + 30,
        },
        description: description.trim(),
        signal: parseSignalType(signalRaw),
      });
    }
  }

  return {
    id: patternDef.id,
    name: patternDef.name,
    hoganScale: patternDef.hoganScale,
    riskLevel: scoreToRiskLevel(finalScore),
    score: finalScore,
    evidence,
    developmentTip: patternDef.developmentTip,
  };
}

// ============================================================
// buildDerailerProfile
// ============================================================

/**
 * 11개 패턴 분석 결과를 종합하여 DerailerProfile 생성
 *
 * - patterns: 점수 내림차순 정렬
 * - topRisks: 상위 3개 고위험 패턴
 * - overallRiskLevel: 상위 3개 평균 점수로 산출
 *
 * @param participantId 분석 대상 참여자 ID
 * @param scenarioType 분석 시나리오 유형
 * @param patterns 11개 탈선 패턴 분석 결과
 * @returns 종합 DerailerProfile
 */
export function buildDerailerProfile(
  participantId: string,
  scenarioType: "normal" | "emergency",
  patterns: DerailerPattern[]
): DerailerProfile {
  // 점수 내림차순 정렬
  const sortedPatterns = [...patterns].sort((a, b) => b.score - a.score);

  // 상위 3개 고위험 패턴 선정
  const topRisks = sortedPatterns.slice(0, 3);

  // 전체 위험 수준 산출: 상위 3개 평균 점수 기반
  const top3Avg =
    topRisks.length > 0
      ? topRisks.reduce((sum, p) => sum + p.score, 0) / topRisks.length
      : 0;

  let overallRiskLevel: DerailerProfile["overallRiskLevel"];
  if (top3Avg <= 3) {
    overallRiskLevel = "low";
  } else if (top3Avg <= 6) {
    overallRiskLevel = "moderate";
  } else {
    overallRiskLevel = "high";
  }

  return {
    participantId,
    scenarioType,
    patterns: sortedPatterns,
    topRisks,
    overallRiskLevel,
  };
}
