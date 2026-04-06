// src/lib/lecture-job-store.ts
// 강의 분석 Job 인메모리 저장소
// analyze/route.ts 와 analyze/status/route.ts 간 공유

import type { LectureAnalysisJob } from "./lecture-types";

const jobStore = new Map<string, LectureAnalysisJob>();

export function getJob(jobId: string): LectureAnalysisJob | undefined {
  return jobStore.get(jobId);
}

export function setJob(job: LectureAnalysisJob): void {
  jobStore.set(job.id, job);
}
