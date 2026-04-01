import type { NextApiRequest, NextApiResponse } from "next";
import Busboy from "busboy";
import { Readable } from "stream";

// Pages API 라우트: bodyParser 비활성화로 body size 제한 없음
// App Router Route Handler는 ~4.5MB 제한이 있어 대용량 영상 업로드 불가
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const API_KEY = process.env.TWELVELABS_API_KEY!;
const API_URL = process.env.TWELVELABS_API_URL || "https://api.twelvelabs.io/v1.3";
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// ── busboy로 multipart 파싱 (스트리밍, 용량 무제한) ──

interface ParsedUpload {
  indexId: string;
  fileBuffer: Buffer;
  fileName: string;
  fileMimeType: string;
}

function parseMultipart(req: NextApiRequest): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers as Record<string, string>,
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
        reject(new Error(`FILE_TOO_LARGE:${(totalSize / 1024 / 1024).toFixed(1)}`));
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

    req.pipe(busboy);
  });
}

// ── URL 기반 업로드 (JSON body) ──

async function handleUrlUpload(req: NextApiRequest, res: NextApiResponse) {
  // bodyParser가 비활성화되어 있으므로 수동으로 JSON 파싱
  const body = await new Promise<string>((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

  const { indexId, videoUrl } = JSON.parse(body);

  if (!indexId || !videoUrl) {
    return res.status(400).json({ error: "indexId와 videoUrl이 필요합니다" });
  }

  const tlRes = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ index_id: indexId, video_url: videoUrl }),
  });

  if (!tlRes.ok) {
    const error = await tlRes.text();
    return res.status(tlRes.status).json({ error: `TwelveLabs 오류 (${tlRes.status}): ${error}` });
  }

  const data = await tlRes.json();
  return res.json({ taskId: data._id, videoId: data.video_id });
}

// ── 파일 기반 업로드 ──

async function handleFileUpload(req: NextApiRequest, res: NextApiResponse) {
  const { indexId, fileBuffer, fileName, fileMimeType } = await parseMultipart(req);

  const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`[Upload] 파일 업로드: ${fileName} (${sizeMB}MB) → ${indexId}`);

  const blob = new Blob([new Uint8Array(fileBuffer)], { type: fileMimeType });
  const formData = new FormData();
  formData.append("index_id", indexId);
  formData.append("video_file", blob, fileName);

  const tlRes = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "x-api-key": API_KEY },
    body: formData,
  });

  if (!tlRes.ok) {
    const error = await tlRes.text();
    return res.status(tlRes.status).json({ error: `TwelveLabs 오류 (${tlRes.status}): ${error}` });
  }

  const data = await tlRes.json();
  console.log(`[Upload] 업로드 성공 — taskId: ${data._id}`);
  return res.json({ taskId: data._id, videoId: data.video_id });
}

// ── 메인 핸들러 ──

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용" });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: "API 키가 설정되지 않았습니다" });
  }

  try {
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("application/json")) {
      return await handleUrlUpload(req, res);
    }
    return await handleFileUpload(req, res);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 실패";

    if (msg.startsWith("FILE_TOO_LARGE:")) {
      return res.status(413).json({ error: `파일 크기가 2GB 제한을 초과합니다` });
    }
    if (msg === "MISSING_PARAMS") {
      return res.status(400).json({ error: "indexId와 file이 필요합니다" });
    }

    console.error("[Upload] 예외:", msg);
    return res.status(500).json({ error: msg });
  }
}
