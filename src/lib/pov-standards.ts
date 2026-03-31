// =============================================
// HPO 센터 운전행위 표준지침반 — 실습가이드 + 평가기준
// 출처: pov standards/guide/실습가이드-13 라인업 및 운전
//       pov standards/standards/표준지침-3035-01 (운전행위 표준지침)
//       pov standards/standards/표준운영-2035A (인적오류 예방기법 및 활용)
// =============================================

// ── 절차 스텝 구조 ──────────────────────────

export interface ProcedureStep {
  id: string;          // "1.1", "1.1.1" 등
  description: string; // 절차 설명
  expectedState?: string; // 기대 상태 ("열림", "닫힘", "기동중" 등)
  equipment?: string;  // 설비/밸브 ID ("VG-003", "TK-101" 등)
  isCritical?: boolean; // 중요 단계 여부
  children?: ProcedureStep[]; // 하위 스텝
}

export interface ProcedureSection {
  id: string;          // "1.1", "1.2" 등 상위 섹션
  title: string;       // 섹션 제목
  steps: ProcedureStep[];
}

export interface Procedure {
  id: string;          // "appendix-1" ~ "appendix-9"
  appendixNo: number;  // 붙임 번호 (1-9)
  title: string;       // 절차 이름
  group: string;       // "Group.1-1" 등
  system: string;      // 계통명 (냉각수, 순환수, 온수, 공정수)
  operation: string;   // 작업 유형 (기동, 정지, 교체운전)
  courseName: string;  // 과정명
  target: string;      // 현장라인업대상
  sections: ProcedureSection[];
  totalSteps: number;  // 총 스텝 수
  estimatedMinutes: number; // 예상 소요시간
  color: string;       // UI 색상
}

// ── 8개 실습 절차 (붙임1-8) + 교수 참고사항(붙임9) ─────

