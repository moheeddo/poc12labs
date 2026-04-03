import { NextRequest, NextResponse } from "next/server";
import { searchVideos } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:search");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const indexId = typeof body.indexId === "string" ? body.indexId.trim() : "";
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!indexId || !query) {
      log.warn("필수 파라미터 누락", { indexId: !!indexId, query: !!query });
      return NextResponse.json({ error: "indexId와 query가 필요합니다" }, { status: 400 });
    }
    // 검색 쿼리 길이 제한 (인젝션 방지)
    if (query.length > 500) {
      log.warn("검색어 길이 초과", { length: query.length });
      return NextResponse.json({ error: "검색어가 너무 깁니다 (최대 500자)" }, { status: 400 });
    }

    log.info("검색 시작", { indexId, queryLength: query.length });
    const result = await searchVideos(indexId, query);
    log.info("검색 완료", { indexId, resultCount: Array.isArray(result?.data) ? result.data.length : 0 });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "검색 실패";
    log.error("검색 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
