import { NextRequest, NextResponse } from "next/server";
import { generateWithPrompt } from "@/lib/twelvelabs";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:multimodal-extract");

// =============================================
// 멀티모달 행동 신호 추출 API
// rubricurl 문서 3 (증거 추출 프롬프트) 기반
// TwelveLabs generate API에 커스텀 프롬프트 전송
// =============================================

// 5채널 추출 프롬프트 (rubricurl 문서 3 기반, TwelveLabs 맞춤 적응)
const EXTRACTION_PROMPTS: Record<string, string> = {
  gaze: `당신은 발표 영상에서 시선 행동을 분석하는 전문 평가자입니다.

[중요 규칙]
- 반드시 순수 JSON만 출력하세요. 마크다운, 설명문, 코드블록(\`\`\`) 없이 JSON 객체만 반환합니다.
- 모든 수치 필드에 반드시 숫자값을 넣으세요. null이나 "N/A"는 사용하지 마세요.
- 관찰이 어려운 지표는 영상에서 보이는 단서를 바탕으로 합리적으로 추정하세요.

## 관찰 항목
1. audience_facing_ratio: 발표자가 청중(카메라) 방향을 응시하는 비율 (0.0~1.0). 정면 ±20° 이내를 "청중 응시"로 판단
2. off_audience_episodes_per_min: 청중 방향에서 1초 이상 이탈한 횟수 (분당)
3. downward_or_slide_fixation_ratio: 하방 또는 자료 응시 비율 (0.0~1.0)

## 판정 기준
- audience_facing_ratio: ≥0.70 상위 / 0.55~0.69 중상 / 0.35~0.54 중하 / <0.35 미흡
- off_audience_episodes_per_min: ≤1.5 상위 / 1.6~3.0 중상 / 3.1~5.0 중하 / >5.0 미흡
- downward_or_slide_fixation_ratio: ≤0.15 상위 / 0.16~0.25 중상 / 0.26~0.40 중하 / >0.40 미흡

## 출력 예시
{"gaze":{"audience_facing_ratio":0.62,"off_audience_episodes_per_min":2.3,"downward_or_slide_fixation_ratio":0.18,"observation":"발표자는 청중 방향을 주로 응시하나 간헐적으로 자료를 확인하는 모습이 관찰됨"}}

위 형식과 동일하게 JSON만 출력하세요.`,

  voice: `당신은 발표 영상에서 음성 운율을 분석하는 전문 평가자입니다.

[중요 규칙]
- 반드시 순수 JSON만 출력하세요. 마크다운, 설명문, 코드블록(\`\`\`) 없이 JSON 객체만 반환합니다.
- 모든 수치 필드에 반드시 숫자값을 넣으세요. null이나 "N/A"는 사용하지 마세요.
- 추정이 어려운 지표는 음성 톤·강세·속도 등 단서를 바탕으로 합리적으로 추정하세요.

## 관찰 항목
1. f0_dynamic_range_st: 음높이(F0) 변화폭 — 단조로운(좁은) vs 역동적(넓은). 반음(semitone) 단위 추정
2. loudness_dynamic_range_db: 음량 변화폭 — 일정한 vs 강약 있는. dB 단위 추정
3. emphasis_bursts_per_min: 핵심 강조 순간(피치+음량 동시 상승) 빈도 (분당)

## 판정 기준
- f0_dynamic_range_st: 4~10 상위 / 3~4 또는 10~12 중상 / 2~3 또는 12~14 중하 / <2 또는 >14 미흡
- loudness_dynamic_range_db: 5~12 상위 / 4~5 또는 12~14 중상 / 3~4 또는 14~16 중하 / <3 또는 >16 미흡
- emphasis_bursts_per_min: 2~6 상위 / 1.0~1.9 또는 6.1~8.0 중상 / 0.5~0.9 또는 8.1~10.0 중하 / <0.5 또는 >10.0 미흡

## 출력 예시
{"voice":{"f0_dynamic_range_st":6.5,"loudness_dynamic_range_db":8.2,"emphasis_bursts_per_min":3.1,"observation":"발표자의 음높이 변화가 적절하며 강조 포인트에서 음량이 자연스럽게 상승함"}}

위 형식과 동일하게 JSON만 출력하세요.`,

  fluency: `당신은 발표 영상에서 유창성을 분석하는 전문 평가자입니다.

[중요 규칙]
- 반드시 순수 JSON만 출력하세요. 마크다운, 설명문, 코드블록(\`\`\`) 없이 JSON 객체만 반환합니다.
- 모든 수치 필드에 반드시 숫자값을 넣으세요. null이나 "N/A"는 사용하지 마세요.
- 추정이 어려운 지표는 발화 속도·멈춤·filler word 등 단서를 바탕으로 합리적으로 추정하세요.

## 관찰 항목
1. articulation_rate_syllables_per_sec: 조음 속도 (음절/초) — 한국어 기준
2. filled_pauses_per_min: "어", "음", "그" 등 filled pause 빈도 (분당)
3. long_silent_pauses_per_min: 1초 이상 무음 구간 빈도 (분당) — 슬라이드 전환 제외

## 판정 기준
- articulation_rate: 3.5~5.8 상위 / 3.0~3.4 또는 5.9~6.4 중상 / 2.5~2.9 또는 6.5~7.0 중하 / <2.5 또는 >7.0 미흡
- filled_pauses_per_min: ≤2.0 상위 / 2.1~4.0 중상 / 4.1~6.0 중하 / >6.0 미흡
- long_silent_pauses_per_min: ≤1.0 상위 / 1.1~2.0 중상 / 2.1~4.0 중하 / >4.0 미흡

## 출력 예시
{"fluency":{"articulation_rate_syllables_per_sec":4.2,"filled_pauses_per_min":3.0,"long_silent_pauses_per_min":1.5,"observation":"발표자는 안정적인 조음 속도를 유지하나 간헐적으로 '음' 등의 채움말이 관찰됨"}}

위 형식과 동일하게 JSON만 출력하세요.`,

  posture: `당신은 발표 영상에서 자세와 제스처를 분석하는 전문 평가자입니다.

[중요 규칙]
- 반드시 순수 JSON만 출력하세요. 마크다운, 설명문, 코드블록(\`\`\`) 없이 JSON 객체만 반환합니다.
- 모든 수치 필드에 반드시 숫자값을 넣으세요. null이나 "N/A"는 사용하지 마세요.
- 관찰이 어려운 지표는 발표자의 상체·팔·손 움직임 등 단서를 바탕으로 합리적으로 추정하세요.

## 관찰 항목
1. open_posture_ratio: 개방적 자세 비율 (0.0~1.0) — 팔짱·손 숨김이 없고 어깨가 정면을 향한 시간 비율
2. purposeful_gesture_bouts_per_min: 발화 강조와 동기화된 목적형 제스처 빈도 (분당)
3. closed_or_fidget_ratio: 닫힌 자세 또는 잔동작 비율 (0.0~1.0) — 팔짱, 자기접촉, 만지작거림

## 판정 기준
- open_posture_ratio: ≥0.70 상위 / 0.55~0.69 중상 / 0.35~0.54 중하 / <0.35 미흡
- purposeful_gesture_bouts_per_min: 2~8 상위 / 1.0~1.9 또는 8.1~10.0 중상 / 0.5~0.9 또는 10.1~12.0 중하 / <0.5 또는 >12.0 미흡
- closed_or_fidget_ratio: <0.10 상위 / 0.10~0.20 중상 / 0.21~0.35 중하 / >0.35 미흡

## 출력 예시
{"posture_gesture":{"open_posture_ratio":0.68,"purposeful_gesture_bouts_per_min":4.5,"closed_or_fidget_ratio":0.12,"observation":"발표자는 대체로 개방적 자세를 유지하며 강조 시 손 제스처를 적절히 활용함"}}

위 형식과 동일하게 JSON만 출력하세요.`,

  face: `당신은 발표 영상에서 표정과 머리 움직임을 분석하는 전문 평가자입니다.

[중요 규칙]
- 반드시 순수 JSON만 출력하세요. 마크다운, 설명문, 코드블록(\`\`\`) 없이 JSON 객체만 반환합니다.
- 모든 수치 필드에 반드시 숫자값을 넣으세요. null이나 "N/A"는 사용하지 마세요.
- 관찰이 어려운 지표는 표정·머리 움직임 등 단서를 바탕으로 합리적으로 추정하세요.

## 관찰 항목
1. engaged_neutral_ratio: 주의집중 상태의 안정적 표정 유지 비율 (0.0~1.0) — 과장 없이 차분하고 집중된 표정
2. facial_tension_ratio: 얼굴 긴장 신호 비율 (0.0~1.0) — 찡그림, 입술 꽉 다물기, 턱 긴장 등
3. abrupt_head_jerk_events_per_min: 급격하고 비자연적 머리 꺾임/흔들림 빈도 (분당)

## 판정 기준
- engaged_neutral_ratio: ≥0.75 상위 / 0.60~0.74 중상 / 0.40~0.59 중하 / <0.40 미흡
- facial_tension_ratio: <0.10 상위 / 0.10~0.20 중상 / 0.21~0.35 중하 / >0.35 미흡
- abrupt_head_jerk_events_per_min: ≤2.0 상위 / 2.1~4.0 중상 / 4.1~6.0 중하 / >6.0 미흡

## 출력 예시
{"face_head":{"engaged_neutral_ratio":0.72,"facial_tension_ratio":0.15,"abrupt_head_jerk_events_per_min":1.8,"observation":"발표자는 안정적인 표정을 유지하며 경미한 긴장 신호가 간헐적으로 관찰됨"}}

위 형식과 동일하게 JSON만 출력하세요.`,
};

