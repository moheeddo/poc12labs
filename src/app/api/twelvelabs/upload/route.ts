import { NextRequest, NextResponse } from "next/server";
import { uploadVideo } from "@/lib/twelvelabs";

// 허용 영상 MIME 타입
const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
]);

// 최대 파일 크기: 100MB
const MAX_SIZE = 100 * 1024 * 1024;

// 영상 파일 업로드 (프록시)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const indexId = formData.get("index_id") as string;
    const file = formData.get("video_file") as File | null;

    if (!indexId) {
      return NextResponse.json({ error: "인덱스 ID가 필요합니다" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "영상 파일이 필요합니다" }, { status: 400 });
    }

    // MIME 타입 검증
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `허용되지 않는 파일 형식입니다: ${file.type}. MP4, WebM, MOV, AVI, MKV만 가능합니다.` },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `파일 크기가 ${Math.round(file.size / 1024 / 1024)}MB로 제한(100MB)을 초과합니다.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await uploadVideo(indexId, arrayBuffer, file.name);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "업로드 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
