import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

// POST /api/twelvelabs/upload
// 클라이언트 FormData(indexId + file)를 받아 TwelveLabs POST /tasks로 프록시
// TwelveLabs tasks/transfers 엔드포인트가 deprecated되어 POST /tasks 방식으로 전환

const log = createLogger("API:upload");

const API_KEY = process.env.TWELVELABS_API_KEY!;
const API_URL = process.env.TWELVELABS_API_URL || "https://api.twelvelabs.io/v1.3";
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    log.error("API 키 미설정");
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const indexId = formData.get("indexId") as string | null;
    const file = formData.get("file") as File | null;

    if (!indexId || !file) {
      log.warn("필수 파라미터 누락", { indexId: !!indexId, file: !!file });
      return NextResponse.json(
        { error: "indexId와 file이 필요합니다" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      log.warn("파일 크기 초과", { fileSize: `${sizeMB}MB` });
      return NextResponse.json(
        { error: `파일 크기(${sizeMB}MB)가 제한(2GB)을 초과합니다` },
        { status: 413 }
      );
    }

    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    log.info("영상 업로드 시작", { indexId, fileName: file.name, fileSize: `${sizeMB}MB` });

    // TwelveLabs POST /tasks — FormData로 영상 업로드 + 인덱싱 동시 진행
    const tlFormData = new FormData();
    tlFormData.append("index_id", indexId);
    tlFormData.append("video_file", file, file.name);

    const res = await fetch(`${API_URL}/tasks`, {
      method: "POST",
      headers: { "x-api-key": API_KEY },
      body: tlFormData,
    });

    if (!res.ok) {
      const error = await res.text();
      log.error("TwelveLabs 업로드 실패", { status: res.status, error });
      return NextResponse.json(
        { error: `TwelveLabs 업로드 오류 (${res.status}): ${error}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    log.info("업로드 성공 — 인덱싱 시작", { taskId: data._id });

    return NextResponse.json({
      taskId: data._id,
      videoId: data.video_id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 실패";
    log.error("업로드 예외", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
