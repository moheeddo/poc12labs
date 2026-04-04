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

// 영상 분석 (/analyze SSE 엔드포인트 — v1.3에서 /generate 대체)
export async function analyzeVideo(videoId: string, type: "summary" | "chapter" | "highlight" | "text") {
  // type별 프롬프트 매핑
  const prompts: Record<string, string> = {
    summary: "이 영상의 내용을 한국어로 3~5문장으로 요약해주세요.",
    chapter: "이 영상을 시간순 챕터로 나눠주세요. 각 챕터의 제목과 시작/종료 시간(초)을 JSON 배열로 출력: [{\"chapter_title\":\"제목\",\"start\":시작초,\"end\":종료초}]",
    highlight: "이 영상에서 가장 중요한 핵심 장면들을 찾아주세요. 각 장면의 설명과 시작/종료 시간(초)을 JSON 배열로 출력: [{\"highlight\":\"설명\",\"start\":시작초,\"end\":종료초}]",
    text: "이 영상의 전체 내용을 구조화하여 한국어로 분석해주세요.",
  };

  const result = await generateWithPrompt(videoId, prompts[type] || prompts.text);
  const text = result.data;

  // summary, text는 그대로 문자열 반환
  if (type === "summary" || type === "text") {
    return { data: text };
  }

  // chapter, highlight는 JSON 배열 파싱 시도
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { data: parsed };
    }
  } catch {
    // JSON 파싱 실패 시 텍스트 그대로
  }

  return { data: text };
}

// 커스텀 프롬프트 기반 영상 분석 (/analyze 엔드포인트, SSE 스트리밍)
export async function generateWithPrompt(videoId: string, prompt: string): Promise<{ data: string }> {
  log.debug("analyze (custom prompt)", { videoId, promptLength: prompt.length });

  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_id: videoId,
      prompt,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    log.error("analyze 실패", { status: res.status, error });
    throw new Error(`TwelveLabs analyze 오류 (${res.status}): ${error}`);
  }

  // SSE 스트리밍 응답을 텍스트로 조합
  const rawText = await res.text();
  const lines = rawText.split("\n").filter((l) => l.trim());
  let fullText = "";

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event.event_type === "text_generation" && event.text) {
        fullText += event.text;
      }
    } catch {
      // 파싱 불가한 라인은 건너뛰기
    }
  }

  log.info("analyze 완료", { videoId, responseLength: fullText.length });
  return { data: fullText };
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

/**
 * 영상 세그먼트의 임베딩 벡터를 추출한다.
 */
export async function getVideoEmbedding(
  videoId: string, startSec: number, endSec: number
): Promise<number[]> {
  const res = await fetch(`${API_URL}/embed`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: videoId,
      video_embedding_scope: { start_offset_sec: startSec, end_offset_sec: endSec },
    }),
  });
  if (!res.ok) throw new Error(`Embed API error: ${res.status}`);
  const data = await res.json();
  return data.video_embedding?.segments?.[0]?.embeddings_float ?? [];
}

/**
 * 영상 전체를 segmentSec 간격으로 나눠 임베딩 배열을 반환한다.
 */
export async function getSegmentedEmbeddings(
  videoId: string, durationSec: number, segmentSec: number = 10
): Promise<{ start: number; end: number; embedding: number[] }[]> {
  const segments: { start: number; end: number; embedding: number[] }[] = [];
  const promises: Promise<void>[] = [];
  for (let start = 0; start < durationSec; start += segmentSec) {
    const end = Math.min(start + segmentSec, durationSec);
    const idx = segments.length;
    segments.push({ start, end, embedding: [] });
    promises.push(
      getVideoEmbedding(videoId, start, end)
        .then(emb => { segments[idx].embedding = emb; })
        .catch(() => { segments[idx].embedding = []; })
    );
    if (promises.length >= 10) {
      await Promise.allSettled(promises);
      promises.length = 0;
    }
  }
  if (promises.length > 0) await Promise.allSettled(promises);
  return segments;
}