const VALID_CHANNELS = new Set(Object.keys(EXTRACTION_PROMPTS));

// 채널별 기대 필드 (수치 추출 폴백용)
const CHANNEL_FIELDS: Record<string, string[]> = {
  gaze: ["audience_facing_ratio", "off_audience_episodes_per_min", "downward_or_slide_fixation_ratio"],
  voice: ["f0_dynamic_range_st", "loudness_dynamic_range_db", "emphasis_bursts_per_min"],
  fluency: ["articulation_rate_syllables_per_sec", "filled_pauses_per_min", "long_silent_pauses_per_min"],
  posture: ["open_posture_ratio", "purposeful_gesture_bouts_per_min", "closed_or_fidget_ratio"],
  face: ["engaged_neutral_ratio", "facial_tension_ratio", "abrupt_head_jerk_events_per_min"],
};

// 채널별 래퍼 키 (JSON 응답 구조: { "gaze": { ... } })
const CHANNEL_WRAPPER_KEYS: Record<string, string> = {
  gaze: "gaze", voice: "voice", fluency: "fluency",
  posture: "posture_gesture", face: "face_head",
};

/**
 * TwelveLabs 응답 텍스트에서 JSON 파싱 (견고한 버전)
 * 1. 순수 JSON 파싱
 * 2. 마크다운 코드블록 내부 추출
 * 3. 가장 깊은 중첩 객체 추출
 * 4. 텍스트 내 수치 추출 폴백
 */
