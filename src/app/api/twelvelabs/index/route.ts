import { NextRequest, NextResponse } from "next/server";
import { listIndexes, createIndex } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";
import { requireApiKey, errorResponse, checkRateLimit, ApiError } from "@/lib/api-middleware";

const log = createLogger("API:index");

// 인덱스 목록 조회
export async function GET(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get("x-forwarded-for") || "unknown");
    requireApiKey();

    log.info("인덱스 목록 조회");
    const result = await listIndexes();
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

// 인덱스 생성
export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req.headers.get("x-forwarded-for") || "unknown");
    requireApiKey();

    const { name } = await req.json();
    if (!name) {
      log.warn("인덱스 이름 누락");
      throw new ApiError("MISSING_PARAMS", 400, "인덱스 이름이 필요합니다");
    }
    log.info("인덱스 생성", { name });
    const result = await createIndex(name);
    log.info("인덱스 생성 완료", { name });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
