// 즉시 코칭 엔진 — 역량 점수 기반 강점/개발 영역 피드백 자동 생성
import type { CoachingFeedback } from "./types";

// 역량별 한국어 실행 방안 매핑 (ISO 10667 §8 개발 계획 권고 기반)
const ACTION_ITEMS_MAP: Record<string, string[]> = {
  communication: [
    "주 1회 팀 브리핑 진행 및 피드백 수렴",
    "비언어적 신호(시선, 자세) 인지 훈련 실시",
    "핵심 메시지 3문장 요약 연습(엘리베이터 피치)",
  ],
  logic: [
    "의사결정 근거 문서화 습관 형성",
    "STAR 기법으로 사례 발표 구조화 연습",
    "논리적 사고 워크숍(근거-주장-결론) 참여",
  ],
  listening: [
    "발언 전 상대방 의도 3초 재확인 습관화",
    "적극적 경청 기법(반영, 명료화, 요약) 연습",
    "팀 회의 중 발언 독점 비율 모니터링",
  ],
  leadership: [
    "월 1회 1:1 코칭 미팅 정례화",
    "팀원 강점 기반 역할 배분 실습",
    "위기 상황 대응 시나리오 시뮬레이션 참여",
  ],
  collaboration: [
    "타 부서 협업 프로젝트 자발적 참여",
    "갈등 조정 역할(퍼실리테이터) 경험 쌓기",
    "상호 피드백 문화 형성을 위한 팀 규칙 제안",
  ],
  situational_awareness: [
    "운전 절차서 정기 검토 및 암기 점검",
    "비정상 징후 조기 감지 훈련 시뮬레이터 참여",
    "시나리오 기반 상황 판단 토론 주 1회 실시",
  ],
  decision_making: [
    "의사결정 매트릭스 도구 활용 훈련",
    "불확실 상황 하 우선순위 설정 연습",
    "사후 의사결정 검토(Post-decision review) 기록",
  ],
  procedure_compliance: [
    "절차서 준수 체크리스트 자체 점검 일일 실시",
    "절차 이탈 사례 분석 후 개선안 제안",
    "신규 절차 변경사항 즉시 숙지 습관화",
  ],
  teamwork: [
    "팀 목표 공유 및 역할 분담 명확화",
    "동료 지원 활동(멘토링) 정기 참여",
    "팀 성과 회고 세션 월 1회 주도",
  ],
  emergency_response: [
    "비상 절차 시뮬레이션 분기별 1회 참여",
    "비상 상황 판단 기준 암기 및 자기 점검",
    "과거 비상 대응 사례 리뷰 후 교훈 공유",
  ],
};

// 역량 수준 레이블 (1–10 스케일)
function getLevelLabel(score: number): string {
  if (score >= 9) return "우수(Expert)";
  if (score >= 7) return "양호(Proficient)";
  if (score >= 5) return "보통(Developing)";
  if (score >= 3) return "미흡(Emerging)";
  return "초급(Novice)";
}

// 상위 N개 역량 추출 (내림차순 정렬)
function getTopN(
  scores: Record<string, number>,
  n: number,
): { key: string; score: number }[] {
  return Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// 하위 N개 역량 추출 (오름차순 정렬)
function getBottomN(
  scores: Record<string, number>,
  n: number,
): { key: string; score: number }[] {
  return Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n);
}

/**
 * 즉시 코칭 피드백 생성
 * @param participantId 참가자 ID
 * @param sessionId 세션 ID
 * @param scores 역량별 점수 맵 (1–10 스케일)
 * @param competencyLabels 역량 키 → 한국어 라벨 매핑
 * @param previousFeedback 이전 세션 피드백 (성장 추이 비교용, 선택)
 */
export function generateCoachingFeedback(
  participantId: string,
  sessionId: string,
  scores: Record<string, number>,
  competencyLabels: Record<string, string>,
  previousFeedback?: CoachingFeedback,
): CoachingFeedback {
  const generatedAt = new Date().toISOString();

  // 상위 2개 역량 → 강점
  const topTwo = getTopN(scores, 2);
  const strengths: CoachingFeedback["strengths"] = topTwo.map(
    ({ key, score }) => ({
      competencyKey: key,
      description: `${competencyLabels[key] ?? key} 역량에서 ${getLevelLabel(score)} 수준(${score}/10)을 보였습니다.`,
      evidence: `평균 이상의 일관된 수행을 통해 팀 내 핵심 기여자로 인정받을 수 있는 수준입니다.`,
    }),
  );

  // 하위 2개 역량 → 개발 영역
  const bottomTwo = getBottomN(scores, 2);
  const developmentAreas: CoachingFeedback["developmentAreas"] = bottomTwo.map(
    ({ key, score }) => ({
      competencyKey: key,
      currentLevel: getLevelLabel(score),
      targetLevel: getLevelLabel(Math.min(score + 2, 10)), // 현실적인 +2 수준 목표
      actionItems:
        ACTION_ITEMS_MAP[key] ?? [
          "관련 교육 프로그램 이수",
          "멘토 지정 후 정기 코칭 수렴",
          "자기 주도 학습 계획 수립",
        ],
    }),
  );

  // 이전 피드백과 비교 (성장 추이 분석)
  let comparedToPrevious: CoachingFeedback["comparedToPrevious"] | undefined;

  if (previousFeedback) {
    // 이전 강점/개발 영역 키 세트 구성
    const prevStrengthKeys = new Set(
      previousFeedback.strengths.map((s) => s.competencyKey),
    );
    const prevDevKeys = new Set(
      previousFeedback.developmentAreas.map((d) => d.competencyKey),
    );

    const currentStrengthKeys = new Set(strengths.map((s) => s.competencyKey));
    const currentDevKeys = new Set(
      developmentAreas.map((d) => d.competencyKey),
    );

    // 개선: 이전에 개발 영역이었다가 현재 강점이 된 역량
    const improved = Array.from(prevDevKeys).filter((k) =>
      currentStrengthKeys.has(k),
    );

    // 유지: 이전에도 강점, 현재도 강점인 역량
    const maintained = Array.from(prevStrengthKeys).filter((k) =>
      currentStrengthKeys.has(k),
    );

    // 주의 필요: 이전에 강점이었으나 현재 개발 영역이 된 역량
    const needsAttention = Array.from(prevStrengthKeys).filter((k) =>
      currentDevKeys.has(k),
    );

    comparedToPrevious = { improved, maintained, needsAttention };
  }

  return {
    participantId,
    sessionId,
    generatedAt,
    strengths,
    developmentAreas,
    ...(comparedToPrevious ? { comparedToPrevious } : {}),
  };
}
