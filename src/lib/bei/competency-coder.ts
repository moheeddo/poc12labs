// 역량 코딩 모듈
// STAR 구조에서 행동/결과 텍스트를 키워드 매칭으로 분석하여 역량을 코딩한다.

import type { STARStructure, BEIEvent, BEIAnalysis } from "./types";

// 역량별 키워드 매핑 — 한국어 기준
// 각 역량은 "threshold" 기준 키워드(기본 수준)와 "differentiating" 기준 키워드(탁월 수준)로 구분
const COMPETENCY_KEYWORDS: Record<
  string,
  { threshold: string[]; differentiating: string[] }
> = {
  // 비전 제시 & 발표력
  visionPresentation: {
    threshold: [
      "발표", "설명", "보고", "공유", "전달", "제안", "방향", "목표",
      "presentation", "vision", "direction",
    ],
    differentiating: [
      "비전", "전략", "중장기", "로드맵", "설득", "동기부여", "영감",
      "혁신", "변화 주도", "미래", "청사진",
    ],
  },
  // 신뢰 구축
  trustBuilding: {
    threshold: [
      "소통", "대화", "협력", "신뢰", "관계", "경청", "공감",
      "약속", "일관성", "투명",
    ],
    differentiating: [
      "신뢰 구축", "관계 강화", "심리적 안전", "솔직", "정직",
      "취약성", "원칙", "이해관계자", "파트너십",
    ],
  },
  // 구성원 개발
  memberDevelopment: {
    threshold: [
      "교육", "코칭", "멘토링", "피드백", "육성", "개발", "성장",
      "훈련", "지도", "지원",
    ],
    differentiating: [
      "역량 강화", "잠재력", "커리어", "개인별 맞춤", "위임",
      "임파워먼트", "성과 향상", "후계자", "인재 개발",
    ],
  },
  // 합리적 의사결정
  rationalDecision: {
    threshold: [
      "결정", "판단", "선택", "분석", "검토", "평가", "기준",
      "데이터", "근거", "논리",
    ],
    differentiating: [
      "의사결정", "트레이드오프", "리스크", "우선순위", "최적화",
      "시나리오", "정량", "증거 기반", "전략적 판단", "비용편익",
    ],
  },
  // 성과 지향
  achievementDrive: {
    threshold: [
      "목표", "달성", "완수", "성과", "결과", "기여", "실행",
      "추진", "해결", "개선",
    ],
    differentiating: [
      "초과 달성", "돌파", "탁월", "최우수", "수상", "1위",
      "획기적", "기록", "벤치마크", "업계 최고",
    ],
  },
  // 협업 및 팀워크
  collaboration: {
    threshold: [
      "협업", "팀", "함께", "공동", "협조", "조율", "협의",
      "부서 간", "cross-functional", "파트너",
    ],
    differentiating: [
      "갈등 해결", "이해충돌", "합의 도출", "시너지", "통합",
      "다양성", "포용", "네트워크", "연대", "협력 생태계",
    ],
  },
  // 위기 대응 & 회복탄력성
  crisisResponse: {
    threshold: [
      "위기", "문제", "장애", "어려움", "도전", "긴급", "비상",
      "극복", "대응", "복구",
    ],
    differentiating: [
      "위기 관리", "불확실성", "모호성", "회복", "탄력", "기민",
      "선제적", "시스템 장애", "사고 대응", "재발 방지",
    ],
  },
  // 혁신 & 창의성
  innovationCreativity: {
    threshold: [
      "아이디어", "개선", "제안", "새로운", "변화", "도입",
      "시도", "실험", "테스트", "파일럿",
    ],
    differentiating: [
      "혁신", "창의", "파괴적", "0에서 1", "특허", "신사업",
      "디지털 전환", "DX", "R&D", "프로토타입", "출시",
    ],
  },
};

// 텍스트에서 키워드가 몇 개나 매칭되는지 카운트
function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

