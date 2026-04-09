// POST /api/session/create
// 훈련 세션 생성 + 운전원별 비동기 분석 파이프라인 오케스트레이션
import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession, updateSession, updateOperator } from '@/lib/session-store';
import { startAnalysis, getJob } from '@/lib/pov-analysis-engine';
import { syncTranscripts } from '@/lib/transcript-sync';
import type { TrainingSession, SessionSummary } from '@/lib/session-types';
import type { TranscriptSegment } from '@/lib/types';

export const maxDuration = 300; // Vercel 타임아웃 5분

const API_KEY = () => process.env.TWELVELABS_API_KEY;
const API_URL = () => process.env.TWELVELABS_API_URL || 'https://api.twelvelabs.io/v1.3';
const POV_INDEX_ID = () => process.env.TWELVELABS_POV_INDEX_ID || '69ccf4b881e81bcd08ca5488';

// ── TwelveLabs 영상 업로드 (URL 방식) ────────────
async function uploadVideoUrl(videoUrl: string): Promise<string> {
  const formData = new FormData();
  formData.append('index_id', POV_INDEX_ID());
  formData.append('video_url', videoUrl);

  const res = await fetch(`${API_URL()}/tasks`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY()! },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TwelveLabs 업로드 실패 (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data._id as string; // taskId
}

// ── TwelveLabs 태스크 폴링 (인덱싱 완료 대기) ────
async function pollTaskUntilReady(taskId: string): Promise<string> {
  const maxAttempts = 120; // 최대 10분 (5초 간격)
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${API_URL()}/tasks/${taskId}`, {
      headers: { 'x-api-key': API_KEY()! },
    });

    if (!res.ok) {
      throw new Error(`태스크 상태 조회 실패 (${res.status})`);
    }

    const data = await res.json();
    if (data.status === 'ready') {
      return data.video_id as string;
    }
    if (data.status === 'failed') {
      throw new Error(`TwelveLabs 인덱싱 실패: ${data.error || '알 수 없는 오류'}`);
    }

    // 5초 대기 후 재시도
    await new Promise<void>((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error('TwelveLabs 인덱싱 시간 초과 (10분)');
}

// ── TwelveLabs 전사문 가져오기 ────────────────────
async function fetchTranscription(videoId: string): Promise<TranscriptSegment[]> {
  const res = await fetch(`${API_URL()}/videos/${videoId}/transcription`, {
    headers: { 'x-api-key': API_KEY()! },
  });

  if (!res.ok) {
    // 전사문이 없을 수 있음 — 빈 배열 반환
    return [];
  }

  const data = await res.json();
  // TwelveLabs 전사문 → TranscriptSegment 변환
  const segments: TranscriptSegment[] = (data.data || []).map((seg: { start: number; end: number; value?: string; text?: string }) => ({
    start: seg.start,
    end: seg.end,
    text: seg.value || seg.text || '',
  }));
  return segments;
}

// ── 분석 잡 폴링 (완료 대기) ─────────────────────
async function pollJobUntilComplete(jobId: string): Promise<void> {
  const maxAttempts = 120;
  for (let i = 0; i < maxAttempts; i++) {
    const job = getJob(jobId);
    if (!job) throw new Error(`작업을 찾을 수 없음: ${jobId}`);
    if (job.status === 'complete') return;
    if (job.status === 'error') throw new Error(job.error || '분석 실패');

    await new Promise<void>((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error('분석 작업 시간 초과');
}

// ── 운전원 1명 분석 파이프라인 ────────────────────
async function processOperator(
  sessionId: string,
  role: 'operatorA' | 'operatorB',
  videoUrl: string,
  procedureId: string,
  demoMode: boolean,
): Promise<void> {
  try {
    let videoId: string;

    if (demoMode) {
      // 데모 모드: 가짜 videoId 생성, TwelveLabs 업로드 건너뜀
      videoId = `demo-${role}-${Date.now()}`;
      updateOperator(sessionId, role, { videoId, status: 'analyzing', progress: 20 });
    } else {
      // 1) TwelveLabs에 영상 업로드
      updateOperator(sessionId, role, { status: 'uploading', progress: 5 });
      const taskId = await uploadVideoUrl(videoUrl);
      updateOperator(sessionId, role, { progress: 10 });

      // 2) 인덱싱 완료 폴링
      videoId = await pollTaskUntilReady(taskId);
      updateOperator(sessionId, role, { videoId, status: 'analyzing', progress: 20 });
    }

    // 3) POV 분석 파이프라인 시작
    const jobId = await startAnalysis(videoId, procedureId);
    updateOperator(sessionId, role, { progress: 30 });

    // 4) 분석 완료 대기
    await pollJobUntilComplete(jobId);
    const job = getJob(jobId);
    updateOperator(sessionId, role, { progress: 80 });

    // 5) 전사문 가져오기
    let transcription: TranscriptSegment[] = [];
    if (!demoMode) {
      transcription = await fetchTranscription(videoId);
    }

    // 6) 운전원 슬롯 업데이트
    updateOperator(sessionId, role, {
      report: job?.result,
      transcription,
      status: 'complete',
      progress: 100,
    });
  } catch (error) {
    updateOperator(sessionId, role, {
      status: 'error',
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
}

// ── 세션 완료 후 처리 (동기화 + 요약) ─────────────
async function finalizeSession(sessionId: string): Promise<void> {
  const session = getSession(sessionId);
  if (!session) return;

  // 완료된 운전원 수집
  const completedOps = session.operators.filter((op) => op.status === 'complete');

  // 전사문 동기화 (2명 이상 완료 시)
  const opsWithTranscripts = completedOps.filter(
    (op) => op.transcription && op.transcription.length > 0,
  );

  if (opsWithTranscripts.length >= 2) {
    updateSession(sessionId, { status: 'syncing' });
    const syncResult = syncTranscripts(
      opsWithTranscripts[0].transcription!,
      opsWithTranscripts[1].transcription!,
    );
    updateSession(sessionId, { syncResult });
  }

  // 세션 요약 생성
  const grades = completedOps.map((op) => ({
    name: op.name,
    role: op.role,
    grade: op.report?.grade || '-',
    score: op.report?.overallScore || 0,
  }));

  const scores = grades.map((g) => g.score).filter((s) => s > 0);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // 비교 하이라이트 생성
  const comparisonHighlights: string[] = [];
  if (grades.length >= 2) {
    const sorted = [...grades].sort((a, b) => b.score - a.score);
    const diff = sorted[0].score - sorted[sorted.length - 1].score;
    comparisonHighlights.push(
      `최고 점수: ${sorted[0].name} (${sorted[0].score}점, ${sorted[0].grade})`,
    );
    if (diff > 0) {
      comparisonHighlights.push(`점수 차이: ${diff}점`);
    }
  }

  const summary: SessionSummary = {
    averageScore,
    grades,
    comparisonHighlights,
  };

  updateSession(sessionId, { summary, status: 'complete' });
}

// ── POST 핸들러 ──────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { procedureId, procedureTitle, operators, instructorVideoUrl } = body;

    // 입력 검증
    if (!procedureId || !procedureTitle || !operators || !Array.isArray(operators) || operators.length === 0) {
      return NextResponse.json(
        { error: 'procedureId, procedureTitle, operators는 필수입니다' },
        { status: 400 },
      );
    }

    // 세션 생성
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: TrainingSession = {
      id: sessionId,
      procedureId,
      procedureTitle,
      createdAt: new Date().toISOString(),
      status: 'analyzing',
      operators: operators.map((op: { role: 'operatorA' | 'operatorB'; name: string; videoUrl: string }) => ({
        role: op.role,
        name: op.name,
        videoUrl: op.videoUrl,
        status: 'pending' as const,
        progress: 0,
      })),
      instructorSlot: instructorVideoUrl
        ? { videoUrl: instructorVideoUrl, status: 'pending' as const }
        : undefined,
    };

    createSession(session);

    // 데모 모드 판정
    const demoMode = !API_KEY() || API_KEY()!.length <= 10;

    // 비동기 백그라운드 파이프라인 시작 (응답 즉시 반환)
    (async () => {
      try {
        // 모든 운전원 병렬 분석
        await Promise.all(
          session.operators.map((op) =>
            processOperator(sessionId, op.role, op.videoUrl || '', procedureId, demoMode),
          ),
        );

        // 세션 마무리 (동기화 + 요약)
        await finalizeSession(sessionId);
      } catch (error) {
        updateSession(sessionId, {
          status: 'error',
        });
      }
    })();

    return NextResponse.json({ sessionId, status: 'analyzing' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '세션 생성 실패' },
      { status: 500 },
    );
  }
}
