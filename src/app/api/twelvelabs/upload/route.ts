import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import Busboy from "busboy";
import { createLogger } from "@/lib/logger";

// POST /api/twelvelabs/upload
// 클라이언트 FormData(indexId + file)를 받아 TwelveLabs POST /tasks로 프록시
// busboy 스트리밍 파싱으로 body 크기 제한(413) 우회

// Vercel Serverless 함수 타임아웃 확장 (Pro: 최대 300초)
export const maxDuration = 300;

const log = createLogger("API:upload");

const API_KEY = process.env.TWELVELABS_API_KEY!;
const API_URL = process.env.TWELVELABS_API_URL || "https://api.twelvelabs.io/v1.3";
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

interface ParsedUpload {
  indexId: string;
  fileBuffer: Buffer;
  fileName: string;
  fileMimeType: string;
}

/**
 * request.formData() 대신 busboy 스트리밍으로 multipart 파싱
 * → Next.js 내부 body parser 크기 제한(1MB)을 우회
 */
function parseMultipart(request: NextRequest): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const contentType = request.headers.get("content-type") || "";

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: MAX_FILE_SIZE },
    });

    let indexId = "";
    let fileName = "";
    let fileMimeType = "";
    const chunks: Buffer[] = [];
    let totalSize = 0;
    let fileSizeLimitHit = false;

    busboy.on("field", (name: string, value: string) => {
      if (name === "indexId") indexId = value;
    });

    busboy.on("file", (_name: string, stream: Readable, info: { filename: string; mimeType: string }) => {
      fileName = info.filename;
      fileMimeType = info.mimeType;

      stream.on("data", (chunk: Buffer) => {
        totalSize += chunk.length;
        chunks.push(chunk);
      });

      stream.on("limit", () => {
        fileSizeLimitHit = true;
      });
    });

    busboy.on("finish", () => {
      if (fileSizeLimitHit) {
        const sizeMB = (totalSize / 1024 / 1024).toFixed(1);
        reject(new Error(`FILE_TOO_LARGE:${sizeMB}`));
        return;
      }
      if (!indexId || chunks.length === 0) {
        reject(new Error("MISSING_PARAMS"));
        return;
      }
      resolve({
        indexId,
        fileBuffer: Buffer.concat(chunks),
        fileName,
        fileMimeType,
      });
    });

    busboy.on("error", (err: Error) => reject(err));

    // Web ReadableStream → Node.js Readable 변환 후 busboy에 파이프
    const body = request.body;
    if (!body) {
      reject(new Error("요청 본문이 비어 있습니다"));
      return;
    }

    const nodeStream = Readable.fromWeb(body as import("stream/web").ReadableStream);
    nodeStream.pipe(busboy);
  });
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    log.error("API 키 미설정");
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  try {
    // busboy 스트리밍 파싱 — body 크기 제한 우회
    const { indexId, fileBuffer, fileName, fileMimeType } = await parseMultipart(request);

    const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1);
    log.info("영상 업로드 시작", { indexId, fileName, fileSize: `${sizeMB}MB` });

    // TwelveLabs POST /tasks — FormData로 영상 업로드 + 인덱싱 동시 진행
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: fileMimeType });
    const tlFormData = new FormData();
    tlFormData.append("index_id", indexId);
    tlFormData.append("video_file", blob, fileName);

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

    // 파일 크기 초과 에러 처리
    if (msg.startsWith("FILE_TOO_LARGE:")) {
      const sizeMB = msg.split(":")[1];
      log.warn("파일 크기 초과", { fileSize: `${sizeMB}MB` });
      return NextResponse.json(
        { error: `파일 크기(${sizeMB}MB)가 제한(2GB)을 초과합니다` },
        { status: 413 }
      );
    }

    if (msg === "MISSING_PARAMS") {
      log.warn("필수 파라미터 누락");
      return NextResponse.json(
        { error: "indexId와 file이 필요합니다" },
        { status: 400 }
      );
    }

    log.error("업로드 예외", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
