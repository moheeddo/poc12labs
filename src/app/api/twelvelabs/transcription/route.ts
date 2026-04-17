import { NextRequest, NextResponse } from "next/server";
import { getVideoTranscription } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";
import { requireApiKey, errorResponse, checkRateLimit, ApiError } from "@/lib/api-middleware";

// Vercel 서버리스 함수 타임아웃
export const maxDuration = 120;

const log = createLogger("API:transcription");

export async function GET(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get("x-forwarded-for") || "unknown");
    requireApiKey();

    const indexId = req.nextUrl.searchParams.get("indexId")?.trim() || "";
    const videoId = req.nextUrl.searchParams.get("videoId")?.trim() || "";

    if (!indexId || !videoId) {
      log.warn("필수 파라미터 누락", { indexId: !!indexId, videoId: !!videoId });
      throw new ApiError("MISSING_PARAMS", 400, "indexId와 videoId가 필요합니다");
    }

    log.info("전사 조회 시작", { indexId, videoId });
    const result = await getVideoTranscription(indexId, videoId);
    // TwelveLabs API 응답 정규화: value → text 필드 통합
    const rawSegments = result.transcription || [];
    const normalized = rawSegments.map((seg: Record<string, unknown>) => ({
      start: seg.start,
      end: seg.end,
      text: (seg.text || seg.value || "") as string,
      speaker: seg.speaker,
      value: (seg.value || seg.text || "") as string, // 하위 호환
    }));
    log.info("전사 조회 완료", { videoId, segmentCount: normalized.length });
    return NextResponse.json({
      videoId: result._id,
      duration: result.metadata?.duration,
      transcription: normalized,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
