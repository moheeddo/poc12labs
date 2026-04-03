// =============================================
// 멀티모달 행동기반 채점 엔진
// rubricurl 문서 4 (채점 프롬프트) 기반
// 15개 하위지표 → 5개 항목 점수 → 총점 (0~9)
// =============================================

// ─── 타입 정의 ───

export interface IndicatorJudgment {
  name: string;
  label: string;
  value: number | null;
  judgment: "상위" | "중상" | "중하" | "미흡" | "N/A";
  score: 3 | 2 | 1 | 0 | null;
}

export interface ItemScore {
  id: string;
  name: string;
  channel: string;
  indicators: IndicatorJudgment[];
  itemScore: number | null;  // 0~9
  naCount: number;
  observation: string;
}

export interface MultimodalScoreResult {
  items: ItemScore[];
  totalScore: number | null;  // 0~9 or null (산출 보류)
  interpretation: string;     // 매우 우수 / 보통 이상 / 보통 미만 / 미흡 / 산출 보류
  scorableItemCount: number;
  naItems: string[];
  naSummary: Record<string, string>;  // 지표명 → N/A 사유
}

// ─── 추출 데이터 타입 ───

export interface ExtractedSignals {
  gaze?: {
    audience_facing_ratio: number | null;
    off_audience_episodes_per_min: number | null;
    downward_or_slide_fixation_ratio: number | null;
    observation?: string;
  };
  voice?: {
    f0_dynamic_range_st: number | null;
    loudness_dynamic_range_db: number | null;
    emphasis_bursts_per_min: number | null;
    observation?: string;
  };
  fluency?: {
    articulation_rate_syllables_per_sec: number | null;
    filled_pauses_per_min: number | null;
    long_silent_pauses_per_min: number | null;
    observation?: string;
  };
  posture_gesture?: {
    open_posture_ratio: number | null;
    purposeful_gesture_bouts_per_min: number | null;
    closed_or_fidget_ratio: number | null;
    gesture_label_available?: boolean;
    observation?: string;
  };
  face_head?: {
    engaged_neutral_ratio: number | null;
    facial_tension_ratio: number | null;
    abrupt_head_jerk_events_per_min: number | null;
    facs_classifier_available?: boolean;
    observation?: string;
  };
}

// ─── 판정 기준 테이블 (rubricurl 문서 4) ───

type ThresholdFn = (v: number) => 3 | 2 | 1 | 0;

// 단순 범위 판정 (높을수록 좋은 지표)
function higherIsBetter(upper: number, midHigh: number, midLow: number): ThresholdFn {
  return (v) => {
    if (v >= upper) return 3;
    if (v >= midHigh) return 2;
    if (v >= midLow) return 1;
    return 0;
  };
}

// 단순 범위 판정 (낮을수록 좋은 지표)
function lowerIsBetter(upper: number, midHigh: number, midLow: number): ThresholdFn {
  return (v) => {
    if (v <= upper) return 3;
    if (v <= midHigh) return 2;
    if (v <= midLow) return 1;
    return 0;
  };
}

// 범위 내가 최적인 지표 (너무 높거나 낮으면 감점)
function rangeOptimal(
  bestLow: number, bestHigh: number,
  goodLow: number, goodHigh: number,
  fairLow: number, fairHigh: number
): ThresholdFn {
  return (v) => {
    if (v >= bestLow && v <= bestHigh) return 3;
    if (v >= goodLow && v <= goodHigh) return 2;
    if (v >= fairLow && v <= fairHigh) return 1;
    return 0;
  };
}

