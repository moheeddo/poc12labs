import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/twelvelabs";

export async function POST(req: NextRequest) {
  try {
    const { videoId, type } = await req.json();
    if (!videoId || !type) {
      return NextResponse.json({ error: "videoId와 type이 필요합니다" }, { status: 400 });
    }
    const result = await analyzeVideo(videoId, type);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
