import { NextRequest, NextResponse } from "next/server";
import { generateWithPrompt, searchVideos } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";
import { ASSESSMENT_BY_KEY } from "@/lib/leadership-rubric-data";
import type { MAssessmentItem, CompetencyAssessmentData } from "@/lib/leadership-rubric-data";

// Vercel 서버리스 함수 타임아웃: 채널 병렬 추출 시 최대 2~3분 소요
export const maxDuration = 300;

const log = createLogger("API:multimodal-extract");

const LEADERSHIP_INDEX_ID = process.env.TWELVELABS_LEADERSHIP_INDEX_ID || "69ccf4b781e81bcd08ca5487";

// =============================================
// 멀티모달 행동 신호 추출 API (역량별 · 루브릭 데이터 구동) v1.0
//
// 피드백 ① 반영: 추출 프롬프트를 ASSESSMENT_BY_KEY[competencyKey].mItems 에서
//   동적 생성한다. 채널 = m-항목 코드(m1~m5). 역량마다 자기 지표를 추출.
// 피드백 ⑦ 반영: roleContext(코치 보정 — 평가 대상자/화자 라벨)를 프롬프트에 주입.
// =============================================

export type RoleContext = {
  targetName?: string;       // 평가 대상자(target/Leader) 이름·라벨
  targetRole?: string;       // 부여 역할 (효율성/안전성/비용 등)
  otherParticipants?: string[]; // 맥락 참여자 라벨 목록
  glossary?: string[];       // 도메인 고유명사 사전 (STT 오인식 보정 — 엄사방·주무차장 등)
};

// m-항목 1개 → 추출 프롬프트 (루브릭 band를 그대로 가이드로 사용)
function buildItemPrompt(
  competency: CompetencyAssessmentData,
  m: MAssessmentItem,
  roleContext?: RoleContext,
): string {
  const code = m.code.toLowerCase();
  const lines: string[] = [];

  lines.push(`당신은 ${competency.label} 리더십 역량평가에서 "${m.customerLabel}"(${m.aiLabel}) 항목의 행동 신호를 분석하는 전문 평가자입니다.`);
  lines.push("");
  lines.push(`## 과업 맥락`);
  lines.push(`- 활동: ${competency.taskContext.activityType} (${competency.taskContext.duration || "길이 가변"})`);
  lines.push(`- 참여 구조: ${competency.participantModel || competency.taskContext.participants || ""}`);

  // 코치 보정(평가 대상자/역할/화자) 주입 — 화자분리·역할매핑 한계 보완
  if (roleContext?.targetName) {
    lines.push(`- 평가 대상자(target): ${roleContext.targetName}${roleContext.targetRole ? ` (역할: ${roleContext.targetRole})` : ""}`);
    lines.push(`  → 반드시 이 평가 대상자 1인의 행동만 산출하세요. 다른 참여자는 맥락(context)으로만 사용합니다.`);
    if (roleContext.otherParticipants?.length) {
      lines.push(`- 다른 참여자(context): ${roleContext.otherParticipants.join(", ")}`);
    }
  }

  // 도메인 용어 사전 — 음성인식(STT) 오인식 보정 (예: "엄사방"→"비만부장 검사반" 오인식 방지)
  if (roleContext?.glossary?.length) {
    lines.push(`- 도메인 고유명사 사전(정확히 사용): ${roleContext.glossary.join(", ")}`);
    lines.push(`  → 관찰 소견에 인명·직책·부서를 적을 때 위 사전의 정확한 표기를 사용하고, 유사 발음 오인식을 피하세요.`);
  }

  lines.push("");
  lines.push(`## 항목 정의`);
  lines.push(m.definition);
  lines.push("");
  lines.push(`## 관찰·산출 항목 (JSON 키 = 변수명)`);

  m.indicators.forEach((ind, idx) => {
    const tag = ind.category === "required" && ind.scoreReflected
      ? "[채점 필수지표]"
      : ind.category === "supplementary"
        ? "[상시 참고지표]"
        : ind.category === "conditional"
          ? "[조건부 참고지표]"
          : "[참고]";
    lines.push(`${idx + 1}. ${ind.variableName} ${tag} — ${ind.customerLabel}`);
    lines.push(`   의미: ${ind.meaning}`);
    if (ind.band) {
      lines.push(`   판정 기준: 상위 ${ind.band.upper} / 중상 ${ind.band.midHigh} / 중하 ${ind.band.midLow} / 미흡 ${ind.band.poor}`);
    }
  });

  lines.push("");
  lines.push(`## 출력 규칙`);
  lines.push(`- 반드시 순수 JSON만 출력하세요. 마크다운·설명문·코드블록(\`\`\`) 없이 JSON 객체만 반환합니다.`);
  lines.push(`- 최상위 키는 "${code}" 이며, 그 안에 위 변수명을 키로 하는 수치값을 넣습니다.`);
  lines.push(`- 비율 지표는 0.0~1.0, 빈도(회/분)·횟수·초·ST·dB 등은 단위 수치로 표기합니다.`);
  lines.push(`- 영상·음성에서 신뢰성 있게 관찰 가능한 행동만 산출하세요. 화자분리·역할매핑이 불가능하거나 해당 신호를 관찰할 수 없으면 그 지표 값은 null 로 두세요(임의 추정 금지 — N/A는 0점이 아닙니다).`);
  lines.push(`- "observation" 키에 관찰 근거를 행동 중심으로 1~2문장(한국어) 작성합니다. 인상평·성격 추정·내용 평가는 금지합니다.`);

  // 출력 예시 (변수명 채워서)
  const exampleFields = m.indicators.map((ind) => {
    const isRatio = ind.unit === "%" || /ratio|index/.test(ind.variableName);
    const sample = ind.dataType?.startsWith("Bool") ? "false" : isRatio ? "0.62" : ind.dataType?.startsWith("Int") ? "3" : "2.3";
    return `"${ind.variableName}":${sample}`;
  }).join(",");
  lines.push("");
  lines.push(`## 출력 예시`);
  lines.push(`{"${code}":{${exampleFields},"observation":"관찰된 행동을 수치 근거와 함께 기술"}}`);
  lines.push("");
  lines.push(`위 형식과 동일하게 JSON만 출력하세요.`);

  return lines.join("\n");
}

