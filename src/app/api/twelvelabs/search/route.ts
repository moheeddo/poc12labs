import { NextRequest, NextResponse } from "next/server";
import { searchVideos } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";
import { requireApiKey, errorResponse, checkRateLimit, ApiError } from "@/lib/api-middleware";

// Vercel 서버리스 함수 타임아웃: Marengo 검색
export const maxDuration = 120;

const log = createLogger("API:search");

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get("x-forwarded-for") || "unknown");
    requireApiKey();

    const body = await req.json();
    const indexId = typeof body.indexId === "string" ? body.indexId.trim() : "";
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!indexId || !query) {
      log.warn("필수 파라미터 누락", { indexId: !!indexId, query: !!query });
      throw new ApiError("MISSING_PARAMS", 400, "indexId와 query가 필요합니다");
    }
    // 검색 쿼리 길이 제한 (인젝션 방지)
    if (query.length > 500) {
      log.warn("검색어 길이 초과", { length: query.length });
      throw new ApiError("QUERY_TOO_LONG", 400, "검색어가 너무 깁니다 (최대 500자)");
    }

    log.info("검색 시작", { indexId, queryLength: query.length });
    const result = await searchVideos(indexId, query);
    log.info("검색 완료", { indexId, resultCount: Array.isArray(result?.data) ? result.data.length : 0 });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
