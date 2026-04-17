import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import Busboy from "busboy";
import { createLogger } from "@/lib/logger";

// POST /api/twelvelabs/upload
// 두 가지 업로드 방식 지원:
// 1. FormData(indexId + file) → busboy 스트리밍 파싱 → TwelveLabs video_file
// 2. JSON({ indexId, videoUrl }) → TwelveLabs video_url (용량 제한 없음)

// Vercel Serverless 함수 타임아웃 확장 (Pro: 최대 300초)
export const maxDuration = 300;

const log = createLogger("API:upload");

const API_KEY = process.env.TWELVELABS_API_KEY!;
const API_URL = process.env.TWELVELABS_API_URL || "https://api.twelvelabs.io/v1.3";
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// 허용 MIME 타입 화이트리스트
const ALLOWED_MIME_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/x-matroska",
  "video/webm", "video/avi", "video/x-msvideo",
  "video/mpeg", "video/x-ms-wmv", "video/x-flv",
]);
// 허용 확장자
const ALLOWED_EXTENSIONS = new Set([
  ".mp4", ".mov", ".mkv", ".webm", ".avi", ".mpeg", ".mpg", ".wmv", ".flv",
]);

function validateFile(fileName: string, mimeType: string): string | null {
  const ext = fileName.lastIndexOf(".") >= 0
    ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
    : "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `지원하지 않는 확장자입니다: ${ext || "(없음)"}. 허용: ${[...ALLOWED_EXTENSIONS].join(", ")}`;
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return `지원하지 않는 파일 형식입니다: ${mimeType}. 허용: 동영상 파일만 업로드 가능합니다`;
  }
  // 경로 순회 공격 방지
  const baseName = fileName.split(/[\\/]/).pop() || fileName;
  if (baseName !== fileName || fileName.includes("..")) {
    return "파일명에 허용되지 않는 문자가 포함되어 있습니다";
  }
  return null;
}

// ── URL 기반 업로드 (용량 제한 없음) ──

async function handleUrlUpload(request: NextRequest) {
  const { indexId, videoUrl } = await request.json();

  if (!indexId || !videoUrl) {
    log.warn("URL 업로드: 필수 파라미터 누락", { indexId: !!indexId, videoUrl: !!videoUrl });
    return NextResponse.json(
      { error: "indexId와 videoUrl이 필요합니다" },
      { status: 400 }
    );
  }

  log.info("URL 기반 업로드 시작", { indexId, videoUrl });

  // TwelveLabs v1.3은 URL 업로드도 multipart/form-data 필요
  const tlFormData = new FormData();
  tlFormData.append("index_id", indexId);
  tlFormData.append("video_url", videoUrl);

  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "x-api-key": API_KEY },
    body: tlFormData,
  });

  if (!res.ok) {
    const error = await res.text();
    log.error("TwelveLabs URL 업로드 실패", { status: res.status, error });
    return NextResponse.json(
      { error: `TwelveLabs 업로드 오류 (${res.status}): ${error}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  log.info("URL 업로드 성공 — 인덱싱 시작", { taskId: data._id });

  return NextResponse.json({
    taskId: data._id,
    videoId: data.video_id,
  });
}

// ── 파일 기반 업로드 (busboy 스트리밍) ──

interface ParsedUpload {
  indexId: string;
  fileBuffer: Buffer;
  fileName: string;
  fileMimeType: string;
}

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
      // 파일 검증 (MIME 타입, 확장자, 경로 순회)
      const validationError = validateFile(fileName, fileMimeType);
      if (validationError) {
        reject(new Error(`INVALID_FILE:${validationError}`));
        return;
      }
      // 경로 순회 공격 방지: 파일명에서 디렉토리 경로 제거
      const safeName = fileName.split(/[\\/]/).pop() || fileName;
      resolve({
        indexId,
        fileBuffer: Buffer.concat(chunks),
        fileName: safeName,
        fileMimeType,
      });
    });

    busboy.on("error", (err: Error) => reject(err));

    const body = request.body;
    if (!body) {
      reject(new Error("요청 본문이 비어 있습니다"));
      return;
    }

    const nodeStream = Readable.fromWeb(body as import("stream/web").ReadableStream);
    nodeStream.pipe(busboy);
  });
}

async function handleFileUpload(request: NextRequest) {
  const { indexId, fileBuffer, fileName, fileMimeType } = await parseMultipart(request);

  const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1);
  log.info("파일 업로드 시작", { indexId, fileName, fileSize: `${sizeMB}MB` });

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
    log.error("TwelveLabs 파일 업로드 실패", { status: res.status, error });
    return NextResponse.json(
      { error: `TwelveLabs 업로드 오류 (${res.status}): ${error}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  log.info("파일 업로드 성공 — 인덱싱 시작", { taskId: data._id });

  return NextResponse.json({
    taskId: data._id,
    videoId: data.video_id,
  });
}

// ── 메인 핸들러 ──

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    log.error("API 키 미설정");
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    // Content-Type으로 업로드 방식 분기
    if (contentType.includes("application/json")) {
      return await handleUrlUpload(request);
    }
    return await handleFileUpload(request);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 실패";

    if (msg.startsWith("FILE_TOO_LARGE:")) {
      const sizeMB = msg.split(":")[1];
      log.warn("파일 크기 초과", { fileSize: `${sizeMB}MB` });
      return NextResponse.json(
        { error: `파일 크기(${sizeMB}MB)가 제한(2GB)을 초과합니다` },
        { status: 413 }
      );
    }

    if (msg.startsWith("INVALID_FILE:")) {
      const detail = msg.slice("INVALID_FILE:".length);
      log.warn("파일 검증 실패", { detail });
      return NextResponse.json({ error: detail }, { status: 400 });
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
