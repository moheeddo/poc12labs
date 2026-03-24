import { NextRequest, NextResponse } from "next/server";
import { searchVideos } from "@/lib/twelvelabs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const indexId = typeof body.indexId === "string" ? body.indexId.trim() : "";
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!indexId || !query) {
      return NextResponse.json({ error: "indexId와 query가 필요합니다" }, { status: 400 });
    }
    // 검색 쿼리 길이 제한 (인젝션 방지)
    if (query.length > 500) {
      return NextResponse.json({ error: "검색어가 너무 깁니다 (최대 500자)" }, { status: 400 });
    }

    const result = await searchVideos(indexId, query);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "검색 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
