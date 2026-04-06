// src/app/api/lecture/analyze/route.ts
// 강의 평가 비동기 분석 파이프라인 API
// Job 기반 — POST로 분석 시작, GET /status로 진행 상태 폴링

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getJob, setJob } from "@/lib/lecture-job-store";
import { computeSlideCoverages } from "@/lib/slide-matcher";
import {
  scoreContentFidelity,
  scoreDelivery,
  computeTotalScore,
  getLectureGrade,
} from "@/lib/lecture-scoring";
import type {
  LectureAnalysisJob,
  LectureAnalysisStage,
  StageStatus,
  ParsedPpt,
  ContentFidelityResult,
  DeliveryResult,
  PedagogyIndicator,
  LectureHighlight,
} from "@/lib/lecture-types";
import type { TranscriptSegment } from "@/lib/types";

const log = createLogger("API:lecture/analyze");

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// 스테이지 초기 상태 생성
function createInitialStages(): Record<LectureAnalysisStage, StageStatus> {
  return {
    transcription: "pending",
    pptParsing: "pending",
    contentFidelity: "pending",
    multimodal: "pending",
    pedagogy: "pending",
    scoring: "pending",
    reporting: "pending",
  };
}

// 진행률 계산 (7단계)
function computeProgress(stages: Record<LectureAnalysisStage, StageStatus>): number {
  const stageKeys: LectureAnalysisStage[] = [
    "transcription", "pptParsing", "contentFidelity",
    "multimodal", "pedagogy", "scoring", "reporting",
  ];
  const doneCount = stageKeys.filter(
    (k) => stages[k] === "done" || stages[k] === "skipped"
  ).length;
  return Math.round((doneCount / stageKeys.length) * 100);
}

// 스테이지 업데이트 헬퍼
function updateStage(
  job: LectureAnalysisJob,
  stage: LectureAnalysisStage,
  status: StageStatus
) {
  job.stages[stage] = status;
  job.progress = computeProgress(job.stages);
  setJob(job);
}

