import { NextRequest, NextResponse } from "next/server";
import { generateWithPrompt } from "@/lib/twelvelabs";

// =============================================
// 멀티모달 행동 신호 추출 API
// rubricurl 문서 3 (증거 추출 프롬프트) 기반
// TwelveLabs generate API에 커스텀 프롬프트 전송
// =============================================

// 5채널 추출 프롬프트 (rubricurl 문서 3 기반, TwelveLabs 맞춤 적응)
const EXTRACTION_PROMPTS: Record<string, string> = {
  gaze: `당신은 발표 영상에서 시선 행동을 분석하는 전문 평가자입니다. 아래 기준으로 발표자의 시선 행동을 관찰하고 JSON으로 출력하세요.

## 관찰 항목
1. audience_facing_ratio: 발표자가 청중(카메라) 방향을 응시하는 비율 (0.0~1.0)
   - 정면 ±20° 이내를 "청중 응시"로 판단
2. off_audience_episodes_per_min: 청중 방향에서 1초 이상 이탈한 횟수 (분당)
3. downward_or_slide_fixation_ratio: 하방 또는 자료 응시 비율 (0.0~1.0)

## 판정 기준
- audience_facing_ratio: ≥0.70 상위 / 0.55~0.69 중상 / 0.35~0.54 중하 / <0.35 미흡
- off_audience_episodes_per_min: ≤1.5 상위 / 1.6~3.0 중상 / 3.1~5.0 중하 / >5.0 미흡
- downward_or_slide_fixation_ratio: ≤0.15 상위 / 0.16~0.25 중상 / 0.26~0.40 중하 / >0.40 미흡

## 출력 형식 (반드시 JSON만 출력)
{"gaze":{"audience_facing_ratio":number,"off_audience_episodes_per_min":number,"downward_or_slide_fixation_ratio":number,"observation":"관찰 근거 1~2문장"}}

관찰이 어려운 지표는 null로 표기하세요.`,

  voice: `당신은 발표 영상에서 음성 운율을 분석하는 전문 평가자입니다. 발표자의 음성 특성을 관찰하고 JSON으로 출력하세요.

## 관찰 항목
1. f0_dynamic_range_st: 음높이(F0) 변화폭 — 단조로운(좁은) vs 역동적(넓은). 반음(semitone) 단위 추정
2. loudness_dynamic_range_db: 음량 변화폭 — 일정한 vs 강약 있는. dB 단위 추정
3. emphasis_bursts_per_min: 핵심 강조 순간(피치+음량 동시 상승) 빈도 (분당)

## 판정 기준
- f0_dynamic_range_st: 4~10 상위 / 3~4 또는 10~12 중상 / 2~3 또는 12~14 중하 / <2 또는 >14 미흡
- loudness_dynamic_range_db: 5~12 상위 / 4~5 또는 12~14 중상 / 3~4 또는 14~16 중하 / <3 또는 >16 미흡
- emphasis_bursts_per_min: 2~6 상위 / 1.0~1.9 또는 6.1~8.0 중상 / 0.5~0.9 또는 8.1~10.0 중하 / <0.5 또는 >10.0 미흡

## 출력 형식 (반드시 JSON만 출력)
{"voice":{"f0_dynamic_range_st":number,"loudness_dynamic_range_db":number,"emphasis_bursts_per_min":number,"observation":"관찰 근거 1~2문장"}}

추정이 어려운 지표는 null로 표기하세요.`,

  fluency: `당신은 발표 영상에서 유창성을 분석하는 전문 평가자입니다. 발표자의 말하기 유창성을 관찰하고 JSON으로 출력하세요.

## 관찰 항목
1. articulation_rate_syllables_per_sec: 조음 속도 (음절/초) — 한국어 기준
2. filled_pauses_per_min: "어", "음", "그" 등 filled pause 빈도 (분당)
3. long_silent_pauses_per_min: 1초 이상 무음 구간 빈도 (분당) — 슬라이드 전환 제외

## 판정 기준
- articulation_rate: 3.5~5.8 상위 / 3.0~3.4 또는 5.9~6.4 중상 / 2.5~2.9 또는 6.5~7.0 중하 / <2.5 또는 >7.0 미흡
- filled_pauses_per_min: ≤2.0 상위 / 2.1~4.0 중상 / 4.1~6.0 중하 / >6.0 미흡
- long_silent_pauses_per_min: ≤1.0 상위 / 1.1~2.0 중상 / 2.1~4.0 중하 / >4.0 미흡

## 출력 형식 (반드시 JSON만 출력)
{"fluency":{"articulation_rate_syllables_per_sec":number,"filled_pauses_per_min":number,"long_silent_pauses_per_min":number,"observation":"관찰 근거 1~2문장"}}

추정이 어려운 지표는 null로 표기하세요.`,

  posture: `당신은 발표 영상에서 자세와 제스처를 분석하는 전문 평가자입니다. 발표자의 신체 행동을 관찰하고 JSON으로 출력하세요.

## 관찰 항목
1. open_posture_ratio: 개방적 자세 비율 (0.0~1.0) — 팔짱·손 숨김이 없고 어깨가 정면을 향한 시간 비율
2. purposeful_gesture_bouts_per_min: 발화 강조와 동기화된 목적형 제스처 빈도 (분당)
3. closed_or_fidget_ratio: 닫힌 자세 또는 잔동작 비율 (0.0~1.0) — 팔짱, 자기접촉, 만지작거림

## 판정 기준
- open_posture_ratio: ≥0.70 상위 / 0.55~0.69 중상 / 0.35~0.54 중하 / <0.35 미흡
- purposeful_gesture_bouts_per_min: 2~8 상위 / 1.0~1.9 또는 8.1~10.0 중상 / 0.5~0.9 또는 10.1~12.0 중하 / <0.5 또는 >12.0 미흡
- closed_or_fidget_ratio: <0.10 상위 / 0.10~0.20 중상 / 0.21~0.35 중하 / >0.35 미흡

## 출력 형식 (반드시 JSON만 출력)
{"posture_gesture":{"open_posture_ratio":number,"purposeful_gesture_bouts_per_min":number,"closed_or_fidget_ratio":number,"observation":"관찰 근거 1~2문장"}}

관찰이 어려운 지표는 null로 표기하세요.`,

  face: `당신은 발표 영상에서 표정과 머리 움직임을 분석하는 전문 평가자입니다. 발표자의 얼굴 행동을 관찰하고 JSON으로 출력하세요.

## 관찰 항목
1. engaged_neutral_ratio: 주의집중 상태의 안정적 표정 유지 비율 (0.0~1.0) — 과장 없이 차분하고 집중된 표정
2. facial_tension_ratio: 얼굴 긴장 신호 비율 (0.0~1.0) — 찡그림, 입술 꽉 다물기, 턱 긴장 등
3. abrupt_head_jerk_events_per_min: 급격하고 비자연적 머리 꺾임/흔들림 빈도 (분당)

## 판정 기준
- engaged_neutral_ratio: ≥0.75 상위 / 0.60~0.74 중상 / 0.40~0.59 중하 / <0.40 미흡
- facial_tension_ratio: <0.10 상위 / 0.10~0.20 중상 / 0.21~0.35 중하 / >0.35 미흡
- abrupt_head_jerk_events_per_min: ≤2.0 상위 / 2.1~4.0 중상 / 4.1~6.0 중하 / >6.0 미흡

## 출력 형식 (반드시 JSON만 출력)
{"face_head":{"engaged_neutral_ratio":number,"facial_tension_ratio":number,"abrupt_head_jerk_events_per_min":number,"observation":"관찰 근거 1~2문장"}}

관찰이 어려운 지표는 null로 표기하세요.`,
};

