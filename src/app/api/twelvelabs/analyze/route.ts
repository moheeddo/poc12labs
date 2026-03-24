import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/twelvelabs";

// 허용되는 분석 타입
const ALLOWED_TYPES = new Set(["summary", "chapter", "highlight", "text"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";

    if (!videoId || !type) {
      return NextResponse.json({ error: "videoId와 type이 필요합니다" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: `허용되지 않는 분석 타입: ${type}` }, { status: 400 });
    }

    const result = await analyzeVideo(videoId, type as "summary" | "chapter" | "highlight" | "text");
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
