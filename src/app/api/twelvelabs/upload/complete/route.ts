import { NextRequest, NextResponse } from "next/server";
import { completeMultipartUpload } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";

// POST /api/twelvelabs/upload/complete
// 모든 파트 업로드 완료 후 TwelveLabs에 통보 → 인덱싱 시작

const log = createLogger("API:upload/complete");

export async function POST(request: NextRequest) {
  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) {
    log.error("API 키 미설정");
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  try {
    const { taskId } = await request.json();

    if (!taskId || typeof taskId !== "string") {
      log.warn("taskId 누락");
      return NextResponse.json({ error: "taskId가 필요합니다" }, { status: 400 });
    }

    log.info("업로드 완료 통보 요청", { taskId });
    const result = await completeMultipartUpload(taskId);
    log.info("인덱싱 시작됨", { taskId, result });

    return NextResponse.json({ taskId, status: "indexing", ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 완료 처리 실패";
    log.error("업로드 완료 예외", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
