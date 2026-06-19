import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { LEADERSHIP_COMPETENCY_DEFS } from "@/lib/constants";

export const maxDuration = 300;
const log = createLogger("API:solar/content-eval");

// =============================================
// 내용(content) 평가 — [최소 프로토타입] · 행동 평가와 분리된 별도 레이어
// 출처: dohan 1원칙(인용 없으면 출력 차단 fail-closed) + 보고서(26.6.18) HITL
//
// 행동 레이어(멀티모달)와 달리 "내용의 타당성"을 평가하므로 위험이 크다.
// 따라서: ① 전사 원문 인용 근거가 없으면 점수 보류(fail-closed)
//        ② 결과는 항상 "AI 초안 · 전문가(교수) 확정 필요" 라벨
//        ③ 행동 총점과 절대 합산하지 않음
// =============================================

const SOLAR_API_KEY = process.env.SOLAR_API_KEY || process.env.UPSTAGE_API_KEY || "";
const SOLAR_API_URL = "https://api.upstage.ai/v1/chat/completions";

const SYSTEM_PROMPT = `당신은 KHNP 인재개발원의 리더십 역량평가에서 "내용(content) 평가 초안"을 작성하는 보조자입니다.
이 평가는 행동(전달) 평가와 분리된 별도 레이어이며, 최종 판정은 사람(교수)이 합니다.

## 절대 규칙 (fail-closed)
1. 각 평가 기준에 대해 점수를 매기려면 반드시 전사(transcript) 원문에서 그 판단을 뒷받침하는 직접 인용 문장이 있어야 한다.
2. 뒷받침하는 인용을 찾을 수 없으면 score를 null로 두고 grade를 "근거 부족 — 보류"로 출력한다. 절대 추측으로 점수를 만들지 않는다.
3. evidence에는 전사에서 실제로 등장한 문장을 그대로(축약 가능) 인용한다. 없으면 빈 문자열.
4. 인상평·성격 추정·외모 언급 금지. 평가 기준에 명시된 내용 측면만 본다.
5. 점수는 0~9 정수. 등급: 7~9 우수 / 4~6 보통 / 1~3 미흡.

## 출력 형식 (순수 JSON만)
{"criteria":[{"criteria":"기준명","score":7,"grade":"우수","evidence":"전사 인용","rationale":"인용이 왜 이 점수를 뒷받침하는지 1문장"}],"overallNote":"내용 평가 종합 1~2문장 (행동 평가와 별개임을 전제)"}
근거 부족 항목 예: {"criteria":"기준명","score":null,"grade":"근거 부족 — 보류","evidence":"","rationale":"전사에서 해당 내용을 확인할 수 없음"}`;

