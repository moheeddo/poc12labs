// POST /api/compliance/triangulate
// AI 점수 + 인간 평가자 점수를 삼각측정하여 최종 점수 반환
import { NextResponse } from "next/server";
import { triangulate } from "@/lib/compliance";
import type { TriangulationConfig } from "@/lib/compliance";
import { DEFAULT_TRIANGULATION_CONFIG } from "@/lib/compliance";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { aiScores, humanScores, config } = body as {
      aiScores: Record<string, number>;
      humanScores: Record<string, number>;
      config?: Partial<TriangulationConfig>;
    };

    // 입력값 검증
    if (!aiScores || typeof aiScores !== "object") {
      return NextResponse.json(
        { error: "aiScores 객체가 필요합니다." },
        { status: 400 },
      );
    }
    if (!humanScores || typeof humanScores !== "object") {
      return NextResponse.json(
        { error: "humanScores 객체가 필요합니다." },
        { status: 400 },
      );
    }

    // 점수 범위 검증 (1–10 스케일)
    for (const [key, score] of Object.entries(aiScores)) {
      if (typeof score !== "number" || score < 0 || score > 10) {
        return NextResponse.json(
          { error: `aiScores.${key} 값이 유효하지 않습니다. 0–10 범위여야 합니다.` },
          { status: 400 },
        );
      }
    }
    for (const [key, score] of Object.entries(humanScores)) {
      if (typeof score !== "number" || score < 0 || score > 10) {
        return NextResponse.json(
          { error: `humanScores.${key} 값이 유효하지 않습니다. 0–10 범위여야 합니다.` },
          { status: 400 },
        );
      }
    }

    // config가 없으면 기본값 사용, 있으면 기본값과 병합
    const resolvedConfig: TriangulationConfig = {
      ...DEFAULT_TRIANGULATION_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_TRIANGULATION_CONFIG.weights,
        ...(config?.weights ?? {}),
      },
    };

    // 가중치 합계 검증
    const weightSum = resolvedConfig.weights.ai + resolvedConfig.weights.human;
    if (Math.abs(weightSum - 1.0) > 0.001) {
      return NextResponse.json(
        { error: `가중치 합계가 1.0이어야 합니다. 현재: ${weightSum}` },
        { status: 400 },
      );
    }

    const results = triangulate(aiScores, humanScores, resolvedConfig);

    return NextResponse.json({
      results,
      config: resolvedConfig,
      summary: {
        total: results.length,
        agree: results.filter((r) => r.agreement === "agree").length,
        minor_diff: results.filter((r) => r.agreement === "minor_diff").length,
        major_diff: results.filter((r) => r.agreement === "major_diff").length,
      },
    });
  } catch (error) {
    console.error("[compliance/triangulate] 오류:", error);
    return NextResponse.json(
      { error: "삼각측정 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
