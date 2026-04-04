// POST /api/fairness/analyze
// 참여자 점수 데이터를 받아 편향/공정성 분석 보고서를 반환한다

import { NextRequest, NextResponse } from "next/server";
import { analyzeFairness } from "@/lib/fairness";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:fairness:analyze");

/**
 * 요청 바디 타입
 */
interface AnalyzeRequest {
  /** 참여자별 점수 목록 */
  scores: Array<{
    participantId: string;
    overallScore: number;
    demographics: Record<string, string>;
  }>;
  /** 분석할 그룹 변수 목록 (기본값: gender, ageGroup, tenureGroup) */
  groupVariables?: string[];
}

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;

  // 요청 바디 파싱
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "요청 바디를 파싱할 수 없습니다." },
      { status: 400 }
    );
  }

  const { scores, groupVariables } = body;

  // 필수 파라미터 검증
  if (!Array.isArray(scores) || scores.length === 0) {
    log.warn("scores 파라미터 누락 또는 빈 배열");
    return NextResponse.json(
      { error: "scores는 비어있지 않은 배열이어야 합니다." },
      { status: 400 }
    );
  }

  // scores 배열 내 각 항목 구조 검증 (첫 번째 항목 샘플 검사)
  const firstEntry = scores[0];
  if (
    typeof firstEntry.participantId !== "string" ||
    typeof firstEntry.overallScore !== "number" ||
    typeof firstEntry.demographics !== "object" ||
    firstEntry.demographics === null
  ) {
    log.warn("scores 항목 구조 오류", { firstEntry });
    return NextResponse.json(
      {
        error:
          "scores 각 항목은 participantId(string), overallScore(number), demographics(object)를 포함해야 합니다.",
      },
      { status: 400 }
    );
  }

  // groupVariables 검증 (제공된 경우)
  if (groupVariables !== undefined) {
    if (
      !Array.isArray(groupVariables) ||
      groupVariables.some((v) => typeof v !== "string")
    ) {
      log.warn("groupVariables 형식 오류", { groupVariables });
      return NextResponse.json(
        { error: "groupVariables는 문자열 배열이어야 합니다." },
        { status: 400 }
      );
    }
  }

  log.info("편향/공정성 분석 시작", {
    participantCount: scores.length,
    groupVariables: groupVariables ?? ["gender", "ageGroup", "tenureGroup"],
  });

  // 공정성 분석 실행
  try {
    const report = analyzeFairness(scores, groupVariables);

    log.info("편향/공정성 분석 완료", {
      overallFairness: report.overallFairness,
      analyzedGroupCount: report.analyzedGroups.length,
      alertCount: report.alerts.length,
    });

    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "공정성 분석 중 오류가 발생했습니다.";
    log.error("편향/공정성 분석 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
