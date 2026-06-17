// =============================================
// KHNP 리더십 역량진단 — 최종 확정 루브릭 v1.0
// 출처: 한수원_리더십_역량평가_루브릭_v1.0 — 비전제시·구성원육성·신뢰형성
//        AI 기술 정의서(System Spec) 최종 검토 반영본 v1.0
//
// 핵심 구조:
//   - 5개 M-항목 (M1~M5), 총점은 핵심 4개(M1~M4)만 반영 / M5는 보조(총점 미반영)
//   - 지표 분류: 필수지표(채점) / 상시·조건부·내부 참고지표(미채점) / 항목간 참고정보
//   - 4단계 운영밴드: 상위(3점) / 중상(2점) / 중하(1점) / 미흡(0점)
//   - 산식: M_score = mean(필수지표 변환점수) × 3 (최대 9점)
//   - 총점 = mean(채점 가능한 M1~M4), 채점 가능 항목 ≥3일 때만 산출 → 100점 환산 병행
//   - 멀티모달 보고서는 역량별 prohibitedExpressions(금지표현)를 강제
//   - 합리적의사결정 평가항목 제외 (3개 핵심 역량만 운영)
// =============================================

import type { LeadershipCompetencyKey } from "./types";

// ─── 공통 4단계 색상 ───
const LEVEL_COLORS = {
  excellent: { color: "text-teal-600", bgColor: "bg-teal-50" },
  good:     { color: "text-sky-600",   bgColor: "bg-sky-50" },
  fair:     { color: "text-amber-600", bgColor: "bg-amber-50" },
  poor:     { color: "text-red-500",   bgColor: "bg-red-50" },
};

// =============================================
// 새 루브릭 타입 정의 (v0.9)
// =============================================

// 지표 분류
export type IndicatorCategory = "required" | "supplementary" | "conditional";

// 4단계 운영밴드
export interface OperatingBand {
  upper: string;    // 상위 = 3점
  midHigh: string;  // 중상 = 2점
  midLow: string;   // 중하 = 1점
  poor: string;     // 미흡 = 0점
}

// 개별 지표 (필수/보조/조건부 공통)
export interface RubricIndicator {
  id: string;
  variableName: string;     // 시스템 변수명 (예: leader_gaze_during_member_ratio)
  customerLabel: string;    // 고객용 평가 지표명
  category: IndicatorCategory;
  dataType: string;         // Float (%), Int, Float (count/min) 등
  unit?: string;            // %, 회/분, 초 등
  meaning: string;          // 의미 설명
  band?: OperatingBand;     // 운영 밴드 (필수지표만 필수)
  condition?: string;       // 조건부지표 사용 조건
  scoreReflected: boolean;  // 점수 산식 반영 여부
}

// M-항목 (5개 평가항목)
export interface MAssessmentItem {
  code: "M1" | "M2" | "M3" | "M4" | "M5";
  customerLabel: string;      // 고객용 항목명 (예: "경청과 공감·인정·이해 확인 반응")
  aiLabel: string;            // AI 영문명 (예: "Active listening & empathic response")
  definition: string;         // 고객용 항목 정의
  indicators: RubricIndicator[];
  scoringFormula: string;     // 점수 산출식
  totalReflected: boolean;    // 총점 반영 여부 (M5만 false)
}

// 과업 맥락
export interface TaskContext {
  title: string;
  description: string;
  activityType: string;
  duration?: string;      // 면담/발표/토의 시간
  participants?: string;  // 참여자 구성
  reference?: string;     // 참고 문헌
}

// =============================================
// 기존 UI 호환용 타입 (deprecated, 새 UI는 indicators 사용)
// =============================================

