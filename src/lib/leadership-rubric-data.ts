// =============================================
// KHNP 리더십역량진단 개선 루브릭 데이터
// 출처: standards/KHNP_리더십역량진단_개선루브릭.pptx
// BARS 기반 행동 앵커 + 원전 맥락 내재화 + 9점 척도
// =============================================

import type { LeadershipCompetencyKey } from "./types";

// 루브릭 4단계 척도 레벨
export interface RubricLevel {
  range: string;       // "9점" | "6~8점" | "2~5점" | "1점"
  label: string;       // "매우 우수" | "보통 이상" | "보통 미만" | "미흡"
  description: string; // 행동 앵커 기술
  color: string;       // UI 색상
  bgColor: string;     // 배경색
}

// 개선 루브릭 평가 항목
export interface ImprovedRubricItem {
  id: string;
  criteria: string;        // 평가 항목명
  subLabel: string;        // 부제 (괄호 안 설명)
  levels: RubricLevel[];   // 4단계 척도
}

// 역량별 상황 사례 설명
export interface CompetencyScenario {
  title: string;           // 사례 제목
  description: string;     // 사례 본문
  activityType: string;    // 활동 유형 (발표, GD, In-basket, RP 등)
  reference: string;       // 개선 근거
}

// 역량별 전체 데이터
export interface CompetencyAssessmentData {
  key: LeadershipCompetencyKey;
  label: string;
  icon: string;            // 아이콘 이름
  color: string;
  scenario: CompetencyScenario;
  rubricItems: ImprovedRubricItem[];
}

// ─── 공통 4단계 색상 ───
const LEVEL_COLORS = {
  excellent: { color: "text-teal-600", bgColor: "bg-teal-50" },
  good:     { color: "text-sky-600",   bgColor: "bg-sky-50" },
  fair:     { color: "text-amber-600", bgColor: "bg-amber-50" },
  poor:     { color: "text-red-500",   bgColor: "bg-red-50" },
};

