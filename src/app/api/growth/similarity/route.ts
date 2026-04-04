// API 라우트: POST /api/growth/similarity
// 두 영상의 임베딩 벡터를 받아 코사인 유사도 기반 비교 보고서를 반환한다

import { NextRequest, NextResponse } from "next/server";
import { compareEmbeddings } from "@/lib/growth";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:growth:similarity");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { embedding1, embedding2, videoId1, videoId2 } = body;

    // 필수 파라미터 검증
    if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
      log.warn("임베딩 파라미터 형식 오류");
      return NextResponse.json(
        { error: "embedding1과 embedding2는 숫자 배열이어야 합니다" },
        { status: 400 }
      );
    }

    if (embedding1.length === 0 || embedding2.length === 0) {
      log.warn("임베딩 배열이 비어있음");
      return NextResponse.json(
        { error: "임베딩 배열은 비어있을 수 없습니다" },
        { status: 400 }
      );
    }

    // 임베딩 값이 모두 숫자인지 검증 (샘플링: 최대 10개)
    const sample1 = embedding1.slice(0, 10);
    const sample2 = embedding2.slice(0, 10);
    if (
      sample1.some((v: unknown) => typeof v !== "number") ||
      sample2.some((v: unknown) => typeof v !== "number")
    ) {
      log.warn("임베딩 배열에 비숫자 값 포함");
      return NextResponse.json(
        { error: "임베딩 배열의 모든 요소는 숫자여야 합니다" },
        { status: 400 }
      );
    }

    const vid1 =
      typeof videoId1 === "string" && videoId1.trim()
        ? videoId1.trim()
        : "video-1";
    const vid2 =
      typeof videoId2 === "string" && videoId2.trim()
        ? videoId2.trim()
        : "video-2";

    log.info("임베딩 유사도 비교 시작", {
      videoId1: vid1,
      videoId2: vid2,
      dim1: embedding1.length,
      dim2: embedding2.length,
    });

    const report = compareEmbeddings(embedding1, embedding2, vid1, vid2);

    log.info("임베딩 유사도 비교 완료", {
      videoId1: vid1,
      videoId2: vid2,
      similarity: report.overallSimilarity,
    });

    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "유사도 계산 실패";
    log.error("임베딩 유사도 비교 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