/**
 * TwelveLabs 응답 텍스트에서 JSON 파싱 (m-항목 래퍼 unwrap)
 */
function parseItemResponse(text: string, code: string, fields: string[]): Record<string, unknown> | null {
  const raw = typeof text === "string" ? text : JSON.stringify(text);
  const cleaned = raw.replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
  const jsonMatches = cleaned.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

  if (jsonMatches) {
    const sorted = [...jsonMatches].sort((a, b) => b.length - a.length);
    for (const match of sorted) {
      try {
        const obj = JSON.parse(match);
        if (obj[code] && typeof obj[code] === "object") return obj[code] as Record<string, unknown>;
        if (fields.some((f) => f in obj)) return obj;
        for (const val of Object.values(obj)) {
          if (val && typeof val === "object" && !Array.isArray(val)) {
            if (fields.some((f) => f in (val as Record<string, unknown>))) return val as Record<string, unknown>;
          }
        }
        return obj;
      } catch { /* 다음 매치 시도 */ }
    }
  }

  // 폴백: 텍스트에서 수치 직접 추출
  const result: Record<string, unknown> = {};
  let found = 0;
  for (const field of fields) {
    const pattern = new RegExp(`["']?${field}["']?\\s*[:=]\\s*(-?[0-9]+\\.?[0-9]*|true|false)`, "i");
    const match = raw.match(pattern);
    if (match) {
      result[field] = match[1] === "true" ? true : match[1] === "false" ? false : parseFloat(match[1]);
      found++;
    }
  }
  const obsMatch = raw.match(/["']?observation["']?\s*[:=]\s*["']([^"']+)["']/i);
  if (obsMatch) result["observation"] = obsMatch[1];
  return found > 0 ? result : null;
}

/**
 * Marengo 검색 기반 시선 분석 보강 (비전제시 M1 청중 응시 전용)
 */
async function enrichVisionGazeWithMarengo(
  videoId: string,
  base: Record<string, unknown> | null,
): Promise<Record<string, unknown>> {
  const data = base || {};
  try {
    const [audienceResults, screenResults] = await Promise.allSettled([
      searchVideos(LEADERSHIP_INDEX_ID, "presenter looking at audience or camera, making eye contact with viewers"),
      searchVideos(LEADERSHIP_INDEX_ID, "presenter looking down at notes, looking at monitor screen, reading slides"),
    ]);

    let audienceSeconds = 0, screenSeconds = 0;
    if (audienceResults.status === "fulfilled" && audienceResults.value.data) {
      for (const clip of audienceResults.value.data) if (clip.video_id === videoId) audienceSeconds += clip.end - clip.start;
    }
    if (screenResults.status === "fulfilled" && screenResults.value.data) {
      for (const clip of screenResults.value.data) if (clip.video_id === videoId) screenSeconds += clip.end - clip.start;
    }
    const totalDetected = audienceSeconds + screenSeconds;
    if (totalDetected < 5) return data;

    const marengoAudienceRatio = audienceSeconds / totalDetected;
    const marengoScreenRatio = screenSeconds / totalDetected;
    const pegasusAudience = typeof data.audience_facing_ratio === "number" ? data.audience_facing_ratio : null;
    const pegasusScreen = typeof data.downward_or_slide_fixation_ratio === "number" ? data.downward_or_slide_fixation_ratio : null;
    const fusedAudience = pegasusAudience !== null ? 0.6 * marengoAudienceRatio + 0.4 * pegasusAudience : marengoAudienceRatio;
    const fusedScreen = pegasusScreen !== null ? 0.6 * marengoScreenRatio + 0.4 * pegasusScreen : marengoScreenRatio;

    return {
      ...data,
      audience_facing_ratio: parseFloat(fusedAudience.toFixed(3)),
      downward_or_slide_fixation_ratio: parseFloat(fusedScreen.toFixed(3)),
      observation: (data.observation || "") +
        ` [Marengo 검증: 청중응시 ${(marengoAudienceRatio * 100).toFixed(0)}%, 모니터응시 ${(marengoScreenRatio * 100).toFixed(0)}% — Pegasus+Marengo 융합값 적용]`,
      _marengo_verified: true,
    };
  } catch (e) {
    log.warn("Marengo 시선 보강 실패, Pegasus 결과만 사용", { error: e instanceof Error ? e.message : "unknown" });
    return data;
  }
}

async function extractItem(
  videoId: string,
  competency: CompetencyAssessmentData,
  m: MAssessmentItem,
  roleContext?: RoleContext,
): Promise<Record<string, unknown>> {
  const code = m.code.toLowerCase();
  const fields = m.indicators.map((i) => i.variableName);
  const prompt = buildItemPrompt(competency, m, roleContext);

  let parsed: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateWithPrompt(videoId, prompt);
      parsed = parseItemResponse(result.data, code, fields);
      if (parsed) break;
    } catch (e) {
      log.warn("항목 추출 실패, 재시도", { code, attempt: attempt + 1, error: e instanceof Error ? e.message : "unknown" });
    }
  }
  let data = parsed || { parseError: true };

  // 비전제시 M1만 Marengo 시선 이중 검증
  if (competency.key === "visionPresentation" && code === "m1" && parsed) {
    data = await enrichVisionGazeWithMarengo(videoId, parsed);
  }
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    const channel = typeof body.channel === "string" ? body.channel.trim().toLowerCase() : "";
    const competencyKey = typeof body.competencyKey === "string" ? body.competencyKey.trim() : "visionPresentation";
    const roleContext: RoleContext | undefined = body.roleContext && typeof body.roleContext === "object" ? body.roleContext : undefined;

    if (!videoId) {
      log.warn("videoId 누락");
      return NextResponse.json({ error: "videoId가 필요합니다" }, { status: 400 });
    }

    const competency = ASSESSMENT_BY_KEY[competencyKey];
    if (!competency) {
      log.warn("유효하지 않은 역량", { competencyKey });
      return NextResponse.json({ error: `유효하지 않은 역량: ${competencyKey}` }, { status: 400 });
    }

    const validCodes = competency.mItems.map((m) => m.code.toLowerCase());

    // 단일 채널(m-항목) 추출
    if (channel && validCodes.includes(channel)) {
      const m = competency.mItems.find((x) => x.code.toLowerCase() === channel)!;
      log.info("단일 항목 추출", { videoId, competencyKey, channel });
      const data = await extractItem(videoId, competency, m, roleContext);
      return NextResponse.json({ channel, competencyKey, data });
    }

    // 전체 항목 병렬 추출
    if (!channel || channel === "all") {
      log.info("전체 항목 병렬 추출", { videoId, competencyKey, items: validCodes.length });
      const results = await Promise.allSettled(
        competency.mItems.map((m) => extractItem(videoId, competency, m, roleContext)),
      );
      const extracted: Record<string, unknown> = {};
      const errors: Record<string, string> = {};
      results.forEach((r, i) => {
        const code = competency.mItems[i].code.toLowerCase();
        if (r.status === "fulfilled") extracted[code] = r.value;
        else errors[code] = r.reason?.message || "추출 실패";
      });
      log.info("전체 항목 추출 완료", { videoId, competencyKey, successCount: Object.keys(extracted).length });
      return NextResponse.json({ competencyKey, extracted, errors });
    }

    log.warn("유효하지 않은 채널", { channel, competencyKey });
    return NextResponse.json(
      { error: `유효하지 않은 항목: ${channel}. 유효 항목: ${validCodes.join(", ")}` },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "멀티모달 추출 실패";
    log.error("멀티모달 추출 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