export const HPO_PROCEDURES: Procedure[] = [
  {
    id: "appendix-1",
    appendixNo: 1,
    title: "냉각수계통 기동 밸브라인업",
    group: "Group.1-1",
    system: "냉각수",
    operation: "기동",
    courseName: "운전행위 표준지침",
    target: "종합실습설비 냉각수계통",
    color: "#3b82f6", // blue
    totalSteps: 35,
    estimatedMinutes: 25,
    sections: [
      {
        id: "1.1", title: "압축공기계통 정상 공급 확인",
        steps: [
          { id: "1.1.1", description: "압축공기계통 공기압축기가 기동중임을 확인한다.", expectedState: "기동중", equipment: "공기압축기" },
          { id: "1.1.2", description: "압축공기 저장탱크의 압력이 '4~7 kgf/㎠' 범위에 있음을 확인한다.", expectedState: "4~7 kgf/㎠", equipment: "저장탱크" },
        ],
      },
      {
        id: "1.2", title: "냉각수계통 원수공급유로 수동밸브 정상 배열 확인",
        steps: [
          { id: "1.2.1", description: "냉각수탱크(TK-101) 원수 공급 조절밸브(LCV-101) 입구 격리밸브(VG-003)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-003" },
          { id: "1.2.2", description: "냉각수탱크(TK-101) 원수 공급 조절밸브(LCV-101) 출구 격리밸브(VG-004)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-004" },
          { id: "1.2.3", description: "냉각수탱크(TK-101) 원수 공급 조절밸브(LCV-101) 입구 배수밸브(VG-007)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-007" },
          { id: "1.2.4", description: "냉각수탱크(TK-101) 원수 공급 조절밸브(LCV-101) 우회 조절밸브(VL-002)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VL-002" },
          { id: "1.2.5", description: "냉각수탱크(TK-101) 원수 공급 조절밸브(LCV-101)가 닫힘 상태임을 제어실을 통해 확인한다.", expectedState: "닫힘", equipment: "LCV-101", isCritical: true },
        ],
      },
      {
        id: "1.3", title: "냉각수계통 배수유로 수동밸브 정상 배열 확인",
        steps: [
          { id: "1.3.1", description: "냉각수탱크(TK-101) 배수 밸브(SOL-V101)가 닫힘 상태임을 제어실을 통해 확인한다.", expectedState: "닫힘", equipment: "SOL-V101", isCritical: true },
          { id: "1.3.2", description: "냉각수탱크(TK-101) 배수 밸브(SOL-V101) 전단 수동 격리 밸브(VG-130)이 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-130" },
          { id: "1.3.3", description: "냉각수탱크(TK-101) 범람 배수 밸브(VG-144)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-144" },
          { id: "1.3.4", description: "SUMP 탱크(TK-702)로 배수밸브(VG-145)가 개방 상태임을 확인한다.", expectedState: "개방", equipment: "VG-145" },
        ],
      },
      {
        id: "1.4", title: "냉각수펌프 후단 재순환유로 수동밸브 정상 배열 확인",
        steps: [
          { id: "1.4.1", description: "냉각수 이송펌프(PP-101A) 후단 탱크재순환밸브(VL-119)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-119" },
          { id: "1.4.2", description: "냉각수 이송펌프(PP-101B) 후단 탱크재순환밸브(VL-120)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-120" },
          { id: "1.4.3", description: "냉각수탱크(TK-101) 전단 냉각수 이송펌프 재순환밸브(VL-103)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-103" },
        ],
      },
      {
        id: "1.5", title: "냉각수 이송펌프(PP-101A) 운전유로 수동밸브 정상 배열 확인",
        steps: [
          { id: "1.5.1", description: "냉각수 이송펌프(PP-101A) 전단 격리밸브(VG-104)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-104" },
          { id: "1.5.2", description: "냉각수 이송펌프(PP-101A) 후단 격리밸브(VL-101)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-101" },
          { id: "1.5.3", description: "냉각수 이송펌프(PP-101A) 전단 스트레이너 입구 차단밸브(VG-102)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-102" },
          { id: "1.5.4", description: "냉각수 이송펌프(PP-101A) 전단 스트레이너 입구 배수밸브(VG-121)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-121" },
        ],
      },
      {
        id: "1.6", title: "냉각수 이송펌프(PP-101B) 운전유로 수동밸브 정상 배열 확인",
        steps: [
          { id: "1.6.1", description: "냉각수 이송펌프(PP-101B) 전단 격리밸브(VG-105)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-105" },
          { id: "1.6.2", description: "냉각수 이송펌프(PP-101B) 후단 격리밸브(VL-102)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-102" },
          { id: "1.6.3", description: "냉각수 이송펌프(PP-101B) 전단 스트레이너 입구 차단밸브(VG-103)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-103" },
          { id: "1.6.4", description: "냉각수 이송펌프(PP-101B) 전단 스트레이너 입구 배수밸브(VG-122)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-122" },
        ],
      },
      {
        id: "1.7", title: "공통모관 격리밸브 확인",
        steps: [
          { id: "1.7", description: "냉각수 이송펌프 전단 공통모관 격리밸브(VG-106)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-106" },
        ],
      },
      {
        id: "1.8", title: "냉각수 모관(HD-101) 재순환유로 수동밸브 정상 배열 확인",
        steps: [
          { id: "1.8.1", description: "냉각수 모관 전단 격리밸브(VG-107)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-107" },
          { id: "1.8.2", description: "냉각수 모관 후단 격리 밸브(VG-108)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-108" },
          { id: "1.8.3", description: "냉각수 모관 후단 격리 밸브(VL-104)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VL-104" },
          { id: "1.8.4", description: "냉각수 모관 후단 격리 밸브(VF-101)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VF-101" },
          { id: "1.8.5", description: "냉각수 모관 후단 격리 밸브(VP-101)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VP-101" },
          { id: "1.8.6", description: "냉각수 모관 후단 격리 밸브(VN-101)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VN-101" },
          { id: "1.8.7", description: "냉각수탱크(TK-101) 전단 냉각수 모관 재순환밸브(VL-109)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-109" },
        ],
      },
      {
        id: "1.9-1.13", title: "열교환기 전후단 냉각수유로 밸브 배열 확인",
        steps: [
          { id: "1.9.1", description: "열교환기(HE-201A) 전단 온도조절밸브(TCV-101A) 입구 차단밸브(VG-111)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-111" },
          { id: "1.9.2", description: "열교환기(HE-201A) 전단 온도조절밸브(TCV-101A) 출구 차단밸브(VG-112)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-112" },
          { id: "1.9.3", description: "열교환기(HE-201A) 전단 냉각수 입구 차단밸브(VG-113)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-113" },
          { id: "1.10.1", description: "열교환기(HE-201A) 냉수 및 온수 혼합 우회 격리밸브(VL-151)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VL-151" },
          { id: "1.10.2", description: "열교환기(HE-201A) 후단 냉각수 출구 차단밸브(VG-117)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-117" },
          { id: "1.11.1", description: "열교환기(HE-201B) 전단 온도조절밸브(TCV-101B) 입구 차단밸브(VG-114)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-114" },
          { id: "1.12.2", description: "열교환기(HE-201B) 후단 냉각수 출구 차단밸브(VG-118)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-118" },
          { id: "1.13", description: "TCV101A 후단 유량계(FE101, FE102)의 격리밸브(VG-400)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-400" },
        ],
      },
    ],
  },
  {
    id: "appendix-2",
    appendixNo: 2,
    title: "냉각수계통 정지 밸브라인업",
    group: "Group.1-2",
    system: "냉각수",
    operation: "정지",
    courseName: "운전행위 표준지침",
    target: "종합실습설비 냉각수계통",
    color: "#6366f1", // indigo
    totalSteps: 35,
    estimatedMinutes: 25,
    sections: [
      { id: "1.1", title: "압축공기계통 정상 공급 확인", steps: [
        { id: "1.1.1", description: "압축공기계통 공기압축기가 기동중임을 확인한다.", expectedState: "기동중", equipment: "공기압축기" },
        { id: "1.1.2", description: "압축공기 저장탱크의 압력이 '4~7 kgf/㎠' 범위에 있음을 확인한다.", expectedState: "4~7 kgf/㎠", equipment: "저장탱크" },
      ]},
      { id: "1.2", title: "원수공급유로 밸브 정지 배열 확인", steps: [
        { id: "1.2.1", description: "냉각수탱크(TK-101) 원수 공급 조절밸브(LCV-101) 입구 격리밸브(VG-003)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-003" },
        { id: "1.2.2", description: "냉각수탱크(TK-101) 원수 공급 조절밸브(LCV-101) 출구 격리밸브(VG-004)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-004" },
      ]},
      { id: "1.3-1.8", title: "배수/재순환/모관 밸브 정지 배열 확인", steps: [
        { id: "1.3.2", description: "냉각수탱크(TK-101) 배수 밸브(SOL-V101) 전단 수동 격리 밸브(VG-130)이 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-130", isCritical: true },
        { id: "1.8.2", description: "냉각수 모관 후단 격리 밸브(VG-108)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-108" },
      ]},
    ],
  },
  {
    id: "appendix-3",
    appendixNo: 3,
    title: "순환수계통 기동 밸브라인업",
    group: "Group.2-1",
    system: "순환수",
    operation: "기동",
    courseName: "운전행위 표준지침",
    target: "종합실습설비 순환수계통",
    color: "#14b8a6", // teal
    totalSteps: 28,
    estimatedMinutes: 20,
    sections: [
      { id: "1.1", title: "압축공기계통 정상 공급 확인", steps: [
        { id: "1.1.1", description: "압축공기계통 공기압축기가 기동중임을 확인한다.", expectedState: "기동중", equipment: "공기압축기" },
        { id: "1.1.2", description: "압축공기 저장탱크의 압력이 '4~7 kgf/㎠' 범위에 있음을 확인한다.", expectedState: "4~7 kgf/㎠", equipment: "저장탱크" },
      ]},
      { id: "1.2", title: "순환수탱크(TK-301) 수동밸브 정상 배열", steps: [
        { id: "1.2.1", description: "순환수탱크(TK-301) 배수 밸브(SOV-301) 전단 수동 격리 밸브(VG-330)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-330" },
        { id: "1.2.2", description: "순환수탱크(TK-301) 출구 격리밸브(VG-301)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-301" },
        { id: "1.2.3", description: "온수계통 열교환기 우회유로 회수밸브(VG-331)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-331" },
      ]},
      { id: "1.3", title: "순환수 이송펌프(PP-301A) 운전유로 밸브 확인", steps: [
        { id: "1.3.1", description: "순환수 이송펌프(PP-301A) 전단 격리밸브(VG-302)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-302" },
        { id: "1.3.2", description: "순환수 이송펌프(PP-301A) 전단 배수밸브(VG-321)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-321" },
        { id: "1.3.3", description: "순환수 이송펌프(PP-301A) 후단 격리밸브(VL-301)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-301" },
        { id: "1.3.4", description: "순환수 이송펌프(PP-301A) 유량조절밸브(FCV-301A) 전단 격리밸브(VL-303)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-303" },
        { id: "1.3.5", description: "순환수 이송펌프(PP-301A) 유량조절밸브(FCV-301A) 후단 격리밸브(VG-304)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-304" },
        { id: "1.3.6", description: "순환수 이송펌프(PP-301A) 후단 배수밸브(VG-323)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-323" },
      ]},
      { id: "1.4-1.6", title: "PP-301B / 회수유로 / 재순환유로 밸브 확인", steps: [
        { id: "1.4.7", description: "순환수 이송펌프(PP-301A/B) TIE LINE 격리밸브(VL-305) 닫힘 상태를 확인한다.", expectedState: "닫힘", equipment: "VL-305", isCritical: true },
        { id: "1.5.5", description: "후단 공통모관 냉각수 회수유로 격리밸브(VG-310)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-310" },
        { id: "1.6.3", description: "MINI FLOW 공통모관 밸브(VL-307)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-307" },
      ]},
    ],
  },
  {
    id: "appendix-4",
    appendixNo: 4,
    title: "순환수계통 정지 밸브라인업",
    group: "Group.2-2",
    system: "순환수",
    operation: "정지",
    courseName: "운전행위 표준지침",
    target: "종합실습설비 순환수계통",
    color: "#0891b2", // cyan
    totalSteps: 28,
    estimatedMinutes: 20,
    sections: [
      { id: "1.1-1.2", title: "압축공기 확인 + 순환수탱크 정지 배열", steps: [
        { id: "1.2.2", description: "순환수탱크(TK-301) 출구 격리밸브(VG-301)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-301", isCritical: true },
      ]},
      { id: "1.3-1.6", title: "이송펌프 정지 배열 + 회수/재순환 유로", steps: [
        { id: "1.3.1", description: "순환수 이송펌프(PP-301A) 전단 격리밸브(VG-302)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-302" },
        { id: "1.5.5", description: "후단 공통모관 냉각수 회수유로 격리밸브(VG-310)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-310" },
      ]},
    ],
  },
  {
    id: "appendix-5",
    appendixNo: 5,
    title: "온수계통 기동 밸브라인업",
    group: "Group.3-1",
    system: "온수",
    operation: "기동",
    courseName: "운전행위 표준지침",
    target: "종합실습설비 온수계통",
    color: "#f59e0b", // amber
    totalSteps: 38,
    estimatedMinutes: 30,
    sections: [
      { id: "1.1", title: "압축공기계통 정상 공급 확인", steps: [
        { id: "1.1.1", description: "압축공기계통 공기압축기가 기동중임을 확인한다.", expectedState: "기동중", equipment: "공기압축기" },
        { id: "1.1.2", description: "압축공기 저장탱크의 압력이 '4~7 kgf/㎠' 범위에 있음을 확인한다.", expectedState: "4~7 kgf/㎠", equipment: "저장탱크" },
      ]},
      { id: "1.2", title: "온수계통 원수공급유로 수동밸브 정상 배열", steps: [
        { id: "1.2.1", description: "온수탱크(TK-201) 원수 공급 조절밸브(LCV-201) 입구 격리밸브(VG-001)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-001" },
        { id: "1.2.2", description: "온수탱크(TK-201) 원수 공급 조절밸브(LCV-201) 출구 격리밸브(VG-002)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-002" },
        { id: "1.2.5", description: "온수탱크(TK-101) 원수 공급 조절밸브(LCV-201)가 닫힘 상태임을 제어실을 통해 확인한다.", expectedState: "닫힘", equipment: "LCV-201", isCritical: true },
      ]},
      { id: "1.3-1.8", title: "배수/재순환/이송펌프/열교환기 밸브 확인", steps: [
        { id: "1.3.1", description: "온수탱크(TK-201) 배수 밸브(SOL-V102)가 닫힘 상태임을 제어실을 통해 확인한다.", expectedState: "닫힘", equipment: "SOL-V102", isCritical: true },
        { id: "1.5.1", description: "온수 이송펌프(PP-201A) 전단 격리밸브(VG-201)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-201" },
        { id: "1.9.1", description: "열교환기(HE-201A) 전단 온도조절밸브(TCV-201A)가 닫힘 상태임을 제어실을 통해 확인한다.", expectedState: "닫힘", equipment: "TCV-201A", isCritical: true },
      ]},
    ],
  },
  {
    id: "appendix-6",
    appendixNo: 6,
    title: "온수계통 정지 밸브라인업",
    group: "Group.3-2",
    system: "온수",
    operation: "정지",
    courseName: "운전행위 표준지침",
    target: "종합실습설비 온수계통",
    color: "#d97706", // amber darker
    totalSteps: 38,
    estimatedMinutes: 30,
    sections: [
      { id: "1.1-1.4", title: "압축공기/원수공급/배수/재순환 정지 배열", steps: [
        { id: "1.4.1", description: "온수 이송펌프(PP-201A) 후단 탱크재순환밸브(VL-209)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VL-209", isCritical: true },
      ]},
      { id: "1.5-1.13", title: "이송펌프/열교환기 정지 배열", steps: [
        { id: "1.7", description: "온수 이송펌프 후단 공통모관 격리밸브(VL-207)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-207" },
        { id: "1.9.5", description: "열교환기(HE-201A) 전단 온수 입구 격리밸브(VG-203)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-203", isCritical: true },
      ]},
    ],
  },
  {
    id: "appendix-7",
    appendixNo: 7,
    title: "공정수계통 교체운전 (B → A)",
    group: "Group.4-1",
    system: "공정수",
    operation: "교체운전 B→A",
    courseName: "운전행위 표준지침",
    target: "종합실습설비 공정수계통",
    color: "#ef4444", // red
    totalSteps: 26,
    estimatedMinutes: 20,
    sections: [
      { id: "1.1", title: "초기조건 확인", steps: [
        { id: "1.1.1", description: "공정수 펌프 제어패널(LOP-4)의 공정수 이송펌프#1 기동램프가 소등되어 있는지 확인한다.", expectedState: "소등", equipment: "LOP-4 #1 기동램프" },
        { id: "1.1.3", description: "공정수 펌프 제어패널(LOP-4)의 공정수 이송펌프#2 기동램프가 점등되어 있는지 확인한다.", expectedState: "점등", equipment: "LOP-4 #2 기동램프", isCritical: true },
        { id: "1.1.5", description: "공정수 순환펌프#B(PP-701B)가 정상 기동함을 확인한다.", expectedState: "기동중", equipment: "PP-701B", isCritical: true },
        { id: "1.1.6", description: "공정수 순환펌프#A(PP-701A) 윤활유 유위가 50% 이상임을 확인한다.", expectedState: "≥50%", equipment: "PP-701A 윤활유" },
        { id: "1.1.8", description: "공정수 탱크(TK-701) 수위가 50% 이상임을 확인한다.", expectedState: "≥50%", equipment: "TK-701" },
      ]},
      { id: "1.2", title: "기동전 밸브 점검", steps: [
        { id: "1.2.1", description: "공정수 순환펌프(PP-701A) 전단 격리밸브(VG-702)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-702" },
        { id: "1.2.2", description: "공정수 순환펌프(PP-701A) 후단 격리밸브(VL-701)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VL-701" },
        { id: "1.2.3", description: "공정수 순환펌프(PP-701A) 후단 유량조절밸브(FCV-701A)가 열림 상태임을 제어실을 통해 확인한다.", expectedState: "열림", equipment: "FCV-701A", isCritical: true },
        { id: "1.2.6", description: "공정수 순환펌프 후단 공통밸브(VL-705)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VL-705", isCritical: true },
        { id: "1.2.10", description: "공정수 순환펌프 우회유로 유량제어밸브(FCV-702)가 닫힘 상태임을 제어실을 통해 확인한다.", expectedState: "닫힘", equipment: "FCV-702" },
      ]},
      { id: "1.3", title: "전원공급 상태 확인", steps: [
        { id: "1.3.1", description: "공정수 순환펌프(PP-701A) : L/C 차단기(MCC-01) 투입", expectedState: "투입", equipment: "MCC-01", isCritical: true },
        { id: "1.3.2", description: "공정수 순환펌프(PP-701B) : L/C 차단기(MCC-02) 투입", expectedState: "투입", equipment: "MCC-02" },
      ]},
      { id: "1.4", title: "펌프 교체운전", steps: [
        { id: "1.4.1", description: "공정수 순환펌프(PP-701A) 후단 출구압력계(PI-702A) 초기압력을 확인한다.", expectedState: "기록", equipment: "PI-702A", isCritical: true },
        { id: "1.4.2", description: "공정수 펌프 제어패널(LOP-4)의 공정수 순환펌프(PP-701A) 기동버튼을 푸쉬하여 기동시킨다.", expectedState: "기동", equipment: "PP-701A", isCritical: true },
        { id: "1.4.3", description: "공정수 순환펌프(PP-701A) 후단 출구압력계(PI-702A) 압력을 재확인한다.", expectedState: "재확인", equipment: "PI-702A" },
        { id: "1.4.4", description: "공정수 순환펌프(PP-701B) 정지버튼을 푸쉬하여 정지시킨다.", expectedState: "정지", equipment: "PP-701B", isCritical: true },
      ]},
      { id: "1.5", title: "교체운전 후 밸브 조작", steps: [
        { id: "1.5.1", description: "공정수 순환펌프(PP-701B) 전단 격리밸브(VG-703)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-703" },
        { id: "1.5.2", description: "공정수 순환펌프(PP-701B) 후단 격리밸브(VL-702)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VL-702" },
      ]},
    ],
  },
  {
    id: "appendix-8",
    appendixNo: 8,
    title: "공정수계통 교체운전 (A → B)",
    group: "Group.4-2",
    system: "공정수",
    operation: "교체운전 A→B",
    courseName: "운전행위 표준지침",
    target: "종합실습설비 공정수계통",
    color: "#dc2626", // red darker
    totalSteps: 26,
    estimatedMinutes: 20,
    sections: [
      { id: "1.1", title: "초기조건 확인", steps: [
        { id: "1.1.1", description: "공정수 펌프 제어패널(LOP-4)의 공정수 이송펌프#1 기동램프가 점등되어 있는지 확인한다.", expectedState: "점등", equipment: "LOP-4 #1 기동램프", isCritical: true },
        { id: "1.1.3", description: "공정수 펌프 제어패널(LOP-4)의 공정수 이송펌프#2 기동램프가 소등되어 있는지 확인한다.", expectedState: "소등", equipment: "LOP-4 #2 기동램프" },
        { id: "1.1.5", description: "공정수 순환펌프#A(PP-701A)가 정상 기동함을 확인한다.", expectedState: "기동중", equipment: "PP-701A", isCritical: true },
        { id: "1.1.8", description: "공정수 탱크(TK-701) 수위가 50% 이상임을 확인한다.", expectedState: "≥50%", equipment: "TK-701" },
      ]},
      { id: "1.2", title: "기동전 밸브 점검", steps: [
        { id: "1.2.1", description: "공정수 순환펌프(PP-701B) 전단 격리밸브(VG-703)가 열림 상태임을 확인한다.", expectedState: "열림", equipment: "VG-703" },
        { id: "1.2.3", description: "공정수 순환펌프(PP-701B) 후단 유량조절밸브(FCV-701B)가 열림 상태임을 제어실을 통해 확인한다.", expectedState: "열림", equipment: "FCV-701B", isCritical: true },
        { id: "1.2.6", description: "공정수 순환펌프 후단 공통밸브(VL-705)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VL-705", isCritical: true },
      ]},
      { id: "1.3-1.4", title: "전원확인 + 펌프 교체운전", steps: [
        { id: "1.4.1", description: "공정수 순환펌프(PP-701B) 후단 출구압력계(PI-702B) 초기압력을 확인한다.", expectedState: "기록", equipment: "PI-702B", isCritical: true },
        { id: "1.4.2", description: "공정수 순환펌프(PP-701B) 기동버튼을 푸쉬하여 기동시킨다.", expectedState: "기동", equipment: "PP-701B", isCritical: true },
        { id: "1.4.4", description: "공정수 순환펌프(PP-701A) 정지버튼을 푸쉬하여 정지시킨다.", expectedState: "정지", equipment: "PP-701A", isCritical: true },
      ]},
      { id: "1.5", title: "교체운전 후 밸브 조작", steps: [
        { id: "1.5.1", description: "공정수 순환펌프(PP-701A) 전단 격리밸브(VG-702)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VG-702" },
        { id: "1.5.2", description: "공정수 순환펌프(PP-701A) 후단 격리밸브(VL-701)가 닫힘 상태임을 확인한다.", expectedState: "닫힘", equipment: "VL-701" },
      ]},
    ],
  },
];