// 4단계 척도 레벨 — 기존 UI 호환
export interface RubricLevel {
  range: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

// 평가 항목 — 기존 UI 호환 (M-항목 1:1 매핑)
export interface ImprovedRubricItem {
  id: string;
  criteria: string;
  subLabel: string;
  levels: RubricLevel[];
}

// 상황 시나리오 — 기존 UI 호환
export interface CompetencyScenario {
  title: string;
  description: string;
  activityType: string;
  reference: string;
}

// 역량 데이터 — 기존 UI 호환 + 새 필드 확장
export interface CompetencyAssessmentData {
  key: LeadershipCompetencyKey;
  label: string;
  icon: string;
  color: string;
  scenario: CompetencyScenario;
  rubricItems: ImprovedRubricItem[];  // 기존 호환: M1~M5 5개 매핑
  // ─── v0.9 확장 필드 ───
  mItems: MAssessmentItem[];           // M1~M5 상세 정의
  taskContext: TaskContext;            // 과업 맥락 (scenario 확장)
  evaluationPrinciples: string[];      // 핵심 평가 원칙
  excludedElements: string[];          // 평가 제외 요소
  totalScoringFormula: string;         // 총점 산출식
  prohibitedExpressions: string[];     // 멀티모달 보고서 금지표현 (System Spec §9)
  crossItemReference?: string;         // 항목 간 참고정보 설명 (judgmental language 등)
  participantModel?: string;           // 평가 대상자/맥락 참여자 구조 설명
}

// 4단계 운영밴드 → RubricLevel 4개 변환 (UI 호환)
function bandToLevels(band: OperatingBand, contextLabel?: string): RubricLevel[] {
  const ctx = contextLabel ? ` (${contextLabel})` : "";
  return [
    { range: "상위 · 3점", label: "매우 우수", description: `${band.upper}${ctx}`, ...LEVEL_COLORS.excellent },
    { range: "중상 · 2점", label: "보통 이상", description: `${band.midHigh}${ctx}`, ...LEVEL_COLORS.good },
    { range: "중하 · 1점", label: "보통 미만", description: `${band.midLow}${ctx}`, ...LEVEL_COLORS.fair },
    { range: "미흡 · 0점", label: "미흡",     description: `${band.poor}${ctx}`, ...LEVEL_COLORS.poor },
  ];
}

// M-항목 → ImprovedRubricItem 변환 (기존 UI 호환)
function mItemToRubricItem(m: MAssessmentItem): ImprovedRubricItem {
  // 첫 번째 필수지표의 운영밴드를 대표 levels로 사용
  const primary = m.indicators.find((ind) => ind.category === "required" && ind.band);
  const levels = primary?.band
    ? bandToLevels(primary.band, primary.customerLabel)
    : [
        { range: "상위 · 3점", label: "매우 우수", description: "핵심 행동이 안정적이고 일관되게 관찰됨", ...LEVEL_COLORS.excellent },
        { range: "중상 · 2점", label: "보통 이상", description: "핵심 행동이 대체로 관찰되나 일부 흔들림이 있음", ...LEVEL_COLORS.good },
        { range: "중하 · 1점", label: "보통 미만", description: "핵심 행동이 제한적으로 확인되거나 일관성이 부족함", ...LEVEL_COLORS.fair },
        { range: "미흡 · 0점", label: "미흡",     description: "핵심 행동이 거의 관찰되지 않음", ...LEVEL_COLORS.poor },
      ];

  return {
    id: m.code.toLowerCase(),
    criteria: m.customerLabel,
    subLabel: `${m.code} · ${m.totalReflected ? "총점 반영" : "보조 항목"}`,
    levels,
  };
}

// =============================================
// 비전제시 (Vision Presentation) — 5분 전략 브리핑 발표
// =============================================

const VP_M1: MAssessmentItem = {
  code: "M1",
  customerLabel: "청중과의 시선 연결",
  aiLabel: "Audience-facing gaze / eye contact",
  definition: "발표 중 청중을 향한 시선 유지 정도를 평가한다. 자료 참조 자체는 감점하지 않으며, 자료를 본 뒤 청중으로 시선이 복귀하는지가 핵심이다.",
  indicators: [
    {
      id: "vp-m1-a", variableName: "audience_facing_ratio", customerLabel: "청중 응시 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "전체 valid frame 중 청중 방향 시선 비율",
      band: { upper: "70% 이상", midHigh: "55~69%", midLow: "40~54%", poor: "40% 미만" },
      scoreReflected: true,
    },
    {
      id: "vp-m1-b", variableName: "off_audience_episodes_per_min", customerLabel: "시선 이탈 빈도",
      category: "required", dataType: "Float", unit: "회/분",
      meaning: "청중에서 벗어난 시선 이탈 이벤트 분당 빈도 (1.5초 이상 지속)",
      band: { upper: "2.0회 이하", midHigh: "2.1~4.0회", midLow: "4.1~6.0회", poor: "6.0회 초과" },
      scoreReflected: true,
    },
    {
      id: "vp-m1-c", variableName: "downward_or_slide_fixation_ratio", customerLabel: "하방·슬라이드 응시 비율",
      category: "supplementary", dataType: "Float (%)", unit: "%",
      meaning: "상시 참고지표 — 자료 참조 맥락·청중 응시 복귀·구조전환 발화와 함께 해석. 점수 산식 직접 미반영",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M1_score = mean(audience_facing_ratio_score, off_audience_episodes_per_min_score) × 3",
  totalReflected: true,
};

const VP_M2: MAssessmentItem = {
  code: "M2",
  customerLabel: "음성의 힘과 강조",
  aiLabel: "Vocal energy & emphasis",
  definition: "음높이·음량·강조 패턴을 활용해 메시지에 방향성과 에너지를 부여하는 정도를 평가한다.",
  indicators: [
    {
      id: "vp-m2-a", variableName: "f0_dynamic_range_st", customerLabel: "F0 변화폭 (Semitone)",
      category: "required", dataType: "Float", unit: "ST",
      meaning: "발표자 음높이 변화폭 — 단조 또는 과장 모두 감점",
      band: { upper: "4.0~10.0 ST", midHigh: "3.0~3.9 또는 10.1~12.0 ST", midLow: "2.0~2.9 또는 12.1~14.0 ST", poor: "2.0 미만 또는 14.0 초과" },
      scoreReflected: true,
    },
    {
      id: "vp-m2-b", variableName: "loudness_dynamic_range_db", customerLabel: "음량 변화폭",
      category: "required", dataType: "Float", unit: "dB",
      meaning: "발표자 음량의 dynamic range",
      band: { upper: "5.0~12.0 dB", midHigh: "4.0~4.9 또는 12.1~14.0 dB", midLow: "3.0~3.9 또는 14.1~16.0 dB", poor: "3.0 미만 또는 16.0 초과" },
      scoreReflected: true,
    },
    {
      id: "vp-m2-c", variableName: "emphasis_bursts_per_min", customerLabel: "강조 burst 빈도",
      category: "conditional", dataType: "Float", unit: "회/분",
      meaning: "핵심 메시지 강조 구간 빈도 — 조건부 참고지표(스펙상 운영밴드 미정의, 점수 미반영)",
      condition: "신뢰도 있게 확인되는 경우에만 참고",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M2_score = mean(f0_dynamic_range_st_score, loudness_dynamic_range_db_score) × 3",
  totalReflected: true,
};

const VP_M3: MAssessmentItem = {
  code: "M3",
  customerLabel: "말의 흐름과 안정감",
  aiLabel: "Speech fluency & stability",
  definition: "불필요한 머뭇거림 없이 발표를 안정적으로 전개하는 정도를 평가한다. 구조전환 발화 직후의 짧은 멈춤은 자연스러운 발표 행동으로 본다.",
  indicators: [
    {
      id: "vp-m3-a", variableName: "articulation_rate_syllables_per_sec", customerLabel: "조음 속도",
      category: "required", dataType: "Float", unit: "음절/초",
      meaning: "실제 조음 기준 말 속도 — 과도하게 느리거나 빠르면 감점",
      band: { upper: "3.5~5.8", midHigh: "3.0~3.4 또는 5.9~6.4", midLow: "2.5~2.9 또는 6.5~7.0", poor: "2.5 미만 또는 7.0 초과" },
      scoreReflected: true,
    },
    {
      id: "vp-m3-b", variableName: "filled_pauses_per_min", customerLabel: "채움말 빈도 (어, 음, 그…)",
      category: "required", dataType: "Float", unit: "회/분",
      meaning: "filled pause 분당 빈도",
      band: { upper: "2회 이하", midHigh: "2.1~4.0회", midLow: "4.1~6.0회", poor: "6.0회 초과" },
      scoreReflected: true,
    },
    {
      id: "vp-m3-c", variableName: "long_silent_pauses_per_min", customerLabel: "장무음 pause 빈도 (1초 이상)",
      category: "required", dataType: "Float", unit: "회/분",
      meaning: "VAD 기준 1초 이상 장무음 분당 빈도 — 구조전환 직후의 의도적 멈춤(structural pause)은 예외 해석",
      band: { upper: "1회 이하", midHigh: "1.1~2.0회", midLow: "2.1~4.0회", poor: "4.0회 초과" },
      scoreReflected: true,
    },
    {
      id: "vp-m3-d", variableName: "structural_pause_candidates", customerLabel: "구조적 멈춤 후보",
      category: "supplementary", dataType: "Int", unit: "회",
      meaning: "상시 참고지표 — 긴 무음이 흐름 저하가 아니라 구조적 설명 멈춤일 가능성이 있는 구간. 점수 산식 직접 미반영",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M3_score = mean(articulation_rate_score, filled_pauses_per_min_score, long_silent_pauses_per_min_score) × 3",
  totalReflected: true,
};

const VP_M4: MAssessmentItem = {
  code: "M4",
  customerLabel: "자세와 제스처의 활용",
  aiLabel: "Posture & purposeful gesture",
  definition: "몸과 손의 움직임이 메시지를 지지하는 방향으로 사용되는 정도를 평가한다.",
  indicators: [
    {
      id: "vp-m4-a", variableName: "open_posture_ratio", customerLabel: "개방적 자세 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "열린 자세를 유지한 valid frame 비율",
      band: { upper: "70% 이상", midHigh: "55~69%", midLow: "35~54%", poor: "35% 미만" },
      scoreReflected: true,
    },
    {
      id: "vp-m4-b", variableName: "purposeful_gesture_bouts_per_min", customerLabel: "목적형 제스처 빈도",
      category: "conditional", dataType: "Float", unit: "회/분",
      meaning: "발화 의미를 보조하는 목적형 제스처 — 조건부 참고지표(스펙상 운영밴드 미정의, 점수 미반영)",
      condition: "목적형 제스처 확인 기준 충족 시에만 산출",
      scoreReflected: false,
    },
    {
      id: "vp-m4-c", variableName: "closed_or_fidget_ratio", customerLabel: "닫힌 자세·잔동작 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "팔짱·손숨김·자기접촉·잔동작이 감지된 frame 비율",
      band: { upper: "10% 미만", midHigh: "10~20%", midLow: "21~35%", poor: "35% 초과" },
      scoreReflected: true,
    },
  ],
  scoringFormula: "M4_score = mean(open_posture_ratio_score, closed_or_fidget_ratio_score) × 3",
  totalReflected: true,
};

const VP_M5: MAssessmentItem = {
  code: "M5",
  customerLabel: "표정과 머리 움직임의 안정성",
  aiLabel: "Supplementary facial/head stability",
  definition: "보조 항목 — 발표 안정성 참고용. 총점에는 반영하지 않으며 참고 의견 생성용으로만 사용한다.",
  indicators: [
    {
      id: "vp-m5-a", variableName: "engaged_neutral_ratio", customerLabel: "Engaged-neutral 유지 비율",
      category: "conditional", dataType: "Float (%)", unit: "%",
      meaning: "FACS AU 기반 분류기로 확인한 안정 표정 비율",
      condition: "FACS AU 분류기 활성 시에만 산출",
      scoreReflected: false,
    },
    {
      id: "vp-m5-b", variableName: "facial_tension_ratio", customerLabel: "얼굴 긴장 신호 비율",
      category: "conditional", dataType: "Float (%)", unit: "%",
      meaning: "얼굴 긴장 신호 비율 — 심리 상태 추정 금지",
      condition: "FACS AU 분류기 활성 시에만 산출",
      scoreReflected: false,
    },
    {
      id: "vp-m5-c", variableName: "abrupt_head_jerk_events_per_min", customerLabel: "급격한 머리 움직임 빈도",
      category: "supplementary", dataType: "Float", unit: "회/분",
      meaning: "급격한 머리 방향 전환 이벤트 빈도",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M5는 점수화하지 않음 — 참고 의견 생성용",
  totalReflected: false,
};

const VISION_PRESENTATION: CompetencyAssessmentData = {
  key: "visionPresentation",
  label: "비전제시",
  icon: "Target",
  color: "#14b8a6",
  scenario: {
    title: "신재생에너지 확대 전략 브리핑 (5분 발표)",
    description:
      "한수원 신사업 TFT 팀장으로서 신재생에너지(태양광·풍력) 사업 포트폴리오 확대 전략을 팀 구성원에게 설명합니다.\n\n" +
      "① PEST 분석 자료 기반 내·외부 환경 설명\n" +
      "② 분석 결과 기반 전략목표·전략과제 도출\n" +
      "③ 과제별 달성방안 구조적 제시",
    activityType: "전략 브리핑형 발표 (Presentation)",
    reference: "PEST 분석 | 멀티모달 발표 행동지표 v1.0",
  },
  rubricItems: [VP_M1, VP_M2, VP_M3, VP_M4, VP_M5].map(mItemToRubricItem),
  mItems: [VP_M1, VP_M2, VP_M3, VP_M4, VP_M5],
  taskContext: {
    title: "신재생에너지 확대 전략 브리핑",
    description: "PEST 분석 → 전략목표·전략과제 → 달성방안 순으로 5분간 팀에 설명하는 전략 브리핑형 발표",
    activityType: "발표 (Presentation)",
    duration: "5분",
    participants: "발표자 1인 + 청중 팀 구성원",
    reference: "비전제시 리더십 역량평가 AI 기술정의서 v1.0",
  },
  evaluationPrinciples: [
    "감정적 호소가 아닌 분석 결과와 전략 방향의 구조적 설명을 중심으로 평가",
    "PEST 분석·전략 내용의 정답 여부는 평가하지 않음 (전달 행동만 평가)",
    "자료 참조 자체는 감점하지 않음 — 자료를 본 뒤 청중으로 시선이 복귀하는지가 핵심",
    "구조전환 발화('먼저', '다음으로')와 직후의 짧은 멈춤은 자연스러운 발표 행동으로 인정",
    "총점은 핵심 4개 항목(M1~M4)만 반영, M5는 보조 항목",
  ],
  excludedElements: [
    "PEST 분석의 정확성",
    "전략목표·전략과제·실행방안의 타당성",
    "발표 내용 자체의 설득력",
    "외모·복장·나이·성별 등 개인적 특성",
    "발표자의 성격·자신감·카리스마에 대한 인상 해석",
    "촬영 품질·배경 환경에 대한 주관적 인상평",
  ],
  totalScoringFormula: "총점 = mean(채점 가능한 M1~M4) (0~9 scale) · 100점 환산값 = 총점 / 9 × 100",
  prohibitedExpressions: [
    "카리스마가 있다", "리더답다", "자신감 있어 보인다", "발표를 잘했다",
    "비전 내용이 좋다", "설득력이 있다", "전략이 우수하다", "PEST 분석이 정확하다",
    "긴장해 보인다", "열정적이다", "감동적 발표였다",
  ],
  participantModel: "발표자 1인 평가 (청중은 맥락). 자료 참조 자체는 감점하지 않으며 청중 응시 복귀 여부가 핵심.",
};

// =============================================
// 신뢰형성 (Trust Building) — 협상형 그룹토의 (가변 N인, 평가 대상자 1인 기준)
// =============================================

const TB_M1: MAssessmentItem = {
  code: "M1",
  customerLabel: "다른 참여자 발언의 인정과 연결 반응",
  aiLabel: "Acknowledgment & connected response",
  definition: "평가 대상자가 다른 두 참여자의 발언에 대해 인정 반응을 보이고, 직전 발언을 이어받아 연결되는 반응을 하는 정도를 평가한다.",
  indicators: [
    {
      id: "tb-m1-a", variableName: "acknowledgment_events_per_min", customerLabel: "인정 반응 및 짧은 지지적 맞장구 빈도",
      category: "required", dataType: "Float", unit: "회/분",
      meaning: "다른 참여자 발화 중 인정 반응·끄덕임·짧은 지지적 맞장구 분당 빈도",
      band: { upper: "2.0~7.0", midHigh: "1.0~1.9 또는 7.1~9.0", midLow: "0.5~0.9 또는 9.1~11.0", poor: "0.5 미만 또는 11.0 초과" },
      scoreReflected: true,
    },
    {
      id: "tb-m1-b", variableName: "connected_response_ratio", customerLabel: "직전 발언 연결 반응 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "다른 참여자의 직전 발언과 의미적으로 연결되는 반응의 비율",
      band: { upper: "70% 이상", midHigh: "55~69%", midLow: "40~54%", poor: "40% 미만" },
      scoreReflected: true,
    },
    {
      id: "tb-m1-c", variableName: "paraphrase_or_understanding_check_count", customerLabel: "재진술·이해 확인 횟수",
      category: "conditional", dataType: "Int",
      meaning: "다른 참여자의 발언을 자기 말로 요약하거나 이해를 확인하는 발화 횟수",
      condition: "STT 의미 분석 신뢰도 확보 시",
      scoreReflected: false,
    },
    {
      id: "tb-m1-d", variableName: "follow_up_question_count", customerLabel: "탐색적 후속질문 횟수",
      category: "conditional", dataType: "Int",
      meaning: "직전 참여자 발언과 연결되어 이유·배경을 더 여는 질문 횟수",
      condition: "질문 의미 분류 신뢰도 확보 시",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M1_score = mean(acknowledgment_events_per_min_score, connected_response_ratio_score) × 3",
  totalReflected: true,
};

const TB_M2: MAssessmentItem = {
  code: "M2",
  customerLabel: "발언 공간 보장과 순서 운영",
  aiLabel: "Speaking space & turn-taking management",
  definition: "평가 대상자가 다른 참여자의 발언 기회를 보장하고, 끊지 않으며 일방적 독백을 피하는 정도를 평가한다.",
  indicators: [
    {
      id: "tb-m2-a", variableName: "target_talk_ratio", customerLabel: "평가 대상자 발화 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "3인 토의 중 평가 대상자의 발화 시간 비중",
      band: { upper: "20~45%", midHigh: "46~55% 또는 15~19%", midLow: "56~65% 또는 10~14%", poor: "65% 초과 또는 10% 미만" },
      scoreReflected: true,
    },
    {
      id: "tb-m2-b", variableName: "interruption_count_per_min", customerLabel: "끼어들기 빈도",
      category: "required", dataType: "Float", unit: "회/분",
      meaning: "다른 참여자 발화를 실질적으로 끊고 들어간 빈도",
      band: { upper: "0.5 이하", midHigh: "0.6~1.2", midLow: "1.3~2.5", poor: "2.5 초과" },
      scoreReflected: true,
    },
    {
      id: "tb-m2-c", variableName: "overlap_ratio", customerLabel: "발화 겹침 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "다른 참여자와 발화가 동시에 겹친 비율",
      band: { upper: "10% 미만", midHigh: "10~20%", midLow: "21~35%", poor: "35% 초과" },
      scoreReflected: true,
    },
    {
      id: "tb-m2-d", variableName: "longest_monologue_sec", customerLabel: "최장 연속 발화 길이",
      category: "required", dataType: "Float", unit: "초",
      meaning: "다른 참여자의 substantive turn 없이 연속 발화한 최장 길이",
      band: { upper: "40초 이하", midHigh: "41~75초", midLow: "76~120초", poor: "120초 초과" },
      scoreReflected: true,
    },
    {
      id: "tb-m2-e", variableName: "response_latency_median_sec", customerLabel: "응답 타이밍 중앙값",
      category: "supplementary", dataType: "Float", unit: "초",
      meaning: "다른 발언 종료 후 평가 대상자 응답까지의 간격 중앙값",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M2_score = mean(target_talk_ratio, interruption, overlap_ratio, longest_monologue_sec) × 3",
  totalReflected: true,
};

const TB_M3: MAssessmentItem = {
  code: "M3",
  customerLabel: "안정적인 말투와 압박 없는 전달",
  aiLabel: "Stable, non-pressuring delivery",
  definition: "평가 대상자의 말 속도·음량이 상대를 압박하지 않는 정도를 평가한다. 강한 발화와 압박적 전달은 구분한다.",
  indicators: [
    {
      id: "tb-m3-a", variableName: "articulation_rate_syl_per_sec", customerLabel: "말 속도",
      category: "required", dataType: "Float", unit: "음절/초",
      meaning: "실제 조음 기준 말 속도",
      band: { upper: "3.5~5.8", midHigh: "3.0~3.4 또는 5.9~6.3", midLow: "2.5~2.9 또는 6.4~6.8", poor: "2.5 미만 또는 6.8 초과" },
      scoreReflected: true,
    },
    {
      id: "tb-m3-b", variableName: "loudness_spike_events_per_min", customerLabel: "음량 급상승 빈도",
      category: "required", dataType: "Float", unit: "회/분",
      meaning: "본인 baseline 대비 급격히 음량이 상승한 이벤트 분당 빈도",
      band: { upper: "0.5 이하", midHigh: "0.6~1.5", midLow: "1.6~3.0", poor: "3.0 초과" },
      scoreReflected: true,
    },
    {
      id: "tb-m3-c", variableName: "tone_instability_events_per_min", customerLabel: "말투·톤 흔들림 참고값",
      category: "supplementary", dataType: "Float", unit: "회/분",
      meaning: "음높이·억양·발성 안정성이 평상시 대비 급격히 흔들린 이벤트 — 심리상태 추정 금지",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M3_score = mean(articulation_rate_score, loudness_spike_score) × 3",
  totalReflected: true,
};

const TB_M4: MAssessmentItem = {
  code: "M4",
  customerLabel: "다른 참여자를 고르게 포함하는 참여 운영",
  aiLabel: "Inclusive participation management",
  definition: "평가 대상자가 특정 참여자에게만 반복적으로 반응하지 않고, 다른 참여자 모두를 대화 안에 포함시키는 정도를 평가한다.",
  indicators: [
    {
      id: "tb-m4-a", variableName: "other_participant_response_coverage_ratio", customerLabel: "다른 참여자 반응 커버리지 비율",
      category: "required", dataType: "Int", unit: "%",
      meaning: "다른 참여자들의 발언 기회 대비 반복적으로 받아주고 연결한 반응 커버리지 (모든 맥락 참여자 coverage의 평균)",
      band: { upper: "100", midHigh: "75~99", midLow: "50~74", poor: "50 미만" },
      scoreReflected: true,
    },
    {
      id: "tb-m4-b", variableName: "other_participant_inclusion_balance_index", customerLabel: "참여자 포함 균형 지수",
      category: "required", dataType: "Float",
      meaning: "다른 참여자에 대한 반응이 기회 대비 한쪽으로 쏠리지 않은 균형 지수 (1.0에 가까울수록 균형)",
      band: { upper: "0.80 이상", midHigh: "0.65~0.79", midLow: "0.45~0.64", poor: "0.45 미만" },
      scoreReflected: true,
    },
    {
      id: "tb-m4-c", variableName: "turn_passing_events_count", customerLabel: "발언권 넘기기 횟수",
      category: "conditional", dataType: "Int",
      meaning: "특정 참여자를 호명하며 발언권을 명시적으로 넘기거나 발언이 적은 참여자를 초대한 횟수",
      condition: "turn-passing 이벤트 탐지 활성 시",
      scoreReflected: false,
    },
    {
      id: "tb-m4-d", variableName: "multi_party_bridging_events_count", customerLabel: "여러 참여자 발언 연결·정리 횟수",
      category: "conditional", dataType: "Int",
      meaning: "한 번의 발언 안에서 둘 이상 참여자의 발언을 함께 참조·요약·연결한 횟수",
      condition: "bridging 이벤트 탐지 활성 시",
      scoreReflected: false,
    },
    {
      id: "tb-m4-e", variableName: "single_participant_response_skew_flag", customerLabel: "특정 참여자 반응 편중 참고값",
      category: "conditional", dataType: "Bool",
      meaning: "내부 참고값 — directed response의 80% 이상이 한 참여자에 집중될 때 true. 점수 미반영, 해석 보강에만 사용",
      condition: "내부 해석 안전장치 (결과 전면 점수항목으로 노출하지 않음)",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M4_score = mean(response_coverage_score, inclusion_balance_score) × 3",
  totalReflected: true,
};

const TB_M5: MAssessmentItem = {
  code: "M5",
  customerLabel: "시선·자세·표정 등 보이는 반응의 안정성",
  aiLabel: "Supplementary visible reaction stability",
  definition: "보조 항목 — 토의 중 시선·자세·표정의 안정성을 참고적으로 확인한다. 총점에는 반영하지 않는다.",
  indicators: [
    {
      id: "tb-m5-a", variableName: "shared_frame_reaction_orientation_ratio", customerLabel: "다중 화면 반응 방향 비율",
      category: "supplementary", dataType: "Float (%)", unit: "%",
      meaning: "shared-frame 구간에서 다른 참여자 방향 반응 비율",
      scoreReflected: false,
    },
    {
      id: "tb-m5-b", variableName: "abrupt_head_or_body_shift_events_per_min", customerLabel: "급격한 머리·상체 움직임 빈도",
      category: "supplementary", dataType: "Float", unit: "회/분",
      meaning: "급격한 자세 전환 이벤트 — 자연스러운 자세 조정과 구분",
      scoreReflected: false,
    },
    {
      id: "tb-m5-c", variableName: "visible_closed_or_fidget_ratio", customerLabel: "닫힌 자세·잔동작 비율",
      category: "conditional", dataType: "Float (%)", unit: "%",
      meaning: "shared-frame 구간에서 닫힌 자세·잔동작 비율",
      condition: "shared-frame 가용 시",
      scoreReflected: false,
    },
    {
      id: "tb-m5-d", variableName: "facial_reaction_instability_ratio", customerLabel: "표정 반응 불안정 비율",
      category: "conditional", dataType: "Float (%)", unit: "%",
      meaning: "표정 변화 불안정 — 인상·성향 해석 금지",
      condition: "FACS AU 분류기 활성 시",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M5는 점수화하지 않음 — 참고 의견 생성용",
  totalReflected: false,
};

const TRUST_BUILDING: CompetencyAssessmentData = {
  key: "trustBuilding",
  label: "신뢰형성",
  icon: "Handshake",
  color: "#f59e0b",
  scenario: {
    title: "부서간 설비 교체 일정 갈등 조율 (협상형 그룹토의)",
    description:
      "발전소 설비 교체 작업 일정을 두고 서로 다른 부서 역할을 맡은 참여자들이 그룹토의를 진행합니다.\n\n" +
      "효율성: 야간/주말 작업으로 가동 중단 최소화\n" +
      "안전성: 주간 작업으로 안전 확보\n" +
      "비용: 예산 범위 내 최적 일정\n\n" +
      "각자 담당 부서 입장을 관철하되, 제한 시간 안에 모두 수용 가능한 하나의 안을 도출합니다.\n" +
      "평가는 한 번에 한 사람(평가 대상자)만 지정하여 수행하며, 나머지는 맥락 참여자로 처리합니다.",
    activityType: "협상형 그룹토의 (Group Discussion)",
    reference: "협상형 토의 상호작용 행동 분석 v1.0",
  },
  rubricItems: [TB_M1, TB_M2, TB_M3, TB_M4, TB_M5].map(mItemToRubricItem),
  mItems: [TB_M1, TB_M2, TB_M3, TB_M4, TB_M5],
  taskContext: {
    title: "부서간 설비 교체 일정 갈등 조율",
    description: "서로 다른 부서 역할을 맡은 참여자들이 합의안을 도출하는 협상형 그룹토의 — 평가 대상자 1인(target) 기준으로 별도 scoring, 나머지는 맥락 참여자(context)",
    activityType: "Group Discussion",
    duration: "세션 길이 가변",
    participants: "평가 대상자 1인(target) + 맥락 참여자 N인(context)",
    reference: "신뢰형성 리더십 역량평가 AI 기술정의서 v1.0",
  },
  evaluationPrinciples: [
    "한 번에 한 사람의 평가 대상자만 평가하며, 나머지 두 사람은 맥락 참여자",
    "내용의 정답 여부·대안의 우수성·최종 합의안 품질은 평가하지 않음",
    "이견 제시와 반박 자체는 감점 사유가 아님",
    "강한 입장 표명과 참여자 비난은 구분 — judgmental_language는 별도 항목 간 참고정보",
    "조건부지표는 탐지된 경우에만 해석 보강에 사용 — 미탐지를 감점하지 않음",
  ],
  excludedElements: [
    "각 부서 입장의 타당성·정답 여부",
    "최종 합의안의 품질·실무적 우수성",
    "반박 내용의 정답 여부",
    "외모·복장·나이·성별 등 개인적 특성",
    "성격·친화력·카리스마·따뜻함 등 인상적 해석",
    "편집 방식·카메라 전환·화면 구성에 대한 주관적 인상평",
  ],
  totalScoringFormula: "총점 = mean(채점 가능한 M1~M4) (0~9 scale) · 핵심 4개 중 3개 이상 채점 가능할 때만 산출 · 100점 환산값 = 총점 / 9 × 100",
  prohibitedExpressions: [
    "신뢰가 형성되었다", "믿음직하다", "따뜻하다", "카리스마가 있다", "공격적이다",
    "소극적이다", "사람을 편하게 한다", "편을 든다", "리더답다", "설득을 잘한다", "의견이 맞다",
    "상대를 계속 바라보았다", "아이컨택이 좋았다",
  ],
  crossItemReference: "강한 입장 표명·이슈 강조(\"안전은 타협할 수 없습니다\")와 사람·발언을 직접 낮추는 일축 표현(\"그건 틀렸습니다\")을 구분한다. judgmental_dismissive_language는 점수화하지 않고 M1·M3 해석 보강에만 사용한다.",
  participantModel: "평가 대상자 1인(target) 평가, 나머지는 맥락 참여자(context). 가변 N인. 이견·반박 자체는 감점하지 않으며, 1:1 면담형 시선 언어(\"계속 바라봄\")를 사용하지 않는다.",
};

// =============================================
// 구성원육성 (Member Development) — 1:1 코칭·피드백 면담 (6분)
// =============================================

const MD_M1: MAssessmentItem = {
  code: "M1",
  customerLabel: "경청과 공감·인정·이해 확인 반응",
  aiLabel: "Active listening & empathic / acknowledgment / understanding response",
  definition: "Leader가 Member의 말을 끊지 않고 듣고, 공감·인정·이해 확인을 통해 코칭적 관계를 형성하는 정도를 평가한다. 면담 초반 라포형성 행동도 참고한다.",
  indicators: [
    {
      id: "md-m1-a", variableName: "leader_gaze_during_member_ratio", customerLabel: "상대 발화 중 시선 유지 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "Member 발화 중 Leader가 Member 방향으로 시선을 유지한 valid frame 비율",
      band: { upper: "70% 이상", midHigh: "55~69%", midLow: "40~54%", poor: "40% 미만" },
      scoreReflected: true,
    },
    {
      id: "md-m1-b", variableName: "active_listening_signals_per_min", customerLabel: "경청 신호 빈도",
      category: "required", dataType: "Float", unit: "회/분",
      meaning: "Member 발화 중 끄덕임·짧은 맞장구 등 수용 반응 분당 빈도",
      band: { upper: "3.0 이상", midHigh: "1.5~2.9", midLow: "0.5~1.4", poor: "0.5 미만" },
      scoreReflected: true,
    },
    {
      id: "md-m1-c", variableName: "empathic_understanding_response_count", customerLabel: "공감·인정·이해 확인 반응 빈도",
      category: "required", dataType: "Int",
      meaning: "재진술·이해 확인·공감 반응·인정/격려 반응 총 발생 건수 (6분 면담 기준)",
      band: { upper: "3회 이상", midHigh: "2회", midLow: "1회", poor: "0회" },
      scoreReflected: true,
    },
    {
      id: "md-m1-d", variableName: "rapport_opening_behavior_count", customerLabel: "라포형성을 위한 면담 초반 관계 형성 행동",
      category: "conditional", dataType: "Int",
      meaning: "면담 시작 후 60~90초에 Member가 편하게 말할 수 있도록 관계를 여는 행동 횟수",
      condition: "면담 초반 관계 형성 행동 탐지 활성 시",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M1_score = mean(leader_gaze_during_member_ratio_score, active_listening_signals_per_min_score, empathic_understanding_response_count_score) × 3",
  totalReflected: true,
};

const MD_M2: MAssessmentItem = {
  code: "M2",
  customerLabel: "안정적인 말투와 압박 없는 전달",
  aiLabel: "Stable, non-pressuring delivery",
  definition: "Leader의 말 속도·음량·말투가 Member에게 과도한 압박 없이 전달되는 정도를 평가한다.",
  indicators: [
    {
      id: "md-m2-a", variableName: "leader_articulation_rate_syl_per_sec", customerLabel: "말 속도",
      category: "required", dataType: "Float", unit: "음절/초",
      meaning: "Leader의 실제 조음 기준 말 속도",
      band: { upper: "3.5~5.5", midHigh: "3.0~3.4 또는 5.6~6.0", midLow: "2.5~2.9 또는 6.1~6.5", poor: "2.5 미만 또는 6.5 초과" },
      scoreReflected: true,
    },
    {
      id: "md-m2-b", variableName: "loudness_spike_events_per_min", customerLabel: "음량 급상승 빈도",
      category: "required", dataType: "Float", unit: "회/분",
      meaning: "Leader 음량이 baseline 대비 급격히 상승한 이벤트 분당 빈도",
      band: { upper: "0.5 이하", midHigh: "0.6~1.5", midLow: "1.6~3.0", poor: "3.0 초과" },
      scoreReflected: true,
    },
    {
      id: "md-m2-c", variableName: "prosody_instability_events_per_min", customerLabel: "말투·톤 흔들림 참고값",
      category: "supplementary", dataType: "Float", unit: "회/분",
      meaning: "Leader 음높이·억양·발성 안정성이 평상시 대비 급격히 흔들린 이벤트 — 심리상태 추정 금지",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M2_score = mean(leader_articulation_rate_score, loudness_spike_score) × 3",
  totalReflected: true,
};

const MD_M3: MAssessmentItem = {
  code: "M3",
  customerLabel: "대화 공간 보장과 코칭적 운영",
  aiLabel: "Coaching-oriented conversation management",
  definition: "Leader가 Member에게 충분한 발언 기회를 보장하고, 일방적 독백 없이 대화를 운영하며, 열린 질문으로 Member의 사고를 여는 정도를 평가한다.",
  indicators: [
    {
      id: "md-m3-a", variableName: "leader_talk_ratio", customerLabel: "Leader 발화 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "실제 발화 구간 중 Leader가 차지하는 발화 비중",
      band: { upper: "20~55%", midHigh: "56~65% 또는 15~19%", midLow: "66~75% 또는 10~14%", poor: "75% 초과 또는 10% 미만" },
      scoreReflected: true,
    },
    {
      id: "md-m3-b", variableName: "interruption_per_min", customerLabel: "끼어들기 빈도",
      category: "required", dataType: "Float", unit: "회/분",
      meaning: "Leader가 Member 발화를 실질적으로 끊고 들어간 빈도",
      band: { upper: "0.5 이하", midHigh: "0.6~1.5", midLow: "1.6~3.0", poor: "3.0 초과" },
      scoreReflected: true,
    },
    {
      id: "md-m3-c", variableName: "longest_monologue_sec", customerLabel: "최장 연속 발화 길이",
      category: "required", dataType: "Float", unit: "초",
      meaning: "Member의 substantive turn 없이 Leader가 연속 발화한 최장 시간",
      band: { upper: "30초 이하", midHigh: "31~60초", midLow: "61~90초", poor: "90초 초과" },
      scoreReflected: true,
    },
    {
      id: "md-m3-d", variableName: "exploratory_follow_up_question_count", customerLabel: "열린 질문·탐색적 후속질문 빈도",
      category: "required", dataType: "Int",
      meaning: "직전 Member 발화와 연결되어 이유·배경·어려움·대안을 더 여는 질문 횟수 (6분 기준)",
      band: { upper: "3회 이상", midHigh: "2회", midLow: "1회", poor: "0회" },
      scoreReflected: true,
    },
    {
      id: "md-m3-e", variableName: "response_latency_median_sec", customerLabel: "응답 타이밍 중앙값",
      category: "supplementary", dataType: "Float", unit: "초",
      meaning: "Member 발화 종료 후 Leader 반응까지 간격 중앙값",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M3_score = mean(leader_talk_ratio, interruption_per_min, longest_monologue_sec, exploratory_follow_up_question_count) × 3",
  totalReflected: true,
};

const MD_M4: MAssessmentItem = {
  code: "M4",
  customerLabel: "개방적 자세와 편안한 몸짓",
  aiLabel: "Open posture & comfortable nonverbal behavior",
  definition: "Leader의 자세가 Member를 향해 열려 있고, 불필요한 잔동작 없이 대화 참여를 방해하지 않는 정도를 평가한다.",
  indicators: [
    {
      id: "md-m4-a", variableName: "open_posture_ratio", customerLabel: "열린 자세 유지 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "Leader가 개방적 자세를 유지한 valid frame 비율",
      band: { upper: "70% 이상", midHigh: "55~69%", midLow: "35~54%", poor: "35% 미만" },
      scoreReflected: true,
    },
    {
      id: "md-m4-b", variableName: "closed_or_fidget_ratio", customerLabel: "잔동작·자기접촉 비율",
      category: "required", dataType: "Float (%)", unit: "%",
      meaning: "팔짱·손 숨김·반복적 자기접촉·펜 돌리기 등 잔동작이 감지된 frame 비율",
      band: { upper: "10% 미만", midHigh: "10~20%", midLow: "21~35%", poor: "35% 초과" },
      scoreReflected: true,
    },
  ],
  scoringFormula: "M4_score = mean(open_posture_ratio_score, closed_or_fidget_ratio_score) × 3",
  totalReflected: true,
};

const MD_M5: MAssessmentItem = {
  code: "M5",
  customerLabel: "표정과 머리 움직임의 안정성",
  aiLabel: "Supplementary facial/head stability",
  definition: "보조 항목 — 면담 안정성 참고용. 총점에는 반영하지 않으며 참고 의견 생성용으로만 사용한다.",
  indicators: [
    {
      id: "md-m5-a", variableName: "abrupt_head_jerk_per_min", customerLabel: "급격한 머리 움직임 빈도",
      category: "supplementary", dataType: "Float", unit: "회/분",
      meaning: "급격한 머리 방향 전환 이벤트 — 자연스러운 자세 전환과 구분",
      scoreReflected: false,
    },
    {
      id: "md-m5-b", variableName: "engaged_neutral_ratio", customerLabel: "표정 안정성 참고값",
      category: "conditional", dataType: "Float (%)", unit: "%",
      meaning: "안정 표정 유지 비율",
      condition: "FACS AU 분류기 활성 시",
      scoreReflected: false,
    },
    {
      id: "md-m5-c", variableName: "facial_tension_ratio", customerLabel: "얼굴 긴장도 참고값",
      category: "conditional", dataType: "Float (%)", unit: "%",
      meaning: "얼굴 긴장 신호 비율 — 심리 상태 추정 금지",
      condition: "FACS AU 분류기 활성 시",
      scoreReflected: false,
    },
  ],
  scoringFormula: "M5는 점수화하지 않음 — 참고 의견 생성용",
  totalReflected: false,
};

const MEMBER_DEVELOPMENT: CompetencyAssessmentData = {
  key: "memberDevelopment",
  label: "구성원육성",
  icon: "GraduationCap",
  color: "#ef4444",
  scenario: {
    title: "1:1 코칭·피드백 면담 — 회의문화 개선 (6분)",
    description:
      "매주 정기 회의가 비효율적으로 운영되고 있습니다. 참가자들이 소극적이고, 건설적 의견 없이 문제점만 반복 논의됩니다.\n\n" +
      "Leader는 민차장과의 1:1 6분 면담을 통해:\n" +
      "① 회의 비효율성 문제를 객관적으로 다루고\n" +
      "② 개선 계획을 함께 수립하며\n" +
      "③ 차장급 구성원의 업무역량 향상까지 함께 고려해야 합니다.\n\n" +
      "단순 지적 면담이 아니라 코칭·피드백 면담입니다.",
    activityType: "1:1 코칭 면담 (Role Play)",
    reference: "개발적 코칭 면담 상호작용 행동 분석 v1.0",
  },
  rubricItems: [MD_M1, MD_M2, MD_M3, MD_M4, MD_M5].map(mItemToRubricItem),
  mItems: [MD_M1, MD_M2, MD_M3, MD_M4, MD_M5],
  taskContext: {
    title: "1:1 코칭·피드백 면담 — 회의문화 개선",
    description: "Leader와 Member의 6분 1:1 면담 — 문제 시정뿐 아니라 성장 지원을 동반한 개발적 면담",
    activityType: "Role Play (1:1 코칭 면담)",
    duration: "6분",
    participants: "Leader (평가 대상자) + Member (맥락 참여자)",
    reference: "구성원육성 리더십 역량평가 AI 기술정의서 v1.0",
  },
  evaluationPrinciples: [
    "Leader 1인만 평가 — Member 발화는 상호작용 맥락 해석용",
    "단순히 발화했는지가 아니라 듣고·공감하고·인정하고·이해 확인하고·열린 질문으로 사고를 여는 코칭 행동을 평가",
    "문제 제기 자체는 감점하지 않음 — 평가·비난 후보 표현(judgmental language)은 별도 항목 간 참고정보",
    "라포형성은 면담 초반 관계 형성 행동으로 관찰 — '라포가 형성되었다'고 단정하지 않음",
    "공감 반응과 인정·격려 반응은 구분",
    "열린 질문은 단순 예/아니오형 질문이 아니라 이유·배경·어려움·대안을 더 여는 질문",
  ],
  excludedElements: [
    "회의문화 개선 방안 자체의 정답 여부",
    "문제 원인 진단의 정확성",
    "조언 내용의 전문성·완성도",
    "차장급 역량 개발 방향의 타당성",
    "외모·복장·나이·성별 등 개인적 특성",
    "성격·따뜻함·리더다움 같은 인상 해석",
    "배경 환경·촬영 품질에 대한 주관적 인상평",
  ],
  totalScoringFormula: "총점 = mean(채점 가능한 M1~M4) (0~9 scale) · 100점 환산값 = 총점 / 9 × 100",
  prohibitedExpressions: [
    "심리적 안전감이 느껴졌다", "코칭을 잘했다", "공감 능력이 높다", "리더답다",
    "따뜻해 보인다", "공격적이다", "방어적이다", "성장시킬 것 같다", "라포가 형성되었다",
  ],
  crossItemReference: "문제 제기 발화(\"회의 참여율이 낮은 부분은 개선이 필요합니다\")와 사람·발언을 직접 낮추는 평가·비난 후보(\"왜 그렇게밖에 못하셨습니까?\")를 구분한다. judgmental_language는 점수화하지 않고 M1·M2 해석 보강에만 사용한다. 라포는 단정하지 않고 '면담 초반 관계 형성 행동' 관찰로만 기술한다.",
  participantModel: "Leader 1인(평가 대상자)만 평가, Member는 맥락 참여자. 공감 반응과 인정·격려 반응을 구분하며, 열린 질문은 이유·배경·어려움·대안을 더 여는 질문으로 한정한다.",
};

// =============================================
// 공통: 점수 변환 + 총점 산출 + 총점 해석
// =============================================

export const SUB_INDICATOR_SCALE = {
  upper: 3,
  midHigh: 2,
  midLow: 1,
  poor: 0,
} as const;

export const TOTAL_INTERPRETATION = [
  { range: "7.5 ~ 9.0", label: "매우 우수", color: "text-teal-600", bgColor: "bg-teal-50" },
  { range: "5.5 ~ 7.4", label: "보통 이상", color: "text-sky-600",  bgColor: "bg-sky-50" },
  { range: "3.0 ~ 5.4", label: "보통 미만", color: "text-amber-600", bgColor: "bg-amber-50" },
  { range: "0.0 ~ 2.9", label: "미흡",      color: "text-red-500",  bgColor: "bg-red-50" },
] as const;

export function interpretTotalScore(score: number): string {
  if (score >= 7.5) return "매우 우수";
  if (score >= 5.5) return "보통 이상";
  if (score >= 3.0) return "보통 미만";
  if (score > 0)    return "미흡";
  return "산출 보류";
}

// 데이터 품질 N/A 규칙 (공통)
export const QUALITY_NA_RULES = [
  "화자 분리(speaker diarization) 또는 역할 매핑 실패 시 M1~M3 N/A 처리",
  "얼굴·시선 추적 valid frame 비율 70% 미만 시 M1 부분 또는 전체 N/A",
  "음성 품질 저하(clipping·잡음·과도한 중첩 발화) 시 M2~M3 부분 또는 전체 N/A",
  "전사 신뢰도 부족 시 의미 분석 기반 지표 N/A",
  "상반신·손 keypoint 가시 비율 70% 미만 시 M4 전체 N/A",
  "M5는 추적 품질이 낮거나 분류기가 비활성이면 자동 N/A 또는 참고의견 생략",
  "상시·조건부·내부 참고지표 미산출은 0점이 아니라 Drop",
  "채점 가능한 핵심 항목(M1~M4)이 3개 미만이면 총점 산출 보류(N/A)",
  "M5(보조 항목)는 numeric score를 산출하지 않으며 총점에 반영하지 않음",
];

// 역량별 채점 대상 필수지표 조회 (category=required & scoreReflected & band 보유)
export function getScoredIndicators(competencyKey: string): RubricIndicator[] {
  const data = ASSESSMENT_BY_KEY[competencyKey];
  if (!data) return [];
  return data.mItems
    .filter((m) => m.totalReflected)
    .flatMap((m) => m.indicators.filter((ind) => ind.category === "required" && ind.scoreReflected && ind.band));
}

// =============================================
// 전체 데이터 내보내기 — 1-3직급 핵심 3개 역량
// =============================================

export const DEPARTMENT_HEAD_ASSESSMENTS: CompetencyAssessmentData[] = [
  VISION_PRESENTATION,
  TRUST_BUILDING,
  MEMBER_DEVELOPMENT,
];

// 역량 키 → 데이터 빠른 조회
export const ASSESSMENT_BY_KEY: Record<string, CompetencyAssessmentData> = Object.fromEntries(
  DEPARTMENT_HEAD_ASSESSMENTS.map((a) => [a.key, a])
);

// =============================================
// (deprecated) Multimodal Rubric — 호환용 alias
// 새 코드는 ASSESSMENT_BY_KEY[*].mItems / indicators 직접 사용 권장
// =============================================

// 현재 운영 버전은 "v1.0" 단일화. "bars"/"multimodal"은 deprecated CompetencyAssessment.tsx 호환용.
export type RubricVersion = "v1.0" | "v0.9" | "bars" | "multimodal";

// 비전제시의 M1~M5를 멀티모달 루브릭 호환 형태로 노출 (deprecated)
export interface MultimodalThreshold {
  upper: string;
  midHigh: string;
  midLow: string;
  poor: string;
}

export interface MultimodalSubIndicator {
  id: string;
  name: string;
  label: string;
  unit: string;
  thresholds: MultimodalThreshold;
  condition?: string;
}

export interface MultimodalRubricItem {
  id: string;
  number: number;
  criteria: string;
  definition: string;
  channel: string;
  subIndicators: MultimodalSubIndicator[];
  scoringNotes: string[];
}

export interface MultimodalRubricData {
  version: string;
  title: string;
  description: string;
  purpose: string;
  scoringFormula: {
    subIndicatorScale: string;
    itemFormula: string;
    totalFormula: string;
  };
  totalInterpretation: { range: string; label: string; color: string }[];
  items: MultimodalRubricItem[];
}

// 비전제시 M-항목을 그대로 노출 (하위 호환)
export const MULTIMODAL_RUBRIC: MultimodalRubricData = {
  version: "v1.0",
  title: "비전제시 멀티모달 행동지표 루브릭",
  description: "비전제시 5분 전략 브리핑 발표의 멀티모달 행동지표 — 새 코드는 ASSESSMENT_BY_KEY['visionPresentation'].mItems 사용 권장",
  purpose: "비전제시 발표의 전달 행동 (시선·음성·유창성·자세·표정)을 정량 평가",
  scoringFormula: {
    subIndicatorScale: "상위 3점 · 중상 2점 · 중하 1점 · 미흡 0점",
    itemFormula: "항목 점수 = 필수지표 변환점수 평균 × 3 (최대 9점)",
    totalFormula: "총점 = 채점 가능한 M1~M4 평균 (최대 9점)",
  },
  totalInterpretation: TOTAL_INTERPRETATION.map(({ range, label, color }) => ({ range, label, color })),
  items: VISION_PRESENTATION.mItems.slice(0, 5).map((m, i) => ({
    id: m.code.toLowerCase(),
    number: i + 1,
    criteria: m.customerLabel,
    definition: m.definition,
    channel: m.aiLabel,
    subIndicators: m.indicators
      .filter((ind) => ind.band)
      .map((ind) => ({
        id: ind.id,
        name: ind.variableName,
        label: ind.customerLabel,
        unit: ind.unit || "",
        thresholds: {
          upper: ind.band!.upper,
          midHigh: ind.band!.midHigh,
          midLow: ind.band!.midLow,
          poor: ind.band!.poor,
        },
        ...(ind.condition ? { condition: ind.condition } : {}),
      })),
    scoringNotes: [m.scoringFormula],
  })),
};

// =============================================
// 데모 디브리핑 클립 — M-항목 기반 (3개 핵심 역량)
// =============================================

export interface DebriefingClip {
  id: string;
  competencyKey: LeadershipCompetencyKey;
  rubricItemId: string;       // m1 / m2 / m3 / m4 / m5
  speaker: string;
  timestamp: number;
  endTime: number;
  description: string;
  suggestedScore: number;
}

export const DEMO_DEBRIEFING_CLIPS: DebriefingClip[] = [
  // ─── 비전제시 ───
  { id: "clip-vp-m1", competencyKey: "visionPresentation", rubricItemId: "m1", speaker: "김철수", timestamp: 30, endTime: 75,
    description: "발표 도입부 청중 응시 비율 72% — 슬라이드 참조 후 일관되게 청중으로 시선 복귀 관찰", suggestedScore: 8 },
  { id: "clip-vp-m2", competencyKey: "visionPresentation", rubricItemId: "m2", speaker: "김철수", timestamp: 110, endTime: 160,
    description: "PEST 분석 결과 설명 구간 — F0 변화폭 6 ST · 음량 변화 9 dB 안정적 강조", suggestedScore: 7 },
  { id: "clip-vp-m3", competencyKey: "visionPresentation", rubricItemId: "m3", speaker: "김철수", timestamp: 180, endTime: 220,
    description: "전략과제 단계로 전환 시 '다음으로' 구조전환 발화 후 짧은 멈춤 — 채움말 분당 2.3회", suggestedScore: 7 },
  { id: "clip-vp-m4", competencyKey: "visionPresentation", rubricItemId: "m4", speaker: "김철수", timestamp: 240, endTime: 285,
    description: "개방적 자세 비율 75% · 닫힌 자세 8% — 메시지를 지지하는 손동작 관찰", suggestedScore: 8 },
  { id: "clip-vp-m5", competencyKey: "visionPresentation", rubricItemId: "m5", speaker: "김철수", timestamp: 290, endTime: 300,
    description: "발표 종료 직전 머리 움직임 안정적 — engaged-neutral 유지", suggestedScore: 7 },

  // ─── 신뢰형성 ───
  { id: "clip-tb-m1", competencyKey: "trustBuilding", rubricItemId: "m1", speaker: "이영희", timestamp: 370, endTime: 410,
    description: "B부서(안전성) 발언 직후 '말씀하신 안전 우선 원칙은 동의합니다'로 인정 + 연결 반응 관찰", suggestedScore: 8 },
  { id: "clip-tb-m2", competencyKey: "trustBuilding", rubricItemId: "m2", speaker: "이영희", timestamp: 420, endTime: 470,
    description: "발화 비율 38% · 끼어들기 0.4회/분 · 최장 연속 발화 32초 — 균형 잡힌 운영", suggestedScore: 8 },
  { id: "clip-tb-m3", competencyKey: "trustBuilding", rubricItemId: "m3", speaker: "이영희", timestamp: 480, endTime: 520,
    description: "강한 입장 표명 구간이나 음량 급상승 이벤트 0.3회/분 — 안정적 전달", suggestedScore: 7 },
  { id: "clip-tb-m4", competencyKey: "trustBuilding", rubricItemId: "m4", speaker: "이영희", timestamp: 540, endTime: 595,
    description: "A·C 두 부서 발언 모두에 반응 (커버리지 100%) · inclusion balance 0.84", suggestedScore: 8 },
  { id: "clip-tb-m5", competencyKey: "trustBuilding", rubricItemId: "m5", speaker: "이영희", timestamp: 600, endTime: 630,
    description: "shared-frame 구간에서 다른 참여자 방향 반응 안정적 — 잔동작 비율 7%", suggestedScore: 7 },

  // ─── 구성원육성 ───
  { id: "clip-md-m1", competencyKey: "memberDevelopment", rubricItemId: "m1", speaker: "정수진", timestamp: 870, endTime: 920,
    description: "Member 발화 중 시선 유지 비율 74% · '그 부분이 부담되셨겠군요' 공감 반응 3회", suggestedScore: 8 },
  { id: "clip-md-m2", competencyKey: "memberDevelopment", rubricItemId: "m2", speaker: "정수진", timestamp: 925, endTime: 960,
    description: "말 속도 4.2 음절/초 안정 · 음량 급상승 이벤트 0회 — 압박 없는 전달", suggestedScore: 8 },
  { id: "clip-md-m3", competencyKey: "memberDevelopment", rubricItemId: "m3", speaker: "정수진", timestamp: 970, endTime: 1020,
    description: "Leader 발화 비율 42% · '어떻게 개선하면 좋겠다고 생각하시나요?' 열린 질문 3회", suggestedScore: 8 },
  { id: "clip-md-m4", competencyKey: "memberDevelopment", rubricItemId: "m4", speaker: "정수진", timestamp: 1030, endTime: 1060,
    description: "개방적 자세 비율 78% · 잔동작 비율 6% — Member 방향 상체 유지", suggestedScore: 8 },
  { id: "clip-md-m5", competencyKey: "memberDevelopment", rubricItemId: "m5", speaker: "정수진", timestamp: 1070, endTime: 1090,
    description: "면담 종료부 표정 안정 유지 — 급격한 머리 움직임 0회/분", suggestedScore: 7 },
];
