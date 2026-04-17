import { NextRequest, NextResponse } from "next/server";
import { createEmbeddingTask, getEmbeddings } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";
import { requireApiKey, errorResponse, checkRateLimit, ApiError } from "@/lib/api-middleware";

const log = createLogger("API:embed");

// 임베딩 태스크 생성
export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get("x-forwarded-for") || "unknown");
    requireApiKey();

    const { videoId } = await req.json();
    if (!videoId) {
      log.warn("videoId 누락");
      throw new ApiError("MISSING_PARAMS", 400, "videoId가 필요합니다");
    }
    log.info("임베딩 태스크 생성", { videoId });
    const result = await createEmbeddingTask(videoId);
    log.info("임베딩 태스크 생성 완료", { videoId });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

// 임베딩 결과 조회
export async function GET(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get("x-forwarded-for") || "unknown");
    requireApiKey();

    const taskId = req.nextUrl.searchParams.get("taskId");
    if (!taskId) {
      log.warn("taskId 누락");
      throw new ApiError("MISSING_PARAMS", 400, "taskId가 필요합니다");
    }
    log.info("임베딩 조회", { taskId });
    const result = await getEmbeddings(taskId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
