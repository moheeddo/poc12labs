// =============================================
// HPO-22: 사고 사례 연계 라이브러리
// INES(국제 원자력 사고 등급) 기반 실제 사고 데이터
// 훈련생의 이탈 유형 및 역량 부족과 연계하여
// 경각심 및 학습 동기를 높이는 교수학적 도구
// =============================================

export interface IncidentCase {
  id: string;
  title: string;                    // 사고명
  date: string;                     // 발생일
  plant: string;                    // 발전소명
  severity: 'level7' | 'level5' | 'level4' | 'level3' | 'level2' | 'level1' | 'level0';
  summary: string;                  // 요약 (2-3문장)
  rootCause: string;                // 근본 원인
  relatedDeviationTypes: string[];  // 관련 이탈 유형: 'skip' | 'swap' | 'delay' | 'insert'
  relatedCompetencies: string[];    // 관련 기본수칙 ID
  relatedHpoTools: string[];        // 관련 HPO 도구 key
  lesson: string;                   // 교훈 (1-2문장)
  preventionMeasure: string;        // 재발 방지 대책
  source?: string;                  // 출처
}

// =============================================
// 6개 실제 사고 사례 데이터 (INES 등급 분류)
// =============================================
export const INCIDENT_LIBRARY: IncidentCase[] = [
  {
    id: 'inc-1',
    title: 'TMI-2 원자로 노심 용융 사고',
    date: '1979-03-28',
    plant: 'Three Mile Island Unit 2 (미국)',
    severity: 'level5',
    summary:
      '2차 계통 급수펌프 고장 후 운전원이 상황을 잘못 판단하여 비상노심냉각장치(ECCS)를 수동으로 차단. 냉각수 상실로 노심 부분 용융.',
    rootCause:
      '운전원의 상황인식 실패 — 가압기 수위만 보고 냉각수 충분하다고 오판. 실제로는 1차 계통 냉각수가 유출 중이었음.',
    relatedDeviationTypes: ['skip', 'swap'],
    relatedCompetencies: ['monitor', 'conservativeBias', 'knowledge'],
    relatedHpoTools: ['situationAwareness', 'selfCheck'],
    lesson:
      '계기 하나만 보고 판단하지 말 것. 여러 파라미터를 종합하여 상황을 파악해야 함.',
    preventionMeasure:
      '다중 파라미터 감시 절차 의무화, ECCS 수동 차단 금지 규정 도입',
    source: 'NRC Special Inquiry Group (1979)',
  },
  {
    id: 'inc-2',
    title: '체르노빌 원자력 발전소 사고',
    date: '1986-04-26',
    plant: 'Chernobyl Unit 4 (우크라이나)',
    severity: 'level7',
    summary:
      '안전 시험 중 운전원이 안전장치를 의도적으로 비활성화하고 절차를 위반하여 출력이 급증, 증기 폭발 및 화재 발생.',
    rootCause:
      '절차 위반 + 안전 문화 부재 — 시험 일정 압박으로 안전 인터록을 해제하고 비인가 절차로 운전.',
    relatedDeviationTypes: ['skip', 'insert'],
    relatedCompetencies: ['conservativeBias', 'control', 'knowledge'],
    relatedHpoTools: ['procedureCompliance', 'preJobBriefing'],
    lesson:
      '어떤 상황에서도 안전장치를 임의로 해제하면 안 됨. 절차서에 없는 행동은 하지 말 것.',
    preventionMeasure:
      '독립적 안전 규제 기관 설립, 안전 문화 교육 의무화',
    source: 'INSAG-7 (IAEA, 1992)',
  },
  {
    id: 'inc-3',
    title: '후쿠시마 제1원전 사고',
    date: '2011-03-11',
    plant: 'Fukushima Daiichi (일본)',
    severity: 'level7',
    summary:
      '지진과 쓰나미로 외부전원과 비상디젤발전기가 상실. 냉각 기능을 잃어 1,3,4호기 수소폭발 및 노심 용융.',
    rootCause:
      '극한 자연재해 대비 부족 + 비상 절차 미흡 — 전원 상실 시나리오에 대한 훈련과 절차가 불충분했음.',
    relatedDeviationTypes: ['skip', 'delay'],
    relatedCompetencies: ['teamwork', 'knowledge', 'conservativeBias'],
    relatedHpoTools: ['communication', 'situationAwareness'],
    lesson:
      '비상상황에서의 의사소통과 팀워크가 결과를 좌우함. 극한 시나리오도 훈련해야 함.',
    preventionMeasure:
      '다중 방어 심층 방어 강화, 이동형 비상장비 도입, SBO(전원상실) 훈련 의무화',
    source: 'NAIIC Report (2012)',
  },
  {
    id: 'inc-4',
    title: '데이비스-베시 원전 반응기 헤드 부식',
    date: '2002-03-06',
    plant: 'Davis-Besse (미국)',
    severity: 'level3',
    summary:
      '원자로 헤드의 붕산 부식을 장기간 방치. 검사 절차를 건너뛰고 부식 징후를 무시하여 강철 라이너만 남은 상태까지 진행.',
    rootCause:
      '감시 절차 생략 + 보수적 판단 미이행 — "아마 괜찮겠지"라는 안일한 판단.',
    relatedDeviationTypes: ['skip'],
    relatedCompetencies: ['monitor', 'conservativeBias'],
    relatedHpoTools: ['situationAwareness', 'verificationTechnique'],
    lesson:
      '감시 절차를 절대 건너뛰지 말 것. 이상 징후를 발견하면 보수적으로 판단해야 함.',
    preventionMeasure:
      '정기 검사 강화, 이상 보고 의무화, 운전원 보수적 판단 교육',
    source: 'NRC Inspection Report (2002)',
  },
  {
    id: 'inc-5',
    title: '한빛 원전 제어봉 낙하 사건',
    date: '2019-05-10',
    plant: '한빛 3호기 (한국)',
    severity: 'level1',
    summary:
      '정비 중 절차 오류로 제어봉 1개가 예기치 않게 낙하. 운전원이 즉시 대응하여 안전에 영향 없었으나, 절차 준수 미흡이 원인.',
    rootCause: '정비 절차서 미준수 + 동시 작업 관리 부족',
    relatedDeviationTypes: ['swap', 'skip'],
    relatedCompetencies: ['control', 'teamwork'],
    relatedHpoTools: ['procedureCompliance', 'peerCheck', 'preJobBriefing'],
    lesson:
      '정비 작업 시 절차서를 반드시 확인하고, 동시 작업 시 상호 확인이 필수.',
    preventionMeasure:
      '작업전회의(Pre-Job Briefing) 의무화, 동시작업 관리 절차 강화',
    source: '원자력안전위원회 보도자료 (2019)',
  },
  {
    id: 'inc-6',
    title: '월성 중수 누출 사건',
    date: '2019-06-11',
    plant: '월성 1호기 (한국)',
    severity: 'level0',
    summary:
      '중수 저장 탱크에서 중수 약 110kg 누출. 밸브 조작 순서 오류가 원인으로 추정.',
    rootCause:
      '밸브 조작 순서 혼동 — 유사한 밸브가 많은 환경에서 기기 식별 미흡',
    relatedDeviationTypes: ['swap'],
    relatedCompetencies: ['control', 'knowledge'],
    relatedHpoTools: ['verificationTechnique', 'selfCheck', 'labeling'],
    lesson:
      '유사 장비가 많은 환경에서 기기 번호를 반드시 확인하고 조작해야 함. 인식표 활용 필수.',
    preventionMeasure:
      '기기 식별 인식표 강화, STAR 기법 의무 적용, 이중 확인',
    source: '한수원 내부 보고서 (2019)',
  },
];