// ── 운전원 기본수칙 5대 역량 (표준지침-3035-01 7.1절) ─────

export type OperatorFundamentalKey =
  | "monitor"
  | "control"
  | "conservativeBias"
  | "teamwork"
  | "knowledge";

export interface OperatorFundamental {
  key: OperatorFundamentalKey;
  label: string;
  section: string;     // 표준지침 조항 번호
  definition: string;
  evaluationPoints: string[];
  color: string;
}

export const OPERATOR_FUNDAMENTALS: OperatorFundamental[] = [
  {
    key: "monitor",
    label: "감시 (Monitor)",
    section: "7.1.1",
    definition: "발전소 운전변수 및 상태에 대한 철저한 감시 — 일정 기간 설비 또는 변수를 관찰하고 점검하여 체계적으로 추적·평가하는 능력",
    evaluationPoints: [
      "중요변수 선정 및 정상범위 숙지",
      "다중 계측기 활용한 교차 확인",
      "예기치 못한 추세 및 경보 조사",
      "설비 기동·정지 후 성능 감시",
    ],
    color: "#3b82f6", // blue
  },
  {
    key: "control",
    label: "제어 (Control)",
    section: "7.1.2",
    definition: "발전소 상태변화에 따른 정확한 제어 — 설비별 제한치 지식, 절차서 사용, 안전 여유도 확보를 바탕으로 정확하게 평가·제어하는 능력",
    evaluationPoints: [
      "제어 범위 및 변화율 설정·준수",
      "인적오류예방기법 체화 적용",
      "절차서 단계별 목적 이해 후 수행",
      "인식표 및 운전방벽 적절 사용",
    ],
    color: "#14b8a6", // teal
  },
  {
    key: "conservativeBias",
    label: "보수적 판단 (Conservative Bias)",
    section: "7.1.3",
    definition: "보수적 판단에 따른 발전소 운전 — 안전변수에 대해 적절한 안전여유도를 유지하고, 불확실 시 행위를 중단·재확인하는 능력",
    evaluationPoints: [
      "설비 운전상태 및 다중성 확보",
      "동시 다발적 업무환경 최소화",
      "예상치 못한 상황 대응조치 수립",
      "보수적 제어 범위 설정·유지",
    ],
    color: "#f59e0b", // amber
  },
  {
    key: "teamwork",
    label: "팀워크 (Teamwork)",
    section: "7.1.4",
    definition: "효과적인 팀워크 구축 — 역할·책임의 명확한 정의, 리더십, 수평적 의사소통으로 인적오류 가능성을 낮추는 능력",
    evaluationPoints: [
      "명확한 의사소통 및 정보 공유",
      "의문 제기 및 이의 제기",
      "인수·인계 철저 수행",
      "역할 이행 및 오버사이트",
    ],
    color: "#ef4444", // red
  },
  {
    key: "knowledge",
    label: "지식 (Knowledge)",
    section: "7.1.5",
    definition: "발전소 설계 및 공학적 원리에 대한 확실한 이해 — 절차 배경, 계통 예상 반응에 대해 명확하게 이해하고 상황 원인을 파악하는 능력",
    evaluationPoints: [
      "절차 배경 및 예상 반응 이해",
      "발전소 위험도 영향 이해",
      "질문과 토론을 통한 지식 확인",
      "공학적 원리 기반 판단",
    ],
    color: "#8b5cf6", // violet
  },
];

