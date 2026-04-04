import { NextRequest, NextResponse } from "next/server";
import { analyzeReliability } from "@/lib/validation";
import type { ReliabilityDatasetItem } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dataset } = body as { dataset: ReliabilityDatasetItem[] };

    if (!Array.isArray(dataset) || dataset.length === 0) {
      return NextResponse.json(
        { error: "dataset 배열이 비어 있거나 잘못된 형식입니다." },
        { status: 400 }
      );
    }

    // 각 항목에 participantId와 competencyScores가 있는지 검증
    for (const item of dataset) {
      if (!item.participantId || typeof item.competencyScores !== "object") {
        return NextResponse.json(
          { error: "각 dataset 항목에는 participantId와 competencyScores가 필요합니다." },
          { status: 400 }
        );
      }
    }

    const report = analyzeReliability(dataset);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[validation/reliability] 오류:", err);
    return NextResponse.json(
      { error: "신뢰도 분석 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
