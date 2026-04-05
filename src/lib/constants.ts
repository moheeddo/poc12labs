import type { LeadershipCompetencyKey, JobLevel, LeadershipCompetencyDef, ServiceTab } from "./types";

// TwelveLabs 인덱스 ID (API는 이름이 아닌 UUID ID를 요구)
export const TWELVELABS_INDEXES = {
  leadership: "69ccf4b781e81bcd08ca5487",
  pov: "69ccf4b881e81bcd08ca5488",
} as const;

// 서비스 탭 정의
export const SERVICE_TABS: {
  key: ServiceTab;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    key: "leadership",
    label: "리더십코칭 역량진단",
    description: "6인 토론 영상에서 개별 발표자의 역량을 자동 스코어링하고 피드백을 생성합니다.",
    color: "text-teal-600",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
  },
  {
    key: "pov",
    label: "훈련영상 POV 분석",
    description: "1인칭 시점 영상으로 SOP 절차 이탈을 탐지하고 숙련도를 비교 분석합니다.",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
];

// =============================================
// KHNP 전직급 리더십 역량 체계 (standards/ 문서 기준)
// =============================================

// 직급별 평가 역량 매핑
// 1-3직급: 비전제시, 신뢰형성, 구성원육성, 합리적의사결정
// 4직급:   비전실천, 의사소통, 자기개발, 문제해결
export const LEVEL_COMPETENCY_MAP: Record<JobLevel, LeadershipCompetencyKey[]> = {
  1: ["visionPresentation", "trustBuilding", "memberDevelopment", "rationalDecision"],
  2: ["visionPresentation", "trustBuilding", "memberDevelopment", "rationalDecision"],
  3: ["visionPresentation", "trustBuilding", "memberDevelopment", "rationalDecision"],
  4: ["visionPractice", "communication", "selfDevelopment", "problemSolving"],
};

// 직급 라벨
export const JOB_LEVEL_LABELS: Record<JobLevel, string> = {
  1: "1직급 (임원)",
  2: "2직급 (부장)",
  3: "3직급 (차장/과장)",
  4: "4직급 (대리/사원)",
};