// ── 인적오류 예방기법 (표준운영-2035A) ─────────

export type HpoToolKey =
  | "situationAwareness"
  | "selfCheck"
  | "communication"
  | "procedureCompliance"
  | "preJobBriefing"
  | "verificationTechnique"
  | "peerCheck"
  | "labeling"
  | "stepMarkup"
  | "turnover"
  | "postJobReview";

export interface HpoTool {
  key: HpoToolKey;
  label: string;
  category: "fundamental" | "conditional";
  definition: string;
  searchQueries: string[]; // TwelveLabs 검색에 사용할 쿼리
  color: string;
}

export const HPO_TOOLS: HpoTool[] = [
  // 기본적 인적오류 예방기법
  {
    key: "situationAwareness",
    label: "상황인식",
    category: "fundamental",
    definition: "사전업무검토, 사전점검, 의문을 갖는 태도, 불확실 시 중지",
    searchQueries: ["주변 환경 확인", "절차서 확인 후 진행", "멈추고 확인하는 장면"],
    color: "#3b82f6",
  },
  {
    key: "selfCheck",
    label: "자기진단",
    category: "fundamental",
    definition: "STAR 기법 — 멈춤(Stop), 생각(Think), 행동(Act), 확인(Review)",
    searchQueries: ["밸브 조작 전 멈추는 장면", "조작 후 확인하는 장면", "기기번호 확인"],
    color: "#14b8a6",
  },
  {
    key: "communication",
    label: "효과적인 의사소통",
    category: "fundamental",
    definition: "의사소통 재확인기법(3-Way), 음표문자 사용",
    searchQueries: ["보고하는 장면", "지시 재확인", "무전기 또는 전화 통화"],
    color: "#f59e0b",
  },
  {
    key: "procedureCompliance",
    label: "절차서 사용 및 준수",
    category: "fundamental",
    definition: "승인된 최신 절차서에 따라 순서대로 수행하고, 수행단계 표시",
    searchQueries: ["절차서 읽는 장면", "절차서 들고 있는 장면", "체크리스트 표시"],
    color: "#ef4444",
  },
  // 조건부 인적오류 예방기법
  {
    key: "preJobBriefing",
    label: "작업전회의",
    category: "conditional",
    definition: "작업 착수 전 위험요소, 예상 결과, 역할분담 등을 사전 공유",
    searchQueries: ["회의하는 장면", "브리핑 장면", "설명하는 장면"],
    color: "#8b5cf6",
  },
  {
    key: "verificationTechnique",
    label: "확인기법 (동시/독립확인)",
    category: "conditional",
    definition: "동시확인 — 2인이 동시에 확인, 독립확인 — 별도 시점에 독립적으로 확인",
    searchQueries: ["2인 확인 장면", "함께 밸브 확인", "독립적으로 점검"],
    color: "#ec4899",
  },
  {
    key: "peerCheck",
    label: "동료점검",
    category: "conditional",
    definition: "동료가 작업의 정확성을 확인하여 오류를 사전 차단",
    searchQueries: ["동료에게 확인 요청", "다른 사람이 점검", "교차 확인"],
    color: "#06b6d4",
  },
  {
    key: "labeling",
    label: "인식표 및 운전방벽",
    category: "conditional",
    definition: "해당 기기에 인식표 부착, 인접기기에 보호커버·안전펜스 등 운전방벽 설치",
    searchQueries: ["꼬리표 확인", "인식표 부착", "태그 확인하는 장면"],
    color: "#10b981",
  },
  {
    key: "stepMarkup",
    label: "수행단계 표시",
    category: "conditional",
    definition: "절차서의 각 단계를 수행할 때마다 완료 표시",
    searchQueries: ["체크 표시하는 장면", "펜으로 표시", "절차서에 기록"],
    color: "#f97316",
  },
  {
    key: "turnover",
    label: "인수인계",
    category: "conditional",
    definition: "운전일지 및 체크리스트를 활용하여 다음 교대조에게 정확한 내용 인계",
    searchQueries: ["인수인계 장면", "교대 장면", "일지 작성"],
    color: "#64748b",
  },
  {
    key: "postJobReview",
    label: "작업후 평가",
    category: "conditional",
    definition: "작업 완료 후 수행 결과를 평가하고 교훈 공유",
    searchQueries: ["작업 후 논의", "결과 확인", "피드백 나누는 장면"],
    color: "#a855f7",
  },
];

