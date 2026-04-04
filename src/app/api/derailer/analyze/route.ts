// POST /api/derailer/analyze
// 참여자 영상에 대한 Hogan HDS 탈선 패턴 분석 API 라우트

import { NextRequest, NextResponse } from "next/server";
import { generateWithPrompt } from "@/lib/twelvelabs";
import {
  DERAILER_PATTERNS,
  buildDerailerPrompt,
  parseDerailerResponse,
  buildDerailerProfile,
} from "@/lib/derailer";
import type { DerailerPattern } from "@/lib/derailer";

/**
 * 요청 바디 타입
 */
interface AnalyzeRequest {
  /** TwelveLabs 영상 ID */
  videoId: string;
  /** 분석 대상 참여자 ID */
  participantId: string;
  /** 분석 시나리오 유형: 정상 운전 / 비상 상황 */
  scenarioType: "normal" | "emergency";
}

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;

  // 요청 바디 파싱
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "요청 바디를 파싱할 수 없습니다." },
      { status: 400 }
    );
  }

  const { videoId, participantId, scenarioType } = body;

  // 필수 파라미터 검증
  if (!videoId || typeof videoId !== "string") {
    return NextResponse.json(
      { error: "videoId가 필요합니다." },
      { status: 400 }
    );
  }
  if (!participantId || typeof participantId !== "string") {
    return NextResponse.json(
      { error: "participantId가 필요합니다." },
      { status: 400 }
    );
  }
  if (scenarioType !== "normal" && scenarioType !== "emergency") {
    return NextResponse.json(
      { error: "scenarioType은 'normal' 또는 'emergency'여야 합니다." },
      { status: 400 }
    );
  }

  // 11개 패턴 순차 분석
  // TwelveLabs API 레이트 리밋을 고려해 순차 처리
  const patterns: DerailerPattern[] = [];

  for (const patternDef of DERAILER_PATTERNS) {
    try {
      // 1. 패턴별 프롬프트 생성
      const prompt = buildDerailerPrompt(patternDef);

      // 2. TwelveLabs generate API 호출
      const result = await generateWithPrompt(videoId, prompt);

      // 3. AI 응답 파싱 → DerailerPattern
      const pattern = parseDerailerResponse(patternDef, result.data, scenarioType);
      patterns.push(pattern);
    } catch (err) {
      // 개별 패턴 분석 실패 시 기본값(점수 0)으로 대체하여 전체 분석 중단 방지
      console.error(`[derailer] ${patternDef.id} 패턴 분석 실패:`, err);
      patterns.push({
        id: patternDef.id,
        name: patternDef.name,
        hoganScale: patternDef.hoganScale,
        riskLevel: "low",
        score: 0,
        evidence: [],
        developmentTip: patternDef.developmentTip,
      });
    }
  }

  // 4. DerailerProfile 종합 생성
  const profile = buildDerailerProfile(participantId, scenarioType, patterns);

  return NextResponse.json(profile);
}