/**
 * STAR 구조의 행동(action) + 결과(result) 텍스트를 기반으로 역량을 코딩한다.
 * - 각 역량 키워드 매칭 점수로 confidence 계산
 * - threshold/differentiating 수준 자동 판별
 *
 * @param star - 파싱된 STAR 구조
 * @returns 코딩된 역량 배열 (confidence > 0인 것만 반환)
 */
export function codeCompetency(
  star: STARStructure
): BEIEvent["codedCompetencies"] {
  // 행동 + 결과 텍스트를 합쳐서 분석 (STAR에서 역량이 가장 잘 드러나는 부분)
  const analysisText = [star.action.text, star.result.text].join(" ");

  const coded: BEIEvent["codedCompetencies"] = [];

  for (const [competencyKey, keywordMap] of Object.entries(COMPETENCY_KEYWORDS)) {
    const thresholdMatches = countMatches(analysisText, keywordMap.threshold);
    const differentiatingMatches = countMatches(analysisText, keywordMap.differentiating);

    if (thresholdMatches === 0 && differentiatingMatches === 0) {
      continue; // 매칭 없으면 해당 역량 스킵
    }

    // confidence: differentiating 매칭에 가중치 2배 부여
    const totalKeywords = keywordMap.threshold.length + keywordMap.differentiating.length;
    const weightedMatches = thresholdMatches + differentiatingMatches * 2;
    const maxWeighted = totalKeywords * 2; // 모두 differentiating이면 최대
    const confidence = Math.min(weightedMatches / Math.max(maxWeighted * 0.2, 1), 1);

    // differentiating 매칭이 1개 이상이고 threshold도 있으면 differentiating으로 분류
    const level: "threshold" | "differentiating" =
      differentiatingMatches >= 1 && thresholdMatches >= 1
        ? "differentiating"
        : "threshold";

    coded.push({ competencyKey, confidence: Math.round(confidence * 100) / 100, level });
  }

  // confidence 내림차순 정렬
  return coded.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 여러 BEI 이벤트를 종합하여 BEIAnalysis 객체를 생성한다.
 * - 역량별 평균 신뢰도 분포
 * - differentiating 역량 집계
 * - 전체 평균 완성도
 */
export function buildBEIAnalysis(events: BEIEvent[]): BEIAnalysis {
  if (events.length === 0) {
    return {
      events: [],
      competencyDistribution: {},
      differentiatingCompetencies: [],
      totalEvents: 0,
      averageCompleteness: 0,
    };
  }

  // 역량별 신뢰도 합산
  const confidenceSums: Record<string, number> = {};
  const confidenceCounts: Record<string, number> = {};
  const differentiatingCounts: Record<string, number> = {};

  for (const event of events) {
    for (const coded of event.codedCompetencies) {
      const key = coded.competencyKey;
      confidenceSums[key] = (confidenceSums[key] ?? 0) + coded.confidence;
      confidenceCounts[key] = (confidenceCounts[key] ?? 0) + 1;
      if (coded.level === "differentiating") {
        differentiatingCounts[key] = (differentiatingCounts[key] ?? 0) + 1;
      }
    }
  }

  // 역량별 평균 신뢰도 계산
  const competencyDistribution: Record<string, number> = {};
  for (const key of Object.keys(confidenceSums)) {
    const sum = confidenceSums[key] ?? 0;
    const count = confidenceCounts[key] ?? 1;
    competencyDistribution[key] = Math.round((sum / count) * 100) / 100;
  }

  // differentiating 이벤트가 2개 이상인 역량 = 차별화 역량
  const differentiatingCompetencies = Object.entries(differentiatingCounts)
    .filter(([, count]) => count >= 2)
    .map(([key]) => key);

  // 전체 STAR 완성도 평균
  const averageCompleteness =
    Math.round(
      (events.reduce((sum, e) => sum + e.star.completeness, 0) / events.length) * 100
    ) / 100;

  return {
    events,
    competencyDistribution,
    differentiatingCompetencies,
    totalEvents: events.length,
    averageCompleteness,
  };
}