// 각 지표별 채점 함수
const SCORING_FUNCTIONS: Record<string, { fn: ThresholdFn; label: string }> = {
  // 항목 1: 시선
  audience_facing_ratio:              { fn: higherIsBetter(0.70, 0.55, 0.35),   label: "청중 응시 비율" },
  off_audience_episodes_per_min:      { fn: lowerIsBetter(1.5, 3.0, 5.0),       label: "시선 이탈 빈도" },
  downward_or_slide_fixation_ratio:   { fn: lowerIsBetter(0.15, 0.25, 0.40),    label: "하방 응시 비율" },

  // 항목 2: 음성
  f0_dynamic_range_st:                { fn: rangeOptimal(4, 10, 3, 12, 2, 14),  label: "F0 변화폭" },
  loudness_dynamic_range_db:          { fn: rangeOptimal(5, 12, 4, 14, 3, 16),  label: "음량 변화폭" },
  emphasis_bursts_per_min:            { fn: rangeOptimal(2, 6, 1.0, 8.0, 0.5, 10.0), label: "강조 burst 빈도" },

  // 항목 3: 유창성
  articulation_rate_syllables_per_sec: { fn: rangeOptimal(3.5, 5.8, 3.0, 6.4, 2.5, 7.0), label: "조음 속도" },
  filled_pauses_per_min:              { fn: lowerIsBetter(2.0, 4.0, 6.0),       label: "Filled pause 빈도" },
  long_silent_pauses_per_min:         { fn: lowerIsBetter(1.0, 2.0, 4.0),       label: "장무음 pause 빈도" },

  // 항목 4: 자세/제스처
  open_posture_ratio:                 { fn: higherIsBetter(0.70, 0.55, 0.35),   label: "개방적 자세 비율" },
  purposeful_gesture_bouts_per_min:   { fn: rangeOptimal(2, 8, 1.0, 10.0, 0.5, 12.0), label: "목적형 제스처 빈도" },
  closed_or_fidget_ratio:             { fn: lowerIsBetter(0.10, 0.20, 0.35),    label: "닫힌 자세/잔동작 비율" },

  // 항목 5: 표정/머리
  engaged_neutral_ratio:              { fn: higherIsBetter(0.75, 0.60, 0.40),   label: "Engaged-neutral 비율" },
  facial_tension_ratio:               { fn: lowerIsBetter(0.10, 0.20, 0.35),    label: "얼굴 긴장 비율" },
  abrupt_head_jerk_events_per_min:    { fn: lowerIsBetter(2.0, 4.0, 6.0),       label: "급격한 머리 움직임" },
};

// ─── 항목별 지표 매핑 ───

const ITEM_INDICATORS: { id: string; name: string; channel: string; dataKey: string; indicators: string[] }[] = [
  { id: "item1", name: "청중 지향 시선 통제",           channel: "시각", dataKey: "gaze",            indicators: ["audience_facing_ratio", "off_audience_episodes_per_min", "downward_or_slide_fixation_ratio"] },
  { id: "item2", name: "음성 추진력과 강조 변화",       channel: "청각", dataKey: "voice",           indicators: ["f0_dynamic_range_st", "loudness_dynamic_range_db", "emphasis_bursts_per_min"] },
  { id: "item3", name: "유창성과 전진감",               channel: "유창성", dataKey: "fluency",       indicators: ["articulation_rate_syllables_per_sec", "filled_pauses_per_min", "long_silent_pauses_per_min"] },
  { id: "item4", name: "개방적 자세와 목적형 제스처",   channel: "신체", dataKey: "posture_gesture",  indicators: ["open_posture_ratio", "purposeful_gesture_bouts_per_min", "closed_or_fidget_ratio"] },
  { id: "item5", name: "표정 안정성과 머리 움직임 절제", channel: "얼굴", dataKey: "face_head",       indicators: ["engaged_neutral_ratio", "facial_tension_ratio", "abrupt_head_jerk_events_per_min"] },
];

// ─── 채점 엔진 ───

