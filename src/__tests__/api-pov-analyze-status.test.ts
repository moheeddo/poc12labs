/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POV 분석 상태 조회 API 라우트 테스트
 * GET /api/twelvelabs/pov-analyze/status?jobId=xxx
 * - jobId 누락 시 400 에러
 * - 존재하지 않는 jobId 시 404 에러
 * - 정상 조회 시 작업 상태 반환
 */
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// pov-analysis-engine 모킹
vi.mock("@/lib/pov-analysis-engine", () => ({
  getJob: vi.fn(),
}));

import { GET } from "@/app/api/twelvelabs/pov-analyze/status/route";
import { getJob } from "@/lib/pov-analysis-engine";

const mockGetJob = vi.mocked(getJob);

describe("POV Analyze Status API", () => {
  it("jobId 누락 시 400 에러", async () => {
    const req = new NextRequest("http://localhost/api/twelvelabs/pov-analyze/status");

    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("jobId");
  });

  it("존재하지 않는 jobId 시 404 에러", async () => {
    mockGetJob.mockReturnValueOnce(undefined);

    const req = new NextRequest(
      "http://localhost/api/twelvelabs/pov-analyze/status?jobId=nonexistent-123"
    );

    const res = await GET(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("찾을 수 없습니다");
  });

  it("분석 중인 작업 조회 시 progress 포함 반환", async () => {
    mockGetJob.mockReturnValueOnce({
      id: "pov-123",
      status: "analyzing",
      progress: 45,
      stages: {
        stepDetection: "complete",
        handObject: "running",
        sequenceMatch: "pending",
        hpo: "pending",
        embedding: "pending",
        scoring: "pending",
      },
      result: undefined,
      error: undefined,
    } as any);

    const req = new NextRequest(
      "http://localhost/api/twelvelabs/pov-analyze/status?jobId=pov-123"
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("analyzing");
    expect(data.progress).toBe(45);
    expect(data.stages).toBeDefined();
    expect(data.result).toBeUndefined();
  });

  it("완료된 작업 조회 시 result 포함 반환", async () => {
    const mockResult = {
      overallScore: 85,
      grade: "A",
    };

    mockGetJob.mockReturnValueOnce({
      id: "pov-456",
      status: "complete",
      progress: 100,
      stages: {
        stepDetection: "complete",
        handObject: "complete",
        sequenceMatch: "complete",
        hpo: "complete",
        embedding: "complete",
        scoring: "complete",
      },
      result: mockResult,
      error: undefined,
    } as any);

    const req = new NextRequest(
      "http://localhost/api/twelvelabs/pov-analyze/status?jobId=pov-456"
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("complete");
    expect(data.progress).toBe(100);
    expect(data.result).toEqual(mockResult);
  });

  it("실패한 작업 조회 시 error 포함 반환", async () => {
    mockGetJob.mockReturnValueOnce({
      id: "pov-789",
      status: "failed",
      progress: 30,
      stages: {
        stepDetection: "complete",
        handObject: "failed",
        sequenceMatch: "pending",
        hpo: "pending",
        embedding: "pending",
        scoring: "pending",
      },
      result: undefined,
      error: "TwelveLabs API 타임아웃",
    } as any);

    const req = new NextRequest(
      "http://localhost/api/twelvelabs/pov-analyze/status?jobId=pov-789"
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("failed");
    expect(data.error).toContain("타임아웃");
    expect(data.result).toBeUndefined();
  });
});
