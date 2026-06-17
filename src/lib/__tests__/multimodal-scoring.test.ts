import { describe, it, expect } from "vitest";
import {
  scoreIndicatorByBand,
  scoreMultimodalSignals,
  type ExtractedSignals,
} from "../multimodal-scoring";
import { ASSESSMENT_BY_KEY } from "../leadership-rubric-data";
import type { RubricIndicator } from "../leadership-rubric-data";

// 역량의 특정 변수 지표 객체 조회
function ind(competencyKey: string, variableName: string): RubricIndicator {
  const data = ASSESSMENT_BY_KEY[competencyKey];
  const found = data.mItems.flatMap((m) => m.indicators).find((i) => i.variableName === variableName);
  if (!found) throw new Error(`indicator not found: ${competencyKey}/${variableName}`);
  return found;
}

describe("밴드 인터프리터 — 루브릭 v1.0 단일 출처 채점", () => {
  it("비전 audience_facing_ratio (v1.0: 중하 40~54·미흡 <40) — higher is better", () => {
    const i = ind("visionPresentation", "audience_facing_ratio");
    expect(scoreIndicatorByBand(0.72, i)).toBe(3); // 72% 상위
    expect(scoreIndicatorByBand(72, i)).toBe(3);   // 이미 % 단위
    expect(scoreIndicatorByBand(0.6, i)).toBe(2);  // 60% 중상
    expect(scoreIndicatorByBand(0.45, i)).toBe(1); // 45% 중하 (v1.0)
    expect(scoreIndicatorByBand(0.38, i)).toBe(0); // 38% 미흡 (v1.0)
  });

  it("비전 off_audience_episodes_per_min (v1.0: 상위 ≤2.0) — lower is better", () => {
    const i = ind("visionPresentation", "off_audience_episodes_per_min");
    expect(scoreIndicatorByBand(1.5, i)).toBe(3);
    expect(scoreIndicatorByBand(2.0, i)).toBe(3); // v1.0 경계 ≤2.0
    expect(scoreIndicatorByBand(3.0, i)).toBe(2);
    expect(scoreIndicatorByBand(5.0, i)).toBe(1);
    expect(scoreIndicatorByBand(7.0, i)).toBe(0);
  });

  it("비전 long_silent_pauses_per_min (v1.0: 필수지표로 승격) — lower is better", () => {
    const i = ind("visionPresentation", "long_silent_pauses_per_min");
    expect(i.scoreReflected).toBe(true); // v1.0에서 채점 대상
    expect(scoreIndicatorByBand(0.8, i)).toBe(3);
    expect(scoreIndicatorByBand(1.5, i)).toBe(2);
    expect(scoreIndicatorByBand(3.0, i)).toBe(1);
    expect(scoreIndicatorByBand(5.0, i)).toBe(0);
  });

  it("비전 f0_dynamic_range_st — range optimal (양끝 감점)", () => {
    const i = ind("visionPresentation", "f0_dynamic_range_st");
    expect(scoreIndicatorByBand(6, i)).toBe(3);   // 4~10 상위
    expect(scoreIndicatorByBand(11, i)).toBe(2);  // 10.1~12 중상
    expect(scoreIndicatorByBand(13, i)).toBe(1);  // 12.1~14 중하
    expect(scoreIndicatorByBand(1, i)).toBe(0);   // <2 미흡
    expect(scoreIndicatorByBand(15, i)).toBe(0);  // >14 미흡
  });

  it("구성원육성 leader_talk_ratio — range (상·하한 모두 감점)", () => {
    const i = ind("memberDevelopment", "leader_talk_ratio");
    expect(scoreIndicatorByBand(40, i)).toBe(3); // 20~55 상위
    expect(scoreIndicatorByBand(60, i)).toBe(2); // 56~65 중상
    expect(scoreIndicatorByBand(12, i)).toBe(1); // 10~14 중하
    expect(scoreIndicatorByBand(80, i)).toBe(0); // >75 미흡
    expect(scoreIndicatorByBand(5, i)).toBe(0);  // <10 미흡
  });

  it("신뢰형성 acknowledgment_events_per_min — range, target_talk_ratio, balance, coverage", () => {
    const ack = ind("trustBuilding", "acknowledgment_events_per_min");
    expect(scoreIndicatorByBand(4, ack)).toBe(3);
    expect(scoreIndicatorByBand(8, ack)).toBe(2);
    expect(scoreIndicatorByBand(10, ack)).toBe(1);
    expect(scoreIndicatorByBand(0.3, ack)).toBe(0);
    expect(scoreIndicatorByBand(12, ack)).toBe(0);

    const talk = ind("trustBuilding", "target_talk_ratio");
    expect(scoreIndicatorByBand(30, talk)).toBe(3);
    expect(scoreIndicatorByBand(50, talk)).toBe(2);
    expect(scoreIndicatorByBand(70, talk)).toBe(0);

    const balance = ind("trustBuilding", "other_participant_inclusion_balance_index");
    expect(scoreIndicatorByBand(0.84, balance)).toBe(3); // % 아님 → 정규화 안 함
    expect(scoreIndicatorByBand(0.7, balance)).toBe(2);
    expect(scoreIndicatorByBand(0.5, balance)).toBe(1);
    expect(scoreIndicatorByBand(0.3, balance)).toBe(0);

    const coverage = ind("trustBuilding", "other_participant_response_coverage_ratio");
    expect(scoreIndicatorByBand(100, coverage)).toBe(3);
    expect(scoreIndicatorByBand(90, coverage)).toBe(2);
    expect(scoreIndicatorByBand(60, coverage)).toBe(1);
    expect(scoreIndicatorByBand(40, coverage)).toBe(0);
  });
});

