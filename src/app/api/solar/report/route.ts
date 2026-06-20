import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { ASSESSMENT_BY_KEY } from "@/lib/leadership-rubric-data";

// Vercel 서버리스 함수 타임아웃: Solar Pro 보고서 생성은 30~60초 소요
export const maxDuration = 300;

const log = createLogger("API:solar/report");

// =============================================
// Solar Pro 2 보고서 생성 API (역량별) v1.0
// 멀티모달 채점 결과 → 자연스럽고 구조화된 한국어 보고서
// 피드백 ①·⑧: competencyKey별 루브릭·시나리오·금지표현 반영
// 피드백 ④: 종합 평가 요약을 최상단에 배치
// =============================================

const SOLAR_API_KEY = process.env.SOLAR_API_KEY || process.env.UPSTAGE_API_KEY || "";
const SOLAR_API_URL = "https://api.upstage.ai/v1/chat/completions";

// 역량별 시스템 프롬프트 (금지표현·참여자 모델 동적 주입)
function buildSystemPrompt(competencyKey: string): string {
  const data = ASSESSMENT_BY_KEY[competencyKey];
  const prohibited = data?.prohibitedExpressions || [
    "자신감 있어 보인다", "카리스마가 있다", "리더답다", "내향적이다",
  ];
  const competencyLabel = data?.label || "리더십";
  const participantModel = data?.participantModel || "";
  const crossItem = data?.crossItemReference || "";

  return `당신은 KHNP(한국수력원자력) 인재개발원의 ${competencyLabel} 리더십 역량평가 보고서를 작성하는 전문 평가관입니다.

## 보고서 작성 원칙 (AI 기술 정의서 v1.0 기준)
1. 파이프라인에서 전달받은 행동 수치·비율·횟수·타임스탬프만 근거로 사용한다. 입력에 없는 지표는 "데이터 부족으로 해석 보류"로만 출력하고 임의 추정하지 않는다(N/A는 0점이 아니다).
2. 인상평·성격 추정·외모/신체 언급을 사용하지 않는다. 행동 중심 언어로만 서술한다.
3. 내용 평가(전략·논리·합의안의 우수성 등)를 하지 않는다 — 전달/상호작용 행동만 평가한다.
4. 단일 신호만으로 역량을 단정하지 않는다.
5. 총점은 핵심 4개 항목(M1~M4)만 반영하며, "표정·머리/보이는 반응의 안정성"(M5)은 보조 항목으로 총점에 반영하지 않는다.
6. 개선 우선순위는 점수가 낮은 항목 순으로 제시한다. N/A 항목은 사유를 명확히 기술한다.
${participantModel ? `7. 평가 구조: ${participantModel}` : ""}
${crossItem ? `8. 항목 간 참고정보: ${crossItem}` : ""}

## 금지 표현 (절대 사용 금지)
${prohibited.map((p) => `- "${p}"`).join("\n")}
대신 행동 중심 표현을 사용한다. 예: "청중 응시 비율이 높고 시선 이탈 빈도가 낮았습니다", "다른 참여자 발언을 받아 이어가는 반응이 반복 확인되었습니다".

## 보고서 구성 (반드시 아래 순서·형식)

## 종합 평가 요약
- 2~3문장으로 전체 평가 결과를 요약합니다. (이 섹션이 보고서 최상단입니다)
- 총점과 해석 등급(매우 우수/보통 이상/보통 미만/미흡)을 명시합니다. 총점은 M1~M4 평균이며 M5는 제외됨을 전제로 합니다.

## 항목별 세부 평가
각 항목마다 아래 구조를 반복합니다:

### [항목명] — [점수]/9 ([등급])
| 하위지표 | 측정값 | 판정 |
|---------|-------|------|
| 지표1 | 수치값 | 상위/중상/중하/미흡 |

**행동 수치 근거**: 관찰된 행동 데이터를 1~2문장으로 기술합니다.
**판정**: 항목 종합 판정을 1문장으로 기술합니다.
**개선 방향**: 구체적 개선 행동을 1~2문장으로 제시합니다.
(M5 보조 항목은 "총점 미반영 · 참고 의견"으로 표기하고 점수를 매기지 않습니다.)

## 개선 우선순위 (최대 3개)
1. 가장 낮은 점수 항목부터 순서대로 번호 목록으로 작성하고 구체적 행동 변화 방안을 제시합니다.

## N/A 항목 사유 (해당 시)
- N/A 항목이 있으면 관찰 불가 사유(화자분리·역할매핑 실패, 화질·각도 등)를 명확히 기술합니다.

## 톤 & 스타일
- 공기업 공식 보고서 격식체(~입니다, ~하였습니다), 행동 관찰 기반 객관 서술, 수치를 괄호 안에 명시.
- 전체 분량 500~700자 내외, 한국어.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scoringResult, competencyKey, competencyLabel, scenarioText } = body;

    if (!scoringResult) {
      log.warn("scoringResult 누락");
      return NextResponse.json({ error: "scoringResult가 필요합니다" }, { status: 400 });
    }

    const key = typeof competencyKey === "string" ? competencyKey : "visionPresentation";
    const label = competencyLabel || ASSESSMENT_BY_KEY[key]?.label || "리더십";

    if (!SOLAR_API_KEY) {
      log.info("Solar API 키 없음 — 로컬 템플릿 폴백", { competencyKey: key });
      return NextResponse.json({ report: generateFallbackReport(scoringResult, label), model: "local-template" });
    }

    const userPrompt = buildUserPrompt(scoringResult, label, scenarioText);

    const response = await fetch(SOLAR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SOLAR_API_KEY}` },
      body: JSON.stringify({
        model: "solar-pro2",
        messages: [
          { role: "system", content: buildSystemPrompt(key) },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2200,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      log.error("Solar API 오류 — 로컬 폴백", { status: response.status, error });
      return NextResponse.json({ report: generateFallbackReport(scoringResult, label), model: "local-template", solarError: error });
    }

    // 200 OK여도 본문이 malformed JSON(게이트웨이 HTML·잘림·점검 페이지)이거나
    // choices 없는 에러 바디일 수 있다 — 검증 후 비정상이면 로컬 폴백(가짜 'solar-pro2' 빈 보고서 방지).
    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = await response.json();
    } catch {
      log.error("Solar 200이나 본문 파싱 실패 — 로컬 폴백");
      return NextResponse.json({ report: generateFallbackReport(scoringResult, label), model: "local-template", solarError: "malformed-json" });
    }
    const reportText = data.choices?.[0]?.message?.content;
    if (!reportText || !reportText.trim()) {
      log.warn("Solar 200이나 빈/비정상 응답(choices 없음) — 로컬 폴백");
      return NextResponse.json({ report: generateFallbackReport(scoringResult, label), model: "local-template", solarError: "empty-content" });
    }
    log.info("Solar 보고서 생성 완료", { model: "solar-pro2", competencyKey: key, length: reportText.length });
    return NextResponse.json({ report: reportText, model: "solar-pro2" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "보고서 생성 실패";
    log.error("보고서 생성 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ScoringItem = {
  id: string; name: string; channel: string; totalReflected: boolean;
  itemScore: number | null; naCount: number; observation?: string;
  indicators?: Array<{ label: string; value: number | boolean | null; unit: string; judgment: string; scoreReflected: boolean }>;
};

function buildUserPrompt(scoringResult: Record<string, unknown>, competencyLabel: string, scenarioText?: string): string {
  const parts: string[] = [];
  parts.push("아래 멀티모달 행동 분석 채점 결과를 기반으로 리더십 역량평가 보고서를 작성해주세요.");
  parts.push("시스템 프롬프트의 보고서 구성(종합 요약 → 항목별 세부 평가 → 개선 우선순위 → N/A 사유)을 반드시 따르세요. 종합 평가 요약을 최상단에 두세요.");
  parts.push("");
  parts.push(`## 평가 역량: ${competencyLabel}`);
  if (scenarioText) parts.push(`## 상황사례: ${scenarioText}`);
  parts.push("");
  parts.push("## 채점 결과 (JSON) — itemScore가 null인 항목은 N/A, totalReflected=false인 항목(M5)은 총점 미반영 보조 항목");
  parts.push("```json");
  parts.push(JSON.stringify(scoringResult, null, 2));
  parts.push("```");
  parts.push("");
  parts.push("## 작성 요구사항");
  parts.push("1. 각 항목을 '행동 수치 근거 → 판정 → 개선 방향' 순으로 서술하세요.");
  parts.push("2. 측정값은 괄호 안에 수치를 명시하세요.");
  parts.push("3. markdown table로 하위지표별 측정값·판정을 정리하세요. 참고지표(scoreReflected=false)는 '참고'로 표기하세요.");
  parts.push("4. 총점은 M1~M4 평균이며 M5는 제외임을 전제로 서술하세요.");
  parts.push("5. 공기업 보고서 격식체로 작성하세요.");
  return parts.join("\n");
}

// Solar API 없을 때 로컬 폴백 보고서 (항목 기반 일반화)
function generateFallbackReport(scoringResult: Record<string, unknown>, competencyLabel: string): string {
  const sr = scoringResult as { items?: ScoringItem[]; totalScore?: number | null; totalScore100?: number | null; interpretation?: string };
  const items = sr.items || [];
  const totalScore = sr.totalScore ?? null;
  const interpretation = sr.interpretation || "산출 보류";

  const core = items.filter((i) => i.totalReflected);
  const scored = core.filter((i) => i.itemScore !== null);
  const strong = scored.filter((i) => (i.itemScore || 0) >= 7);
  const weak = scored.filter((i) => (i.itemScore || 0) < 5);

  const parts: string[] = [];

  // ── 종합 평가 요약 (최상단) ──
  parts.push(`## 종합 평가 요약`);
  parts.push("");
  if (totalScore !== null) {
    parts.push(`${competencyLabel} 역량에 대한 멀티모달 행동기반 평가 결과, 총점 **${totalScore.toFixed(1)}점**(${interpretation})으로 산출되었습니다. (총점은 핵심 4개 항목 M1~M4 평균이며, 보조 항목 M5는 총점에 반영하지 않았습니다.)`);
  } else {
    parts.push(`채점 가능한 핵심 항목이 3개 미만이어서 총점 산출을 보류하였습니다.`);
  }
  if (strong.length > 0) parts.push(`${strong.map((i) => `**${i.name}**(${(i.itemScore || 0).toFixed(1)}점)`).join(", ")} 항목에서 상위 수준의 행동 신호가 관찰되었습니다.`);
  if (weak.length > 0) parts.push(`${weak.map((i) => `**${i.name}**(${(i.itemScore || 0).toFixed(1)}점)`).join(", ")} 항목은 루브릭 기준 대비 보완이 필요합니다.`);

  // ── 항목별 세부 평가 ──
  parts.push("");
  parts.push(`## 항목별 세부 평가`);
  items.forEach((item) => {
    parts.push("");
    if (!item.totalReflected) {
      parts.push(`### ${item.name} — 총점 미반영 · 참고 의견`);
      parts.push("");
      if (item.observation) parts.push(`**참고 의견**: ${item.observation}`);
      else parts.push(`보조 항목으로 점수를 산출하지 않으며, 참고 의견 생성용으로만 활용합니다.`);
      return;
    }
    const score = item.itemScore !== null ? `${item.itemScore.toFixed(1)}/9` : "N/A";
    const grade = item.itemScore !== null
      ? item.itemScore >= 7 ? "상위" : item.itemScore >= 5 ? "중상" : item.itemScore >= 3 ? "중하" : "미흡"
      : "산출 불가";
    parts.push(`### ${item.name} — ${score} (${grade})`);
    parts.push("");
    if (item.indicators && item.indicators.length > 0) {
      parts.push(`| 하위지표 | 측정값 | 판정 |`);
      parts.push(`|---------|-------|------|`);
      item.indicators.forEach((ind) => {
        const val = ind.value === null ? "—" : typeof ind.value === "boolean" ? (ind.value ? "예" : "아니오")
          : ind.value < 1 && ind.unit === "%" ? `${(ind.value * 100).toFixed(0)}%` : `${ind.value}${ind.unit}`;
        const judg = ind.scoreReflected ? ind.judgment : `${ind.judgment}(참고)`;
        parts.push(`| ${ind.label} | ${val} | ${judg} |`);
      });
    }
    if (item.observation) {
      parts.push("");
      parts.push(`**행동 수치 근거**: ${item.observation}`);
    }
    if (item.naCount > 0) {
      parts.push("");
      parts.push(`**비고**: ${item.naCount}개 필수지표가 관찰 불가(N/A)로 처리되었습니다. 화자분리·역할매핑 실패 또는 화질·각도 등으로 해당 신호를 충분히 포착하지 못한 것으로 판단됩니다.`);
    }
  });

  // ── 개선 우선순위 ──
  parts.push("");
  parts.push(`## 개선 우선순위`);
  parts.push("");
  if (weak.length > 0) {
    [...weak].sort((a, b) => (a.itemScore || 0) - (b.itemScore || 0)).slice(0, 3).forEach((item, i) => {
      parts.push(`${i + 1}. **${item.name}** (${(item.itemScore || 0).toFixed(1)}점): 루브릭 상위 수준 기준을 참고하여 해당 항목의 행동 빈도·안정성을 높이는 연습이 권장됩니다.`);
    });
  } else if (scored.length > 0) {
    parts.push("핵심 항목이 모두 기준 이상으로, 즉각적 개선 대상은 없습니다. 현재 패턴의 지속적 유지를 권장합니다.");
  } else {
    parts.push("채점 가능 항목이 부족하여 개선 우선순위를 도출하지 못하였습니다.");
  }

  // ── N/A 항목 사유 ──
  const naList = core.filter((i) => i.itemScore === null || i.naCount > 0);
  if (naList.length > 0) {
    parts.push("");
    parts.push(`## N/A 항목 사유`);
    parts.push("");
    naList.forEach((item) => {
      if (item.itemScore === null) parts.push(`- **${item.name}**: 필수지표 전체가 관찰 불가하여 점수 산출이 보류되었습니다.`);
      else if (item.naCount > 0) parts.push(`- **${item.name}**: ${item.naCount}개 필수지표가 N/A 처리되었으며, 나머지 지표 기반으로 점수가 산출되었습니다.`);
    });
  }

  return parts.join("\n");
}
