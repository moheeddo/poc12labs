import type { FairnessReport, GroupDistribution } from "./types";
import { mean, sampleStandardDeviation, cohenD } from "@/lib/statistics";
import { fourFifthsRule } from "@/lib/statistics";

interface ScoreEntry {
  participantId: string;
  overallScore: number;
  demographics: Record<string, string>;
}

export function analyzeFairness(
  scores: ScoreEntry[],
  groupVariables: string[] = ["gender", "ageGroup", "tenureGroup"]
): FairnessReport {
  const analyzedGroups: GroupDistribution[] = [];
  const alerts: string[] = [];
  let hasFailure = false, hasWarning = false;

  for (const variable of groupVariables) {
    // 변수별로 그룹 분류
    const grouped: Record<string, number[]> = {};
    for (const entry of scores) {
      const group = entry.demographics[variable];
      if (!group) continue;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(entry.overallScore);
    }

    const groups = Object.keys(grouped);
    // 비교 가능한 그룹이 2개 미만이면 건너뜀
    if (groups.length < 2) continue;

    // 그룹별 기술통계량 계산
    const distributions: GroupDistribution["scoreDistributions"] = {};
    const allScores = scores.map((s) => s.overallScore);
    for (const [group, vals] of Object.entries(grouped)) {
      distributions[group] = {
        n: vals.length,
        mean: mean(vals),
        sd: sampleStandardDeviation(vals),
        effectSize: cohenD(vals, allScores),
      };
    }

    // 합격률 계산 (5점 이상을 합격으로 간주)
    const passRates: Record<string, number> = {};
    for (const [group, vals] of Object.entries(grouped)) {
      passRates[group] = vals.filter((v) => v >= 5).length / vals.length;
    }

    // 4/5 규칙 적용 — 불리한 영향(Adverse Impact) 탐지
    const aiResult = fourFifthsRule(passRates);

    if (aiResult.impacted) {
      hasFailure = true;
      alerts.push(
        `${variable}: ${aiResult.focalGroup} 그룹에 불리한 영향 감지 (4/5 비율: ${aiResult.ratio.toFixed(2)})`
      );
    }

    // 효과 크기(Cohen's d) 경고 — d > 0.8 이면 큰 효과 크기
    for (const [group, dist] of Object.entries(distributions)) {
      if (dist.effectSize > 0.8) {
        hasWarning = true;
        alerts.push(
          `${variable}/${group}: 큰 효과 크기 (d=${dist.effectSize.toFixed(2)})`
        );
      }
    }

    analyzedGroups.push({
      variable,
      groups,
      scoreDistributions: distributions,
      adverseImpact: { fourFifthsRatio: aiResult.ratio, impacted: aiResult.impacted },
    });
  }

  return {
    analyzedGroups,
    overallFairness: hasFailure ? "fail" : hasWarning ? "warning" : "pass",
    alerts,
  };
}
