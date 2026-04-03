import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:solar/report");

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

## 보고서 구성 (반드시 아래 순서와 형식을 따르세요)

### 1. 종합 평가 요약
- 2~3문장으로 전체 평가 결과를 요약합니다.
- 총점과 해석 등급(상위/중상/중하/미흡)을 명시합니다.

### 2. 항목별 세부 평가
각 항목마다 아래 구조를 반복합니다:

#### [항목명] — [점수]/9 ([등급])
| 하위지표 | 측정값 | 판정 |
|---------|-------|------|
| 지표1 | 수치값 | 상위/중상/중하/미흡 |

**행동 수치 근거**: 관찰된 행동 데이터를 1~2문장으로 기술합니다.
**판정**: 해당 항목의 종합 판정을 1문장으로 기술합니다.
**개선 방향**: 구체적인 개선 행동을 1~2문장으로 제시합니다.

### 3. 개선 우선순위 (최대 3개)
1. 가장 낮은 점수 항목부터 순서대로 번호 목록으로 작성합니다.
2. 각 항목에 대해 구체적인 행동 변화 방안을 제시합니다.

### 4. N/A 항목 사유 (해당 시)
- N/A 항목이 있는 경우 관찰 불가 사유를 명확히 기술합니다.

## 톤 & 스타일
- 공기업 공식 보고서에 적합한 격식체 (~입니다, ~됩니다, ~하였습니다)
- 행동 관찰 기반의 객관적 서술 — 추측이나 감정적 표현 배제
- 수치 데이터를 괄호 안에 명시하여 근거를 제시
- 전체 분량: 400~600자 내외
- 한국어로 작성`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scoringResult, competencyLabel, scenarioText } = body;

    if (!scoringResult) {
      log.warn("scoringResult 누락");
      return NextResponse.json({ error: "scoringResult가 필요합니다" }, { status: 400 });
    }

    // Solar API 키가 없으면 로컬 템플릿 기반 보고서 생성
    if (!SOLAR_API_KEY) {
      log.info("Solar API 키 없음 — 로컬 템플릿 폴백", { competencyLabel });
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
        model: "solar-pro2",
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
      log.error("Solar API 오류 — 로컬 폴백", { status: response.status, error });
      // 폴백: 로컬 템플릿
      const fallbackReport = generateFallbackReport(scoringResult, competencyLabel, scenarioText);
      return NextResponse.json({ report: fallbackReport, model: "local-template", solarError: error });
    }

    const data = await response.json();
    const reportText = data.choices?.[0]?.message?.content || "";

    log.info("Solar 보고서 생성 완료", { model: "solar-pro2", length: reportText.length });
    return NextResponse.json({ report: reportText, model: "solar-pro2" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "보고서 생성 실패";
    log.error("보고서 생성 실패", { error: message });
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
  parts.push("시스템 프롬프트에 명시된 보고서 구성(종합 요약 → 항목별 세부 평가 → 개선 우선순위 → N/A 사유)을 반드시 따르세요.");
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
  parts.push("## 작성 요구사항");
  parts.push("1. 각 항목에 대해 '행동 수치 근거 → 판정 → 개선 방향' 순서로 서술하세요.");
  parts.push("2. 측정값은 반드시 괄호 안에 수치를 명시하세요 (예: 청중 응시 비율 0.62).");
  parts.push("3. 표(markdown table)를 활용하여 하위지표별 측정값과 판정을 정리하세요.");
  parts.push("4. 공기업 보고서 격식체(~입니다, ~하였습니다)로 작성하세요.");

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
  parts.push("");
  if (totalScore !== null) {
    parts.push(`${competencyLabel || "리더십"} 역량에 대한 멀티모달 행동기반 평가 결과, 총점 **${totalScore.toFixed(1)}점**(${interpretation})으로 산출되었습니다.`);
  } else {
    parts.push(`채점 가능 항목이 부족하여 총점 산출이 보류되었습니다.`);
  }

  const scored = items.filter((i) => i.itemScore !== null);
  const strong = scored.filter((i) => (i.itemScore || 0) >= 7);
  const weak = scored.filter((i) => (i.itemScore || 0) < 5);

  if (strong.length > 0) {
    parts.push(`${strong.map((i) => `**${i.name}**(${(i.itemScore || 0).toFixed(1)}점)`).join(", ")} 항목에서 상위 수준의 행동 신호가 관찰되었습니다.`);
  }
  if (weak.length > 0) {
    parts.push(`${weak.map((i) => `**${i.name}**(${(i.itemScore || 0).toFixed(1)}점)`).join(", ")} 항목은 루브릭 기준 대비 보완이 필요합니다.`);
  }

  // 항목별 세부 평가
  parts.push("");
  parts.push(`## 항목별 세부 평가`);
  items.forEach((item) => {
    const score = item.itemScore !== null ? `${item.itemScore.toFixed(1)}/9` : "N/A";
    const grade = item.itemScore !== null
      ? item.itemScore >= 7 ? "상위" : item.itemScore >= 5 ? "중상" : item.itemScore >= 3 ? "중하" : "미흡"
      : "산출 불가";
    parts.push("");
    parts.push(`### ${item.name} — ${score} (${grade})`);
    parts.push("");
    parts.push(`| 구분 | 내용 |`);
    parts.push(`|------|------|`);
    parts.push(`| 분석 채널 | ${item.channel} |`);
    parts.push(`| 점수 | ${score} |`);
    parts.push(`| 등급 | ${grade} |`);
    if (item.observation) {
      parts.push("");
      parts.push(`**행동 수치 근거**: ${item.observation}`);
    }
    if (item.naCount > 0) {
      parts.push("");
      parts.push(`**비고**: ${item.naCount}개 하위지표가 관찰 불가(N/A)로 처리되었습니다. 영상 화질, 카메라 각도 등의 이유로 해당 행동 신호를 충분히 포착하지 못한 것으로 판단됩니다.`);
    }
  });

  // 개선 우선순위
  parts.push("");
  parts.push(`## 개선 우선순위`);
  parts.push("");
  if (weak.length > 0) {
    weak.sort((a, b) => (a.itemScore || 0) - (b.itemScore || 0));
    weak.slice(0, 3).forEach((item, i) => {
      const channelAdvice: Record<string, string> = {
        gaze: "청중을 향한 시선 유지 비율을 높이고, 자료 확인 시에도 빠르게 청중 방향으로 복귀하는 연습이 권장됩니다.",
        voice: "음높이와 음량의 변화폭을 의식적으로 넓히고, 핵심 메시지 전달 시 강조 포인트를 명확히 하는 훈련이 권장됩니다.",
        fluency: "발화 속도를 안정적으로 유지하고, 채움말(어, 음) 사용을 줄이기 위한 사전 리허설이 권장됩니다.",
        posture: "개방적 자세를 의식적으로 유지하고, 발화 내용과 동기화된 목적형 제스처를 활용하는 훈련이 권장됩니다.",
        face: "안정적이고 집중된 표정을 유지하며, 불필요한 얼굴 긴장이나 머리 움직임을 줄이는 연습이 권장됩니다.",
      };
      const advice = channelAdvice[item.channel] || "해당 채널의 행동 기준을 참고하여 개선 계획을 수립하시기 바랍니다.";
      parts.push(`${i + 1}. **${item.name}** (${(item.itemScore || 0).toFixed(1)}점): ${advice}`);
    });
  } else if (scored.length > 0) {
    parts.push("모든 항목이 기준 이상의 수준을 보이고 있어 즉각적인 개선 대상은 없습니다. 지속적인 역량 유지를 권장합니다.");
  } else {
    parts.push("채점 가능 항목이 부족하여 개선 우선순위를 도출하지 못하였습니다.");
  }

  // N/A 항목 사유
  const naItems = items.filter((i) => i.itemScore === null || i.naCount > 0);
  if (naItems.length > 0) {
    parts.push("");
    parts.push(`## N/A 항목 사유`);
    parts.push("");
    naItems.forEach((item) => {
      if (item.itemScore === null) {
        parts.push(`- **${item.name}**: 해당 채널(${item.channel})의 하위지표 전체가 관찰 불가하여 점수 산출이 보류되었습니다.`);
      } else if (item.naCount > 0) {
        parts.push(`- **${item.name}**: ${item.naCount}개 하위지표가 N/A 처리되었으며, 나머지 지표 기반으로 점수가 산출되었습니다.`);
      }
    });
  }

  return parts.join("\n");
}
