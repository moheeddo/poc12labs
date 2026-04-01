import { NextRequest, NextResponse } from "next/server";
import { initMultipartUpload } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";

// POST /api/twelvelabs/upload/init
// 멀티파트 직접 업로드 초기화 — presigned URL 목록 반환
// 클라이언트가 presigned URL로 직접 TwelveLabs에 파트 업로드

const log = createLogger("API:upload/init");

export async function POST(request: NextRequest) {
  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) {
    log.error("API 키 미설정");
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  try {
    const { indexId, fileName, fileSize } = await request.json();

    if (!indexId || !fileName || !fileSize) {
      log.warn("필수 파라미터 누락", { indexId: !!indexId, fileName: !!fileName, fileSize: !!fileSize });
      return NextResponse.json(
        { error: "indexId, fileName, fileSize가 필요합니다" },
        { status: 400 }
      );
    }

    log.info("멀티파트 업로드 초기화 요청", {
      indexId,
      fileName,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(1)}MB`,
    });

    const result = await initMultipartUpload(indexId, fileName, fileSize);

    log.info("멀티파트 업로드 초기화 완료", {
      taskId: result.taskId,
      partCount: result.parts.length,
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 초기화 실패";
    log.error("업로드 초기화 예외", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
