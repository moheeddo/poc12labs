import { NextRequest, NextResponse } from "next/server";
import { createEmbeddingTask, getEmbeddings } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:embed");

// 임베딩 태스크 생성
export async function POST(req: NextRequest) {
  try {
    const { videoId } = await req.json();
    if (!videoId) {
      log.warn("videoId 누락");
      return NextResponse.json({ error: "videoId가 필요합니다" }, { status: 400 });
    }
    log.info("임베딩 태스크 생성", { videoId });
    const result = await createEmbeddingTask(videoId);
    log.info("임베딩 태스크 생성 완료", { videoId });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "임베딩 생성 실패";
    log.error("임베딩 생성 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 임베딩 결과 조회
export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");
    if (!taskId) {
      log.warn("taskId 누락");
      return NextResponse.json({ error: "taskId가 필요합니다" }, { status: 400 });
    }
    log.info("임베딩 조회", { taskId });
    const result = await getEmbeddings(taskId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "임베딩 조회 실패";
    log.error("임베딩 조회 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
