import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";

// GET /api/twelvelabs/upload/status?taskId=xxx
// 인덱싱 태스크 상태 조회 (폴링용)

const log = createLogger("API:upload/status");

export async function GET(request: NextRequest) {
  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) {
    log.error("API 키 미설정");
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    log.warn("taskId 쿼리 파라미터 누락");
    return NextResponse.json({ error: "taskId 쿼리 파라미터가 필요합니다" }, { status: 400 });
  }

  try {
    log.debug("태스크 상태 조회", { taskId });
    const result = await getTaskStatus(taskId);
    log.info("태스크 상태 반환", { taskId, status: result.status, videoId: result.videoId });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "상태 조회 실패";
    log.error("태스크 상태 조회 예외", { taskId, error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