// =============================================
// 비동기 분석 파이프라인
// =============================================
async function runLectureAnalysisPipeline(job: LectureAnalysisJob) {
  let transcript: TranscriptSegment[] = [];
  let multimodalRaw = 5; // 폴백 기본값
  let pedagogyIndicators: PedagogyIndicator[] = [];
  let contentFidelity: ContentFidelityResult | null = null;

  try {
    // ─── 1단계: 전사(Transcription) ───
    updateStage(job, "transcription", "running");
    try {
      // indexId가 없으므로 videoId 기반으로 전사 조회
      // 기존 transcription API는 indexId + videoId 필요
      // 여기서는 모든 인덱스를 순회하지 않고, 기본 인덱스 사용
      const indexId = process.env.TWELVELABS_LECTURE_INDEX_ID || "";
      if (indexId) {
        const transRes = await fetch(
          `${BASE_URL}/api/twelvelabs/transcription?indexId=${indexId}&videoId=${job.videoId}`
        );
        if (transRes.ok) {
          const transData = await transRes.json();
          transcript = (transData.transcription || []) as TranscriptSegment[];
          log.info("전사 조회 성공", { videoId: job.videoId, segments: transcript.length });
        } else {
          log.warn("전사 조회 실패 — 빈 전사로 진행", { status: transRes.status });
        }
      } else {
        log.warn("TWELVELABS_LECTURE_INDEX_ID 미설정 — 전사 건너뜀");
      }
      updateStage(job, "transcription", "done");
    } catch (e) {
      log.error("전사 단계 오류", { error: e instanceof Error ? e.message : String(e) });
      updateStage(job, "transcription", "error");
    }

    // ─── 2단계: PPT 파싱 (이미 클라이언트에서 완료) ───
    if (job.pptData) {
      updateStage(job, "pptParsing", "done");
      log.info("PPT 데이터 확인", {
        fileName: job.pptData.fileName,
        slideCount: job.pptData.slideCount,
      });
    } else {
      updateStage(job, "pptParsing", "skipped");
      log.info("PPT 미첨부 — 전달력 단독 평가 모드");
    }

    // ─── 3단계: 내용 충실도 (PPT가 있을 때만) ───
    if (job.pptData && transcript.length > 0) {
      updateStage(job, "contentFidelity", "running");
      try {
        const coverages = computeSlideCoverages(job.pptData.slides, transcript);
        // 로컬 폴백: 개념 매칭과 전달 품질은 빈 배열 (LLM 분석 미수행)
        contentFidelity = scoreContentFidelity(coverages, [], []);
        log.info("내용 충실도 계산 완료", {
          overallCoverage: contentFidelity.overallCoveragePercent,
          score: contentFidelity.score,
        });
        updateStage(job, "contentFidelity", "done");
      } catch (e) {
        log.error("내용 충실도 계산 오류", { error: e instanceof Error ? e.message : String(e) });
        updateStage(job, "contentFidelity", "error");
      }
    } else {
      updateStage(job, "contentFidelity", job.pptData ? "error" : "skipped");
      if (job.pptData) {
        log.warn("전사 데이터 없음 — 내용 충실도 계산 불가");
      }
    }

    // ─── 4단계: 멀티모달 행동 신호 추출 ───
    updateStage(job, "multimodal", "running");
    try {
      const mmRes = await fetch(`${BASE_URL}/api/twelvelabs/multimodal-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: job.videoId, channel: "all" }),
      });
      if (mmRes.ok) {
        const mmData = await mmRes.json();
        // 5채널 추출 결과에서 총점 계산 (각 채널 0-9 스케일 중 평균)
        const extracted = mmData.extracted || {};
        const channelScores: number[] = [];
        for (const chData of Object.values(extracted)) {
          if (chData && typeof chData === "object" && !("parseError" in (chData as Record<string, unknown>))) {
            // 각 채널의 observation 필드를 제외한 수치 평균으로 간이 점수 산출
            const numValues = Object.values(chData as Record<string, unknown>)
              .filter((v): v is number => typeof v === "number");
            if (numValues.length > 0) {
              // 0-1 비율 값들을 9점 스케일로 변환
              const avg = numValues.reduce((s, v) => s + v, 0) / numValues.length;
              channelScores.push(avg <= 1 ? avg * 9 : Math.min(9, avg));
            }
          }
        }
        if (channelScores.length > 0) {
          multimodalRaw = Math.round(
            (channelScores.reduce((s, v) => s + v, 0) / channelScores.length) * 10
          ) / 10;
        }
        log.info("멀티모달 추출 완료", { multimodalRaw, channelCount: channelScores.length });
      } else {
        log.warn("멀티모달 추출 API 실패 — 기본값 사용", { status: mmRes.status });
      }
      updateStage(job, "multimodal", "done");
    } catch (e) {
      log.error("멀티모달 단계 오류 — 기본값 사용", { error: e instanceof Error ? e.message : String(e) });
      updateStage(job, "multimodal", "done"); // 폴백값으로 진행
    }

    // ─── 5단계: 교수법 지표 추출 ───
    updateStage(job, "pedagogy", "running");
    try {
      const pedRes = await fetch(`${BASE_URL}/api/lecture/pedagogy-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: job.videoId }),
      });
      if (pedRes.ok) {
        const pedData = await pedRes.json();
        pedagogyIndicators = pedData.indicators || [];
        log.info("교수법 지표 추출 완료", {
          indicatorCount: pedagogyIndicators.length,
          scores: pedagogyIndicators.map((i: PedagogyIndicator) => `${i.key}=${i.score}`),
        });
      } else {
        log.warn("교수법 추출 API 실패 — 빈 지표 사용", { status: pedRes.status });
      }
      updateStage(job, "pedagogy", "done");
    } catch (e) {
      log.error("교수법 단계 오류 — 빈 지표 사용", { error: e instanceof Error ? e.message : String(e) });
      updateStage(job, "pedagogy", "done"); // 빈 지표로 진행
    }

    // ─── 6단계: 스코어링 ───
    updateStage(job, "scoring", "running");
    try {
      const delivery: DeliveryResult = scoreDelivery(multimodalRaw, pedagogyIndicators);
      const totalScore = computeTotalScore(delivery, contentFidelity);
      const { grade } = getLectureGrade(totalScore);

      // 하이라이트 생성 (간이)
      const highlights: LectureHighlight[] = [];
      if (delivery.multimodalScore >= 25) {
        highlights.push({
          timestamp: 0,
          type: "positive",
          category: "delivery",
          description: "전달력 점수가 우수 수준입니다",
        });
      }
      if (contentFidelity && contentFidelity.overallCoveragePercent >= 70) {
        highlights.push({
          timestamp: 0,
          type: "positive",
          category: "content",
          description: "슬라이드 내용 커버리지가 70% 이상입니다",
        });
      }
      if (pedagogyIndicators.some((p) => p.score >= 4)) {
        highlights.push({
          timestamp: 0,
          type: "positive",
          category: "pedagogy",
          description: "교수법 지표 중 우수한 항목이 있습니다",
        });
      }

      // 결과 저장 (report는 다음 단계에서 추가)
      job.result = {
        id: job.id,
        videoId: job.videoId,
        instructorName: job.instructorName,
        courseName: job.courseName,
        date: new Date().toISOString().split("T")[0],
        hasPpt: !!job.pptData,
        delivery,
        contentFidelity,
        totalScore,
        grade,
        highlights,
        analyzedAt: new Date().toISOString(),
      };

      log.info("스코어링 완료", { totalScore, grade });
      updateStage(job, "scoring", "done");
    } catch (e) {
      log.error("스코어링 오류", { error: e instanceof Error ? e.message : String(e) });
      updateStage(job, "scoring", "error");
      throw new Error("스코어링 실패");
    }

    // ─── 7단계: Solar 리포트 생성 ───
    updateStage(job, "reporting", "running");
    try {
      const reportRes = await fetch(`${BASE_URL}/api/solar/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoringResult: {
            totalScore: job.result!.totalScore,
            grade: job.result!.grade,
            delivery: job.result!.delivery,
            contentFidelity: job.result!.contentFidelity,
            instructorName: job.instructorName,
            courseName: job.courseName,
          },
          competencyLabel: "강의 전달력",
        }),
      });
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        job.result!.report = reportData.report || "";
        log.info("리포트 생성 완료", { model: reportData.model, length: (reportData.report || "").length });
      } else {
        log.warn("리포트 생성 API 실패", { status: reportRes.status });
      }
      updateStage(job, "reporting", "done");
    } catch (e) {
      log.error("리포트 단계 오류", { error: e instanceof Error ? e.message : String(e) });
      updateStage(job, "reporting", "done"); // 리포트 없이 진행
    }

    // ═══ 파이프라인 완료 ═══
    job.status = "complete";
    job.progress = 100;
    setJob(job);
    log.info("분석 파이프라인 완료", {
      jobId: job.id,
      totalScore: job.result?.totalScore,
      grade: job.result?.grade,
    });
  } catch (e) {
    job.status = "error";
    job.error = e instanceof Error ? e.message : "분석 파이프라인 실패";
    setJob(job);
    log.error("분석 파이프라인 실패", { jobId: job.id, error: job.error });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    const pptData = (body.pptData as ParsedPpt | null) || null;
    const instructorName = typeof body.instructorName === "string" ? body.instructorName.trim() : "미지정";
    const courseName = typeof body.courseName === "string" ? body.courseName.trim() : "미지정";

    if (!videoId) {
      log.warn("videoId 누락");
      return NextResponse.json({ error: "videoId가 필요합니다" }, { status: 400 });
    }

    // Job 생성
    const jobId = `lec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: LectureAnalysisJob = {
      id: jobId,
      videoId,
      pptData,
      instructorName,
      courseName,
      status: "analyzing",
      progress: 0,
      stages: createInitialStages(),
    };

    setJob(job);
    log.info("분석 Job 생성", { jobId, videoId, hasPpt: !!pptData, instructorName, courseName });

    // 비동기 파이프라인 실행 (fire-and-forget)
    runLectureAnalysisPipeline(job).catch((e) => {
      log.error("파이프라인 비동기 오류", { jobId, error: e instanceof Error ? e.message : String(e) });
    });

    return NextResponse.json({ jobId, status: "analyzing" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석 시작 실패";
    log.error("분석 시작 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
