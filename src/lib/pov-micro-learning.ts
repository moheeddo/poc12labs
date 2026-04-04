// =============================================
// HPO-23: 마이크로 러닝 추천 라이브러리
// 약점 역량 점수 기반 맞춤형 학습 모듈 5대 역량×난이도별 8개 모듈
// =============================================

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  competencyId: string;    // 관련 기본수칙 ID
  hpoToolKey?: string;     // 관련 HPO 도구 key
  type: 'video' | 'reading' | 'practice' | 'quiz';
  duration: string;        // "10분", "15분"
  difficulty: 'basic' | 'intermediate' | 'advanced';
  content: string;         // 학습 내용 (마크다운 형태 텍스트)
  practiceTask?: string;   // 실천 과제
}

// =============================================
// 학습 모듈 데이터 (5역량 × 난이도별 8개 모듈)
// =============================================
export const LEARNING_MODULES: LearningModule[] = [
  // ── 감시 (monitor) ────────────────────
  {
    id: 'lm-1',
    title: '계기 판독의 기초',
    description: '정상/비정상 범위 식별 및 트렌드 분석',
    competencyId: 'monitor',
    type: 'reading',
    duration: '10분',
    difficulty: 'basic',
    content:
      '원전 계기의 정상 범위를 빠르게 식별하는 방법을 학습합니다.\n\n' +
      '1. 계기의 녹색 범위(정상)와 적색 범위(비정상) 확인\n' +
      '2. 트렌드(추세) 확인: 값이 증가 중인지 감소 중인지\n' +
      '3. 변화 속도(rate of change) 판단\n' +
      '4. 여러 관련 계기를 동시에 확인하는 크로스 체크',
    practiceTask:
      '훈련 시뮬레이터에서 5개 계기를 15초 내에 정상/비정상 판별하기',
  },
  {
    id: 'lm-2',
    title: '다중 파라미터 동시 감시',
    description: '여러 계기를 교차 확인하여 정확한 상태 판단',
    competencyId: 'monitor',
    type: 'practice',
    duration: '20분',
    difficulty: 'intermediate',
    content:
      '단일 계기만 보면 오판할 수 있습니다 (TMI-2 사고 교훈).\n\n' +
      '크로스체크 패턴:\n' +
      '- 가압기 수위 ↔ 가압기 압력 ↔ 냉각재 온도\n' +
      '- 펌프 전류 ↔ 유량 ↔ 출구 압력\n' +
      '- 탱크 수위 ↔ 밸브 위치 ↔ 유량계',
    practiceTask:
      '크로스체크 시트를 작성하고 시뮬레이터에서 3개 시나리오 연습',
  },

  // ── 제어 (control) ────────────────────
  {
    id: 'lm-3',
    title: 'STAR 기법 마스터하기',
    description: 'Stop-Think-Act-Review 4단계 습관화',
    competencyId: 'control',
    hpoToolKey: 'selfCheck',
    type: 'practice',
    duration: '15분',
    difficulty: 'basic',
    content:
      'STAR 기법은 모든 조작 전에 수행하는 자기진단입니다.\n\n' +
      'S - Stop: 멈추기 (조작 직전 2초 정지)\n' +
      'T - Think: 생각하기 (이 조작이 맞는가? 기기번호 맞는가?)\n' +
      'A - Act: 행동하기 (확인 후 조작)\n' +
      'R - Review: 확인하기 (조작 결과가 기대와 일치하는가?)\n\n' +
      '핵심: T 단계에서 기기번호를 소리 내어 확인하기',
    practiceTask:
      '일상 생활에서 3가지 행동에 STAR 적용하고 기록하기 (예: 문 잠그기, 불 끄기)',
  },
  {
    id: 'lm-4',
    title: '밸브 조작 정밀도 향상',
    description: '기기 식별 → 조작 → 확인의 3단계 정밀 조작',
    competencyId: 'control',
    hpoToolKey: 'verificationTechnique',
    type: 'practice',
    duration: '20분',
    difficulty: 'intermediate',
    content:
      '정밀 밸브 조작 3단계:\n\n' +
      '1단계 — 기기 식별: 인식표(태그) 확인, 기기번호 음독, 주변 밸브와 구별\n' +
      '2단계 — 조작: 천천히 조작, 중간 위치 주의, 끝까지 열거나 닫기\n' +
      '3단계 — 확인: 지시값(인디케이터) 확인, 제어실에 보고, 절차서에 기록\n\n' +
      '월성 중수 누출 사건(2019)은 이 단계를 생략해서 발생했습니다.',
    practiceTask:
      '훈련 설비에서 10개 밸브를 3단계 절차로 조작하고 시간 측정',
  },

  // ── 보수적 판단 (conservativeBias) ────
  {
    id: 'lm-5',
    title: '"확신 없으면 멈추기" 원칙',
    description: '불확실 상황에서 보수적 의사결정',
    competencyId: 'conservativeBias',
    type: 'reading',
    duration: '10분',
    difficulty: 'basic',
    content:
      '보수적 판단의 핵심 원칙:\n\n' +
      '1. 확실하지 않으면 진행하지 않는다\n' +
      '2. 안전 쪽으로 가정한다\n' +
      '3. 상급자에게 보고하고 판단을 구한다\n' +
      '4. "아마 괜찮겠지"는 가장 위험한 생각이다\n\n' +
      '데이비스-베시(2002) 사례에서 "아마 괜찮겠지"가 원자로 헤드 부식을 방치하게 만들었습니다.',
    practiceTask:
      '이번 주 업무 중 불확실한 상황 3건을 기록하고, 각각 어떻게 보수적으로 대응했는지 작성',
  },

  // ── 팀워크 (teamwork) ─────────────────
  {
    id: 'lm-6',
    title: '3-Way Communication 실전',
    description: '지시-복창-확인의 3단계 의사소통',
    competencyId: 'teamwork',
    hpoToolKey: 'communication',
    type: 'practice',
    duration: '15분',
    difficulty: 'basic',
    content:
      '3-Way Communication:\n\n' +
      '1단계 — 지시: "VG-003 밸브를 열어주세요" (명확하게)\n' +
      '2단계 — 복창: "VG-003 밸브 열겠습니다" (기기번호 포함)\n' +
      '3단계 — 확인: "VG-003 밸브 열림 확인했습니다" (결과 보고)\n\n' +
      '핵심: 절대 "네" "알겠습니다"만으로 끝내지 않는다. 기기번호를 반드시 복창한다.',
    practiceTask:
      '동료와 5가지 작업 지시를 3-Way로 연습하고 녹음해서 자가 점검',
  },

  // ── 지식 (knowledge) ──────────────────
  {
    id: 'lm-7',
    title: '절차 순서의 논리적 이해',
    description: 'SOP 순서가 왜 이렇게 정해졌는지',
    competencyId: 'knowledge',
    hpoToolKey: 'procedureCompliance',
    type: 'reading',
    duration: '15분',
    difficulty: 'intermediate',
    content:
      '절차 순서는 임의가 아닙니다. 논리적 이유가 있습니다:\n\n' +
      '1. 격리 밸브를 먼저 여는 이유: 유로를 확보해야 조절밸브가 작동\n' +
      '2. 배수밸브를 먼저 닫는 이유: 공급 전에 누출 경로 차단\n' +
      '3. 제어실 확인이 필요한 이유: 원격 제어 밸브의 실제 위치 검증\n' +
      '4. 기동 전 수위 확인 이유: 펌프 공회전(dry run) 방지\n\n' +
      '순서를 바꾸면 어떤 일이? → 실제 사고 사례로 학습',
    practiceTask:
      '본인이 수행하는 절차의 각 단계가 왜 그 순서인지 3가지 이유를 적어보기',
  },
  {
    id: 'lm-8',
    title: 'P&ID 기초 읽기',
    description: '배관계장도 해독으로 계통 이해 심화',
    competencyId: 'knowledge',
    type: 'reading',
    duration: '25분',
    difficulty: 'advanced',
    content:
      'P&ID(Piping & Instrumentation Diagram)는 계통의 지도입니다:\n\n' +
      '기본 심볼:\n' +
      '- 수동밸브: ▷◁ (Gate Valve)\n' +
      '- 제어밸브: ▷⊠◁ (Control Valve)\n' +
      '- 펌프: ◯→ (Pump)\n' +
      '- 탱크: □ (Tank)\n' +
      '- 계기: ○ 내 문자 (PI=압력, LI=수위, TI=온도)\n\n' +
      '밸브 번호 체계: VG=수동게이트, VL=수동글로브, LCV=수위제어, TCV=온도제어',
    practiceTask:
      '본인 관할 계통의 P&ID에서 절차서 단계를 따라가며 각 기기 위치 표시하기',
  },
];

