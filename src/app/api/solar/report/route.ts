import { NextRequest, NextResponse } from "next/server";

// =============================================
// Solar Pro 2 보고서 생성 API
// 멀티모달 채점 결과 → 자연스럽고 구조화된 한국어 보고서
// rubricurl 문서 4 보고서 생성 규칙 + 금지 표현 검증
// =============================================

const SOLAR_API_KEY = process.env.SOLAR_API_KEY || process.env.UPSTAGE_API_KEY || "";
const SOLAR_API_URL = "https://api.upstage.ai/v1/chat/completions";

const REPORT_SYSTEM_PROMPT = `당신은 KHNP(한국수력원자력) 인재개발원의 리더십 역량평가 보고서를 작성하는 전문 평가관입니다.

## 보고서 작성 원칙 (rubricurl 문서 4 기준)
1. 관찰된 행동 수치와 이벤트만 근거로 사용한다.
2. 인상평("자신감 있어 보인다", "카리스마가 있다"), 성격 추정("내향적이다"), 외모·신체 관련 언급을 절대 사용하지 않는다.
3. 내용 평가("비전이 명확하다", "논리가 탄탄하다")를 사용하지 않는다.
4. 단일 신호만으로 역량을 단정하는 표현("~이기 때문에 리더십이 부족하다")을 사용하지 않는다.
5. 개선 우선순위는 점수가 낮은 항목 순으로 제시한다.
6. N/A 항목은 사유를 명확히 기술한다.

## 보고서 구성
1. **종합 평가 요약** (2~3문장)
2. **항목별 결과** (표 형식 + 행동 근거 2~4문장)
3. **개선 우선순위** (최대 3개)
4. **N/A 항목 사유**

## 톤 & 스타일
- 공기업 공식 보고서에 적합한 격식체
- 행동 관찰 기반의 객관적 서술
- 수치 데이터를 근거로 제시
- 한국어로 작성`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scoringResult, competencyLabel, scenarioText } = body;

    if (!scoringResult) {
      return NextResponse.json({ error: "scoringResult가 필요합니다" }, { status: 400 });
    }

    // Solar API 키가 없으면 로컬 템플릿 기반 보고서 생성
    if (!SOLAR_API_KEY) {
      const fallbackReport = generateFallbackReport(scoringResult, competencyLabel, scenarioText);
      return NextResponse.json({ report: fallbackReport, model: "local-template" });
    }

    const userPrompt = buildUserPrompt(scoringResult, competencyLabel, scenarioText);

    const response = await fetch(SOLAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SOLAR_API_KEY}`,
      },
      body: JSON.stringify({
        model: "solar-pro2-preview",
        messages: [
          { role: "system", content: REPORT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Solar API 오류:", error);
      // 폴백: 로컬 템플릿
      const fallbackReport = generateFallbackReport(scoringResult, competencyLabel, scenarioText);
      return NextResponse.json({ report: fallbackReport, model: "local-template", solarError: error });
    }

    const data = await response.json();
    const reportText = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ report: reportText, model: "solar-pro2-preview" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "보고서 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Solar API 호출용 사용자 프롬프트 구성
function buildUserPrompt(
  scoringResult: Record<string, unknown>,
  competencyLabel?: string,
  scenarioText?: string
): string {
  const parts: string[] = [];

  parts.push("아래 멀티모달 행동 분석 채점 결과를 기반으로 리더십 역량평가 보고서를 작성해주세요.");
  parts.push("");

  if (competencyLabel) {
    parts.push(`## 평가 역량: ${competencyLabel}`);
  }
  if (scenarioText) {
    parts.push(`## 상황사례: ${scenarioText}`);
  }

  parts.push("");
  parts.push("## 채점 결과 (JSON)");
  parts.push("```json");
  parts.push(JSON.stringify(scoringResult, null, 2));
  parts.push("```");
  parts.push("");
  parts.push("위 데이터를 바탕으로 종합 평가 요약, 항목별 행동 근거, 개선 우선순위를 포함한 보고서를 한국어로 작성해주세요.");

  return parts.join("\n");
}

// Solar API 없을 때 로컬 폴백 보고서 생성
function generateFallbackReport(
  scoringResult: Record<string, unknown>,
  competencyLabel?: string,
  _scenarioText?: string
): string {
  const items = (scoringResult as { items?: Array<{ name: string; itemScore: number | null; channel: string; observation?: string; naCount: number }> }).items || [];
  const totalScore = scoringResult.totalScore as number | null;
  const interpretation = (scoringResult.interpretation as string) || "산출 보류";

  const parts: string[] = [];

  // 종합 평가 요약
  parts.push(`## 종합 평가 요약`);
  if (totalScore !== null) {
    parts.push(`${competencyLabel || "리더십"} 역량에 대한 멀티모달 행동기반 평가 결과, 총점 ${totalScore.toFixed(1)}점(${interpretation})으로 산출되었습니다.`);
  } else {
    parts.push(`채점 가능 항목이 부족하여 총점 산출이 보류되었습니다.`);
  }

  const scored = items.filter((i) => i.itemScore !== null);
  const strong = scored.filter((i) => (i.itemScore || 0) >= 7);
  const weak = scored.filter((i) => (i.itemScore || 0) < 5);

  if (strong.length > 0) {
    parts.push(`${strong.map((i) => i.name).join(", ")} 항목에서 상위 수준의 행동 신호가 관찰되었습니다.`);
  }
  if (weak.length > 0) {
    parts.push(`${weak.map((i) => i.name).join(", ")} 항목은 루브릭 기준 대비 보완이 필요합니다.`);
  }

  // 항목별 결과
  parts.push("");
  parts.push(`## 항목별 결과`);
  items.forEach((item) => {
    const score = item.itemScore !== null ? `${item.itemScore.toFixed(1)}/9` : "N/A";
    parts.push(`### ${item.name} (${item.channel}) — ${score}`);
    if (item.observation) {
      parts.push(item.observation);
    }
    if (item.naCount > 0) {
      parts.push(`※ ${item.naCount}개 하위지표 N/A`);
    }
  });

  // 개선 우선순위
  if (weak.length > 0) {
    parts.push("");
    parts.push(`## 개선 우선순위`);
    weak.sort((a, b) => (a.itemScore || 0) - (b.itemScore || 0));
    weak.slice(0, 3).forEach((item, i) => {
      parts.push(`${i + 1}. **${item.name}** — 해당 채널(${item.channel})의 행동 기준을 참고하여 개선 계획을 수립하세요.`);
    });
  }

  return parts.join("\n");
}
