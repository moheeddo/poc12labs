// =============================================
// 리더십 역량진단 — AI 분석 엔진
// 챕터/하이라이트 내용 기반 역량 매칭 + 자동 스코어링 + 피드백 생성
// =============================================

import type { Chapter, Highlight, LeadershipCompetencyKey } from "./types";
import { LEADERSHIP_COMPETENCY_DEFS } from "./constants";

// ─── 역량별 키워드 사전 (원전 맥락 내재화) ───

const COMPETENCY_KEYWORDS: Record<LeadershipCompetencyKey, string[]> = {
  visionPresentation: [
    "비전", "전략", "목표", "방향", "계획", "미래", "발표", "제시",
    "PEST", "환경분석", "기회", "위협", "혁신", "도전", "성장",
    "신사업", "신재생", "포트폴리오", "전략목표", "전략과제",
    "동기부여", "실행", "추진", "안전비전", "경영전략",
    "중장기", "로드맵", "청사진", "핵심가치",
  ],
  visionPractice: [
    "실행", "실천", "주도적", "책임감", "수행", "이행",
    "목표달성", "성과", "협력", "피드백", "경청",
  ],
  trustBuilding: [
    "신뢰", "공정", "투명", "소통", "존중", "협력", "갈등",
    "조율", "합의", "타협", "중재", "균형", "설득", "협의",
    "토론", "토의", "의견", "수렴", "참여", "개방",
    "솔선수범", "책임", "일관", "기준", "권한위임",
    "반박", "동의", "경청", "수용", "배려",
  ],
  communication: [
    "의사소통", "전달", "설명", "표현", "커뮤니케이션",
    "경청", "질문", "답변", "보고", "공유",
  ],
  memberDevelopment: [
    "육성", "코칭", "멘토링", "피드백", "성장", "개발",
    "면담", "상담", "지도", "교육", "훈련", "학습",
    "목표설정", "동기부여", "격려", "잠재력", "강점",
    "개선", "역량개발", "경력", "OJT", "지원",
    "회의문화", "개선계획", "실행계획",
  ],
  selfDevelopment: [
    "자기개발", "학습", "성장", "역량강화", "전문성",
    "트렌드", "기술", "습득", "발전",
  ],
  rationalDecision: [
    "의사결정", "판단", "분석", "대안", "우선순위",
    "리스크", "위험", "긴급", "중요", "선택",
    "근거", "데이터", "논리", "타당성", "기준",
    "점검", "조정", "실행계획", "체계", "프로세스",
    "예산", "자원배분", "효율", "효과",
  ],
  problemSolving: [
    "문제해결", "원인분석", "개선", "해결방안", "창의",
    "아이디어", "대응", "조치", "시정",
  ],
};

// ─── 역량 매칭 점수 계산 ───

interface CompetencyMatch {
  key: LeadershipCompetencyKey;
  score: number;        // 매칭 점수 (0-100)
  matchedKeywords: string[];
}

/**
 * 텍스트에서 역량별 키워드 매칭 점수를 계산
 */
function scoreCompetencyMatch(
  text: string,
  competencyKey: LeadershipCompetencyKey
): CompetencyMatch {
  const keywords = COMPETENCY_KEYWORDS[competencyKey] || [];
  const lowerText = text.toLowerCase();
  const matched = keywords.filter((kw) => lowerText.includes(kw.toLowerCase()));
  const score = keywords.length > 0 ? (matched.length / Math.min(keywords.length, 8)) * 100 : 0;

  return {
    key: competencyKey,
    score: Math.min(100, score),
    matchedKeywords: matched,
  };
}

/**
 * 챕터 내용(제목 + 하이라이트)에 가장 적합한 역량을 매칭
 * targetKeys: 현재 직급에서 평가할 역량 목록
 */
export function matchChapterToCompetency(
  chapter: Chapter,
  chapterHighlights: Highlight[],
  targetKeys: LeadershipCompetencyKey[],
  usedKeys: Set<LeadershipCompetencyKey> = new Set()
): { key: LeadershipCompetencyKey; matchedKeywords: string[]; confidence: number } {
  // 분석 텍스트 조합
  const combinedText = [
    chapter.title,
    ...chapterHighlights.map((h) => h.text),
  ].join(" ");

  // 각 역량에 대한 매칭 점수 계산
  const scores = targetKeys.map((key) => scoreCompetencyMatch(combinedText, key));

  // 이미 사용된 역량은 점수 30% 감산 (다양성 확보, 완전 제외하지는 않음)
  scores.forEach((s) => {
    if (usedKeys.has(s.key)) {
      s.score *= 0.7;
    }
  });

  // 최고 점수 역량 선택
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  return {
    key: best.key,
    matchedKeywords: best.matchedKeywords,
    confidence: Math.min(100, best.score),
  };
}