const VALID_CHANNELS = new Set(Object.keys(EXTRACTION_PROMPTS));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    const channel = typeof body.channel === "string" ? body.channel.trim() : "";

    if (!videoId) {
      return NextResponse.json({ error: "videoId가 필요합니다" }, { status: 400 });
    }

    // 단일 채널 추출
    if (channel && VALID_CHANNELS.has(channel)) {
      const prompt = EXTRACTION_PROMPTS[channel];
      const result = await generateWithPrompt(videoId, prompt);

      // TwelveLabs 응답에서 JSON 파싱 시도
      let parsed = null;
      try {
        const text = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
        // JSON 블록 추출 (마크다운 코드블록 내부 또는 순수 JSON)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = { raw: result.data, parseError: true };
      }

      return NextResponse.json({ channel, data: parsed });
    }

    // 전체 5채널 병렬 추출
    if (!channel || channel === "all") {
      const channels = Object.keys(EXTRACTION_PROMPTS);
      const results = await Promise.allSettled(
        channels.map(async (ch) => {
          const prompt = EXTRACTION_PROMPTS[ch];
          const result = await generateWithPrompt(videoId, prompt);
          let parsed = null;
          try {
            const text = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          } catch {
            parsed = { raw: result.data, parseError: true };
          }
          return { channel: ch, data: parsed };
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

      return NextResponse.json({ extracted, errors });
    }

    return NextResponse.json(
      { error: `유효하지 않은 채널: ${channel}. 유효 채널: ${[...VALID_CHANNELS].join(", ")}` },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "멀티모달 추출 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
