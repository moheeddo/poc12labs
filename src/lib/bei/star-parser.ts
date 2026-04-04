// STAR 구조 파싱 모듈
// BEI 인터뷰 텍스트에서 상황(S)/과제(T)/행동(A)/결과(R) 구조를 추출하고 품질을 평가한다.

import type { STARElement, STARStructure } from "./types";

// MM:SS 형식 타임스탬프를 초 단위로 변환
function mmssToSeconds(mmss: string): number {
  const parts = mmss.split(":").map(Number);
  if (parts.length === 2) {
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  }
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  }
  return 0;
}

// STAR 레이블 패턴 — 한국어/영어 모두 지원
const STAR_LABELS: Record<keyof Pick<STARStructure, "situation" | "task" | "action" | "result">, RegExp> = {
  situation: /\*{0,2}(상황|Situation|S)\s*[:：]\*{0,2}/i,
  task:      /\*{0,2}(과제|Task|T)\s*[:：]\*{0,2}/i,
  action:    /\*{0,2}(행동|Action|A)\s*[:：]\*{0,2}/i,
  result:    /\*{0,2}(결과|Result|R)\s*[:：]\*{0,2}/i,
};

// 텍스트에서 특정 섹션의 내용을 추출하고 타임스탬프(MM:SS)를 파싱한다.
function extractSection(
  text: string,
  labelPattern: RegExp,
  nextLabelPatterns: RegExp[],
  baseTimestamp: number
): STARElement {
  const labelMatch = labelPattern.exec(text);
  if (!labelMatch) {
    return {
      text: "",
      timestamp: { start: baseTimestamp, end: baseTimestamp },
    };
  }

  const sectionStart = labelMatch.index + labelMatch[0].length;

  // 다음 섹션 레이블 위치 중 가장 가까운 것을 찾아 섹션 종료 위치 결정
  let sectionEnd = text.length;
  for (const nextPattern of nextLabelPatterns) {
    const nextMatch = nextPattern.exec(text.slice(sectionStart));
    if (nextMatch) {
      sectionEnd = Math.min(sectionEnd, sectionStart + nextMatch.index);
    }
  }

  const rawContent = text.slice(sectionStart, sectionEnd).trim();

  // MM:SS 또는 HH:MM:SS 형식 타임스탬프 전체 추출
  const timestampPattern = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
  const timestamps: number[] = [];
  let tsMatch: RegExpExecArray | null;
  while ((tsMatch = timestampPattern.exec(rawContent)) !== null) {
    timestamps.push(mmssToSeconds(tsMatch[1]));
  }

  // 타임스탬프가 있으면 min/max로 구간 결정, 없으면 baseTimestamp 사용
  const startSec = timestamps.length > 0 ? Math.min(...timestamps) : baseTimestamp;
  const endSec = timestamps.length > 1 ? Math.max(...timestamps) : startSec + 30;

  // 텍스트에서 타임스탬프 표기 제거 후 순수 내용만 반환
  const cleanText = rawContent.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "").replace(/\s{2,}/g, " ").trim();

  return {
    text: cleanText,
    timestamp: { start: startSec, end: endSec },
  };
}

/**
 * TwelveLabs에 STAR 구조 추출을 요청하는 프롬프트를 생성한다.
 * @param transcript - 인터뷰 전사 텍스트
 */
export function buildSTARPrompt(transcript: string): string {
  return `다음은 리더십 역량 인터뷰(BEI: Behavioral Event Interview)의 전사 텍스트입니다.
아래 텍스트를 분석하여 STAR 구조(상황-과제-행동-결과)에 따라 핵심 행동 사건을 추출해주세요.

[전사 텍스트]
${transcript}

[출력 형식]
각 행동 사건에 대해 다음 형식으로 출력하세요.
타임스탬프는 MM:SS 형식으로 표기하세요.

상황: [구체적 상황 설명] (타임스탬프: 시작-종료)
과제: [당시 맡은 역할/과제] (타임스탬프: 시작-종료)
행동: [본인이 취한 구체적 행동] (타임스탬프: 시작-종료)
결과: [행동의 결과/영향] (타임스탬프: 시작-종료)

여러 행동 사건이 있는 경우 번호를 붙여 구분하세요.
각 섹션의 내용은 인터뷰어의 질문이나 추임새를 제외하고 응답자의 발언만 포함하세요.`;
}

/**
 * TwelveLabs AI 응답에서 STAR 구조를 파싱한다.
 * @param aiResponse - TwelveLabs generateWithPrompt 반환 텍스트
 * @param baseTimestamp - 해당 트랜스크립트 세그먼트의 시작 시간(초)
 */
export function parseSTARFromResponse(aiResponse: string, baseTimestamp: number = 0): STARStructure {
  const situation = extractSection(
    aiResponse,
    STAR_LABELS.situation,
    [STAR_LABELS.task, STAR_LABELS.action, STAR_LABELS.result],
    baseTimestamp
  );
  const task = extractSection(
    aiResponse,
    STAR_LABELS.task,
    [STAR_LABELS.action, STAR_LABELS.result],
    baseTimestamp
  );
  const action = extractSection(
    aiResponse,
    STAR_LABELS.action,
    [STAR_LABELS.result],
    baseTimestamp
  );
  const result = extractSection(
    aiResponse,
    STAR_LABELS.result,
    [],
    baseTimestamp
  );

  // 4개 요소 각각의 존재 여부로 기본 완성도 계산 (각 0.25)
  const presenceScore =
    (situation.text ? 0.25 : 0) +
    (task.text ? 0.25 : 0) +
    (action.text ? 0.25 : 0) +
    (result.text ? 0.25 : 0);

  // 내용 풍부도 보정 — 평균 단어 수 기준 (15단어 이상이면 만점)
  const avgWords =
    ([situation.text, task.text, action.text, result.text]
      .map((t) => t.split(/\s+/).filter(Boolean).length)
      .reduce((a, b) => a + b, 0)) /
    4;
  const richnessScore = Math.min(avgWords / 15, 1) * 0.0; // 현재는 presenceScore에 통합

  const completeness = Math.min(presenceScore + richnessScore, 1);

  return { situation, task, action, result, completeness };
}

/**
 * STAR 구조의 품질을 1~5점 척도로 평가한다.
 * - completeness: 4개 요소 완성도 반영
 * - action specificity: 행동 텍스트의 구체성 (동사 풍부도)
 * - result specificity: 결과 텍스트의 구체성 (수치/정량 표현 유무)
 */
export function scoreSTARQuality(star: STARStructure): number {
  // 1. 완성도 기반 기초 점수 (1~3점)
  const baseScore = 1 + star.completeness * 2;

  // 2. 행동 구체성 보정 (+0~1점): 구체적 동사 수 기준
  const actionWords = star.action.text.split(/\s+/).filter(Boolean).length;
  const actionBonus = actionWords >= 20 ? 1 : actionWords / 20;

  // 3. 결과 구체성 보정 (+0~1점): 수치/퍼센트/배수 표현 존재 여부
  const resultHasQuantitative = /\d+\s*(%|퍼센트|배|건|명|시간|일|주|개월|억|만원|점|위|등)/.test(
    star.result.text
  );
  const resultBonus = resultHasQuantitative ? 1 : star.result.text.split(/\s+/).filter(Boolean).length >= 15 ? 0.5 : 0;

  const rawScore = baseScore + actionBonus + resultBonus;
  // 1~5 클램핑 후 소수 첫째 자리 반올림
  return Math.round(Math.min(Math.max(rawScore, 1), 5) * 10) / 10;
}