// 8대 리더십 역량 정의 + 하위요소 + 행동지표 + 루브릭
export const LEADERSHIP_COMPETENCY_DEFS: LeadershipCompetencyDef[] = [
  {
    key: "visionPresentation",
    label: "비전제시",
    definition: "회사 및 조직이 나아가야 할 비전 및 전략 방향을 제시하고 구성원과 이를 적극적으로 공유하여 실행에 옮기며, 목표 달성과 성과 창출을 이끄는 역량",
    color: "#14b8a6", // teal
    subElements: {
      1: [
        { name: "전략적 방향 제시", behaviorIndicator: "회사 성과에 영향을 미치는 주요 경영 환경에 대한 이해를 바탕으로 조직의 중장기 비전과 경영전략 방향을 제시한다." },
        { name: "조직 목표 및 전략 수립", behaviorIndicator: "회사의 비전 및 전략 목표 달성을 위한 구체적인 계획을 수립하고, 실행에 필요한 조직의 인적, 물적 자원을 적절히 배치한다." },
        { name: "전략적 커뮤니케이션", behaviorIndicator: "회사의 비전·전략과 조직의 목표를 명확하고 효과적으로 구성원들과 공유하여 구성원들의 이해와 참여를 유도한다." },
      ],
      2: [
        { name: "목표 및 전략 수립", behaviorIndicator: "조직 목표 달성을 위한 구체적인 부서의 성과목표를 설정하고, 구성원의 업무 목표와 연계하여 일관성을 유지한다." },
        { name: "실행계획 구축", behaviorIndicator: "부서 목표를 달성하기 위해 필요한 장·단기 실행계획을 구체적으로 수립하고, 구성원들에게 방향성을 명확히 전달하여, 성과 창출에 필요한 자원을 적극적으로 확보한다." },
        { name: "성과 점검 및 피드백", behaviorIndicator: "정기적으로 부서 목표의 달성 정도를 점검하고, 구성원들에게 필요한 피드백 제공 및 동기부여를 통해 실행력을 높인다." },
      ],
      3: [
        { name: "목표 이해 및 실행 연계", behaviorIndicator: "부서의 목표를 명확히 이해하고, 이를 실행하기 위한 구체적인 업무 목표를 수립한다." },
        { name: "기획 및 추진", behaviorIndicator: "목표 달성을 위한 업무의 중요도 혹은 우선순위 등을 고려하여 업무별 구체적인 실행계획을 적기에 수립하고, 구성원들과 이를 공유하여 적극적으로 실행한다." },
        { name: "업무 성과 창출", behaviorIndicator: "업무 실행계획의 적극적 이행을 통해 부서 성과 창출을 주도하며, 부서 목표에 대한 성과 분석을 통해 적절한 개선 방안을 제시한다." },
      ],
    },
    rubric: [
      { criteria: "PEST 이해 및 분석 적절성", description: "PEST 분석 Tool의 내용을 잘 이해하고 있으며, 분석은 적절한가? 신재생에너지 사업과 관련된 기회/위협, 강점/약점을 잘 도출하였는가?" },
      { criteria: "분석결과와 Align된 과제 도출", description: "분석 결과와 Align된 전략목표와 전략과제가 도출되었는가? PEST 분석에서 도출된 방향성이 실제 전략목표와 과제에 연결되어 있는가?" },
      { criteria: "전략/과제의 구성", description: "신사업 전개에 필요한 전략목표 및 과제는 중복이나 누락 없이 도출되었는가? 구체적이고 실행 가능한 과제를 도출했는가?" },
      { criteria: "과제의 도전성", description: "전략과제는 도전적인 내용인가? 현실적이면서도 현재의 업무 방식에서 한 단계 도약할 수 있는 목표를 제시하는가?" },
      { criteria: "발표 명확성 및 동기부여", description: "과제의 실행에 대해 멤버들에게 명확하게 설명하는가? 단순 전달이 아닌 멤버들의 입장에서 이해와 참여에의 동기부여를 하는가?" },
    ],
  },
  {
    key: "visionPractice",
    label: "비전실천",
    definition: "조직의 목표를 이해하고, 주어진 업무를 주도적이고 책임감 있는 자세로 실행하여 성과 창출에 기여하는 역량",
    color: "#06b6d4", // cyan
    subElements: {
      4: [
        { name: "목표 중심 실행", behaviorIndicator: "회사의 비전과 조직의 목표를 명확히 이해하고, 주어진 업무를 주도적으로 계획하고 수행한다." },
        { name: "적극적 협력", behaviorIndicator: "부서의 목표를 동료와 공유하고, 상호업무에 대해 질문하고 배우는 태도로 책임감 있게 업무에 임한다." },
        { name: "성과 지향적 태도", behaviorIndicator: "업무에 필요한 리더의 피드백을 적극적으로 경청하고, 회사 전체의 폭넓은 관점에서 조직 성과 향상을 위한 최선의 방법을 찾는다." },
      ],
    },
  },
  {
    key: "trustBuilding",
    label: "신뢰형성",
    definition: "공정한 기준과 일관된 소통을 바탕으로 조직 구성원의 자율성과 책임감을 높이고, 신뢰와 협력을 이끄는 조직 문화를 조성하는 역량",
    color: "#f59e0b", // amber
    subElements: {
      1: [
        { name: "투명한 의사결정", behaviorIndicator: "주요 의사결정에 대한 명확한 배경, 방향성, 기준 등을 공유하고 이행한다." },
        { name: "권한위임과 자율성 보장", behaviorIndicator: "구성원들의 자율성을 보장하는 의사결정 환경을 조성하고, 핵심 가치와 윤리 규범에 부합하는 의사결정을 일관되게 수행한다." },
        { name: "신뢰 문화 구축", behaviorIndicator: "존중과 신뢰를 바탕으로 한 기업문화 정착을 위한 관련 제도 및 활동을 적극적으로 지원하고, 나아가 외부 이해관계자와도 원활한 업무 수행이 가능하도록 장기적 관점에서 신뢰관계를 구축한다." },
      ],
      2: [
        { name: "공정한 운영", behaviorIndicator: "부서 업무 수행 및 의사결정 과정에서 일관된 기준을 적용하고, 공정성을 유지하여 구성원들에게 신뢰를 주는 운영을 한다." },
        { name: "솔선수범과 책임감", behaviorIndicator: "스스로 높은 기준을 세우고 모범을 보이며, 부서의 문제 발생 시 책임을 회피하지 않는다." },
        { name: "개방적인 소통", behaviorIndicator: "구성원의 다양한 의견을 경청하며, 비판적인 의견도 열린 자세로 수용하여 상호 존중과 신뢰 분위기를 조성한다." },
      ],
      3: [
        { name: "책임감 있는 실행", behaviorIndicator: "자신의 역할과 책임을 명확히 인식하고, 맡은 업무를 철저히 완수하여 구성원으로부터 신뢰를 얻는다." },
        { name: "협력적 업무 지원", behaviorIndicator: "구성원들과 협조적인 자세로 일하며, 정보를 투명하게 공유하고, 구성원들의 어려움에 도움을 아끼지 않는다." },
        { name: "존중과 수용", behaviorIndicator: "상사와 동료의 조언과 의견을 열린 자세로 수용하고, 외부 이해관계자와 신뢰 관계를 유지하는 태도를 실천한다." },
      ],
    },
    rubric: [
      { criteria: "문제 상황 분석", description: "역할을 맡은 담당 부서가 처한 입장을 명확히 인식하고, 객관적으로 분석하는가? 부서 간의 갈등 원인을 타 부서의 입장에서 적절하게 분석하는가?" },
      { criteria: "대안 도출 능력", description: "부서간 균형을 맞춘 해결 방안을 제시했는가? 각 부서의 요구를 반영하여 실현 가능한 대안을 도출했는가?" },
      { criteria: "적극 참여 및 목표 기여", description: "적극적으로 집단 토론에 참여하면서 결론 도출에 기여하는가? 합의 도출 과정에서 주도적인 역할을 했는가?" },
      { criteria: "존중과 협력", description: "상대 의견 존중, 협력 분위기 조성에 기여하는가? 자신의 의견을 주장하는 과정에서 협력적인 태도를 유지했는가?" },
      { criteria: "설득과 협의", description: "토의 과정에서 자신의 의견을 효과적으로 설득하는가? 자신의 의견이 토론에서 실제 반영될 수 있도록 효과적으로 조율했는가?" },
    ],
  },
  {
    key: "communication",
    label: "의사소통",
    definition: "명확한 정보 전달과 상호 이해를 바탕으로 상대방을 존중하고 적극적으로 소통하여 협업을 촉진하는 역량",
    color: "#8b5cf6", // violet
    subElements: {
      4: [
        { name: "명확한 의사 전달", behaviorIndicator: "핵심 정보를 논리적이고 간결하게 구성하여, 상황과 대상에 따른 적절한 의사소통 방식을 사용한다." },
        { name: "적극적 의견 조율", behaviorIndicator: "동료와 열린 마음으로 의견을 교환하며, 최적의 방안을 도출하는 과정에서 다양한 관점과 피드백을 적극적으로 수용한다." },
        { name: "신뢰 기반 관계 구축", behaviorIndicator: "부서 간, 조직 간, 외부 이해관계자와 원활하게 협업하기 위해 신뢰를 바탕으로 매너와 전문성을 갖춘 커뮤니케이션을 실천한다." },
      ],
    },
  },
  {
    key: "memberDevelopment",
    label: "구성원육성",
    definition: "구성원의 성장 가능성과 경력 단계에 맞춰 중장기 육성 계획을 수립하고, 단계별 목표 설정과 피드백, 코칭을 통해 주도적 성장을 촉진하는 역량",
    color: "#ef4444", // red
    subElements: {
      1: [
        { name: "인재육성 전략 수립", behaviorIndicator: "조직의 지속 가능한 성장을 위해 중장기 관점에서 확보해야 할 핵심역량을 정의하고, 직무 전문가와 미래 리더의 체계적 육성을 위한 전략을 수립한다." },
        { name: "체계적 성장환경 구축", behaviorIndicator: "구성원들의 지속적인 학습을 통한 성장과 역량 개발을 장려하는 제도나 문화를 조성하고, 체계적인 성장 경로를 마련한다." },
        { name: "코칭 환경 조성", behaviorIndicator: "리더들이 효과적으로 코칭과 피드백을 수행할 수 있는 제도·지침을 설계하고, 도전과 학습을 장려하는 조직 문화를 선도한다." },
      ],
      2: [
        { name: "목표설정 및 동기부여", behaviorIndicator: "부서원 개개인의 성장 수준과 과제를 반영한 도전적인 목표를 설정하고, 실행을 위한 자원을 적극적으로 제공해 성장을 유도한다." },
        { name: "경력개발 중심 성장지원", behaviorIndicator: "구성원의 역량과 경력을 고려한 자기개발 계획 수립을 지원하고, 경력개발을 위한 학습 기회를 보장한다." },
        { name: "멘토링 및 코칭 제공", behaviorIndicator: "구성원들의 강점과 약점을 파악하여 정기적 코칭을 통해 구체적으로 조언하며, 성장을 유도한다." },
      ],
      3: [
        { name: "목표설정 및 성장지원", behaviorIndicator: "파트원이 업무 목표를 명확히 이해하고 달성할 수 있도록 지원하며, 목표 달성을 위한 구체적인 조언과 실행 방안을 제시한다." },
        { name: "직무 성장 유도", behaviorIndicator: "파트원의 잠재력과 장점을 격려하고 스스로 성장하려는 의욕을 장려하며, 필요시 OJT나 교육에 대한 정보를 제공하여 경력개발을 지원한다." },
        { name: "피드백과 격려", behaviorIndicator: "구성원의 업무 수행 과정에서 어려움을 함께 점검하고, 구성원의 행동이나 성과에 대해 즉각적이고 구체적인 피드백을 제공한다." },
      ],
    },
    rubric: [
      { criteria: "문제 인식 및 상황 설명", description: "회의 비효율성 문제를 명확히 인식하고 차장에게 설명했는가? 문제 정의 과정에서 객관적인 데이터나 사례를 활용하여 논리적으로 설명했는가?" },
      { criteria: "개선 계획의 구체성", description: "회의문화 변화를 위한 구체적인 실행계획을 수립하고, 역할 분담을 명확히 하는가? 변화 활동, 일정 등에 대해 구체적으로 표현되었는가?" },
      { criteria: "발전적 피드백", description: "피드백을 구체적인 사례를 통해 전달하고, 명확한 개선 포인트를 제시했는가? 단순한 지적이 아닌, 문제의 원인을 분석하여 효과적인 개선책을 제시했는가?" },
      { criteria: "허용 분위기 조성", description: "면담을 시작할 때 편안한 분위기를 조성하고, 면담의 목적을 명확하게 설명했는가? 민차장이 방어적인 태도를 보이지 않고, 적극적으로 참여하도록 유도했는가?" },
      { criteria: "함께 대안 모색", description: "회의 문화의 수행 문제에 대한 해결방안을 함께 모색하였으며, 실행 계획을 도출했는가? 현실적인 해결책을 논의하고, 실천 방안을 도출했는가?" },
    ],
  },
  {
    key: "selfDevelopment",
    label: "자기개발",
    definition: "전문성 강화를 위해 새로운 기술과 업무를 배우는데 적극적이며, 스스로 동기부여하고 목표를 설정하여 지속적으로 성장하는 역량",
    color: "#10b981", // emerald
    subElements: {
      4: [
        { name: "직무 역량 강화", behaviorIndicator: "자신의 업무 분야에서 요구되는 핵심 역량을 지속적으로 개발하고, 새로운 기술과 지식을 습득하여 자기 성장을 도모한다." },
        { name: "상호 피드백 수용", behaviorIndicator: "동료 및 상사의 피드백을 적극적으로 수용하고, 이를 바탕으로 자신의 강점과 개선점을 파악하여 지속적으로 발전한다." },
        { name: "미래 대비 역량 개발", behaviorIndicator: "회사의 변화 방향, 기술발전, 산업 트렌드를 이해하고 이를 바탕으로 새로운 업무 방식과 요구역량을 습득하여 조직에 기여한다." },
      ],
    },
  },
  {
    key: "rationalDecision",
    label: "합리적의사결정",
    definition: "조직의 전략과 리스크를 고려해 다양한 의견을 수렴하고, 대안을 분석·검토하여 시의적절하고 합리적인 의사결정을 수행하는 역량",
    color: "#3b82f6", // blue
    subElements: {
      1: [
        { name: "전략적 판단", behaviorIndicator: "회사의 중장기 전략, 외부 환경, 기회·위험 요소를 균형 있게 고려하여 전략적 의사결정을 수행한다." },
        { name: "통합적 의사결정", behaviorIndicator: "회사의 주요 의사결정 사항에 대해 내·외부 이해관계자의 의견을 수렴하여 시의적절하게 균형 잡힌 결정을 이끈다." },
        { name: "의사결정 프로세스 구축", behaviorIndicator: "조직 전략과 연계된 의사결정 프로세스를 체계화하여, 불확실성에 대비하고 다양한 상황에 안정적인 의사결정을 가능하게 한다." },
      ],
      2: [
        { name: "전략 기반 실행 결정", behaviorIndicator: "조직의 전략 방향과 정책을 이해하고, 부서 상황에 맞게 해석 및 실행이 가능한 판단과 결정을 수행한다." },
        { name: "의견 수렴 및 합의 도출", behaviorIndicator: "구성원의 의견을 공정하게 반영하고, 결정 과정의 논리와 기준을 설계하고 설득한다." },
        { name: "점검 및 조정", behaviorIndicator: "의사결정에 따른 리스크를 예측·분석하고, 상황에 따라 다양한 대응 방안을 고려하여 실행한다." },
      ],
      3: [
        { name: "문제 정의 능력", behaviorIndicator: "조직 목표 달성과 문제해결을 위한 핵심 원인을 정확히 파악하고 구체적인 해결 방안을 제시하여 의사결정에 이바지한다." },
        { name: "정보수집 및 분석", behaviorIndicator: "조직의 성과와 문제해결에 필요한 정보를 체계적이고 다양하게 수집·분석하여, 의사결정의 근거를 강화하고 대안을 제시한다." },
        { name: "신속한 실행 결정", behaviorIndicator: "상황을 판단해 가능한 대안을 비교하고, 근거를 기반으로 실현이 가능한 방안을 신속하게 모색하여 문제를 해결한다." },
      ],
    },
    rubric: [
      { criteria: "문제 상황 분석", description: "각 사안에 대해 긴급성과 중요성을 적절히 분석했는가? 의사결정에 필요한 데이터를 충분히 고려하여 우선순위를 설정했는가?" },
      { criteria: "의사결정의 논리적 근거", description: "각 대안의 타당성을 명확히 설명하고, 논리적으로 연결 지었는가? 데이터, 경험적 근거, 조직의 규정 등을 활용했는가?" },
      { criteria: "이해관계자 의견 수렴", description: "의사결정 과정과 결과를 투명하게 공유하고 있는가? 이해관계자의 의견을 수렴하여 균형 잡힌 의사결정을 하였는가?" },
      { criteria: "리스크 관리", description: "의사결정의 결과로 발생할 수 있는 위험을 충분히 고려하고, 이를 최소화하려는 노력을 했는가? 잠재적 리스크를 예상하고 대비 계획을 마련했는가?" },
      { criteria: "실행계획의 구체성", description: "각 대안의 실행 방안을 체계적으로 구성하고, 실행 가능성을 높이기 위한 방안을 제시했는가? 실행 계획이 구체적이고 현실적인가?" },
    ],
  },
  {
    key: "problemSolving",
    label: "문제해결",
    definition: "주어진 과제를 효과적으로 해결하기 위해 다양한 관점을 고려하며, 창의적이고 논리적인 사고를 바탕으로 최적의 해결책을 도출하고 실행하는 역량",
    color: "#f97316", // orange
    subElements: {
      4: [
        { name: "체계적 원인 분석", behaviorIndicator: "다양한 데이터를 수집·분석하고, 실행 가능성과 효율성을 고려하여 합리적이고 논리적으로 해결방안을 모색한다." },
        { name: "창의적 협업 해결", behaviorIndicator: "동료들의 다양한 지식과 경험을 융합적으로 활용하여, 새롭고 독창적인 아이디어를 도출하고, 상호 피드백을 수용하며 해결방안을 구체화한다." },
        { name: "지속적 실행 개선", behaviorIndicator: "해결방안을 실행한 후 성과를 분석하고, 지속적으로 완성도를 높이는 노력을 통해 조직의 목표달성에 기여한다." },
      ],
    },
  },
];

// 직급별 역량 가져오기 헬퍼
export function getCompetenciesForLevel(level: JobLevel) {
  const keys = LEVEL_COMPETENCY_MAP[level];
  return LEADERSHIP_COMPETENCY_DEFS.filter((d) => keys.includes(d.key));
}

// 리더십 역량 간단 설정 (하위 호환 + ScoreCard/차트용)
export const LEADERSHIP_COMPETENCY_CONFIG: {
  key: LeadershipCompetencyKey;
  label: string;
  weight: number;
  color: string;
}[] = LEADERSHIP_COMPETENCY_DEFS.map((d) => ({
  key: d.key,
  label: d.label,
  weight: 0.25, // 4개 역량 균등 가중치 (직급별 4개씩 평가)
  color: d.color,
}));

// SOP 이탈 심각도 라벨
export const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "경미", color: "text-blue-400" },
  medium: { label: "보통", color: "text-amber-400" },
  high: { label: "심각", color: "text-orange-400" },
  critical: { label: "위험", color: "text-red-400" },
};
