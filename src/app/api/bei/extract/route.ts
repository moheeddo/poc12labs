// BEI STAR 추출 API 라우트
// POST /api/bei/extract
// 요청: { videoId: string, transcriptSegments: { text: string; start: number; end: number; speakerId?: string }[] }
// 응답: BEIAnalysis

import { NextRequest, NextResponse } from "next/server";
import { generateWithPrompt } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";
import {
  buildSTARPrompt,
  parseSTARFromResponse,
  scoreSTARQuality,
  codeCompetency,
  buildBEIAnalysis,
} from "@/lib/bei";
import type { BEIEvent } from "@/lib/bei";

const log = createLogger("API:bei/extract");

interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  speakerId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const videoId: string =
      typeof body.videoId === "string" ? body.videoId.trim() : "";
    const transcriptSegments: TranscriptSegment[] = Array.isArray(
      body.transcriptSegments
    )
      ? body.transcriptSegments
      : [];

    if (!videoId) {
      log.warn("videoId 누락");
      return NextResponse.json(
        { error: "videoId가 필요합니다" },
        { status: 400 }
      );
    }

    if (transcriptSegments.length === 0) {
      log.warn("transcriptSegments 누락 또는 비어 있음");
      return NextResponse.json(
        { error: "transcriptSegments가 필요합니다 (빈 배열 불가)" },
        { status: 400 }
      );
    }

    log.info("BEI 추출 시작", {
      videoId,
      segmentCount: transcriptSegments.length,
    });

    // 발화자별로 세그먼트를 그룹화하여 STAR 분석 수행
    // speakerId가 없으면 "unknown"으로 처리
    const speakerMap: Record<string, TranscriptSegment[]> = {};
    for (const seg of transcriptSegments) {
      const sid = seg.speakerId ?? "unknown";
      if (!speakerMap[sid]) speakerMap[sid] = [];
      speakerMap[sid].push(seg);
    }

    const events: BEIEvent[] = [];
    let eventCounter = 0;

    for (const [speakerId, segments] of Object.entries(speakerMap)) {
      // 세그먼트를 하나의 전사 텍스트로 합산
      const transcript = segments
        .map((s) => {
          const minutes = Math.floor(s.start / 60)
            .toString()
            .padStart(2, "0");
          const seconds = Math.floor(s.start % 60)
            .toString()
            .padStart(2, "0");
          return `[${minutes}:${seconds}] ${s.text}`;
        })
        .join("\n");

      const baseTimestamp = segments[0]?.start ?? 0;

      // TwelveLabs에 STAR 추출 프롬프트 전송
      log.info("STAR 프롬프트 전송", { videoId, speakerId });
      const starPrompt = buildSTARPrompt(transcript);

      let aiResponse: string;
      try {
        const result = await generateWithPrompt(videoId, starPrompt);
        aiResponse = result.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "TwelveLabs 오류";
        log.error("TwelveLabs generateWithPrompt 실패", { speakerId, error: msg });
        // 한 발화자 실패 시 건너뛰고 계속 진행
        continue;
      }

      // AI 응답에서 STAR 구조 파싱
      const star = parseSTARFromResponse(aiResponse, baseTimestamp);

      // STAR 품질 점수 계산
      const qualityScore = scoreSTARQuality(star);

      // 역량 코딩
      const codedCompetencies = codeCompetency(star);

      // 최소 품질 점수 이하(1.5점 미만)이거나 역량 미검출 시 이벤트 포함 제외
      if (qualityScore < 1.5 && codedCompetencies.length === 0) {
        log.warn("BEI 이벤트 품질 미달 — 제외", { speakerId, qualityScore });
        continue;
      }

      eventCounter++;
      events.push({
        id: `bei-event-${eventCounter}`,
        speakerId,
        star,
        codedCompetencies,
        qualityScore,
      });

      log.info("BEI 이벤트 생성", {
        id: `bei-event-${eventCounter}`,
        speakerId,
        qualityScore,
        competencyCount: codedCompetencies.length,
      });
    }

    // 전체 BEI 분석 결과 생성
    const analysis = buildBEIAnalysis(events);

    log.info("BEI 추출 완료", {
      videoId,
      totalEvents: analysis.totalEvents,
      differentiatingCount: analysis.differentiatingCompetencies.length,
      averageCompleteness: analysis.averageCompleteness,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "BEI 추출 실패";
    log.error("BEI 추출 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
