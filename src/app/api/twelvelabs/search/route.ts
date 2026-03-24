import { NextRequest, NextResponse } from "next/server";
import { searchVideos } from "@/lib/twelvelabs";

export async function POST(req: NextRequest) {
  try {
    const { indexId, query } = await req.json();
    if (!indexId || !query) {
      return NextResponse.json({ error: "indexId와 query가 필요합니다" }, { status: 400 });
    }
    const result = await searchVideos(indexId, query);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "검색 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
