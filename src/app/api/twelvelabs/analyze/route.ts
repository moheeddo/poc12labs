import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";
import { requireApiKey, errorResponse, checkRateLimit, ApiError } from "@/lib/api-middleware";

// Vercel 서버리스 함수 타임아웃: TwelveLabs analyze SSE 스트리밍은 30~120초 소요
export const maxDuration = 300;

const log = createLogger("API:analyze");

// 허용되는 분석 타입
const ALLOWED_TYPES = new Set(["summary", "chapter", "highlight", "text"]);

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get("x-forwarded-for") || "unknown");
    requireApiKey();

    const body = await req.json();
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";

    if (!videoId || !type) {
      log.warn("필수 파라미터 누락", { videoId: !!videoId, type: !!type });
      throw new ApiError("MISSING_PARAMS", 400, "videoId와 type이 필요합니다");
    }
    if (!ALLOWED_TYPES.has(type)) {
      log.warn("허용되지 않는 분석 타입", { type });
      throw new ApiError("INVALID_TYPE", 400, `허용되지 않는 분석 타입: ${type}`);
    }

    log.info("분석 시작", { videoId, type });
    const result = await analyzeVideo(videoId, type as "summary" | "chapter" | "highlight" | "text");
    log.info("분석 완료", { videoId, type });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