// =============================================
// 이탈 유형 + 역량 기반 관련 사례 검색
// =============================================

/**
 * 이탈 유형과 관련된 사고 사례를 검색하여 관련성 높은 순으로 반환
 * @param deviationTypes  탐지된 이탈 유형 배열 ('skip' | 'swap' | 'delay' | 'insert')
 * @param competencyIds   약점 역량 ID 배열 (선택적 필터)
 * @param hpoToolKeys     관련 HPO 도구 키 배열 (선택적 필터)
 */
export function findRelatedIncidents(
  deviationTypes: string[],
  competencyIds?: string[],
  hpoToolKeys?: string[]
): IncidentCase[] {
  return INCIDENT_LIBRARY.filter((inc) => {
    const typeMatch = inc.relatedDeviationTypes.some((t) => deviationTypes.includes(t));
    const compMatch =
      !competencyIds ||
      competencyIds.length === 0 ||
      inc.relatedCompetencies.some((c) => competencyIds.includes(c));
    const hpoMatch =
      !hpoToolKeys ||
      hpoToolKeys.length === 0 ||
      inc.relatedHpoTools.some((h) => hpoToolKeys.includes(h));
    return typeMatch && (compMatch || hpoMatch);
  }).sort((a, b) => {
    // 매칭 수가 많은 사례 우선 정렬
    const aScore = a.relatedDeviationTypes.filter((t) => deviationTypes.includes(t)).length;
    const bScore = b.relatedDeviationTypes.filter((t) => deviationTypes.includes(t)).length;
    return bScore - aScore;
  });
}

// =============================================
// INES 등급 라벨 및 색상 매핑
// =============================================

export const INES_LABELS: Record<string, { label: string; color: string }> = {
  level7: { label: '7등급 (대사고)',      color: '#dc2626' },
  level6: { label: '6등급 (심각사고)',     color: '#ea580c' },
  level5: { label: '5등급 (시설외 위험)', color: '#d97706' },
  level4: { label: '4등급 (시설내 사고)', color: '#ca8a04' },
  level3: { label: '3등급 (중대이상)',    color: '#eab308' },
  level2: { label: '2등급 (이상)',        color: '#84cc16' },
  level1: { label: '1등급 (비정상)',      color: '#22c55e' },
  level0: { label: '0등급 (편차)',        color: '#6b7280' },
};

// 이탈 유형 한국어 라벨
export const DEVIATION_TYPE_LABELS: Record<string, string> = {
  skip:   'SKIP (생략)',
  swap:   'SWAP (순서 바꿈)',
  insert: 'INSERT (삽입)',
  delay:  'DELAY (지연)',
};
