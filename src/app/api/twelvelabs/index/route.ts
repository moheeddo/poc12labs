import { NextRequest, NextResponse } from "next/server";
import { listIndexes, createIndex } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:index");

// 인덱스 목록 조회
export async function GET() {
  try {
    log.info("인덱스 목록 조회");
    const result = await listIndexes();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "인덱스 조회 실패";
    log.error("인덱스 조회 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 인덱스 생성
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) {
      log.warn("인덱스 이름 누락");
      return NextResponse.json({ error: "인덱스 이름이 필요합니다" }, { status: 400 });
    }
    log.info("인덱스 생성", { name });
    const result = await createIndex(name);
    log.info("인덱스 생성 완료", { name });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "인덱스 생성 실패";
    log.error("인덱스 생성 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