type CriterionResult = { criteria: string; score: number | null; grade: string; evidence: string; rationale: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const competencyKey = typeof body.competencyKey === "string" ? body.competencyKey : "";
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    const scenarioText = typeof body.scenarioText === "string" ? body.scenarioText : "";

    const def = LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === competencyKey);
    if (!def || !def.rubric || def.rubric.length === 0) {
      return NextResponse.json({ error: `내용 평가 루브릭이 없는 역량: ${competencyKey}` }, { status: 400 });
    }

    // fail-closed: 전사가 부족하면 내용 평가 보류 (추측 금지)
    if (transcript.length < 50) {
      const held: CriterionResult[] = def.rubric.map((r) => ({
        criteria: r.criteria, score: null, grade: "근거 부족 — 보류", evidence: "",
        rationale: "전사(대본)가 부족하여 내용 평가를 보류합니다.",
      }));
      return NextResponse.json({
        criteria: held, overallNote: "전사 데이터 부족으로 내용 평가를 보류했습니다 (fail-closed).",
        model: "held", draft: true, competencyLabel: def.label,
      });
    }

    // Solar 키 없으면 보류 (내용 평가는 근거 없이 생성하지 않음)
    if (!SOLAR_API_KEY) {
      log.info("Solar 키 없음 — 내용 평가 보류(fail-closed)", { competencyKey });
      const held: CriterionResult[] = def.rubric.map((r) => ({
        criteria: r.criteria, score: null, grade: "근거 부족 — 보류", evidence: "",
        rationale: "내용 평가 모델 미연결로 보류합니다. (온프렘 LLM 연결 시 활성화)",
      }));
      return NextResponse.json({
        criteria: held, overallNote: "내용 평가 모델 미연결 — 보류 (fail-closed: 근거 없이 점수를 만들지 않습니다).",
        model: "held", draft: true, competencyLabel: def.label,
      });
    }

    const userPrompt = [
      `## 평가 역량: ${def.label}`,
      def.definition ? `역량 정의: ${def.definition}` : "",
      scenarioText ? `## 상황사례\n${scenarioText}` : "",
      `## 내용 평가 기준 (각 기준마다 점수+인용)`,
      ...def.rubric.map((r, i) => `${i + 1}. ${r.criteria} — ${r.description}`),
      `## 전사(transcript)`,
      transcript.slice(0, 8000),
      `위 전사만을 근거로, 각 기준을 채점하되 인용 근거가 없으면 보류하세요. 순수 JSON만 출력하세요.`,
    ].filter(Boolean).join("\n\n");

    const response = await fetch(SOLAR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SOLAR_API_KEY}` },
      body: JSON.stringify({
        model: "solar-pro2",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      log.error("Solar 내용 평가 오류 — 보류", { status: response.status, err });
      const held: CriterionResult[] = def.rubric.map((r) => ({
        criteria: r.criteria, score: null, grade: "근거 부족 — 보류", evidence: "", rationale: "내용 평가 모델 오류로 보류합니다.",
      }));
      return NextResponse.json({ criteria: held, overallNote: "모델 오류로 내용 평가 보류.", model: "error", draft: true, competencyLabel: def.label });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    let parsed: { criteria?: CriterionResult[]; overallNote?: string } | null = null;
    try {
      const cleaned = text.replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch { /* 파싱 실패 → 보류 */ }

    if (!parsed?.criteria?.length) {
      const held: CriterionResult[] = def.rubric.map((r) => ({
        criteria: r.criteria, score: null, grade: "근거 부족 — 보류", evidence: "", rationale: "내용 평가 응답 파싱 실패로 보류합니다.",
      }));
      return NextResponse.json({ criteria: held, overallNote: "응답 파싱 실패로 보류.", model: "parse-error", draft: true, competencyLabel: def.label });
    }

    // ── fail-closed 런타임 강제 (프롬프트 지시만으로는 신뢰하지 않는다) ──
    // dohan 1원칙: 인용 없으면 출력 차단. 모델이 규칙2를 무시하고 점수만 지어내도
    // 여기서 강등(sanitize)한다. 검증 항목:
    //   ① score는 0~9 정수여야 한다 (벗어나면 보류)
    //   ② evidence가 비어 있으면 점수를 인정하지 않는다 (보류)
    //   ③ evidence가 전사 원문에 실제로 존재해야 한다 (정규화 후 부분문자열) — 없으면 보류
    const norm = (s: string) => s.replace(/\s+/g, "").replace(/["'""''「」『』]/g, "").toLowerCase();
    const transcriptNorm = norm(transcript);
    let demotedCount = 0;
    const sanitized: CriterionResult[] = parsed.criteria.map((c) => {
      const criteria = typeof c?.criteria === "string" ? c.criteria : "";
      const rawScore = c?.score;
      const evidence = typeof c?.evidence === "string" ? c.evidence : "";
      const rationale = typeof c?.rationale === "string" ? c.rationale : "";

      // 모델이 이미 보류로 출력한 항목은 그대로 보류 정규화
      if (rawScore === null || rawScore === undefined) {
        return { criteria, score: null, grade: "근거 부족 — 보류", evidence: "", rationale: rationale || "전사에서 해당 내용을 확인할 수 없음" };
      }

      const hold = (reason: string): CriterionResult => {
        demotedCount += 1;
        return { criteria, score: null, grade: "근거 부족 — 보류", evidence: "", rationale: reason };
      };

      // ① 점수 범위/정수 검증
      if (typeof rawScore !== "number" || !Number.isInteger(rawScore) || rawScore < 0 || rawScore > 9) {
        return hold("점수 형식이 유효하지 않아 보류합니다 (0~9 정수 아님).");
      }
      // ② 인용 누락
      const evTrim = evidence.trim();
      if (!evTrim) {
        return hold("점수를 뒷받침하는 전사 인용이 없어 보류합니다 (fail-closed).");
      }
      // ③ 인용이 전사 원문에 실제로 존재하는지 검증 (할루시네이션 인용 차단)
      const evNorm = norm(evTrim);
      if (evNorm.length < 4 || !transcriptNorm.includes(evNorm)) {
        return hold("인용이 전사 원문에서 확인되지 않아 보류합니다 (할루시네이션 인용 차단).");
      }

      const grade = rawScore >= 7 ? "우수" : rawScore >= 4 ? "보통" : "미흡";
      return { criteria, score: rawScore, grade, evidence: evTrim, rationale };
    });

    log.info("내용 평가 초안 생성", { competencyKey, count: sanitized.length, demoted: demotedCount });
    return NextResponse.json({
      criteria: sanitized, overallNote: parsed.overallNote || "",
      model: "solar-pro2", draft: true, competencyLabel: def.label,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "내용 평가 실패";
    log.error("내용 평가 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