function judgeIndicator(name: string, value: number | null): IndicatorJudgment {
  const def = SCORING_FUNCTIONS[name];
  if (!def) return { name, label: name, value, judgment: "N/A", score: null };

  if (value === null || value === undefined || isNaN(value)) {
    return { name, label: def.label, value: null, judgment: "N/A", score: null };
  }

  const score = def.fn(value);
  const judgmentMap: Record<number, "상위" | "중상" | "중하" | "미흡"> = {
    3: "상위", 2: "중상", 1: "중하", 0: "미흡",
  };

  return {
    name,
    label: def.label,
    value,
    judgment: judgmentMap[score],
    score,
  };
}

/**
 * 추출된 멀티모달 신호를 rubricurl 문서 4 기준으로 채점
 */
export function scoreMultimodalSignals(signals: ExtractedSignals): MultimodalScoreResult {
  const naSummary: Record<string, string> = {};
  const items: ItemScore[] = ITEM_INDICATORS.map((item) => {
    const channelData = signals[item.dataKey as keyof ExtractedSignals] as Record<string, unknown> | undefined;
    const observation = (channelData?.observation as string) || "";

    const indicators: IndicatorJudgment[] = item.indicators.map((indName) => {
      const rawValue = channelData?.[indName];
      const value = typeof rawValue === "number" ? rawValue : null;

      // N/A 조건 체크
      if (value === null) {
        const reason = !channelData
          ? `${item.channel} 채널 데이터 미제공`
          : `${SCORING_FUNCTIONS[indName]?.label || indName} 값 산출 불가`;
        naSummary[indName] = reason;
      }

      // 조건부 지표 특수 처리
      if (indName === "purposeful_gesture_bouts_per_min") {
        const gestureAvail = channelData?.gesture_label_available;
        if (gestureAvail === false) {
          naSummary[indName] = "제스처 라벨 미제공 (gesture_label_available=false)";
          return { name: indName, label: SCORING_FUNCTIONS[indName]?.label || indName, value: null, judgment: "N/A" as const, score: null };
        }
      }
      if (indName === "engaged_neutral_ratio" || indName === "facial_tension_ratio") {
        const facsAvail = channelData?.facs_classifier_available;
        if (facsAvail === false) {
          naSummary[indName] = "FACS AU 분류기 미제공";
          return { name: indName, label: SCORING_FUNCTIONS[indName]?.label || indName, value: null, judgment: "N/A" as const, score: null };
        }
      }

      return judgeIndicator(indName, value);
    });

    // 항목 점수 계산: 유효 지표 점수 합계 / 유효 지표 수 × 3
    const validIndicators = indicators.filter((i) => i.score !== null);
    const naCount = indicators.length - validIndicators.length;
    let itemScore: number | null = null;

    if (validIndicators.length > 0) {
      const avg = validIndicators.reduce((sum, i) => sum + (i.score || 0), 0) / validIndicators.length;
      itemScore = Math.round(avg * 3 * 10) / 10; // 최대 9점
      itemScore = Math.min(9, itemScore);
    }

    return {
      id: item.id,
      name: item.name,
      channel: item.channel,
      indicators,
      itemScore,
      naCount,
      observation,
    };
  });

  // 총점 산출 (rubricurl 문서 4 규칙: 채점 가능 항목 3개 이상)
  const scorableItems = items.filter((i) => i.itemScore !== null);
  const naItems = items.filter((i) => i.itemScore === null).map((i) => i.name);

  let totalScore: number | null = null;
  let interpretation = "산출 보류";

  if (scorableItems.length >= 3) {
    totalScore = Math.round(
      (scorableItems.reduce((sum, i) => sum + (i.itemScore || 0), 0) / scorableItems.length) * 10
    ) / 10;

    if (totalScore >= 7.5) interpretation = "매우 우수";
    else if (totalScore >= 5.5) interpretation = "보통 이상";
    else if (totalScore >= 3.0) interpretation = "보통 미만";
    else interpretation = "미흡";
  }

  return {
    items,
    totalScore,
    interpretation,
    scorableItemCount: scorableItems.length,
    naItems,
    naSummary,
  };
}