describe("비율 정규화 규약 잠금 — 추출은 0~1 emit, %밴드는 0~100 (적대적 리뷰 Critical 재검증)", () => {
  it("coverage_ratio: 0~1 emit이 올바르게 채점 (1%→미흡, 100%→상위 / 점수 역전 없음)", () => {
    const cov = ind("trustBuilding", "other_participant_response_coverage_ratio");
    expect(scoreIndicatorByBand(0.01, cov)).toBe(0); // 1% 커버리지 → 미흡
    expect(scoreIndicatorByBand(0.49, cov)).toBe(0); // 49% → 미흡(<50)
    expect(scoreIndicatorByBand(0.5, cov)).toBe(1);  // 50% → 중하(50~74)
    expect(scoreIndicatorByBand(0.84, cov)).toBe(2); // 84% → 중상(75~99)
    expect(scoreIndicatorByBand(1.0, cov)).toBe(3);  // 100% → 상위
    // 추출이 0~100으로 emit해도 동일하게 동작 (>1은 정규화 안 함)
    expect(scoreIndicatorByBand(45, cov)).toBe(0);
    expect(scoreIndicatorByBand(84, cov)).toBe(2);
    expect(scoreIndicatorByBand(100, cov)).toBe(3);
  });
  it("balance_index(0~1, %아님)는 정규화 없이 채점", () => {
    const bal = ind("trustBuilding", "other_participant_inclusion_balance_index");
    expect(scoreIndicatorByBand(0.84, bal)).toBe(3);
    expect(scoreIndicatorByBand(0.3, bal)).toBe(0);
  });
  it("카운트 단위(회/분)는 정규화하지 않음 (off_audience 1.5회 → 상위, 0.4회 → 상위)", () => {
    const off = ind("visionPresentation", "off_audience_episodes_per_min");
    expect(scoreIndicatorByBand(1.5, off)).toBe(3); // 1.5회/분 ≤2.0 → 상위 (×100되지 않음)
    expect(scoreIndicatorByBand(0.4, off)).toBe(3);
  });
  it("gap 동률은 보수적으로 낮은 점수 (talk_ratio 55.5 → 중상, target_talk 45.5 → 중상)", () => {
    const lt = ind("memberDevelopment", "leader_talk_ratio");
    expect(scoreIndicatorByBand(55.5, lt)).toBe(2); // 상위 천장(55)·중상 바닥(56) 중점 → 보수적 중상
    const tt = ind("trustBuilding", "target_talk_ratio");
    expect(scoreIndicatorByBand(45.5, tt)).toBe(2);
  });
});

