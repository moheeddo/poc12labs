import { NextRequest, NextResponse } from "next/server";
import { getVideoTranscription } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";

// Vercel 서버리스 함수 타임아웃
export const maxDuration = 120;

const log = createLogger("API:transcription");

export async function GET(req: NextRequest) {
  try {
    const indexId = req.nextUrl.searchParams.get("indexId")?.trim() || "";
    const videoId = req.nextUrl.searchParams.get("videoId")?.trim() || "";

    if (!indexId || !videoId) {
      log.warn("필수 파라미터 누락", { indexId: !!indexId, videoId: !!videoId });
      return NextResponse.json({ error: "indexId와 videoId가 필요합니다" }, { status: 400 });
    }

    log.info("전사 조회 시작", { indexId, videoId });
    const result = await getVideoTranscription(indexId, videoId);
    log.info("전사 조회 완료", { videoId, segmentCount: result.transcription?.length || 0 });
    return NextResponse.json({
      videoId: result._id,
      duration: result.metadata?.duration,
      transcription: result.transcription || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "전사 조회 실패";
    log.error("전사 조회 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
