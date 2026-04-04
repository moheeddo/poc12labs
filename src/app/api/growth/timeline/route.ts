// API 라우트: POST /api/growth/timeline
// 직원의 세션 데이터를 받아 성장 타임라인(추이 분석)을 반환한다

import { NextRequest, NextResponse } from "next/server";
import { buildGrowthTimeline } from "@/lib/growth";
import { createLogger } from "@/lib/logger";
import type { GrowthDataPoint } from "@/lib/growth";

const log = createLogger("API:growth:timeline");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const employeeId =
      typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const employeeName =
      typeof body.employeeName === "string" ? body.employeeName.trim() : "";
    const dataPoints: unknown = body.dataPoints;

    // 필수 파라미터 검증
    if (!employeeId || !employeeName) {
      log.warn("필수 파라미터 누락", {
        employeeId: !!employeeId,
        employeeName: !!employeeName,
      });
      return NextResponse.json(
        { error: "employeeId와 employeeName이 필요합니다" },
        { status: 400 }
      );
    }

    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      log.warn("dataPoints 누락 또는 빈 배열", { employeeId });
      return NextResponse.json(
        { error: "dataPoints 배열이 필요합니다 (최소 1개)" },
        { status: 400 }
      );
    }

    // dataPoints 구조 최소 검증
    for (const dp of dataPoints) {
      if (
        typeof dp !== "object" ||
        dp === null ||
        typeof dp.sessionId !== "string" ||
        typeof dp.date !== "string" ||
        typeof dp.competencyScores !== "object" ||
        typeof dp.overallScore !== "number"
      ) {
        log.warn("dataPoints 형식 오류", { employeeId });
        return NextResponse.json(
          {
            error:
              "dataPoints 각 항목은 sessionId, date, competencyScores, overallScore를 포함해야 합니다",
          },
          { status: 400 }
        );
      }
    }

    log.info("성장 타임라인 계산 시작", {
      employeeId,
      sessionCount: dataPoints.length,
    });

    const timeline = buildGrowthTimeline(
      employeeId,
      employeeName,
      dataPoints as GrowthDataPoint[]
    );

    log.info("성장 타임라인 계산 완료", {
      employeeId,
      trendCount: timeline.trends.length,
      plateauCount: timeline.plateauCompetencies.length,
      breakthroughCount: timeline.breakthroughCompetencies.length,
    });

    return NextResponse.json(timeline);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "타임라인 계산 실패";
    log.error("성장 타임라인 계산 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
