import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:middleware");

// ─────────────────────────────────────────────
// API 에러 클래스 — 코드, HTTP 상태, 메시지 포함
// ─────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    /** 머신 판독용 에러 코드 (예: "MISSING_API_KEY", "RATE_LIMITED") */
    public code: string,
    /** HTTP 상태 코드 */
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─────────────────────────────────────────────
// 표준 에러 응답 생성
// ApiError면 코드/상태를 그대로 사용, 일반 Error면 500으로 래핑
// ─────────────────────────────────────────────

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    log.warn("API 에러 응답", { code: error.code, status: error.status, message: error.message });
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : "알 수 없는 서버 오류";
  log.error("미처리 예외", { error: message });
  return NextResponse.json(
    { error: message, code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}

// ─────────────────────────────────────────────
// API 키 검증 — 환경변수에서 TwelveLabs API 키를 읽어 반환
// 없으면 ApiError(401) throw
// ─────────────────────────────────────────────

export function requireApiKey(): string {
  const key = process.env.TWELVELABS_API_KEY;
  if (!key) {
    throw new ApiError(
      "MISSING_API_KEY",
      401,
      "TWELVELABS_API_KEY 환경변수가 설정되지 않았습니다",
    );
  }
  return key;
}

// ─────────────────────────────────────────────
// 요청 바디 JSON 파싱 + Zod 스키마 검증
// 검증 실패 시 ApiError(400) throw
// ─────────────────────────────────────────────

export async function parseBody<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("INVALID_JSON", 400, "요청 본문이 유효한 JSON이 아닙니다");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ApiError("VALIDATION_ERROR", 400, `입력값 검증 실패: ${issues}`);
  }

  return result.data;
}

// ─────────────────────────────────────────────
// Rate Limiting — 인메모리 슬라이딩 윈도우
// POC용이므로 Redis 없이 Map 기반 구현
// 기본: IP당 분당 60회
// ─────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// 오래된 항목 정리 (메모리 누수 방지) — 5분마다 실행
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limit 검사 — 제한 초과 시 ApiError(429) throw
 * @param key   식별 키 (보통 클라이언트 IP)
 * @param limit 윈도우 내 최대 요청 수 (기본 60)
 * @param windowMs 윈도우 크기 (ms, 기본 60000 = 1분)
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60_000,
): void {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    // 새 윈도우 시작
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    throw new ApiError(
      "RATE_LIMITED",
      429,
      `요청 제한 초과 (${limit}회/분). ${retryAfterSec}초 후 다시 시도하세요`,
    );
  }
}
