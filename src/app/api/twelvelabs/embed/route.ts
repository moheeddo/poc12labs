import { NextRequest, NextResponse } from "next/server";
import { createEmbeddingTask, getEmbeddings } from "@/lib/twelvelabs";

// 임베딩 태스크 생성
export async function POST(req: NextRequest) {
  try {
    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId가 필요합니다" }, { status: 400 });
    }
    const result = await createEmbeddingTask(videoId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "임베딩 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 임베딩 결과 조회
export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "taskId가 필요합니다" }, { status: 400 });
    }
    const result = await getEmbeddings(taskId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "임베딩 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
