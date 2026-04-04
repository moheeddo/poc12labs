import { cronbachAlpha, icc21, itemTotalCorrelation, alphaIfDeleted } from "@/lib/statistics";
import type { SampleAdequacy, ItemAnalysisResult, ReliabilityReport } from "./types";

// 표본 크기에 따른 적절성 분류
export function classifySampleAdequacy(n: number): SampleAdequacy {
  if (n < 10) return "insufficient";
  if (n < 30) return "exploratory";
  if (n < 50) return "adequate";
  return "robust";
}

// 신뢰도 지표 기반 한국어 권고사항 생성
export function generateRecommendations(
  alpha: number,
  iccValue: number,
  sampleSize: number,
  adequacy: SampleAdequacy
): string[] {
  const recs: string[] = [];

  // Cronbach α 기반 권고
  if (alpha < 0.6) {
    recs.push("Cronbach α가 0.6 미만입니다. 내적 일관성이 매우 낮으므로 문항 재검토 또는 삭제를 권장합니다.");
  } else if (alpha < 0.7) {
    recs.push("Cronbach α가 0.6~0.7 수준입니다. 탐색적 연구에는 수용 가능하나, 실용적 적용 전 추가 문항 정제를 권장합니다.");
  } else if (alpha < 0.8) {
    recs.push("Cronbach α가 0.7~0.8 수준으로 양호합니다. 현재 신뢰도는 일반적인 연구 기준을 충족합니다.");
  } else if (alpha < 0.9) {
    recs.push("Cronbach α가 0.8 이상으로 우수합니다. 신뢰도 기준이 충족되었으며 실용적 평가에 적합합니다.");
  } else {
    recs.push("Cronbach α가 0.9 이상으로 매우 높습니다. 문항 중복 가능성을 점검하시기 바랍니다.");
  }

  // ICC 기반 권고
  if (iccValue < 0.4) {
    recs.push("ICC(2,1)이 0.4 미만입니다. AI 평가자와 인간 평가자 간 일치도가 낮으므로 평가 기준 재조정이 필요합니다.");
  } else if (iccValue < 0.6) {
    recs.push("ICC(2,1)이 0.4~0.6 수준입니다. 평가자 간 보통 수준의 일치도로, 추가 보정이 권장됩니다.");
  } else if (iccValue < 0.75) {
    recs.push("ICC(2,1)이 0.6~0.75 수준으로 양호합니다. AI 평가 결과를 보조 지표로 활용하기에 적절합니다.");
  } else {
    recs.push("ICC(2,1)이 0.75 이상으로 우수합니다. AI 평가자와 인간 평가자의 높은 일치도가 확인되었습니다.");
  }

  // 표본 적절성 기반 권고
  if (adequacy === "insufficient") {
    recs.push(`현재 표본 크기(n=${sampleSize})가 매우 부족합니다. 최소 10명 이상의 데이터를 수집 후 분석하시기 바랍니다.`);
  } else if (adequacy === "exploratory") {
    recs.push(`표본 크기(n=${sampleSize})가 탐색적 연구 수준입니다. 결과 일반화를 위해 n=50 이상 확보를 목표로 하십시오.`);
  } else if (adequacy === "adequate") {
    recs.push(`표본 크기(n=${sampleSize})가 적절합니다. 강건한 노름 테이블 구축을 위해 n=50 이상 유지를 권장합니다.`);
  } else {
    recs.push(`표본 크기(n=${sampleSize})가 강건합니다. 노름 구축 및 규준 참조 평가에 충분한 데이터가 확보되었습니다.`);
  }

  return recs;
}

// 데이터셋 입력 타입 정의
export interface ReliabilityDatasetItem {
  participantId: string;
  competencyScores: Record<string, number>;
  humanScores?: Record<string, number>;
}

// 신뢰도 분석 실행: Cronbach α, ICC(2,1), 문항 분석
export function analyzeReliability(dataset: ReliabilityDatasetItem[]): ReliabilityReport {
  const n = dataset.length;
  const adequacy = classifySampleAdequacy(n);

  // 역량 키 목록 추출 (첫 번째 참가자 기준)
  const competencyKeys = n > 0 ? Object.keys(dataset[0].competencyScores) : [];
  const k = competencyKeys.length;

  // N×K 문항 행렬 구성 (참가자 × 역량)
  const itemMatrix: number[][] = dataset.map((item) =>
    competencyKeys.map((key) => item.competencyScores[key] ?? 0)
  );

  // Cronbach α 계산 (행: 참가자, 열: 역량 → 전치 필요 없음, 함수가 행=참가자 기대)
  const alpha = k >= 2 && n >= 2 ? cronbachAlpha(itemMatrix) : 0;

  // ICC(2,1) 계산: AI 점수 합계 vs 인간 점수 합계 비교
  const aiTotals = dataset.map((item) =>
    competencyKeys.reduce((sum, key) => sum + (item.competencyScores[key] ?? 0), 0)
  );
  const humanTotals = dataset
    .map((item) =>
      item.humanScores
        ? competencyKeys.reduce((sum, key) => sum + (item.humanScores![key] ?? 0), 0)
        : null
    )
    .filter((v): v is number => v !== null);

  // humanScores가 존재하는 참가자만 추려 ICC 계산
  const iccPairs: { ai: number; human: number }[] = dataset
    .filter((item) => item.humanScores !== undefined)
    .map((item) => ({
      ai: competencyKeys.reduce((sum, key) => sum + (item.competencyScores[key] ?? 0), 0),
      human: competencyKeys.reduce((sum, key) => sum + (item.humanScores![key] ?? 0), 0),
    }));

  const iccResult =
    iccPairs.length >= 3
      ? icc21(
          iccPairs.map((p) => p.ai),
          iccPairs.map((p) => p.human)
        )
      : { value: 0, ci95: [0, 0] as [number, number] };

  // 문항별(역량별) 분석: 문항-전체 상관, 해당 문항 삭제 시 α
  const itemAnalysis: ItemAnalysisResult[] = competencyKeys.map((key, index) => ({
    competencyKey: key,
    itemTotalCorrelation: k >= 2 && n >= 3 ? itemTotalCorrelation(itemMatrix, index) : 0,
    alphaIfDeleted: k >= 3 && n >= 2 ? alphaIfDeleted(itemMatrix, index) : 0,
  }));

  const recommendations = generateRecommendations(alpha, iccResult.value, n, adequacy);

  // aiTotals는 사용하지 않으면 lint 경고 발생하므로 조건부 참조
  void aiTotals;
  void humanTotals;

  return {
    cronbachAlpha: alpha,
    icc: { type: "ICC(2,1)", value: iccResult.value, ci95: iccResult.ci95 },
    itemAnalysis,
    sampleSize: n,
    adequacy,
    recommendations,
  };
}
