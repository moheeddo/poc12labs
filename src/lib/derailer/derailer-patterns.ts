// Hogan HDS 11가지 탈선 패턴 정의

/**
 * 탈선 패턴 정의 구조체
 * AI 분석 프롬프트 생성 및 결과 해석에 사용
 */
export interface DerailerPatternDef {
  /** 패턴 식별자 */
  id: string;
  /** 한국어 명칭 */
  name: string;
  /** Hogan HDS 척도명 */
  hoganScale: string;
  /** 행동 특성 설명 */
  description: string;
  /** TwelveLabs 검색에 사용할 한국어 쿼리 3개 */
  searchQueries: [string, string, string];
  /** 비상 상황 시 가중치 (0~1) */
  emergencyWeight: number;
  /** 정상 운전 시 가중치 (0~1) */
  normalWeight: number;
  /** 개발 제언 */
  developmentTip: string;
}

/**
 * Hogan HDS 11가지 탈선 패턴 배열
 * 원전 리더십 역량 진단에 최적화된 한국어 검색 쿼리 포함
 */
export const DERAILER_PATTERNS: DerailerPatternDef[] = [
  {
    id: "bold",
    name: "과도한 지시형",
    hoganScale: "Bold",
    description:
      "자신감 과잉으로 타인의 의견을 무시하고 일방적으로 지시하는 경향. 비판에 방어적이며 자신의 판단을 과신함.",
    searchQueries: [
      "일방적으로 지시하거나 명령하는 장면",
      "타인의 의견을 무시하거나 끊는 장면",
      "자신의 판단이 옳다고 단정짓는 발언",
    ],
    emergencyWeight: 0.9,
    normalWeight: 0.7,
    developmentTip:
      "팀원의 의견을 경청하는 연습을 강화하고, 의사결정 전 반드시 다양한 관점을 수렴하는 절차를 습관화하세요.",
  },
  {
    id: "cautious",
    name: "회피형",
    hoganScale: "Cautious",
    description:
      "위험 회피 성향 과잉으로 결정을 지연하거나 책임 소재를 불분명하게 함. 변화와 도전을 거부하는 경향.",
    searchQueries: [
      "결정을 미루거나 회피하는 장면",
      "책임지기를 꺼리거나 다른 사람에게 떠넘기는 발언",
      "새로운 제안이나 변화에 소극적으로 반응하는 장면",
    ],
    emergencyWeight: 0.95,
    normalWeight: 0.6,
    developmentTip:
      "소규모 의사결정 훈련으로 결정 근육을 키우고, 불확실성을 수용하는 인지적 유연성을 개발하세요.",
  },
  {
    id: "excitable",
    name: "변덕형",
    hoganScale: "Excitable",
    description:
      "감정 기복이 크고 열정과 좌절 사이를 오가는 경향. 스트레스 상황에서 예측 불가능한 감정 반응을 보임.",
    searchQueries: [
      "감정이 급격히 변하거나 과잉 반응하는 장면",
      "스트레스 상황에서 좌절하거나 흥분하는 장면",
      "열정적이었다가 갑자기 의욕을 잃는 발언",
    ],
    emergencyWeight: 0.9,
    normalWeight: 0.65,
    developmentTip:
      "감정 조절 기법(마음챙김, 호흡 조절)을 훈련하고, 고압 상황에서 자신의 감정 패턴을 인식하는 자기 모니터링을 강화하세요.",
  },
  {
    id: "reserved",
    name: "과잉신중형",
    hoganScale: "Reserved",
    description:
      "지나친 신중함으로 의사소통이 단절되고 팀과 거리를 두는 경향. 감정 표현 억제로 팀워크가 저해됨.",
    searchQueries: [
      "팀원과 소통을 단절하거나 거리를 두는 장면",
      "감정이나 생각을 표현하지 않고 침묵하는 장면",
      "피드백이나 정보 공유를 꺼리는 발언",
    ],
    emergencyWeight: 0.85,
    normalWeight: 0.55,
    developmentTip:
      "정기적인 체크인 미팅과 피드백 공유 습관을 형성하고, 팀원과 의도적으로 비공식적 소통 기회를 늘리세요.",
  },
  {
    id: "arrogant",
    name: "독선형",
    hoganScale: "Argumentative",
    description:
      "자신이 항상 옳다고 믿으며 타인을 의심하고 조직의 동기를 불신하는 경향. 갈등을 자주 유발함.",
    searchQueries: [
      "타인의 의도를 의심하거나 불신하는 발언",
      "자신만이 옳다고 주장하며 논쟁하는 장면",
      "조직이나 타 부서를 비난하는 발언",
    ],
    emergencyWeight: 0.8,
    normalWeight: 0.75,
    developmentTip:
      "타인의 관점에서 상황을 이해하는 역지사지 훈련을 받고, 협력적 문제 해결 방식을 적극 실천하세요.",
  },
  {
    id: "colorful",
    name: "과시형",
    hoganScale: "Colorful",
    description:
      "주목받기를 원하며 극적인 행동으로 관심을 끄는 경향. 본질적 업무보다 자기 어필에 집중함.",
    searchQueries: [
      "자신의 업적이나 능력을 과도하게 강조하는 발언",
      "주목받기 위해 극적이거나 과장된 행동을 하는 장면",
      "팀의 성과를 자신의 공으로 돌리는 발언",
    ],
    emergencyWeight: 0.7,
    normalWeight: 0.7,
    developmentTip:
      "팀 성과를 공유하는 습관을 기르고, 실질적 기여도 중심의 피드백 문화를 만드는 데 앞장서세요.",
  },
  {
    id: "leisurely",
    name: "수동공격형",
    hoganScale: "Leisurely",
    description:
      "겉으로는 동의하지만 실제로는 수동적으로 저항하는 경향. 지연, 불이행으로 우회적 반발을 표현함.",
    searchQueries: [
      "표면적으로 동의하지만 실제로 따르지 않는 장면",
      "업무를 지연하거나 핑계를 대는 발언",
      "지시에 불만이 있지만 직접 표현하지 않는 장면",
    ],
    emergencyWeight: 0.85,
    normalWeight: 0.6,
    developmentTip:
      "불만과 이견을 건설적으로 표현하는 직접 소통 훈련을 받고, 투명한 업무 진행 상황 보고 습관을 형성하세요.",
  },
  {
    id: "mischievous",
    name: "무관심형",
    hoganScale: "Mischievous",
    description:
      "규칙과 절차를 무시하고 모험적 행동을 즐기는 경향. 단기적 흥미를 위해 장기적 결과를 경시함.",
    searchQueries: [
      "규정이나 절차를 무시하거나 임의로 변경하는 장면",
      "위험을 경시하거나 안전 수칙을 가볍게 여기는 발언",
      "원칙보다 임기응변을 선호하는 행동",
    ],
    emergencyWeight: 1.0,
    normalWeight: 0.75,
    developmentTip:
      "절차 준수의 중요성을 체험할 수 있는 사례 기반 교육을 이수하고, 규칙 변경 시 공식 프로세스를 따르는 습관을 기르세요.",
  },
  {
    id: "dutiful",
    name: "과잉순응형",
    hoganScale: "Dutiful",
    description:
      "상위 권위에 과도하게 의존하며 독립적 판단을 회피하는 경향. 비판적 사고 없이 지시를 이행함.",
    searchQueries: [
      "상위 지시에 무조건 동의하거나 맹목적으로 따르는 장면",
      "독립적 판단을 내리기보다 허락을 구하는 발언",
      "문제 상황에서 자신의 의견을 제시하지 못하는 장면",
    ],
    emergencyWeight: 0.9,
    normalWeight: 0.5,
    developmentTip:
      "비판적 사고 훈련을 통해 정보를 독립적으로 평가하는 역량을 키우고, 자신의 판단을 팀에 제시하는 연습을 일상화하세요.",
  },
  {
    id: "diligent",
    name: "완벽주의형",
    hoganScale: "Diligent",
    description:
      "세부 사항에 과도하게 집착하며 완벽을 추구하다 전체 흐름을 방해하는 경향. 위임을 꺼리고 마이크로매니지먼트를 함.",
    searchQueries: [
      "사소한 세부 사항에 과도하게 집착하는 장면",
      "팀원에게 업무를 위임하지 못하고 직접 처리하려는 발언",
      "완벽하지 않으면 진행을 멈추거나 재작업을 요구하는 장면",
    ],
    emergencyWeight: 0.75,
    normalWeight: 0.65,
    developmentTip:
      "완벽보다 적시 완료를 우선시하는 마인드셋을 훈련하고, 팀원의 역량을 신뢰하며 효과적으로 위임하는 기술을 개발하세요.",
  },
  {
    id: "imaginative",
    name: "고립형",
    hoganScale: "Imaginative",
    description:
      "독창적 사고에 집착하여 현실과 동떨어진 아이디어를 고수하는 경향. 실용성보다 참신함을 우선시함.",
    searchQueries: [
      "현실과 동떨어진 비현실적인 제안을 고집하는 장면",
      "팀의 실용적 의견을 무시하고 독창성만 강조하는 발언",
      "검증되지 않은 새로운 방법을 고집하는 장면",
    ],
    emergencyWeight: 0.8,
    normalWeight: 0.55,
    developmentTip:
      "아이디어 도출 후 현실 타당성 검증 단계를 반드시 거치는 습관을 기르고, 팀의 실용적 피드백을 적극 수용하세요.",
  },
];
