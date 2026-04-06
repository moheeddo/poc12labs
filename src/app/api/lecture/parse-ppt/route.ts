// src/app/api/lecture/parse-ppt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parsePptxBuffer } from "@/lib/pptx-parser";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:lecture/parse-ppt");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
    }

    if (!file.name.endsWith(".pptx")) {
      return NextResponse.json({ error: ".pptx 파일만 지원합니다" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = await parsePptxBuffer(buffer, file.name);

    log.info("PPT 파싱 성공", {
      fileName: result.fileName,
      slideCount: result.slideCount,
      totalNotesLength: result.totalNotesLength,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "PPT 파싱 실패";
    log.error("PPT 파싱 에러", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