describe("scoreMultimodalSignals — 역량별 채점 + M5 총점 제외", () => {
  it("비전제시: M1~M4 채점, M5(표정·머리)는 총점 제외 (피드백 ②)", () => {
    const signals: ExtractedSignals = {
      m1: { audience_facing_ratio: 0.72, off_audience_episodes_per_min: 1.5, downward_or_slide_fixation_ratio: 0.1, observation: "" },
      m2: { f0_dynamic_range_st: 6, loudness_dynamic_range_db: 8, emphasis_bursts_per_min: 3 },
      m3: { articulation_rate_syllables_per_sec: 4.2, filled_pauses_per_min: 1.5, long_silent_pauses_per_min: 0.8 },
      m4: { open_posture_ratio: 0.75, closed_or_fidget_ratio: 0.08, purposeful_gesture_bouts_per_min: 4 },
      m5: { engaged_neutral_ratio: 0.7, facial_tension_ratio: 0.5, abrupt_head_jerk_events_per_min: 1 }, // 의도적 나쁜 값
    };
    const r = scoreMultimodalSignals(signals, "visionPresentation");
    const m5 = r.items.find((i) => i.id === "m5");
    expect(m5?.itemScore).toBeNull();           // M5는 점수 미산출
    expect(m5?.totalReflected).toBe(false);
    expect(r.scorableItemCount).toBe(4);        // M1~M4만
    expect(r.coreItemCount).toBe(4);
    expect(r.totalScore).not.toBeNull();
    // M5의 나쁜 값이 총점을 끌어내리지 않아야 함 (전부 상위 → 총점 9에 근접)
    expect(r.totalScore!).toBeGreaterThanOrEqual(8.5);
  });

  it("참고지표는 채점에서 제외 (피드백 ③: downward_or_slide_fixation_ratio)", () => {
    const signals: ExtractedSignals = {
      m1: { audience_facing_ratio: 0.72, off_audience_episodes_per_min: 1.5, downward_or_slide_fixation_ratio: 0.99 },
      m2: { f0_dynamic_range_st: 6, loudness_dynamic_range_db: 8 },
      m3: { articulation_rate_syllables_per_sec: 4.2, filled_pauses_per_min: 1.5, long_silent_pauses_per_min: 0.8 },
      m4: { open_posture_ratio: 0.75, closed_or_fidget_ratio: 0.08 },
    };
    const r = scoreMultimodalSignals(signals, "visionPresentation");
    const m1 = r.items.find((i) => i.id === "m1");
    // M1 점수는 audience_facing + off_audience 2개만으로 산출 (둘 다 상위 → 9)
    expect(m1?.itemScore).toBe(9);
    const downward = m1?.indicators.find((i) => i.name === "downward_or_slide_fixation_ratio");
    expect(downward?.scoreReflected).toBe(false);
    expect(downward?.score).toBeNull();
  });

  it("채점 가능 핵심 항목 3개 미만이면 총점 산출 보류", () => {
    const signals: ExtractedSignals = {
      m1: { audience_facing_ratio: 0.72, off_audience_episodes_per_min: 1.5 },
      m2: { f0_dynamic_range_st: 6, loudness_dynamic_range_db: 8 },
      // m3, m4 누락 → 채점 가능 2개
    };
    const r = scoreMultimodalSignals(signals, "visionPresentation");
    expect(r.scorableItemCount).toBe(2);
    expect(r.totalScore).toBeNull();
    expect(r.interpretation).toBe("산출 보류");
  });

  it("역량별로 자기 루브릭을 사용 — 구성원육성 신호로 채점 (피드백 ①)", () => {
    const signals: ExtractedSignals = {
      m1: { leader_gaze_during_member_ratio: 0.74, active_listening_signals_per_min: 3.2, empathic_understanding_response_count: 3 },
      m2: { leader_articulation_rate_syl_per_sec: 4.2, loudness_spike_events_per_min: 0.2 },
      m3: { leader_talk_ratio: 42, interruption_per_min: 0.3, longest_monologue_sec: 25, exploratory_follow_up_question_count: 3 },
      m4: { open_posture_ratio: 0.78, closed_or_fidget_ratio: 0.06 },
    };
    const r = scoreMultimodalSignals(signals, "memberDevelopment");
    expect(r.competencyLabel).toBe("구성원육성");
    expect(r.scorableItemCount).toBe(4);
    expect(r.totalScore).toBeGreaterThanOrEqual(8.5);
    // 구성원육성 M1은 3개 필수지표
    const m1 = r.items.find((i) => i.id === "m1");
    expect(m1?.indicators.filter((i) => i.scoreReflected).length).toBe(3);
  });
});
