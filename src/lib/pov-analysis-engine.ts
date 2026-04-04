// =============================================
// POV 분석 파이프라인 오케스트레이터
// 6단계: 단계검출→손물체→시퀀스매칭→HPO→임베딩→스코어링
// 인메모리 작업 관리, 배치 병렬처리, 에러 복구
// =============================================

import type {
  AnalysisJob,
  DetectedStep,
  HandObjectEvent,
  HpoToolResult,
  EmbeddingComparison,
  SegmentSimilarity,
  PovEvaluationReport,
  FundamentalScore,
  StepEvaluation,
  HpoToolEvaluation,
  SopDeviation,
  StageStatus,
} from './types';
import { searchVideos, generateWithPrompt, getSegmentedEmbeddings } from './twelvelabs';
import { getQueryTemplates, getHpoQueries } from './pov-query-templates';
import { alignSequences } from './pov-dtw';
import {
  calculateProcedureScore,
  calculateHpoScore,
  calculateFundamentalsScore,
  calculateOverallScore,
  calculateQualityAdjustedScore,
  getGrade,
  applyGradeOverride,
} from './pov-scoring';
import { analyzeRootCause } from './pov-rca';
import { HPO_PROCEDURES } from './pov-standards';
import { getGoldStandard, getBestGoldStandard, getOrFetchEmbeddings } from './pov-gold-standard';
import { TWELVELABS_INDEXES } from './constants';
import { createLogger } from './logger';
import { getCachedReport, cacheReport } from './pov-analysis-cache';
import { saveReport as saveReportToHistory } from './pov-analysis-history';

const log = createLogger('PovAnalysisEngine');

// ── 인메모리 작업 저장소 ────────────────────────
const jobStore = new Map<string, AnalysisJob>();

// ── 배치 크기 (API 속도 제한 대응) ──────────────
const BATCH_SIZE = 5;

// ── 파이프라인 버전 ─────────────────────────────
const PIPELINE_VERSION = '1.0.0';

// ── Rate-limited 배치 유틸리티 ──────────────────
/**
 * 아이템을 batchSize 단위로 묶어 병렬 처리
 * 배치 간 200ms 대기로 TwelveLabs 429 에러 방지
 */
async function rateLimitedBatch<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
    // 배치 간 200ms 대기 (rate limit 방지)
    if (i + batchSize < items.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
    }
  }
  return results;
}

// ── 공개 API ────────────────────────────────────

/** 작업 상태 조회 */
export function getJob(jobId: string): AnalysisJob | undefined {
  return jobStore.get(jobId);
}

/**
 * 분석 파이프라인 시작
 * - jobId를 즉시 반환하고, 비동기로 6단계 파이프라인을 실행
 * - getJob(jobId)로 진행 상태를 폴링
 */