function parseChannelResponse(text: string, channel: string): Record<string, unknown> | null {
  const raw = typeof text === "string" ? text : JSON.stringify(text);

  // 1단계: 코드블록 제거 후 JSON 추출
  const cleaned = raw.replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
  const jsonMatches = cleaned.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

  if (jsonMatches) {
    // 가장 긴 매치를 우선 시도 (전체 JSON일 가능성 높음)
    const sorted = [...jsonMatches].sort((a, b) => b.length - a.length);
    for (const match of sorted) {
      try {
        const obj = JSON.parse(match);
        // 래퍼 키가 있으면 풀어냄: { "gaze": { ... } } → { ... }
        const wrapperKey = CHANNEL_WRAPPER_KEYS[channel];
        if (wrapperKey && obj[wrapperKey] && typeof obj[wrapperKey] === "object") {
          return obj[wrapperKey] as Record<string, unknown>;
        }
        // 기대 필드가 직접 있으면 그대로 사용
        const fields = CHANNEL_FIELDS[channel] || [];
        if (fields.some(f => f in obj)) return obj;
        // 하위 객체에 기대 필드가 있는지 확인
        for (const val of Object.values(obj)) {
          if (val && typeof val === "object" && !Array.isArray(val)) {
            if (fields.some(f => f in (val as Record<string, unknown>))) return val as Record<string, unknown>;
          }
        }
        return obj;
      } catch { /* 다음 매치 시도 */ }
    }
  }

  // 2단계: 텍스트에서 수치 직접 추출 (폴백)
  const fields = CHANNEL_FIELDS[channel];
  if (fields) {
    const result: Record<string, unknown> = {};
    let found = 0;
    for (const field of fields) {
      // "audience_facing_ratio": 0.62 또는 audience_facing_ratio: 0.62 패턴
      const pattern = new RegExp(`["']?${field}["']?\\s*[:=]\\s*([0-9]+\\.?[0-9]*)`, "i");
      const match = raw.match(pattern);
      if (match) {
        result[field] = parseFloat(match[1]);
        found++;
      }
    }
    // observation 추출
    const obsMatch = raw.match(/["']?observation["']?\s*[:=]\s*["']([^"']+)["']/i);
    if (obsMatch) result["observation"] = obsMatch[1];

    if (found > 0) {
      log.info("폴백 수치 추출 성공", { channel, found, total: fields.length });
      return result;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    const channel = typeof body.channel === "string" ? body.channel.trim() : "";

    if (!videoId) {
      log.warn("videoId 누락");
      return NextResponse.json({ error: "videoId가 필요합니다" }, { status: 400 });
    }

    // 단일 채널 추출
    if (channel && VALID_CHANNELS.has(channel)) {
      log.info("단일 채널 추출 시작", { videoId, channel });
      const prompt = EXTRACTION_PROMPTS[channel];

      // 최대 2회 시도 (첫 실패 시 재시도)
      let parsed = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await generateWithPrompt(videoId, prompt);
          parsed = parseChannelResponse(result.data, channel);
          if (parsed) break;
          log.warn("파싱 실패, 재시도", { channel, attempt: attempt + 1 });
        } catch (e) {
          log.warn("추출 실패, 재시도", { channel, attempt: attempt + 1, error: e instanceof Error ? e.message : "unknown" });
        }
      }

      if (!parsed) {
        log.warn("채널 추출 최종 실패", { channel });
        parsed = { parseError: true };
      }

      return NextResponse.json({ channel, data: parsed });
    }

    // 전체 5채널 병렬 추출
    if (!channel || channel === "all") {
      log.info("전체 5채널 병렬 추출 시작", { videoId });
      const channels = Object.keys(EXTRACTION_PROMPTS);
      const results = await Promise.allSettled(
        channels.map(async (ch) => {
          const prompt = EXTRACTION_PROMPTS[ch];
          let parsed = null;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const result = await generateWithPrompt(videoId, prompt);
              parsed = parseChannelResponse(result.data, ch);
              if (parsed) break;
            } catch { /* 재시도 */ }
          }
          return { channel: ch, data: parsed || { parseError: true } };
        })
      );

      const extracted: Record<string, unknown> = {};
      const errors: Record<string, string> = {};

      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          extracted[channels[i]] = r.value.data;
        } else {
          errors[channels[i]] = r.reason?.message || "추출 실패";
        }
      });

      log.info("전체 5채널 추출 완료", { videoId, successCount: Object.keys(extracted).length, errorCount: Object.keys(errors).length });
      return NextResponse.json({ extracted, errors });
    }

    log.warn("유효하지 않은 채널", { channel });
    return NextResponse.json(
      { error: `유효하지 않은 채널: ${channel}. 유효 채널: ${[...VALID_CHANNELS].join(", ")}` },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "멀티모달 추출 실패";
    log.error("멀티모달 추출 실패", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
