/**
 * api-middleware 유틸리티 테스트
 * - ApiError 클래스
 * - requireApiKey: API 키 검증
 * - checkRateLimit: Rate limiting
 * - errorResponse: 표준 에러 응답 생성
 * - parseBody: JSON 파싱 + Zod 검증
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";

// logger 모킹
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  ApiError,
  requireApiKey,
  checkRateLimit,
  errorResponse,
  parseBody,
} from "@/lib/api-middleware";

describe("ApiError", () => {
  it("코드, 상태, 메시지를 포함하는 에러 생성", () => {
    const err = new ApiError("TEST_ERROR", 418, "테스트 에러");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("TEST_ERROR");
    expect(err.status).toBe(418);
    expect(err.message).toBe("테스트 에러");
    expect(err.name).toBe("ApiError");
  });
});

describe("requireApiKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("API 키 없을 때 ApiError(401) throw", () => {
    vi.stubEnv("TWELVELABS_API_KEY", "");
    expect(() => requireApiKey()).toThrow(ApiError);

    try {
      requireApiKey();
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(401);
      expect(err.code).toBe("MISSING_API_KEY");
    }
  });

  it("API 키가 undefined일 때 ApiError throw", () => {
    // process.env에서 해당 키를 완전히 제거
    delete process.env.TWELVELABS_API_KEY;
    expect(() => requireApiKey()).toThrow(ApiError);
  });

  it("API 키 존재 시 키 문자열 반환", () => {
    vi.stubEnv("TWELVELABS_API_KEY", "valid-api-key-123");
    const key = requireApiKey();
    expect(key).toBe("valid-api-key-123");
  });
});

describe("checkRateLimit", () => {
  it("제한 이내 요청 시 에러 없음", () => {
    // 고유 키로 테스트 (다른 테스트와 충돌 방지)
    const key = `test-ip-${Date.now()}-ok`;
    expect(() => checkRateLimit(key, 5, 60_000)).not.toThrow();
  });

  it("제한 초과 시 ApiError(429) throw", () => {
    const key = `test-ip-${Date.now()}-over`;
    const limit = 3;

    // 제한 내 요청들
    for (let i = 0; i < limit; i++) {
      checkRateLimit(key, limit, 60_000);
    }

    // 제한 초과 → 에러
    expect(() => checkRateLimit(key, limit, 60_000)).toThrow(ApiError);

    try {
      checkRateLimit(key, limit, 60_000);
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(429);
      expect(err.code).toBe("RATE_LIMITED");
      expect(err.message).toContain("요청 제한 초과");
    }
  });

  it("윈도우 만료 후 카운터 리셋", async () => {
    const key = `test-ip-${Date.now()}-reset`;
    const limit = 2;
    const windowMs = 50; // 50ms 윈도우

    // 제한 내 요청
    checkRateLimit(key, limit, windowMs);
    checkRateLimit(key, limit, windowMs);

    // 윈도우 만료 대기
    await new Promise((resolve) => setTimeout(resolve, 60));

    // 윈도우 만료 후 새 윈도우에서 다시 가능
    expect(() => checkRateLimit(key, limit, windowMs)).not.toThrow();
  });
});

describe("errorResponse", () => {
  it("ApiError 처리 — 코드와 상태 보존", async () => {
    const err = new ApiError("NOT_FOUND", 404, "리소스를 찾을 수 없습니다");
    const res = errorResponse(err);

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("리소스를 찾을 수 없습니다");
    expect(data.code).toBe("NOT_FOUND");
  });

  it("일반 Error 처리 — 500으로 래핑", async () => {
    const err = new Error("예기치 않은 오류");
    const res = errorResponse(err);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("예기치 않은 오류");
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("Error가 아닌 값 처리 — 기본 메시지", async () => {
    const res = errorResponse("문자열 에러");

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("알 수 없는 서버 오류");
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("null/undefined 처리", async () => {
    const res = errorResponse(null);
    expect(res.status).toBe(500);

    const res2 = errorResponse(undefined);
    expect(res2.status).toBe(500);
  });
});

describe("parseBody", () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number().optional(),
  });

  it("유효한 JSON + 스키마 매칭 시 파싱된 데이터 반환", async () => {
    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ name: "테스트", age: 25 }),
    });

    const result = await parseBody(req, testSchema);
    expect(result.name).toBe("테스트");
    expect(result.age).toBe(25);
  });

  it("스키마 검증 실패 시 ApiError(400) throw", async () => {
    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ age: "not-a-number" }), // name 필수 필드 누락
    });

    await expect(parseBody(req, testSchema)).rejects.toThrow(ApiError);

    try {
      // 새 요청 객체 (이전 요청의 body는 이미 소비됨)
      const req2 = new NextRequest("http://localhost/test", {
        method: "POST",
        body: JSON.stringify({ age: "not-a-number" }),
      });
      await parseBody(req2, testSchema);
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(400);
      expect(err.code).toBe("VALIDATION_ERROR");
    }
  });

  it("유효하지 않은 JSON 시 ApiError(400) throw", async () => {
    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      body: "not-json{{{",
      headers: { "content-type": "application/json" },
    });

    await expect(parseBody(req, testSchema)).rejects.toThrow(ApiError);
  });
});