// ─── AI 자동 점수 제안 ───

interface AIScoreResult {
  score: number;           // 1-9 (AI 추천)
  confidence: number;      // 0-100 (추천 신뢰도)
  reasoning: string;       // 점수 산출 근거
}

/**
 * 챕터/하이라이트 품질 기반 AI 점수 제안
 *
 * 점수 산출 로직:
 * - 기본점수 5점 (보통)
 * - 하이라이트 개수에 따라 +0~2점
 * - 키워드 매칭 밀도에 따라 +0~1점
 * - 챕터 길이(발표 충실도)에 따라 +0~1점
 */
export function generateAIScore(
  chapter: Chapter,
  chapterHighlights: Highlight[],
  matchedKeywords: string[],
  summary: string
): AIScoreResult {
  let score = 5; // 기본: 보통
  const reasons: string[] = [];

  // 1. 하이라이트 풍부도 (+0~2)
  const hlCount = chapterHighlights.length;
  if (hlCount >= 3) {
    score += 2;
    reasons.push(`핵심 장면 ${hlCount}개 검출 — 풍부한 활동 관찰`);
  } else if (hlCount >= 1) {
    score += 1;
    reasons.push(`핵심 장면 ${hlCount}개 검출`);
  } else {
    reasons.push("핵심 장면 미검출 — 추가 관찰 필요");
  }

  // 2. 키워드 매칭 밀도 (+0~1)
  if (matchedKeywords.length >= 4) {
    score += 1;
    reasons.push(`역량 관련 키워드 다수 매칭 (${matchedKeywords.slice(0, 3).join(", ")} 등)`);
  } else if (matchedKeywords.length >= 2) {
    score += 0.5;
    reasons.push(`역량 관련 키워드 일부 매칭 (${matchedKeywords.join(", ")})`);
  }

  // 3. 챕터 길이 — 발표 충실도 (+0~1)
  const duration = chapter.end - chapter.start;
  if (duration >= 120) {
    score += 1;
    reasons.push(`충분한 관찰 구간 (${Math.floor(duration / 60)}분 ${Math.floor(duration % 60)}초)`);
  } else if (duration >= 60) {
    score += 0.5;
    reasons.push(`적정 관찰 구간 (${Math.floor(duration)}초)`);
  } else {
    reasons.push("짧은 구간 — 평가 정밀도 제한적");
  }

  // 4. 요약에서 긍정/부정 시그널
  if (summary) {
    const positiveSignals = ["우수", "탁월", "효과적", "명확", "적극", "주도", "논리적"];
    const negativeSignals = ["미흡", "부족", "불분명", "소극", "반복", "일방적"];
    const posCount = positiveSignals.filter((s) => summary.includes(s)).length;
    const negCount = negativeSignals.filter((s) => summary.includes(s)).length;

    if (posCount > negCount) {
      score += 0.5;
      reasons.push("AI 요약에서 긍정적 평가 시그널 감지");
    } else if (negCount > posCount) {
      score -= 0.5;
      reasons.push("AI 요약에서 개선 필요 시그널 감지");
    }
  }

  // 최종 점수 범위 제한
  score = Math.round(Math.max(1, Math.min(9, score)));

  // 신뢰도: 하이라이트 + 키워드 기반
  const confidence = Math.min(100, Math.round(
    (hlCount >= 1 ? 30 : 0) +
    (matchedKeywords.length >= 2 ? 25 : matchedKeywords.length * 10) +
    (duration >= 60 ? 20 : 10) +
    (summary ? 15 : 0) +
    10 // 기본
  ));

  return {
    score,
    confidence,
    reasoning: reasons.join(". ") + ".",
  };
}

// ─── 자동 피드백 생성 ───

/**
 * 역량 + 점수 + 챕터 내용을 기반으로 평가 피드백을 자동 생성
 */
