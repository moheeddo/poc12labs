import { NextRequest, NextResponse } from "next/server";
import { getVideoTranscription } from "@/lib/twelvelabs";

export async function GET(req: NextRequest) {
  try {
    const indexId = req.nextUrl.searchParams.get("indexId")?.trim() || "";
    const videoId = req.nextUrl.searchParams.get("videoId")?.trim() || "";

    if (!indexId || !videoId) {
      return NextResponse.json({ error: "indexId와 videoId가 필요합니다" }, { status: 400 });
    }

    const result = await getVideoTranscription(indexId, videoId);
    return NextResponse.json({
      videoId: result._id,
      duration: result.metadata?.duration,
      transcription: result.transcription || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "전사 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
