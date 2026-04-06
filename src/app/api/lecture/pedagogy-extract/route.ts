// src/app/api/lecture/pedagogy-extract/route.ts
// 교수법 확장 지표 3개 추출 API
// TwelveLabs generate API로 영상에서 교수법 행동 패턴을 분석

import { NextRequest, NextResponse } from "next/server";
import { generateWithPrompt } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";
import type { PedagogyIndicator } from "@/lib/lecture-types";

const log = createLogger("API:lecture/pedagogy-extract");

const TL_API_KEY = process.env.TWELVELABS_API_KEY || "";

// 3개 교수법 지표별 프롬프트
const PEDAGOGY_PROMPTS: Record<string, string> = {
  learnerEngagement: `당신은 강의 영상에서 학습자 질문 유도 행동을 분석하는 전문 평가자입니다.

[중요 규칙]
- 반드시 순수 JSON만 출력하세요. 마크다운, 설명문, 코드블록(\`\`\`) 없이 JSON 객체만 반환합니다.

## 관찰 항목
강의자가 학습자에게 질문을 유도하거나, "이해되셨나요?", "질문 있으신 분?", "~해볼까요?", "~라고 생각하시나요?" 등
학습자 참여를 이끌어내는 발화를 찾아주세요.

## 출력 형식
{"count": 숫자, "examples": ["발화 예시1", "발화 예시2", ...]}

count: 영상 전체에서 관찰된 학습자 질문 유도 발화 횟수
examples: 대표적인 발화를 최대 5개까지 기록

위 형식과 동일하게 JSON만 출력하세요.`,

  slidePointing: `당신은 강의 영상에서 슬라이드 포인팅 행동을 분석하는 전문 평가자입니다.

[중요 규칙]
- 반드시 순수 JSON만 출력하세요. 마크다운, 설명문, 코드블록(\`\`\`) 없이 JSON 객체만 반환합니다.

## 관찰 항목
강의자가 슬라이드나 화면의 특정 부분을 손, 포인터, 레이저 등으로 가리키며 설명하는 행동을 찾아주세요.
"여기를 보시면", "이 부분에서", "화면의 이 그래프를" 등 시각 자료를 지시하며 설명하는 발화도 포함합니다.

## 출력 형식
{"count": 숫자, "examples": ["포인팅 행동 설명1", "포인팅 행동 설명2", ...]}

count: 영상 전체에서 관찰된 슬라이드 포인팅 행동 횟수
examples: 대표적인 포인팅 행동을 최대 5개까지 기록

위 형식과 동일하게 JSON만 출력하세요.`,

  transitionSignal: `당신은 강의 영상에서 요약 및 전환 시그널을 분석하는 전문 평가자입니다.

[중요 규칙]
- 반드시 순수 JSON만 출력하세요. 마크다운, 설명문, 코드블록(\`\`\`) 없이 JSON 객체만 반환합니다.

## 관찰 항목
강의자가 내용을 요약하거나, 다음 주제로 전환할 때 사용하는 시그널을 찾아주세요.
"지금까지 정리하면", "다음으로", "요약하자면", "이어서 살펴볼 내용은", "핵심은 ~입니다" 등
구조적 전환 발화를 포함합니다.

## 출력 형식
{"count": 숫자, "examples": ["전환 시그널 발화1", "전환 시그널 발화2", ...]}

count: 영상 전체에서 관찰된 요약·전환 시그널 횟수
examples: 대표적인 시그널을 최대 5개까지 기록

위 형식과 동일하게 JSON만 출력하세요.`,
};

// 지표 키 → 한국어 레이블
const INDICATOR_LABELS: Record<string, string> = {
  learnerEngagement: "학습자 질문 유도",
  slidePointing: "슬라이드 포인팅",
  transitionSignal: "요약·전환 시그널",
};

// 데모 폴백 데이터 (API 키 없을 때)
function getDemoFallback(): PedagogyIndicator[] {
  return [
    {
      key: "learnerEngagement",
      label: "학습자 질문 유도",
      score: 3,
      count: 6,
      evidence: [
        "이 부분에 대해 질문 있으신 분 계신가요?",
        "여러분은 어떻게 생각하시나요?",
        "이해가 되셨을까요?",
      ],
    },
    {
      key: "slidePointing",
      label: "슬라이드 포인팅",
      score: 4,
      count: 8,
      evidence: [
        "여기 이 그래프를 보시면 추이가 명확합니다",
        "화면 왼쪽의 표를 확인해주세요",
        "이 다이어그램에서 핵심은 여기입니다",
      ],
    },
    {
      key: "transitionSignal",
      label: "요약·전환 시그널",
      score: 3,
      count: 5,
      evidence: [
        "지금까지의 내용을 정리하면 세 가지입니다",
        "다음으로 살펴볼 주제는 안전 절차입니다",
        "요약하자면 핵심 포인트는 다음과 같습니다",
      ],
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";

    if (!videoId) {
      log.warn("videoId 누락");
      return NextResponse.json({ error: "videoId가 필요합니다" }, { status: 400 });
    }

    // API 키 없으면 데모 폴백
    if (!TL_API_KEY) {
      log.info("TwelveLabs API 키 없음 — 데모 폴백", { videoId });
      return NextResponse.json({ indicators: getDemoFallback() });
    }

    log.info("교수법 지표 3채널 추출 시작", { videoId });

    // 3개 지표 병렬 추출
    const keys = Object.keys(PEDAGOGY_PROMPTS);
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const prompt = PEDAGOGY_PROMPTS[key];
        const result = await generateWithPrompt(videoId, prompt);

        // JSON 파싱
        let parsed: { count: number; examples: string[] } = { count: 0, examples: [] };
        try {
          const text = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch {
          log.warn("교수법 지표 JSON 파싱 실패", { key });
        }

        return { key, parsed };
      })
    );

    // 결과를 PedagogyIndicator 배열로 변환
    const indicators: PedagogyIndicator[] = keys.map((key, i) => {
      const r = results[i];
      if (r.status === "fulfilled") {
        const { parsed } = r.value;
        const count = typeof parsed.count === "number" ? parsed.count : 0;
        const examples = Array.isArray(parsed.examples) ? parsed.examples : [];
        return {
          key: key as PedagogyIndicator["key"],
          label: INDICATOR_LABELS[key] || key,
          score: Math.min(5, Math.round(count / 2)),
          count,
          evidence: examples.slice(0, 5),
        };
      }
      // 실패한 지표는 0점 처리
      log.warn("교수법 지표 추출 실패", { key, reason: (r as PromiseRejectedResult).reason?.message });
      return {
        key: key as PedagogyIndicator["key"],
        label: INDICATOR_LABELS[key] || key,
        score: 0,
        count: 0,
        evidence: [],
      };
    });

    log.info("교수법 지표 추출 완료", {
      videoId,
      scores: indicators.map((i) => `${i.key}=${i.score}`).join(", "),
    });

    return NextResponse.json({ indicators });
  } catch (error) {
    const message = error instanceof Error ? error.message : "교수법 지표 추출 실패";
    log.error("교수법 지표 추출 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