// =============================================
// ① 비전제시
// =============================================
const VISION_PRESENTATION: CompetencyAssessmentData = {
  key: "visionPresentation",
  label: "비전제시",
  icon: "Target",
  color: "#14b8a6",
  scenario: {
    title: "신사업·신재생에너지 분야 전략 수립",
    description:
      "에너지 기업이 신재생에너지 분야(태양광, 풍력)로 사업 포트폴리오를 확대하려 합니다. TFT 팀장으로서 PEST 분석 도구를 활용하여 환경을 분석하고, 전략목표와 과제를 도출한 뒤 TFT 멤버들에게 결과를 설명해야 합니다.\n\n" +
      "① PEST 분석 자료를 참고하여 내·외부 환경을 분석\n" +
      "② 분석 결과를 토대로 전략목표와 전략과제 도출\n" +
      "③ TFT 멤버들에게 전략과 실행방향 발표 및 동기부여",
    activityType: "발표 (Presentation)",
    reference: "Smith & Kendall(1963) BARS | Sanchez-Cortes et al.(2012) 비언어행동 기반 리더십 | Naim et al.(2015) 멀티모달 발표역량",
  },
  rubricItems: [
    {
      id: "vp-01",
      criteria: "환경 분석 역량",
      subLabel: "PEST 기반",
      levels: [
        { range: "9점", label: "매우 우수", description: "PEST 4요인을 원전 사업 맥락에 정확히 적용하고, 기회/위협을 안전·규제·기술 관점에서 도출함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "PEST 분석을 수행하나, 원전 산업 특수성(규제·안전) 반영이 일부 미흡함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "PEST 개념을 이해하나 분석이 표면적이며, 원전 맥락과의 연결이 부족함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "PEST 프레임을 이해하지 못하거나 분석 결과가 과제와 무관함", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "vp-02",
      criteria: "전략-과제 정합성",
      subLabel: "Alignment",
      levels: [
        { range: "9점", label: "매우 우수", description: "분석 결과에서 논리적으로 전략목표를 도출하고, 안전·생산·혁신 3축이 균형 있게 연결됨", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "전략목표와 과제 간 연결이 대체로 적절하나, 안전-생산 균형에 일부 편중 있음", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "과제를 도출했으나 분석과의 논리적 연계가 약하고, 전략 축이 누락됨", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "과제 도출이 분석과 무관하거나, 전략적 방향성 자체가 불분명함", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "vp-03",
      criteria: "과제의 도전성",
      subLabel: "안전비전 포함",
      levels: [
        { range: "9점", label: "매우 우수", description: "현 수준을 넘는 도전적 과제를 제시하며, 안전문화 혁신·선제적 규제 대응을 포함함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "도전적 요소가 있으나 안전문화 관점의 혁신 목표가 다소 약함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "기존 업무 수준에 머물며, 도전적·안전 혁신적 요소가 부족함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "보수적 접근에 머물러 조직 변화와 안전문화 발전을 기대하기 어려움", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "vp-04",
      criteria: "발표·동기부여",
      subLabel: "전달력",
      levels: [
        { range: "9점", label: "매우 우수", description: "핵심 메시지를 구조화하여 전달하고, 구성원의 공감과 참여 의지를 이끌어냄. 시선 접촉·안정된 음성 톤 유지", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "전략과 실행계획을 설명하나, 구성원 공감 유발이나 비언어적 전달력이 다소 부족함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "내용을 전달했으나 일방적이며, 동기부여 요소나 청중 교감이 미흡함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "설명이 불명확하고, 구성원 참여를 유도하지 못함", ...LEVEL_COLORS.poor },
      ],
    },
  ],
};

// =============================================
// ② 신뢰형성
// =============================================
const TRUST_BUILDING: CompetencyAssessmentData = {
  key: "trustBuilding",
  label: "신뢰형성",
  icon: "Handshake",
  color: "#f59e0b",
  scenario: {
    title: "부서간 설비 교체 일정 갈등 조율",
    description:
      "발전소 설비 교체 작업 일정을 두고 3개 부서가 서로 다른 입장을 가지고 있습니다.\n\n" +
      "A부서(효율성 중시): 야간/주말 작업으로 가동 중단 최소화\n" +
      "B부서(안전성 중시): 주간 근무 시간 작업으로 안전 확보\n" +
      "C부서(비용 중시): 예산 범위 내 최적 일정 요구\n\n" +
      "3개조로 나누어 각자 담당 부서의 입장을 관철하되, 최종적으로 모든 부서가 수용할 수 있는 합의를 도출해야 합니다.",
    activityType: "집단 토론 (Group Discussion)",
    reference: "Edmondson(1999) 심리적 안전감 이론 | Müller et al.(2019) 시선·자세 조합의 리더십 탐지",
  },
  rubricItems: [
    {
      id: "tb-01",
      criteria: "갈등 상황 분석",
      subLabel: "다중 이해관계",
      levels: [
        { range: "9점", label: "매우 우수", description: "각 부서의 입장과 핵심 이해를 정확히 파악하고, 안전-효율 갈등의 구조적 원인까지 분석함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "부서 입장을 파악하나, 갈등의 근본 원인 분석이나 안전-효율 프레임 적용이 일부 부족함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "자기 부서 관점에 치우쳐 타 부서 입장의 객관적 분석이 미흡함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "갈등 상황의 핵심을 파악하지 못하고, 분석 없이 주장에 머뭄", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "tb-02",
      criteria: "대안 도출",
      subLabel: "균형적 해법",
      levels: [
        { range: "9점", label: "매우 우수", description: "안전·효율·비용의 3축을 모두 고려한 창의적 해법을 제시하고, 실현 가능성을 검토함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "균형 있는 대안을 제시하나, 일부 축(안전 또는 비용)의 고려가 약함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "대안을 제시했으나 한쪽에 치우치며, 실현 가능성 검토가 부족함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "실효성 있는 대안을 제시하지 못하거나, 갈등을 해소하지 못함", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "tb-03",
      criteria: "적극 참여·기여",
      subLabel: "토론 주도성",
      levels: [
        { range: "9점", label: "매우 우수", description: "토론에서 핵심 논점을 정리하고, 합의 도출을 주도하며, 구성원 발언을 촉진함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "적극적으로 참여하나, 합의 도출 주도나 참여 촉진이 다소 부족함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "소극적으로 참여하여 결론 도출에 대한 기여가 미흡함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "토론에서 거의 발언하지 않고, 결론 도출에 기여하지 못함", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "tb-04",
      criteria: "존중·협력",
      subLabel: "심리적 안전감",
      levels: [
        { range: "9점", label: "매우 우수", description: "경청·고개 끄덕임·개방적 자세로 심리적 안전감을 조성하고, 소수 의견도 존중함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "상대 의견을 대체로 존중하나, 의견 충돌 시 협력 태도가 약해지는 순간이 있음", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "자기 주장에 집중하며, 타인 의견에 대한 경청이 부분적임", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "상대 의견을 무시하거나, 팀 분위기를 경직시키는 행동을 보임", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "tb-05",
      criteria: "설득·합의",
      subLabel: "논리적 조율",
      levels: [
        { range: "9점", label: "매우 우수", description: "데이터·사례 기반으로 논리적 설득을 하며, Win-Win 합의를 이끌어냄", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "설득력 있는 주장을 하나, 최종 합의 도출까지의 조율이 다소 부족함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "주장의 논리적 근거가 약하고, 합의 과정에서 효과적으로 조율하지 못함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "설득 없이 고집하거나, 합의 도출에 기여하지 못함", ...LEVEL_COLORS.poor },
      ],
    },
  ],
};

// =============================================
// ③ 합리적 의사결정
// =============================================
const RATIONAL_DECISION: CompetencyAssessmentData = {
  key: "rationalDecision",
  label: "합리적 의사결정",
  icon: "Scale",
  color: "#3b82f6",
  scenario: {
    title: "In-basket: 복합 상황 긴급 판단",
    description:
      "OO부 부장으로 근무하며 오전 9시 중요 회의 전 40분간 3건의 긴급 사안을 처리해야 합니다.\n\n" +
      "① 김과장 퇴직 건: 핵심 인력의 갑작스러운 퇴직 의사. 회의 전 면담 필요\n" +
      "② 행사 파견 인원 선정 건: 10시까지 차장급 1명, 과장급 1명 명단 제출\n" +
      "③ 협력업체 안전 위반 건: 30분 전 현장 안전규정 위반 사고 발생, 후속 조치 필요\n\n" +
      "우선순위가 높은 순서로 40분간의 처리 계획을 작성하고 제출해야 합니다.",
    activityType: "In-basket (서류함 기법)",
    reference: "Eisenhardt(1989) High-velocity 의사결정 | NRC NUREG-1021 운전원 평가 가이드 | Kahneman(2011) 판단과 의사결정 편향",
  },
  rubricItems: [
    {
      id: "rd-01",
      criteria: "문제 상황 분석",
      subLabel: "긴급도-중요도",
      levels: [
        { range: "9점", label: "매우 우수", description: "긴급성·중요성 매트릭스를 활용해 우선순위를 설정하고, '안전 최우선' 원칙에 따라 판단함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "우선순위를 설정하나, 안전 관련 사안의 긴급도 판단에 일부 모호함이 있음", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "우선순위 설정이 불명확하고, 안전 사안과 행정 사안의 구분이 미흡함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "문제의 핵심을 파악하지 못하고, 우선순위 설정이 부적절함", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "rd-02",
      criteria: "논리적 근거",
      subLabel: "데이터·규정 기반",
      levels: [
        { range: "9점", label: "매우 우수", description: "조직 규정·경험 데이터·업계 기준을 활용해 대안의 타당성을 명확히 설명함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "대안의 근거를 제시하나, 규정·데이터 활용이 부분적이거나 논리 연결이 일부 약함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "근거가 불명확하거나, 직관에 의존한 판단이 많음", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "근거를 제시하지 않고, 감각적 판단에 의존함", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "rd-03",
      criteria: "이해관계자 의견 수렴",
      subLabel: "투명한 공유",
      levels: [
        { range: "9점", label: "매우 우수", description: "의사결정 과정과 결과를 투명히 공유하고, 관련자 의견을 적극 수렴하여 균형 잡힌 결정을 함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "결과를 공유하나, 의견 수렴 범위가 제한적이거나 일부 이해관계자가 누락됨", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "의사결정을 독자적으로 진행하고, 이해관계자 의견 수렴이 형식적임", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "의견 수렴 없이 일방적 결정을 내리고, 과정을 공유하지 않음", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "rd-04",
      criteria: "리스크 관리",
      subLabel: "원전 안전 관점",
      levels: [
        { range: "9점", label: "매우 우수", description: "잠재 리스크를 사전 식별하고, 안전 관련 리스크에 대해 예방적 대응 계획을 수립함. 최악의 상황(Worst Case)까지 고려함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "일부 리스크를 고려하나, 안전 관련 잠재 리스크 대비가 불충분함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "리스크 분석이 피상적이고, 상황 변화에 대한 대처 계획이 미흡함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "리스크를 전혀 고려하지 않고 원래 계획을 강행함", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "rd-05",
      criteria: "실행 계획",
      subLabel: "구체성·책임 배분",
      levels: [
        { range: "9점", label: "매우 우수", description: "Who·When·How를 명확히 제시하고, 후속 점검 체계까지 포함한 실행 계획을 수립함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "실행 계획이 있으나, 책임 배분이나 일정이 일부 모호함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "계획이 형식적이며, 실질적 실행 가능성이 낮음", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "실행 계획이 부재하거나, 책임 소재가 불분명함", ...LEVEL_COLORS.poor },
      ],
    },
  ],
};

// =============================================
// ④ 구성원육성
// =============================================
const MEMBER_DEVELOPMENT: CompetencyAssessmentData = {
  key: "memberDevelopment",
  label: "구성원육성",
  icon: "GraduationCap",
  color: "#ef4444",
  scenario: {
    title: "1:1 코칭 면담 — 회의 비효율성 개선",
    description:
      "매주 정기 회의가 비효율적으로 운영되고 있습니다. 참가자들이 소극적이고, 건설적 의견 없이 문제점만 반복 논의되는 상황입니다.\n\n" +
      "한 달 전 부서간 협력 방안 회의에서는 결론 없이 1시간 이상을 허비했으며, 구성원들은 '어차피 결론이 나지 않을 것'이라는 인식으로 수동적으로 참여하고 있습니다.\n\n" +
      "리더로서 민차장과의 1:1 면담을 통해:\n" +
      "① 회의 비효율성 문제를 객관적으로 설명\n" +
      "② 구체적 개선 계획을 함께 수립\n" +
      "③ 민차장의 적극적 참여를 유도해야 합니다.",
    activityType: "역할 연기 (Role Play)",
    reference: "CCL SBI 피드백 모델 | Edmondson(1999) 심리적 안전감 | Whitmore(2009) GROW 코칭 모델",
  },
  rubricItems: [
    {
      id: "md-01",
      criteria: "문제 인식·설명",
      subLabel: "데이터 기반",
      levels: [
        { range: "9점", label: "매우 우수", description: "구체적 데이터·사례(일시, 빈도, 영향)를 근거로 문제를 논리적으로 설명하고, 구성원도 동의할 수 있도록 전달함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "문제를 설명하나, 구체적 데이터 제시가 부족하거나 논리 연결이 약함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "문제를 부분적으로 인식했으나, 설명이 모호하고 근거가 부족함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "문제 정의가 불명확하며, 원인 분석 없이 단순 지적에 머뭄", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "md-02",
      criteria: "개선 계획 구체성",
      subLabel: "역할·일정·KPI",
      levels: [
        { range: "9점", label: "매우 우수", description: "개선 활동의 역할 분담·일정·성과 지표(KPI)를 명확히 설정하고, 단계별 점검 계획을 포함함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "실행 계획이 대체로 적절하나, KPI 설정이나 단계별 점검이 미흡함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "계획이 모호하고, 역할 분담이 명확하지 않아 실행이 어려움", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "실행 계획이 불명확하며, 개선 지속 가능성이 낮음", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "md-03",
      criteria: "발전적 피드백",
      subLabel: "SBI 모델 적용",
      levels: [
        { range: "9점", label: "매우 우수", description: "SBI 모델(상황-행동-영향)로 구체적 피드백을 전달하고, 성장 방향과 학습 기회를 제시함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "피드백을 제공하나, 행동과 영향의 구분이 불명확하거나 추상적임", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "단순 지적에 그치며, 성장 방향을 제시하지 않음", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "피드백 없이 지시만 하거나, 부정적 언급으로 의욕을 저하시킴", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "md-04",
      criteria: "심리적 안전감 조성",
      subLabel: "허용 분위기",
      levels: [
        { range: "9점", label: "매우 우수", description: "편안한 분위기를 조성하고 면담 목적을 설명하며, 구성원이 솔직하게 의견을 말할 수 있도록 유도함. 개방형 질문 활용", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "면담 목적을 설명하나, 구성원이 다소 방어적 태도를 보임", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "면담 목적 설명 부족으로 구성원이 의도를 이해하지 못함", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "경직된 분위기로 인해 구성원이 적극적으로 대화하지 못함", ...LEVEL_COLORS.poor },
      ],
    },
    {
      id: "md-05",
      criteria: "공동 대안 모색",
      subLabel: "코칭적 접근",
      levels: [
        { range: "9점", label: "매우 우수", description: "구성원과 함께 해결책을 논의하고, 구성원 스스로 실천 방안을 도출하도록 코칭 질문을 활용함", ...LEVEL_COLORS.excellent },
        { range: "6~8점", label: "보통 이상", description: "대안을 제시했으나, 구성원의 자발적 참여가 부족함", ...LEVEL_COLORS.good },
        { range: "2~5점", label: "보통 미만", description: "대안을 구체적으로 도출하지 못하고, 일방적 지시 경향이 있음", ...LEVEL_COLORS.fair },
        { range: "1점", label: "미흡", description: "대안을 모색하지 않거나, 일방적 지시만 내림", ...LEVEL_COLORS.poor },
      ],
    },
  ],
};

// =============================================
// Version B: 멀티모달 행동기반 평가 루브릭
// 출처: https://leadershiprv-tuxel99j.manus.space
// 관찰 가능한 행동 신호 기반 정량 평가 · 5개 항목 × 3개 하위지표
// =============================================

// 하위지표 임계값 (4단계)
export interface MultimodalThreshold {
  upper: string;   // 상위 (3점)
  midHigh: string; // 중상 (2점)
  midLow: string;  // 중하 (1점)
  poor: string;    // 미흡 (0점)
}

// 하위지표
export interface MultimodalSubIndicator {
  id: string;
  name: string;          // 영문 지표명
  label: string;         // 한글 설명
  unit: string;          // 단위 (%, 회/분, ST, dB 등)
  thresholds: MultimodalThreshold;
  condition?: string;    // 조건부 사용 설명
}

// 멀티모달 평가 항목
export interface MultimodalRubricItem {
  id: string;
  number: number;
  criteria: string;
  definition: string;
  channel: string;       // 시각/청각/언어유창성/신체/얼굴
  subIndicators: MultimodalSubIndicator[];
  scoringNotes: string[];  // 채점 시 유의사항
}

// 멀티모달 루브릭 전체 데이터
export interface MultimodalRubricData {
  version: string;
  title: string;
  description: string;
  purpose: string;
  scoringFormula: {
    subIndicatorScale: string;   // "상위=3, 중상=2, 중하=1, 미흡=0"
    itemFormula: string;         // "하위지표 평균 × 3 (최대 9점)"
    totalFormula: string;        // "항목 점수 평균 (최대 9점)"
  };
  totalInterpretation: { range: string; label: string; color: string }[];
  items: MultimodalRubricItem[];
}

export const MULTIMODAL_RUBRIC: MultimodalRubricData = {
  version: "v0.2",
  title: "발표 행동기반 멀티모달 평가 루브릭",
  description: "발표 장면에서 관찰 가능한 멀티모달 행동 신호를 정량적으로 평가. 내용이 아닌 전달 역량을 측정.",
  purpose: "비전제시 발표 상황에서 발표자의 행동적 전달 역량을 평가하기 위한 기준. 평가 대상은 발표 내용이 아닌, 관찰 가능한 멀티모달 행동 신호.",
  scoringFormula: {
    subIndicatorScale: "상위 3점 · 중상 2점 · 중하 1점 · 미흡 0점",
    itemFormula: "항목 점수 = 사용 가능한 하위지표 평균 × 3 (최대 9점)",
    totalFormula: "총점 = 채점 가능 항목 평균 (최대 9점)",
  },
  totalInterpretation: [
    { range: "7.5 ~ 9.0", label: "매우 우수", color: "text-teal-600" },
    { range: "5.5 ~ 7.4", label: "보통 이상", color: "text-sky-600" },
    { range: "3.0 ~ 5.4", label: "보통 미만", color: "text-amber-600" },
    { range: "0.0 ~ 2.9", label: "미흡", color: "text-red-500" },
  ],
  items: [
    {
      id: "mm-01",
      number: 1,
      criteria: "청중 지향 시선 통제",
      definition: "발표 중 청중과의 시각적 연결을 유지하고, 불필요한 시선 이탈을 최소화하는 정도",
      channel: "시각 (Visual)",
      subIndicators: [
        {
          id: "mm-01-a",
          name: "audience_facing_ratio",
          label: "청중 응시 비율",
          unit: "%",
          thresholds: { upper: "70% 이상", midHigh: "55~69%", midLow: "35~54%", poor: "35% 미만" },
        },
        {
          id: "mm-01-b",
          name: "off_audience_episodes_per_min",
          label: "시선 이탈 빈도",
          unit: "회/분",
          thresholds: { upper: "1.5회 이하", midHigh: "1.6~3.0회", midLow: "3.1~5.0회", poor: "5.0회 초과" },
        },
        {
          id: "mm-01-c",
          name: "downward_or_slide_fixation_ratio",
          label: "하방/슬라이드 응시 비율",
          unit: "%",
          thresholds: { upper: "15% 이하", midHigh: "16~25%", midLow: "26~40%", poor: "40% 초과" },
        },
      ],
      scoringNotes: [
        "청중 응시 비율이 높을수록 유리",
        "불필요한 시선 이탈이 적을수록 유리",
        "짧고 목적 있는 슬라이드 참조는 감점하지 않음",
      ],
    },
    {
      id: "mm-02",
      number: 2,
      criteria: "음성 추진력과 강조 변화",
      definition: "목소리의 높낮이, 크기, 강조 패턴을 활용해 메시지에 방향성과 에너지를 부여하는 정도",
      channel: "청각 (Vocal)",
      subIndicators: [
        {
          id: "mm-02-a",
          name: "f0_dynamic_range_st",
          label: "F0 변화폭 (Semitone)",
          unit: "ST",
          thresholds: { upper: "4~10 ST", midHigh: "3~4 또는 10~12 ST", midLow: "2~3 또는 12~14 ST", poor: "2 미만 또는 14 초과" },
        },
        {
          id: "mm-02-b",
          name: "loudness_dynamic_range_db",
          label: "음량 변화폭",
          unit: "dB",
          thresholds: { upper: "5~12 dB", midHigh: "4~5 또는 12~14 dB", midLow: "3~4 또는 14~16 dB", poor: "3 미만 또는 16 초과" },
        },
        {
          id: "mm-02-c",
          name: "emphasis_bursts_per_min",
          label: "강조 burst 빈도",
          unit: "회/분",
          thresholds: { upper: "2~6회", midHigh: "1.0~1.9 또는 6.1~8.0회", midLow: "0.5~0.9 또는 8.1~10.0회", poor: "0.5 미만 또는 10.0 초과" },
          condition: "명시적으로 제공된 경우에만 사용",
        },
      ],
      scoringNotes: [
        "화자 내 상대적 변화폭을 기준으로 평가",
        "지나치게 단조로우면 감점",
        "지나치게 불안정하고 과장된 변화도 감점",
        "목적 있는 강조 변화가 가장 높은 평가 대상",
      ],
    },
    {
      id: "mm-03",
      number: 3,
      criteria: "유창성과 전진감",
      definition: "불필요한 머뭇거림 없이 발표를 안정적으로 전개하는 정도",
      channel: "언어유창성 (Fluency)",
      subIndicators: [
        {
          id: "mm-03-a",
          name: "articulation_rate_syllables_per_sec",
          label: "조음 속도",
          unit: "음절/초",
          thresholds: { upper: "3.5~5.8", midHigh: "3.0~3.4 또는 5.9~6.4", midLow: "2.5~2.9 또는 6.5~7.0", poor: "2.5 미만 또는 7.0 초과" },
        },
        {
          id: "mm-03-b",
          name: "filled_pauses_per_min",
          label: "Filled pause 빈도 (어, 음, 그…)",
          unit: "회/분",
          thresholds: { upper: "2회 이하", midHigh: "2.1~4.0회", midLow: "4.1~6.0회", poor: "6.0회 초과" },
        },
        {
          id: "mm-03-c",
          name: "long_silent_pauses_per_min",
          label: "장무음 pause 빈도 (1초 이상)",
          unit: "회/분",
          thresholds: { upper: "1회 이하", midHigh: "1.1~2.0회", midLow: "2.1~4.0회", poor: "4.0회 초과" },
          condition: "장표 전환이나 의도적 수사 pause는 제외 가능",
        },
      ],
      scoringNotes: [
        "발화 속도가 과도하게 느리거나 빠르면 감점",
        "filled pause와 긴 무음 pause가 많을수록 감점",
        "문장 경계의 의도적 pause는 감점하지 않음",
      ],
    },
    {
      id: "mm-04",
      number: 4,
      criteria: "개방적 자세와 목적형 제스처",
      definition: "몸과 손의 움직임이 메시지를 지지하는 방향으로 사용되는 정도",
      channel: "신체 (Body)",
      subIndicators: [
        {
          id: "mm-04-a",
          name: "open_posture_ratio",
          label: "개방적 자세 비율",
          unit: "%",
          thresholds: { upper: "70% 이상", midHigh: "55~69%", midLow: "35~54%", poor: "35% 미만" },
        },
        {
          id: "mm-04-b",
          name: "purposeful_gesture_bouts_per_min",
          label: "목적형 제스처 빈도",
          unit: "회/분",
          thresholds: { upper: "2~8회", midHigh: "1.0~1.9 또는 8.1~10.0회", midLow: "0.5~0.9 또는 10.1~12.0회", poor: "0.5 미만 또는 12.0 초과" },
          condition: "사전 정의된 이벤트 라벨이 있을 때만 사용",
        },
        {
          id: "mm-04-c",
          name: "closed_or_fidget_ratio",
          label: "닫힌 자세/잔동작 비율",
          unit: "%",
          thresholds: { upper: "10% 미만", midHigh: "10~20%", midLow: "21~35%", poor: "35% 초과" },
        },
      ],
      scoringNotes: [
        "열린 자세가 높을수록 유리",
        "목적형 제스처가 적절한 빈도로 나타날수록 유리",
        "팔짱, 손숨김, 자기접촉, 불필요한 잔동작은 감점",
        "목적성 라벨이 없으면 목적성은 추정하지 않음",
      ],
    },
    {
      id: "mm-05",
      number: 5,
      criteria: "표정 안정성과 머리 움직임의 절제",
      definition: "과도한 긴장 신호 없이 평정감 있는 얼굴·머리 움직임을 유지하는 정도",
      channel: "얼굴 (Face)",
      subIndicators: [
        {
          id: "mm-05-a",
          name: "engaged_neutral_ratio",
          label: "Engaged-neutral 유지 비율",
          unit: "%",
          thresholds: { upper: "75% 이상", midHigh: "60~74%", midLow: "40~59%", poor: "40% 미만" },
          condition: "FACS AU 기반 분류기가 있을 때만 사용",
        },
        {
          id: "mm-05-b",
          name: "facial_tension_ratio",
          label: "얼굴 긴장 신호 비율",
          unit: "%",
          thresholds: { upper: "10% 미만", midHigh: "10~20%", midLow: "21~35%", poor: "35% 초과" },
          condition: "FACS AU 기반 분류기가 있을 때만 사용",
        },
        {
          id: "mm-05-c",
          name: "abrupt_head_jerk_events_per_min",
          label: "급격한 머리 움직임 빈도",
          unit: "회/분",
          thresholds: { upper: "2회 이하", midHigh: "2.1~4.0회", midLow: "4.1~6.0회", poor: "6.0회 초과" },
          condition: "전처리 이벤트가 제공될 때만 사용",
        },
      ],
      scoringNotes: [
        "미소 자체를 요구하지 않음",
        "engaged-neutral의 안정적 유지가 유리",
        "facial tension과 abrupt head jerk가 많을수록 감점",
      ],
    },
  ],
};

// 루브릭 버전 타입
export type RubricVersion = "bars" | "multimodal";

// =============================================
// 전체 데이터 내보내기
// =============================================

// 부장(2직급) 평가 데이터 — 4대 역량
export const DEPARTMENT_HEAD_ASSESSMENTS: CompetencyAssessmentData[] = [
  VISION_PRESENTATION,
  TRUST_BUILDING,
  RATIONAL_DECISION,
  MEMBER_DEVELOPMENT,
];

// 역량 키 → 데이터 빠른 조회
export const ASSESSMENT_BY_KEY: Record<string, CompetencyAssessmentData> = Object.fromEntries(
  DEPARTMENT_HEAD_ASSESSMENTS.map((a) => [a.key, a])
);

// 데모: 평가항목별 영상 디브리핑 클립
export interface DebriefingClip {
  id: string;
  competencyKey: LeadershipCompetencyKey;
  rubricItemId: string;
  speaker: string;
  timestamp: number;
  endTime: number;
  description: string;
  suggestedScore: number;
}

export const DEMO_DEBRIEFING_CLIPS: DebriefingClip[] = [
  // 비전제시
  { id: "clip-vp-01", competencyKey: "visionPresentation", rubricItemId: "vp-01", speaker: "김철수", timestamp: 35, endTime: 75, description: "PEST 분석 도구를 활용하여 원전 사업의 정치·경제·사회·기술 요인을 체계적으로 분석하고, 규제 환경 변화에 따른 기회와 위협을 도출함", suggestedScore: 8 },
  { id: "clip-vp-02", competencyKey: "visionPresentation", rubricItemId: "vp-02", speaker: "이영희", timestamp: 165, endTime: 200, description: "PEST 분석 결과에서 3개의 전략목표를 도출하고, 안전·생산·혁신 3축을 균형있게 연결하여 과제를 체계화함", suggestedScore: 7 },
  { id: "clip-vp-03", competencyKey: "visionPresentation", rubricItemId: "vp-03", speaker: "박민준", timestamp: 210, endTime: 250, description: "안전문화 혁신을 포함한 도전적 과제를 제시했으나, 선제적 규제 대응 관점은 다소 부족함", suggestedScore: 6 },
  { id: "clip-vp-04", competencyKey: "visionPresentation", rubricItemId: "vp-04", speaker: "김철수", timestamp: 300, endTime: 340, description: "핵심 메시지를 3단계로 구조화하여 전달하고, 시선 접촉과 안정된 톤으로 구성원의 공감을 유도함", suggestedScore: 8 },
  // 신뢰형성
  { id: "clip-tb-01", competencyKey: "trustBuilding", rubricItemId: "tb-01", speaker: "정수진", timestamp: 370, endTime: 400, description: "A부서(효율)와 B부서(안전) 간 갈등의 구조적 원인을 분석하고, 양측의 핵심 이해관계를 정리함", suggestedScore: 7 },
  { id: "clip-tb-02", competencyKey: "trustBuilding", rubricItemId: "tb-02", speaker: "한지원", timestamp: 415, endTime: 445, description: "안전·효율·비용을 모두 고려한 단계별 교체 방안을 제시하고, 각 부서의 수용 가능성을 검토함", suggestedScore: 8 },
  { id: "clip-tb-03", competencyKey: "trustBuilding", rubricItemId: "tb-03", speaker: "김철수", timestamp: 465, endTime: 500, description: "토론의 핵심 논점 3가지를 정리하고 합의안을 주도적으로 제안하며, 소극적 참여자에게 발언을 촉진함", suggestedScore: 7 },
  { id: "clip-tb-04", competencyKey: "trustBuilding", rubricItemId: "tb-04", speaker: "이영희", timestamp: 530, endTime: 560, description: "반대 의견을 경청하며 고개를 끄덕이고, 소수 의견을 적극 반영하여 심리적 안전감을 조성함", suggestedScore: 8 },
  { id: "clip-tb-05", competencyKey: "trustBuilding", rubricItemId: "tb-05", speaker: "한지원", timestamp: 570, endTime: 595, description: "안전 데이터와 비용 분석을 근거로 논리적 설득을 하며, 모든 부서가 수용하는 Win-Win 합의를 이끌어냄", suggestedScore: 8 },
  // 합리적 의사결정
  { id: "clip-rd-01", competencyKey: "rationalDecision", rubricItemId: "rd-01", speaker: "박민준", timestamp: 620, endTime: 660, description: "3건의 사안을 긴급성-중요성 매트릭스로 분류하고, 협력업체 안전 위반을 최우선으로 배치함", suggestedScore: 8 },
  { id: "clip-rd-02", competencyKey: "rationalDecision", rubricItemId: "rd-02", speaker: "최동현", timestamp: 670, endTime: 700, description: "안전규정과 사내 절차를 근거로 각 사안의 대안을 제시하나, 일부 규정 인용이 부분적임", suggestedScore: 7 },
  { id: "clip-rd-03", competencyKey: "rationalDecision", rubricItemId: "rd-03", speaker: "정수진", timestamp: 710, endTime: 740, description: "의사결정 과정을 투명하게 공유하고, 이차장·김과장·총무부 담당자 의견을 수렴하여 결정함", suggestedScore: 7 },
  { id: "clip-rd-04", competencyKey: "rationalDecision", rubricItemId: "rd-04", speaker: "김철수", timestamp: 760, endTime: 800, description: "협력업체 조치의 잠재 리스크(재발 가능성, 계약 이슈)를 분석하고, Worst Case 시나리오를 포함한 대응 계획을 수립함", suggestedScore: 8 },
  { id: "clip-rd-05", competencyKey: "rationalDecision", rubricItemId: "rd-05", speaker: "박민준", timestamp: 820, endTime: 850, description: "각 사안에 대해 담당자·완료 시한·처리 방법을 명확히 제시하고, 사후 점검 체계까지 포함함", suggestedScore: 8 },
  // 구성원육성
  { id: "clip-md-01", competencyKey: "memberDevelopment", rubricItemId: "md-01", speaker: "최동현", timestamp: 870, endTime: 900, description: "지난 3개월 회의 데이터(시간, 결론 도출률, 참여도)를 제시하며 비효율성 문제를 논리적으로 설명함", suggestedScore: 8 },
  { id: "clip-md-02", competencyKey: "memberDevelopment", rubricItemId: "md-02", speaker: "이영희", timestamp: 915, endTime: 945, description: "주 1회 사전 안건 공유, 30분 타임박스, 퍼실리테이터 지정 등 구체적 KPI와 일정을 제시함", suggestedScore: 7 },
  { id: "clip-md-03", competencyKey: "memberDevelopment", rubricItemId: "md-03", speaker: "정수진", timestamp: 960, endTime: 990, description: "SBI 모델로 '지난 화요일 회의(S)에서 발언 없이 앉아 계셨는데(B), 다른 분들도 위축되는 효과가 있었습니다(I)'라고 구체적 피드백 전달", suggestedScore: 7 },
  { id: "clip-md-04", competencyKey: "memberDevelopment", rubricItemId: "md-04", speaker: "한지원", timestamp: 1010, endTime: 1040, description: "면담 시작 시 '이 자리는 평가가 아닌 함께 고민하는 시간'이라고 목적을 설명하고, 개방형 질문으로 의견을 유도함", suggestedScore: 8 },
  { id: "clip-md-05", competencyKey: "memberDevelopment", rubricItemId: "md-05", speaker: "김철수", timestamp: 1060, endTime: 1090, description: "'차장님은 어떻게 개선하면 좋겠다고 생각하시나요?'라는 코칭 질문으로 민차장 스스로 실천 방안을 도출하도록 유도함", suggestedScore: 8 },
];
