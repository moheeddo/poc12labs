import { NextRequest, NextResponse } from "next/server";
import { buildNormTable } from "@/lib/validation";
import type { NormDatasetItem } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dataset, groupBy } = body as { dataset: NormDatasetItem[]; groupBy: string };

    if (!Array.isArray(dataset) || dataset.length === 0) {
      return NextResponse.json(
        { error: "dataset 배열이 비어 있거나 잘못된 형식입니다." },
        { status: 400 }
      );
    }

    if (!groupBy || typeof groupBy !== "string") {
      return NextResponse.json(
        { error: "groupBy 필드가 필요합니다 (예: 'department', 'grade')." },
        { status: 400 }
      );
    }

    // 각 항목 유효성 검증
    for (const item of dataset) {
      if (!item.participantId || typeof item.competencyScores !== "object" || !item.group) {
        return NextResponse.json(
          { error: "각 dataset 항목에는 participantId, competencyScores, group이 필요합니다." },
          { status: 400 }
        );
      }
    }

    const normTable = buildNormTable(dataset, groupBy);
    return NextResponse.json(normTable);
  } catch (err) {
    console.error("[validation/norms] 오류:", err);
    return NextResponse.json(
      { error: "노름 테이블 구축 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
