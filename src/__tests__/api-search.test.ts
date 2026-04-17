/**
 * Search API 라우트 테스트
 * POST /api/twelvelabs/search
 * - 필수 파라미터 누락 시 400 에러
 * - 정상 검색 요청 (fetch 모킹)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// logger 모킹
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// twelvelabs 모듈의 searchVideos 모킹
vi.mock("@/lib/twelvelabs", () => ({
  searchVideos: vi.fn(),
}));

import { POST } from "@/app/api/twelvelabs/search/route";
import { searchVideos } from "@/lib/twelvelabs";

const mockSearchVideos = vi.mocked(searchVideos);

describe("Search API", () => {
  beforeEach(() => {
    vi.stubEnv("TWELVELABS_API_KEY", "test-key");
    mockSearchVideos.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("indexId 누락 시 400 에러", async () => {
    const req = new NextRequest("http://localhost/api/twelvelabs/search", {
      method: "POST",
      body: JSON.stringify({ query: "비상냉각 조작" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("indexId");
  });

  it("query 누락 시 400 에러", async () => {
    const req = new NextRequest("http://localhost/api/twelvelabs/search", {
      method: "POST",
      body: JSON.stringify({ indexId: "idx-1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("query");
  });

  it("indexId와 query 모두 누락 시 400 에러", async () => {
    const req = new NextRequest("http://localhost/api/twelvelabs/search", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("검색어 길이 초과 시 400 에러", async () => {
    const longQuery = "가".repeat(501);
    const req = new NextRequest("http://localhost/api/twelvelabs/search", {
      method: "POST",
      body: JSON.stringify({ indexId: "idx-1", query: longQuery }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("500자");
  });

  it("정상 검색 요청 시 결과 반환", async () => {
    const mockResult = {
      data: [
        {
          video_id: "vid-1",
          start: 10.5,
          end: 25.3,
          confidence: "high",
          metadata: [{ text: "비상냉각 조작 장면" }],
        },
      ],
    };

    mockSearchVideos.mockResolvedValueOnce(mockResult);

    const req = new NextRequest("http://localhost/api/twelvelabs/search", {
      method: "POST",
      body: JSON.stringify({
        indexId: "idx-1",
        query: "비상냉각 조작",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].video_id).toBe("vid-1");

    // searchVideos가 올바른 인자로 호출되었는지 확인
    expect(mockSearchVideos).toHaveBeenCalledWith("idx-1", "비상냉각 조작");
  });

  it("searchVideos 예외 시 500 에러", async () => {
    mockSearchVideos.mockRejectedValueOnce(new Error("TwelveLabs API 오류 (503): Service Unavailable"));

    const req = new NextRequest("http://localhost/api/twelvelabs/search", {
      method: "POST",
      body: JSON.stringify({
        indexId: "idx-1",
        query: "비상냉각 조작",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("503");
  });
});
