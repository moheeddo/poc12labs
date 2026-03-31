import { NextRequest, NextResponse } from "next/server";
import { initMultipartUpload } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";

// POST /api/twelvelabs/upload
// 멀티파트 업로드 초기화: presigned URL 목록 반환
// 클라이언트가 presigned URL로 직접 TwelveLabs에 파일 전송

const log = createLogger("API:upload/init");

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (Pegasus 모델 제한)
const MIN_FILE_SIZE = 1024; // 1KB (최소 유효 파일)

export async function POST(request: NextRequest) {
  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) {
    log.error("API 키 미설정");
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { indexId, fileName, fileSize } = body;

    // 입력 검증
    if (!indexId || !fileName || !fileSize) {
      log.warn("필수 파라미터 누락", { indexId, fileName, fileSize });
      return NextResponse.json(
        { error: "indexId, fileName, fileSize가 필요합니다" },
        { status: 400 }
      );
    }

    if (typeof fileSize !== "number" || fileSize < MIN_FILE_SIZE) {
      log.warn("파일 크기 너무 작음", { fileSize });
      return NextResponse.json({ error: "유효하지 않은 파일 크기입니다" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
      log.warn("파일 크기 초과", { fileSize: `${sizeMB}MB` });
      return NextResponse.json(
        { error: `파일 크기(${sizeMB}MB)가 제한(2GB)을 초과합니다` },
        { status: 413 }
      );
    }

    log.info("업로드 초기화 요청", {
      indexId,
      fileName,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(1)}MB`,
    });

    const result = await initMultipartUpload(indexId, fileName, fileSize);

    log.info("업로드 초기화 완료 — presigned URL 발급", {
      taskId: result.taskId,
      parts: result.parts.length,
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 초기화 실패";
    log.error("업로드 초기화 예외", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