// ── 평가 등급 체계 ────────────────────────

export interface GradeDefinition {
  grade: string;
  label: string;
  minScore: number;
  color: string;
  bgColor: string;
  description: string;
}

export const POV_GRADES: GradeDefinition[] = [
  { grade: "S", label: "탁월", minScore: 95, color: "text-emerald-400", bgColor: "bg-emerald-500/15", description: "모든 절차를 완벽하게 수행하고 HPO 기법을 체화 수준으로 적용" },
  { grade: "A", label: "우수", minScore: 85, color: "text-blue-400", bgColor: "bg-blue-500/15", description: "절차를 정확히 수행하고 대부분의 HPO 기법을 적절히 적용" },
  { grade: "B", label: "양호", minScore: 70, color: "text-teal-400", bgColor: "bg-teal-500/15", description: "절차 수행은 양호하나 일부 HPO 기법 적용이 미흡" },
  { grade: "C", label: "보통", minScore: 55, color: "text-amber-400", bgColor: "bg-amber-500/15", description: "절차 이탈이 일부 있으며 HPO 기법 적용 개선 필요" },
  { grade: "D", label: "미흡", minScore: 40, color: "text-orange-400", bgColor: "bg-orange-500/15", description: "다수의 절차 이탈 및 HPO 기법 미적용 — 재교육 필요" },
  { grade: "F", label: "부적합", minScore: 0, color: "text-red-400", bgColor: "bg-red-500/15", description: "안전 관련 중대 이탈 발생 — 즉시 재교육 및 재평가 필요" },
];

export function getGradeForScore(score: number): GradeDefinition {
  return POV_GRADES.find((g) => score >= g.minScore) || POV_GRADES[POV_GRADES.length - 1];
}

// ── 헬퍼: 절차 요약 ────────────────────────

export function getProceduresBySystem() {
  const systems = new Map<string, Procedure[]>();
  for (const proc of HPO_PROCEDURES) {
    const list = systems.get(proc.system) || [];
    list.push(proc);
    systems.set(proc.system, list);
  }
  return systems;
}

// 절차 내 전체 스텝 수 (중첩 포함)
export function countAllSteps(proc: Procedure): number {
  let count = 0;
  for (const section of proc.sections) {
    count += section.steps.length;
  }
  return count;
}

// 절차 내 중요 단계만 추출
export function getCriticalSteps(proc: Procedure): ProcedureStep[] {
  const critical: ProcedureStep[] = [];
  for (const section of proc.sections) {
    for (const step of section.steps) {
      if (step.isCritical) critical.push(step);
    }
  }
  return critical;
}

// 계통별 색상
export const SYSTEM_COLORS: Record<string, { primary: string; bg: string; border: string }> = {
  냉각수: { primary: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  순환수: { primary: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30" },
  온수: { primary: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  공정수: { primary: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};
