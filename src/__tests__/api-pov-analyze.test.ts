/**
 * POV 분석 API 라우트 테스트
 * POST /api/twelvelabs/pov-analyze
 * - 필수 파라미터 누락 시 400 에러
 * - 정상 요청 시 jobId 반환
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

// pov-analysis-engine 모킹
vi.mock("@/lib/pov-analysis-engine", () => ({
  startAnalysis: vi.fn(),
}));

import { POST } from "@/app/api/twelvelabs/pov-analyze/route";
import { startAnalysis } from "@/lib/pov-analysis-engine";

const mockStartAnalysis = vi.mocked(startAnalysis);

describe("POV Analyze API", () => {
  beforeEach(() => {
    vi.stubEnv("TWELVELABS_API_KEY", "test-key");
    mockStartAnalysis.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("videoId 누락 시 400 에러", async () => {
    const req = new NextRequest("http://localhost/api/twelvelabs/pov-analyze", {
      method: "POST",
      body: JSON.stringify({ procedureId: "proc-1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("videoId");
  });

  it("procedureId 누락 시 400 에러", async () => {
    const req = new NextRequest("http://localhost/api/twelvelabs/pov-analyze", {
      method: "POST",
      body: JSON.stringify({ videoId: "vid-1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("procedureId");
  });

  it("videoId와 procedureId 모두 누락 시 400 에러", async () => {
    const req = new NextRequest("http://localhost/api/twelvelabs/pov-analyze", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("정상 요청 시 jobId와 status 반환", async () => {
    mockStartAnalysis.mockResolvedValueOnce("pov-12345-abc");

    const req = new NextRequest("http://localhost/api/twelvelabs/pov-analyze", {
      method: "POST",
      body: JSON.stringify({
        videoId: "vid-1",
        procedureId: "proc-1",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobId).toBe("pov-12345-abc");
    expect(data.status).toBe("analyzing");

    // startAnalysis가 올바른 인자로 호출되었는지
    expect(mockStartAnalysis).toHaveBeenCalledWith("vid-1", "proc-1", undefined);
  });

  it("goldStandardId 포함 정상 요청", async () => {
    mockStartAnalysis.mockResolvedValueOnce("pov-67890-xyz");

    const req = new NextRequest("http://localhost/api/twelvelabs/pov-analyze", {
      method: "POST",
      body: JSON.stringify({
        videoId: "vid-2",
        procedureId: "proc-2",
        goldStandardId: "gs-001",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobId).toBe("pov-67890-xyz");

    expect(mockStartAnalysis).toHaveBeenCalledWith("vid-2", "proc-2", "gs-001");
  });

  it("startAnalysis 예외 시 500 에러", async () => {
    mockStartAnalysis.mockRejectedValueOnce(new Error("내부 파이프라인 오류"));

    const req = new NextRequest("http://localhost/api/twelvelabs/pov-analyze", {
      method: "POST",
      body: JSON.stringify({
        videoId: "vid-1",
        procedureId: "proc-1",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("내부 파이프라인 오류");
  });
});
