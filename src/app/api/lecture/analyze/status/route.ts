// src/app/api/lecture/analyze/status/route.ts
// 강의 분석 Job 상태 조회 API
// 클라이언트가 3초 간격으로 폴링하여 진행 상태 확인

import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/lecture-job-store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:lecture/analyze/status");

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId")?.trim() || "";

  if (!jobId) {
    log.warn("jobId 누락");
    return NextResponse.json({ error: "jobId가 필요합니다" }, { status: 400 });
  }

  const job = getJob(jobId);

  if (!job) {
    log.warn("Job을 찾을 수 없음", { jobId });
    return NextResponse.json({ error: "해당 Job을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    stages: job.stages,
    result: job.result || null,
    error: job.error || null,
  });
}