// =============================================
// 약점 역량 기반 학습 모듈 추천 함수
// =============================================

/**
 * 점수가 낮은 역량 순으로 정렬 후 난이도에 맞는 모듈을 추천
 * @param fundamentalScores  { id: string; score: number }[] 형태 (key → id)
 * @param maxModules         최대 추천 모듈 수 (기본 5)
 */
export function recommendModules(
  fundamentalScores: { id: string; score: number }[],
  maxModules: number = 5
): LearningModule[] {
  // 점수 낮은 역량 순으로 정렬
  const weakest = [...fundamentalScores].sort((a, b) => a.score - b.score);

  const recommendations: LearningModule[] = [];
  for (const comp of weakest) {
    if (recommendations.length >= maxModules) break;
    const modules = LEARNING_MODULES.filter((m) => m.competencyId === comp.id);
    // 점수에 따라 난이도 선택: <40 → basic, <70 → intermediate, >=70 → advanced
    const difficulty =
      comp.score < 40 ? 'basic' : comp.score < 70 ? 'intermediate' : 'advanced';
    const matched = modules.filter((m) => m.difficulty === difficulty);
    const toAdd = matched.length > 0 ? matched : modules;
    for (const m of toAdd) {
      if (!recommendations.some((r) => r.id === m.id) && recommendations.length < maxModules) {
        recommendations.push(m);
      }
    }
  }
  return recommendations;
}

// =============================================
// 모듈 타입별 아이콘 텍스트 (이모지 없이)
// =============================================
export const MODULE_TYPE_LABELS: Record<LearningModule['type'], { label: string; icon: string }> = {
  video:    { label: '영상',  icon: '▶' },
  reading:  { label: '읽기',  icon: '□' },
  practice: { label: '실습',  icon: '★' },
  quiz:     { label: '퀴즈',  icon: '?' },
};

// 난이도 한국어 라벨
export const DIFFICULTY_LABELS: Record<LearningModule['difficulty'], { label: string; color: string }> = {
  basic:        { label: '기초',  color: '#22c55e' },
  intermediate: { label: '중급',  color: '#f59e0b' },
  advanced:     { label: '심화',  color: '#ef4444' },
};
