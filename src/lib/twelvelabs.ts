// TwelveLabs API 서버사이드 클라이언트

import { createLogger } from "./logger";

const log = createLogger("TwelveLabs");

const API_KEY = process.env.TWELVELABS_API_KEY!;
const API_URL = process.env.TWELVELABS_API_URL || "https://api.twelvelabs.io/v1.3";

async function tlFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || "GET";
  log.debug(`${method} ${path} 요청`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    log.error(`${method} ${path} 실패`, { status: res.status, error });
    throw new Error(`TwelveLabs API 오류 (${res.status}): ${error}`);
  }

  log.info(`${method} ${path} 성공`, { status: res.status });
  return res.json();
}

// 인덱스 목록 조회
export async function listIndexes() {
  return tlFetch<{ data: Array<{ _id: string; index_name: string; video_count: number; created_at: string }> }>(
    "/indexes?page=1&page_limit=50"
  );
}

// 인덱스 생성
export async function createIndex(name: string) {
  return tlFetch<{ _id: string }>("/indexes", {
    method: "POST",
    body: JSON.stringify({
      index_name: name,
      engines: [
        {
          engine_name: "pegasus1.2",
          engine_options: ["visual", "conversation"],
        },
      ],
    }),
  });
}

// 인덱스 내 영상 목록
export async function listVideos(indexId: string) {
  return tlFetch<{ data: Array<{ _id: string; metadata: { filename: string; duration: number }; created_at: string }> }>(
    `/indexes/${indexId}/videos?page=1&page_limit=50`
  );
}

// 영상 검색 (visual + conversation + transcription)
export async function searchVideos(indexId: string, query: string) {
  return tlFetch<{
    data: Array<{
      video_id: string;
      start: number;
      end: number;
      confidence: string;
      metadata: { filename?: string };
    }>;
  }>("/search", {
    method: "POST",
    body: JSON.stringify({
      index_id: indexId,
      query,
      search_options: ["visual", "conversation", "transcription"],
    }),
  });
}

// 영상 전사(transcript) 조회
export async function getVideoTranscription(indexId: string, videoId: string) {
  return tlFetch<{
    _id: string;
    metadata: { filename: string; duration: number };
    transcription?: Array<{ value: string; start: number; end: number }>;
  }>(`/indexes/${indexId}/videos/${videoId}?embed=true&transcription=true`);
}

// 영상 분석 (generate)
export async function analyzeVideo(videoId: string, type: "summary" | "chapter" | "highlight" | "text") {
  return tlFetch<{ data: string | Array<{ chapter_title?: string; start: number; end: number; highlight?: string }> }>(
    "/generate",
    {
      method: "POST",
      body: JSON.stringify({
        video_id: videoId,
        type,
      }),
    }
  );
}

// 영상 임베딩 생성 태스크
export async function createEmbeddingTask(videoId: string) {
  return tlFetch<{ _id: string }>("/embed/tasks", {
    method: "POST",
    body: JSON.stringify({
      video_id: videoId,
      model_name: "Marengo-retrieval-2.7",
    }),
  });
}

// 임베딩 조회
export async function getEmbeddings(taskId: string) {
  return tlFetch<{ video_embeddings: Array<{ embedding: number[]; start: number; end: number }> }>(
    `/embed/tasks/${taskId}`
  );
}

// 인덱싱 태스크 상태 조회
export async function getTaskStatus(taskId: string) {
  log.debug("태스크 상태 조회", { taskId });

  const data = await tlFetch<{
    _id: string;
    status: string;
    video_id?: string;
    estimated_time?: string;
  }>(`/tasks/${taskId}`);

  log.info("태스크 상태", { taskId, status: data.status, videoId: data.video_id });
  return {
    taskId: data._id,
    status: data.status as "pending" | "indexing" | "ready" | "failed",
    videoId: data.video_id,
    estimatedTime: data.estimated_time,
  };
}

// (하위호환) 단일 파일 프록시 업로드 — 소형 파일용 (200MB 이하)
export async function uploadVideo(indexId: string, fileBuffer: ArrayBuffer, fileName: string) {
  log.info("단일 파일 업로드 (프록시)", { indexId, fileName, size: `${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB` });

  const formData = new FormData();
  formData.append("index_id", indexId);
  formData.append("video_file", new Blob([new Uint8Array(fileBuffer)]), fileName);

  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "x-api-key": API_KEY },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    log.error("단일 파일 업로드 실패", { status: res.status, error });
    throw new Error(`TwelveLabs 업로드 오류 (${res.status}): ${error}`);
  }

  const data = await res.json() as { _id: string };
  log.info("단일 파일 업로드 완료", { taskId: data._id });
  return data;
}