export function generateAutoFeedback(
  competencyKey: LeadershipCompetencyKey,
  score: number,
  chapter: Chapter,
  matchedKeywords: string[],
  highlights: Highlight[]
): string {
  const comp = LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === competencyKey);
  if (!comp) return "";

  const label = comp.label;
  const hlTexts = highlights.map((h) => h.text).filter(Boolean);

  // 점수 구간별 템플릿
  if (score >= 8) {
    return `[${label}] 탁월한 수준입니다. ${
      hlTexts.length > 0
        ? `"${hlTexts[0]}" 등 핵심 장면에서 ${label} 역량이 명확히 관찰됩니다.`
        : `해당 구간에서 ${label} 관련 행동이 적극적으로 발휘되었습니다.`
    }${matchedKeywords.length > 0 ? ` 특히 ${matchedKeywords.slice(0, 2).join(", ")} 측면이 두드러집니다.` : ""}`;
  }

  if (score >= 6) {
    return `[${label}] 양호한 수준이나 일부 보완이 필요합니다. ${
      hlTexts.length > 0
        ? `"${hlTexts[0]}" 장면에서 기본적인 ${label} 역량이 확인됩니다.`
        : `${label} 관련 행동이 관찰되나, 보다 적극적인 발휘가 기대됩니다.`
    } 루브릭 상위 수준의 행동 기준을 참고하여 향상 포인트를 확인하세요.`;
  }

  if (score >= 4) {
    return `[${label}] 보통 수준입니다. ${label} 역량의 발휘가 제한적으로 관찰됩니다. ${
      comp.rubric && comp.rubric.length > 0
        ? `"${comp.rubric[0].criteria}" 기준의 상위 레벨 행동을 참고하여 개선점을 도출하세요.`
        : "구체적인 행동 변화 계획을 수립하는 것이 권장됩니다."
    }`;
  }

  return `[${label}] 개선이 필요한 수준입니다. 해당 구간에서 ${label} 관련 행동이 충분히 관찰되지 않았습니다. ${
    comp.rubric && comp.rubric.length > 0
      ? `루브릭의 "${comp.rubric[0].criteria}" 항목을 참고하여 구체적인 행동 개선 계획을 수립하세요.`
      : "역량 정의와 행동지표를 참고하여 실천 계획을 세워보세요."
  }`;
}

// ─── 종합 분석 결과 생성 ───

export interface CompetencySummary {
  key: LeadershipCompetencyKey;
  label: string;
  color: string;
  avgScore: number;
  evidenceCount: number;
  topHighlight: string;
  strengths: string[];
  improvements: string[];
}

export interface AnalysisReportData {
  overallScore: number;
  competencies: CompetencySummary[];
  totalEvidenceCount: number;
  scoredCount: number;
  aiSummary: string;
  topStrengths: string[];
  topImprovements: string[];
}

interface EvidenceForReport {
  competencyKey: LeadershipCompetencyKey;
  score: number;
  feedback: string;
  description: string;
  aiScore?: number;
}

/**
 * evidence 목록에서 종합 분석 리포트 데이터 생성
 */
export function generateAnalysisReport(
  evidenceList: EvidenceForReport[],
  summary: string,
  targetKeys: LeadershipCompetencyKey[]
): AnalysisReportData {
  const competencies: CompetencySummary[] = targetKeys.map((key) => {
    const comp = LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === key);
    const items = evidenceList.filter((e) => e.competencyKey === key);
    const scored = items.filter((e) => e.score > 0 || e.aiScore);

    // 평균 점수: 사용자 입력 > AI 추천
    const scores = items.map((e) => e.score > 0 ? e.score : (e.aiScore || 0)).filter((s) => s > 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // 대표 하이라이트
    const topHl = items.find((e) => e.description.length > 10)?.description || "";

    // 강점/개선점 추출
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (avg >= 7) {
      strengths.push(`${comp?.label} 역량이 우수한 수준으로 발휘됨`);
    } else if (avg >= 5) {
      improvements.push(`${comp?.label} 역량의 상위 수준 행동 강화 필요`);
    } else if (avg > 0) {
      improvements.push(`${comp?.label} 역량 개선을 위한 구체적 행동 계획 수립 권장`);
    }

    return {
      key,
      label: comp?.label || key,
      color: comp?.color || "#94a3b8",
      avgScore: Math.round(avg * 10) / 10,
      evidenceCount: items.length,
      topHighlight: topHl.length > 60 ? topHl.slice(0, 60) + "..." : topHl,
      strengths,
      improvements,
    };
  });

  const scoredItems = evidenceList.filter((e) => e.score > 0 || e.aiScore);
  const allScores = scoredItems.map((e) => e.score > 0 ? e.score : (e.aiScore || 0));
  const overallScore = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
    : 0;

  return {
    overallScore,
    competencies,
    totalEvidenceCount: evidenceList.length,
    scoredCount: evidenceList.filter((e) => e.score > 0).length,
    aiSummary: summary,
    topStrengths: competencies.flatMap((c) => c.strengths),
    topImprovements: competencies.flatMap((c) => c.improvements),
  };
}