export async function startAnalysis(
  videoId: string,
  procedureId: string,
  goldStandardId?: string
): Promise<string> {
  const jobId = `pov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ── 캐시 체크: 동일 영상+절차 조합이 이미 분석된 경우 즉시 반환 ──
  const cachedReport = getCachedReport(videoId, procedureId);
  if (cachedReport) {
    log.info('캐시 히트 — 파이프라인 스킵', { jobId, videoId, procedureId });
    const cachedJob: AnalysisJob = {
      id: jobId,
      videoId,
      procedureId,
      goldStandardId,
      status: 'complete',
      progress: 100,
      stages: {
        stepDetection: 'done',
        handObject: 'done',
        sequenceMatch: 'done',
        hpoVerification: 'done',
        embeddingComparison: 'done',
        scoring: 'done',
      },
      result: cachedReport,
    };
    jobStore.set(jobId, cachedJob);
    return jobId;
  }

  const job: AnalysisJob = {
    id: jobId,
    videoId,
    procedureId,
    goldStandardId,
    status: 'analyzing',
    progress: 0,
    stages: {
      stepDetection: 'pending',
      handObject: 'pending',
      sequenceMatch: 'pending',
      hpoVerification: 'pending',
      embeddingComparison: 'pending',
      scoring: 'pending',
    },
  };

  jobStore.set(jobId, job);
  log.info('분석 파이프라인 시작', { jobId, videoId, procedureId, goldStandardId });

  // 비동기 파이프라인 실행 (즉시 반환)
  runPipeline(job).catch((err) => {
    log.error('파이프라인 치명적 오류', { jobId, error: String(err) });
    job.status = 'error';
    job.error = err instanceof Error ? err.message : String(err);
  });

  return jobId;
}

// ── 파이프라인 실행 ─────────────────────────────

async function runPipeline(job: AnalysisJob): Promise<void> {
  const startTime = Date.now();
  let apiCallCount = 0;

  const procedure = HPO_PROCEDURES.find((p) => p.id === job.procedureId);
  if (!procedure) {
    throw new Error(`절차 ID '${job.procedureId}'를 찾을 수 없습니다.`);
  }

  // goldStandardId 미지정 시 해당 절차의 최고 점수 골드스탠다드 자동 선택
  if (!job.goldStandardId) {
    const best = getBestGoldStandard(job.procedureId);
    if (best) {
      job.goldStandardId = best.id;
      log.info('골드스탠다드 자동 선택', { goldStandardId: best.id, averageScore: best.averageScore });
    } else {
      log.info('자동 선택할 골드스탠다드 없음 — 임베딩 비교 단계 건너뜀');
    }
  }

  const indexId = TWELVELABS_INDEXES.pov;

  // ── 3A: 단계 검출 (Marengo Search) ────────────
  updateStage(job, 'stepDetection', 'running');
  job.progress = 5;

  const queryTemplates = getQueryTemplates(job.procedureId);
  log.info('단계 검출 시작', { stepCount: queryTemplates.length });

  const detectedSteps: DetectedStep[] = [];
  const allApiCalls = queryTemplates.map((qt) => ({
    stepId: qt.stepId,
    actionQuery: qt.actionQuery,
    objectQuery: qt.objectQuery,
    stateQuery: qt.stateQuery,
    sopText: qt.sopText,
  }));

  // 배치 처리: 5건씩 병렬 요청, 배치 간 200ms 대기 (rate limit 방지)
  const stepDetectionResults = await rateLimitedBatch(
    allApiCalls,
    BATCH_SIZE,
    async (call) => {
      // actionQuery로 검색 (가장 핵심적인 쿼리)
      apiCallCount++;
      const response = await searchVideos(indexId, call.actionQuery);
      return { ...call, response };
    }
  );

  stepDetectionResults.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      const { stepId, response } = result.value;
      const clips = response.data || [];

      // 해당 videoId에 해당하는 클립만 필터링
      const relevantClips = clips.filter((c) => c.video_id === job.videoId);

      if (relevantClips.length > 0) {
        // 가장 높은 신뢰도의 클립 사용
        const bestClip = relevantClips[0]; // API는 신뢰도 순 정렬
        const confidence = parseConfidence(bestClip.confidence);

        detectedSteps.push({
          stepId,
          status: confidence >= 70 ? 'pass' : confidence >= 40 ? 'partial' : 'fail',
          confidence,
          timestamp: bestClip.start,
          endTime: bestClip.end,
          searchScore: confidence,
        });
      } else {
        // 검출 실패
        detectedSteps.push({
          stepId,
          status: 'fail',
          confidence: 0,
          timestamp: 0,
          endTime: 0,
          searchScore: 0,
        });
      }
    } else {
      // API 오류 — 해당 스텝은 실패로 처리하고 계속 진행
      const stepId = allApiCalls[idx]?.stepId ?? 'unknown';
      log.warn('단계 검출 실패', { stepId, error: result.reason });
      detectedSteps.push({
        stepId,
        status: 'fail',
        confidence: 0,
        timestamp: 0,
        endTime: 0,
        searchScore: 0,
      });
    }
  });

  // 진행률 업데이트 (5~25% 구간)
  job.progress = 25;

  updateStage(job, 'stepDetection', 'done');
  log.info('단계 검출 완료', { detected: detectedSteps.filter((s) => s.status !== 'fail').length, total: detectedSteps.length });

  // ── 3B: 손-물체 상호작용 분석 (Pegasus Analyze) ─
  updateStage(job, 'handObject', 'running');
  job.progress = 28;

  const handObjectEvents: HandObjectEvent[] = [];

  // 검출된 단계 중 pass/partial인 것만 분석
  const passedSteps = detectedSteps.filter((s) => s.status !== 'fail' && s.timestamp > 0);

  if (passedSteps.length > 0) {
    // 배치 처리: 5건씩 Pegasus 분석, 배치 간 200ms 대기 (rate limit 방지)
    const handObjectResults = await rateLimitedBatch(
      passedSteps,
      BATCH_SIZE,
      async (step) => {
        apiCallCount++;
        const prompt = buildHandObjectPrompt(step);
        const response = await generateWithPrompt(job.videoId, prompt);
        return { stepId: step.stepId, timestamp: step.timestamp, endTime: step.endTime, text: response.data };
      }
    );

    for (const result of handObjectResults) {
      if (result.status === 'fulfilled') {
        const event = parseHandObjectResponse(result.value);
        if (event) {
          handObjectEvents.push(event);
        }
      } else {
        log.warn('손-물체 분석 실패', { error: result.reason });
      }
    }
  }

  job.progress = 40;

  updateStage(job, 'handObject', 'done');
  log.info('손-물체 분석 완료', { eventCount: handObjectEvents.length });

  // ── 3C: 시퀀스 매칭 (DTW) ─────────────────────
  updateStage(job, 'sequenceMatch', 'running');
  job.progress = 42;

  // SOP 순서: 절차의 모든 스텝 ID를 평탄화
  const sopSequence = flattenAllStepIds(procedure);

  // 검출 순서: 타임스탬프 기준 정렬 후 스텝 ID 추출
  const detectedSequence = detectedSteps
    .filter((s) => s.status !== 'fail' && s.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((s) => s.stepId);

  // 핵심 단계 Set 구성
  const criticalSteps = new Set<string>();
  for (const section of procedure.sections) {
    collectCriticalSteps(section.steps, criticalSteps);
  }

  const sequenceAlignment = alignSequences(sopSequence, detectedSequence, criticalSteps);

  updateStage(job, 'sequenceMatch', 'done');
  job.progress = 50;
  log.info('시퀀스 매칭 완료', {
    complianceScore: sequenceAlignment.complianceScore,
    criticalDeviations: sequenceAlignment.criticalDeviations,
  });

  // ── 3D: HPO 기법 적용 검증 (Marengo Search) ──
  updateStage(job, 'hpoVerification', 'running');
  job.progress = 52;

  const hpoQueries = getHpoQueries();
  const hpoResults: HpoToolResult[] = [];

  // 배치 처리: 5건씩 병렬 요청, 배치 간 200ms 대기 (rate limit 방지)
  const hpoQueryResults = await rateLimitedBatch(
    hpoQueries,
    BATCH_SIZE,
    async (hq) => {
      apiCallCount++;
      const response = await searchVideos(indexId, hq.searchQuery);
      return { hq, response };
    }
  );

  hpoQueryResults.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      const { hq, response } = result.value;
      const clips = (response.data || []).filter((c) => c.video_id === job.videoId);
      const detected = clips.length > 0;
      const bestConfidence = detected ? parseConfidence(clips[0].confidence) : 0;

      hpoResults.push({
        toolId: hq.toolId,
        toolName: hq.toolLabel,
        category: hq.category,
        detected,
        detectionCount: clips.length,
        timestamps: clips.map((c) => c.start),
        confidence: bestConfidence,
      });
    } else {
      const hq = hpoQueries[idx];
      if (hq) {
        hpoResults.push({
          toolId: hq.toolId,
          toolName: hq.toolLabel,
          category: hq.category,
          detected: false,
          detectionCount: 0,
          timestamps: [],
          confidence: 0,
        });
      }
    }
  });

  job.progress = 65;

  updateStage(job, 'hpoVerification', 'done');
  log.info('HPO 검증 완료', { total: hpoResults.length, detected: hpoResults.filter((r) => r.detected).length });

  // ── 3E: 임베딩 비교 (Marengo Embed) ──────────
  updateStage(job, 'embeddingComparison', 'running');
  job.progress = 67;

  let embeddingComparison: EmbeddingComparison | undefined;

  if (job.goldStandardId) {
    const goldStandard = getGoldStandard(job.goldStandardId);
    if (goldStandard) {
      try {
        // 골드스탠다드 임베딩: 캐시 우선, 미스 시 API 호출 후 캐시 저장
        const durationSec = estimateDuration(detectedSteps);
        apiCallCount++;
        const goldEmbeddings = await getOrFetchEmbeddings(goldStandard, durationSec);

        if (goldEmbeddings.length > 0) {
          // 피평가자 영상의 임베딩 추출 (10초 단위)
          const traineeEmbeddings = await getSegmentedEmbeddings(job.videoId, durationSec, 10);

          embeddingComparison = compareEmbeddings(
            goldEmbeddings,
            traineeEmbeddings.map((seg) => seg.embedding),
            traineeEmbeddings
          );

          log.info('임베딩 비교 완료', { avgSimilarity: embeddingComparison.averageSimilarity });
        } else {
          log.warn('골드스탠다드 임베딩 추출 실패, 임베딩 비교 건너뜀', { goldStandardId: job.goldStandardId });
        }
      } catch (err) {
        log.warn('임베딩 비교 실패', { error: String(err) });
      }
    } else {
      log.warn('골드스탠다드를 찾을 수 없음, 임베딩 비교 건너뜀', { goldStandardId: job.goldStandardId });
    }
  }

  updateStage(job, 'embeddingComparison', 'done');
  job.progress = 78;

  // ── 3F: 스코어링 ─────────────────────────────
  updateStage(job, 'scoring', 'running');
  job.progress = 80;

  // 기본수칙 역량 평가 (Pegasus로 5대 역량 스코어링)
  let fundamentalScores: FundamentalScore[] = [];
  try {
    apiCallCount++;
    fundamentalScores = await evaluateFundamentals(job.videoId);
  } catch (err) {
    log.warn('기본수칙 역량 평가 실패, 기본값 사용', { error: String(err) });
    fundamentalScores = getDefaultFundamentals();
  }

  job.progress = 88;

  // ── RCA: 이탈 근본원인 분석 ─────────────────
  sequenceAlignment.deviations.forEach((dev) => {
    dev.rootCause = analyzeRootCause(dev, detectedSteps, hpoResults, fundamentalScores);
  });

  // 점수 계산
  const rawProcedureScore = calculateProcedureScore(
    detectedSteps,
    procedure.totalSteps,
    sequenceAlignment.criticalDeviations
  );

  // 품질 가중 절차 점수: 손-물체 이벤트의 평균 qualityScore를 20% 반영
  const procedureScore = calculateQualityAdjustedScore(rawProcedureScore, handObjectEvents, 0.2);
  if (procedureScore !== rawProcedureScore) {
    log.info('품질 조정 절차 점수 적용', { rawProcedureScore, adjustedProcedureScore: procedureScore });
  }

  const hpoScore = calculateHpoScore(hpoResults);
  const fundamentalsAvg = calculateFundamentalsScore(fundamentalScores);
  const similarityScore = embeddingComparison?.averageSimilarity;

  const overallScore = calculateOverallScore(procedureScore, hpoScore, fundamentalsAvg, similarityScore);
  const grade = applyGradeOverride(getGrade(overallScore), sequenceAlignment.criticalDeviations);

  // StepEvaluation 생성 (기존 타입 호환)
  const stepEvaluations: StepEvaluation[] = detectedSteps.map((ds) => {
    const qt = queryTemplates.find((q) => q.stepId === ds.stepId);
    return {
      stepId: ds.stepId,
      description: qt?.sopText || ds.stepId,
      status: ds.status === 'fail' ? 'fail' : ds.status === 'partial' ? 'partial' : 'pass',
      confidence: ds.confidence,
      timestamp: ds.timestamp > 0 ? ds.timestamp : undefined,
    };
  });

  // HpoToolEvaluation 생성 (기존 타입 호환)
  const hpoEvaluations: HpoToolEvaluation[] = hpoResults.map((hr) => ({
    toolKey: hr.toolId,
    label: hr.toolName,
    applied: hr.detected,
    score: hr.detected ? Math.round(hr.confidence) : 0,
    evidence: hr.detected
      ? `${hr.detectionCount}회 검출 (타임스탬프: ${hr.timestamps.map((t) => `${t.toFixed(1)}s`).join(', ')})`
      : undefined,
    timestamp: hr.timestamps[0],
  }));

  // SopDeviation 변환 (DTW 이탈 → 기존 SopDeviation 타입)
  const deviations: SopDeviation[] = sequenceAlignment.deviations.map((d) => ({
    step: d.stepIds.join(', '),
    expected: d.type === 'skip' ? '수행' : d.type === 'swap' ? '정순서 수행' : 'SOP 절차 내 행동',
    actual: d.description,
    timestamp: d.timestamp ?? 0,
    severity: mapSeverity(d.severity),
  }));

  // 강점/개선점 생성
  const strengths = generateStrengths(detectedSteps, hpoResults, sequenceAlignment, fundamentalScores);
  const improvements = generateImprovements(detectedSteps, hpoResults, sequenceAlignment, fundamentalScores);

  // 요약 생성
  const summary = generateSummary(procedure.title, overallScore, grade, procedureScore, hpoScore, fundamentalsAvg);

  const processingTimeMs = Date.now() - startTime;

  // 최종 리포트 조립
  const report: PovEvaluationReport = {
    id: `report-${job.id}`,
    procedureId: procedure.id,
    procedureTitle: procedure.title,
    videoId: job.videoId,
    date: new Date().toISOString(),
    stepEvaluations,
    procedureComplianceScore: procedureScore,
    hpoEvaluations,
    hpoOverallScore: hpoScore,
    fundamentalScores,
    overallScore,
    grade,
    deviations,
    strengths,
    improvements,
    summary,
    handObjectEvents,
    sequenceAlignment,
    hpoResults,
    embeddingComparison,
    analysisMetadata: {
      analyzedAt: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
      totalApiCalls: apiCallCount,
      processingTimeMs,
    },
  };

  // 분석 결과 캐시 저장 (동일 영상 재분석 방지)
  cacheReport(job.videoId, job.procedureId, report, PIPELINE_VERSION);

  // 분석 이력 영속 저장 (서버 재시작 후에도 유지)
  try {
    saveReportToHistory(report);
    log.info('분석 이력 저장 완료', { reportId: report.id, procedureId: report.procedureId });
  } catch (err) {
    log.warn('분석 이력 저장 실패 (분석 결과에는 영향 없음)', { error: err });
  }

  job.result = report;
  job.status = 'complete';
  job.progress = 100;
  updateStage(job, 'scoring', 'done');

  log.info('파이프라인 완료', {
    jobId: job.id,
    overallScore,
    grade,
    processingTimeMs,
    apiCallCount,
  });
}

// ── 유틸리티 함수 ───────────────────────────────

/** 작업 단계 상태 업데이트 */
function updateStage(job: AnalysisJob, stage: keyof AnalysisJob['stages'], status: StageStatus): void {
  job.stages[stage] = status;
}

/** confidence 문자열을 숫자로 변환 (예: "high" → 85, "medium" → 60, "low" → 30) */
function parseConfidence(confidence: string | number): number {
  if (typeof confidence === 'number') return confidence;
  const lower = confidence.toLowerCase();
  if (lower === 'high') return 85;
  if (lower === 'medium') return 60;
  if (lower === 'low') return 30;
  // 숫자 문자열인 경우
  const parsed = parseFloat(confidence);
  return isNaN(parsed) ? 50 : parsed;
}

/** 절차의 모든 스텝 ID를 순서대로 평탄화 */
function flattenAllStepIds(procedure: { sections: { steps: { id: string; children?: { id: string; children?: unknown[] }[] }[] }[] }): string[] {
  const ids: string[] = [];
  for (const section of procedure.sections) {
    collectStepIds(section.steps, ids);
  }
  return ids;
}

/** 재귀적 스텝 ID 수집 */
function collectStepIds(
  steps: { id: string; children?: { id: string; children?: unknown[] }[] }[],
  ids: string[]
): void {
  for (const step of steps) {
    ids.push(step.id);
    if (step.children) {
      collectStepIds(step.children as typeof steps, ids);
    }
  }
}

/** 재귀적 핵심 단계 수집 */
function collectCriticalSteps(
  steps: { id: string; isCritical?: boolean; children?: typeof steps }[],
  set: Set<string>
): void {
  for (const step of steps) {
    if (step.isCritical) set.add(step.id);
    if (step.children) collectCriticalSteps(step.children, set);
  }
}

/** DTW severity → SopDeviation severity 매핑 */
function mapSeverity(severity: 'critical' | 'major' | 'minor'): 'low' | 'medium' | 'high' | 'critical' {
  switch (severity) {
    case 'critical': return 'critical';
    case 'major': return 'high';
    case 'minor': return 'low';
  }
}

/** 영상 추정 길이 (검출 스텝 중 최대 endTime 기반) */
function estimateDuration(steps: DetectedStep[]): number {
  const maxEnd = Math.max(...steps.map((s) => s.endTime), 0);
  // 최소 60초, 최대 endTime + 여유 30초
  return Math.max(60, maxEnd + 30);
}

// ── 손-물체 분석 프롬프트 / 파싱 ────────────────

/** 특정 단계에 대한 손-물체 상호작용 분석 프롬프트 생성 (품질 평가 포함) */
function buildHandObjectPrompt(step: DetectedStep): string {
  return `This is a first-person POV video of a nuclear power plant operator.
For the segment from ${step.timestamp.toFixed(1)}s to ${step.endTime.toFixed(1)}s, analyze in detail:

1. What tool/object is the operator holding? (wrench, checklist, bare hands, radio, etc.)
2. What equipment are they interacting with? (valve VG-003, pump panel, gauge, etc.)
3. Equipment state BEFORE the action? (closed, off, normal range, etc.)
4. Equipment state AFTER the action? (open, on, above threshold, etc.)
5. Action type? (turn_valve, check_gauge, press_button, write_record, etc.)
6. Does the action match standard operating procedure? (true/false)
7. Confidence level of this analysis? (0-100)
8. QUALITY ASSESSMENT (0-100): How precisely and completely was the action performed?
   - 100: Perfect execution, deliberate and complete
   - 80: Correct but slightly rushed
   - 60: Correct but incomplete (e.g., valve not fully opened)
   - 40: Attempted but significant errors
   - 20: Incorrect technique or wrong equipment
9. COACHING FEEDBACK: One specific improvement suggestion in Korean.

Respond ONLY in JSON:
{"heldObject":"...","targetEquipment":"...","stateBefore":"...","stateAfter":"...","actionType":"...","matchesSOP":true/false,"confidence":N,"qualityScore":N,"qualityFeedback":"..."}`;
}

/** Pegasus 응답에서 HandObjectEvent 파싱 */
function parseHandObjectResponse(data: {
  stepId: string;
  timestamp: number;
  endTime: number;
  text: string;
}): HandObjectEvent | null {
  try {
    const jsonMatch = data.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      stepId: data.stepId,
      timestamp: data.timestamp,
      endTime: data.endTime,
      heldObject: parsed.heldObject || '미확인',
      targetEquipment: parsed.targetEquipment || '미확인',
      actionType: parsed.actionType || '미확인',
      stateBefore: parsed.stateBefore || '미확인',
      stateAfter: parsed.stateAfter || '미확인',
      matchesSOP: parsed.matchesSOP ?? false,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
      rawDescription: data.text,
      // 품질 평가 필드 (고도화된 Pegasus 프롬프트 응답)
      qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : undefined,
      qualityFeedback: typeof parsed.qualityFeedback === 'string' && parsed.qualityFeedback
        ? parsed.qualityFeedback
        : undefined,
    };
  } catch {
    log.warn('손-물체 응답 파싱 실패', { stepId: data.stepId });
    return null;
  }
}

// ── 기본수칙 역량 평가 (Pegasus) ────────────────

/** TwelveLabs Pegasus로 5대 운전원 기본수칙 역량을 평가 */
async function evaluateFundamentals(videoId: string): Promise<FundamentalScore[]> {
  const prompt = `You are an expert nuclear power plant operator evaluator. Analyze this training video and score the operator on 5 fundamental competencies. Respond ONLY with a JSON object:
{
  "safetyAwareness": { "score": 0-100, "feedback": "한국어 피드백" },
  "procedureAdherence": { "score": 0-100, "feedback": "한국어 피드백" },
  "communicationSkill": { "score": 0-100, "feedback": "한국어 피드백" },
  "equipmentHandling": { "score": 0-100, "feedback": "한국어 피드백" },
  "situationalJudgment": { "score": 0-100, "feedback": "한국어 피드백" }
}
Evaluate based on: body language, procedure document usage, equipment manipulation, verbal communication, and overall attentiveness.`;

  const response = await generateWithPrompt(videoId, prompt);
  const jsonMatch = response.data.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    log.warn('기본수칙 역량 JSON 파싱 실패, 기본값 사용');
    return getDefaultFundamentals();
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const competencyMap: { key: string; label: string; field: string }[] = [
      { key: 'safetyAwareness', label: '안전의식', field: 'safetyAwareness' },
      { key: 'procedureAdherence', label: '절차준수', field: 'procedureAdherence' },
      { key: 'communicationSkill', label: '의사소통', field: 'communicationSkill' },
      { key: 'equipmentHandling', label: '기기취급', field: 'equipmentHandling' },
      { key: 'situationalJudgment', label: '상황판단', field: 'situationalJudgment' },
    ];

    return competencyMap.map((c) => ({
      key: c.key,
      label: c.label,
      score: typeof parsed[c.field]?.score === 'number' ? parsed[c.field].score : 50,
      feedback: parsed[c.field]?.feedback || '평가 데이터 부족',
    }));
  } catch {
    log.warn('기본수칙 역량 JSON 파싱 오류');
    return getDefaultFundamentals();
  }
}

/** 기본수칙 평가 실패 시 기본값 */
function getDefaultFundamentals(): FundamentalScore[] {
  return [
    { key: 'safetyAwareness', label: '안전의식', score: 50, feedback: 'AI 분석 실패로 기본 점수가 부여되었습니다.' },
    { key: 'procedureAdherence', label: '절차준수', score: 50, feedback: 'AI 분석 실패로 기본 점수가 부여되었습니다.' },
    { key: 'communicationSkill', label: '의사소통', score: 50, feedback: 'AI 분석 실패로 기본 점수가 부여되었습니다.' },
    { key: 'equipmentHandling', label: '기기취급', score: 50, feedback: 'AI 분석 실패로 기본 점수가 부여되었습니다.' },
    { key: 'situationalJudgment', label: '상황판단', score: 50, feedback: 'AI 분석 실패로 기본 점수가 부여되었습니다.' },
  ];
}

// ── 임베딩 비교 ─────────────────────────────────

/** 골드스탠다드 임베딩과 피평가자 임베딩 비교 */
function compareEmbeddings(
  goldEmbeddings: number[][],
  traineeEmbeddingVecs: number[][],
  traineeSegments: { start: number; end: number; embedding: number[] }[]
): EmbeddingComparison {
  const pairCount = Math.min(goldEmbeddings.length, traineeEmbeddingVecs.length);
  const segmentPairs: SegmentSimilarity[] = [];
  const gapSegments: SegmentSimilarity[] = [];
  const heatmapData: number[] = [];

  for (let i = 0; i < pairCount; i++) {
    const goldVec = goldEmbeddings[i];
    const traineeVec = traineeEmbeddingVecs[i];
    const similarity = cosineSimilarity(goldVec, traineeVec);
    const simPercent = Math.round(similarity * 100);

    const traineeSeg = traineeSegments[i] || { start: i * 10, end: (i + 1) * 10 };
    const pair: SegmentSimilarity = {
      expertStart: i * 10,
      expertEnd: (i + 1) * 10,
      traineeStart: traineeSeg.start,
      traineeEnd: traineeSeg.end,
      similarity: simPercent,
    };

    segmentPairs.push(pair);
    heatmapData.push(simPercent);

    // 유사도 50% 미만인 세그먼트를 갭으로 분류
    if (simPercent < 50) {
      gapSegments.push(pair);
    }
  }

  const averageSimilarity =
    segmentPairs.length > 0
      ? Math.round(segmentPairs.reduce((sum, p) => sum + p.similarity, 0) / segmentPairs.length)
      : 0;

  return {
    segmentPairs,
    averageSimilarity,
    gapSegments,
    heatmapData,
  };
}

/** 코사인 유사도 계산 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ── 강점 / 개선점 생성 ─────────────────────────

/** 분석 결과 기반 강점 목록 생성 (한국어) */
function generateStrengths(
  steps: DetectedStep[],
  hpoResults: HpoToolResult[],
  alignment: { complianceScore: number; criticalDeviations: number },
  fundamentals: FundamentalScore[]
): string[] {
  const strengths: string[] = [];

  const passRate = steps.length > 0
    ? steps.filter((s) => s.status === 'pass').length / steps.length
    : 0;

  if (passRate >= 0.8) {
    strengths.push(`절차 수행 정확도 우수 (${Math.round(passRate * 100)}% 통과)`);
  }

  if (alignment.complianceScore >= 80) {
    strengths.push(`SOP 절차 준수율 높음 (${alignment.complianceScore}%)`);
  }

  if (alignment.criticalDeviations === 0) {
    strengths.push('핵심 단계 이탈 없음 — 안전 관련 절차를 정확히 수행함');
  }

  const detectedHpoCount = hpoResults.filter((r) => r.detected).length;
  if (detectedHpoCount >= 6) {
    strengths.push(`HPO 기법 ${detectedHpoCount}개 항목 적용 확인 — 인적오류 예방 의식 우수`);
  }

  const highFundamentals = fundamentals.filter((f) => f.score >= 75);
  for (const f of highFundamentals) {
    strengths.push(`${f.label} 역량 우수 (${f.score}점)`);
  }

  if (strengths.length === 0) {
    strengths.push('분석 완료 — 세부 결과를 확인하세요');
  }

  return strengths;
}

/** 분석 결과 기반 개선점 목록 생성 (한국어) */
function generateImprovements(
  steps: DetectedStep[],
  hpoResults: HpoToolResult[],
  alignment: { complianceScore: number; criticalDeviations: number; deviations: { type: string; stepIds: string[]; description: string }[] },
  fundamentals: FundamentalScore[]
): string[] {
  const improvements: string[] = [];

  const failCount = steps.filter((s) => s.status === 'fail').length;
  if (failCount > 3) {
    improvements.push(`${failCount}개 단계 미수행 확인 — 절차 숙지도 향상 필요`);
  }

  if (alignment.criticalDeviations > 0) {
    improvements.push(`핵심 단계 ${alignment.criticalDeviations}건 이탈 — 안전 관련 절차 재교육 필요`);
  }

  const swaps = alignment.deviations.filter((d) => d.type === 'swap');
  if (swaps.length > 0) {
    improvements.push(`절차 순서 역전 ${swaps.length}건 발생 — SOP 순서 준수 강화 필요`);
  }

  const missingHpo = hpoResults.filter((r) => !r.detected && r.category === 'fundamental');
  if (missingHpo.length > 0) {
    const names = missingHpo.map((r) => r.toolName).join(', ');
    improvements.push(`기본 HPO 기법 미적용: ${names} — 인적오류 예방기법 훈련 필요`);
  }

  const lowFundamentals = fundamentals.filter((f) => f.score < 50);
  for (const f of lowFundamentals) {
    improvements.push(`${f.label} 역량 부족 (${f.score}점) — 집중 개선 필요`);
  }

  if (improvements.length === 0) {
    improvements.push('전반적으로 양호 — 지속적인 훈련으로 역량 유지 권장');
  }

  return improvements;
}

// ── 요약 생성 ───────────────────────────────────

/** 전체 평가 요약 문장 생성 (한국어) */
function generateSummary(
  procedureTitle: string,
  overallScore: number,
  grade: string,
  procedureScore: number,
  hpoScore: number,
  fundamentalsAvg: number
): string {
  return `[${procedureTitle}] 절차 수행에 대한 AI 자동 분석 결과, ` +
    `종합 점수 ${overallScore}점(${grade}등급)으로 평가되었습니다. ` +
    `절차 준수 ${procedureScore}점, HPO 기법 적용 ${hpoScore}점, ` +
    `기본수칙 역량 ${fundamentalsAvg}점입니다.`;
}
