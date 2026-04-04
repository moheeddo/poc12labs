# 글로벌 수준 역량진단 시스템 설계 스펙

## 개요

KHNP 리더십코칭 역량진단 시스템을 글로벌 수준(Korn Ferry, DDI, Hogan, CCL, SHL급)으로 고도화한다.
10개 기능 갭을 7개 독립 모듈 + 5개 공유 인프라로 구현하며, 마이크로 모듈 아키텍처를 채택한다.

### 현재 상태
- 8개 KHNP 역량 + BARS 9점 척도 구현 완료
- 5채널 멀티모달 분석(시선/음성/유창성/자세/표정) 15개 지표 구현
- 8-Phase AI 분석 파이프라인 + Solar Pro 2 리포트 생성
- 6인 조 관리 + LocalStorage 세션 데이터 (~10명 미만)
- AI + 관찰 평가자 1명 하이브리드 구조

### 목표
- 증거 기반 설명 가능성 (ISO 10667 투명성)
- 탈선 요인 탐지 (Hogan HDS 방식)
- BEI 자동화 (STAR 구조 파싱)
- 역량 성장 종단 추적
- 심리측정학적 타당화 + 노름 구축
- 편향/공정성 모니터링
- 하이브리드 삼각측정 (AI + 인간)
- ISO 10667 인증 심사 대비
- 평가 직후 즉시 코칭 피드백
- 인사 DB 연계

---

## 아키텍처

### 레이어 구조

```
UI Layer (리더십코칭 탭 — 5단계 워크플로우)
  ├── Step 1: 동의/조 구성 (ISO 동의 + 인사DB 연동)
  ├── Step 2: 영상 업로드 (기존 유지)
  ├── Step 3: AI 분석 (5개 서브탭)
  │     ├── 역량평가 (기존 8Phase + 삼각측정)
  │     ├── 증거맵 (루브릭↔영상 매핑)
  │     ├── 탈선탐지 (11패턴 위험도)
  │     ├── BEI (STAR 타임라인)
  │     └── 성장추이 (종단 비교)
  ├── Step 4: 심층 리포트 (밝은면+어두운면 통합)
  └── Step 5: 검증/관리 (관리자 전용)
        ├── 타당화 콘솔
        ├── 공정성 모니터
        └── ISO 감사

Core Modules (7개 독립 모듈)
  ├── lib/evidence/        — 증거 기반 설명 가능성
  ├── lib/derailer/        — 탈선 요인 탐지
  ├── lib/bei/             — BEI 자동화
  ├── lib/growth/          — 성장 추이 추적
  ├── lib/validation/      — 심리측정 타당화 + 노름
  ├── lib/fairness/        — 편향/공정성 모니터링
  └── lib/compliance/      — ISO 10667 + 삼각측정 + 코칭

Shared Infrastructure (5개)
  ├── lib/assessment-store/ — IndexedDB 영구 저장 (LocalStorage 대체)
  ├── lib/hr-connector/    — 인사 DB 연계
  ├── lib/audit-logger/    — ISO 10667 감사 추적
  ├── lib/statistics/      — 통계 유틸리티 (α, ICC, DIF)
  └── lib/twelvelabs.ts    — 기존 API 래퍼 (Embeddings 확장)
```

### 파일 구조

```
src/
├── lib/
│   ├── evidence/
│   │   ├── types.ts           — EvidenceMap, EvidenceClip 타입
│   │   ├── evidence-mapper.ts — 루브릭↔영상 매핑 로직
│   │   └── index.ts
│   ├── derailer/
│   │   ├── types.ts           — DerailerProfile, DerailerPattern 타입
│   │   ├── derailer-detector.ts — 11패턴 탐지 로직
│   │   ├── derailer-prompts.ts  — TwelveLabs 분석 프롬프트
│   │   └── index.ts
│   ├── bei/
│   │   ├── types.ts           — BEIEvent, STARStructure 타입
│   │   ├── star-parser.ts     — STAR 구조 파싱
│   │   ├── competency-coder.ts — 역량 코딩
│   │   └── index.ts
│   ├── growth/
│   │   ├── types.ts           — GrowthTimeline, SimilarityReport 타입
│   │   ├── growth-tracker.ts  — 시계열 분석 + 추세선
│   │   ├── embedding-compare.ts — 코사인 유사도 비교
│   │   └── index.ts
│   ├── validation/
│   │   ├── types.ts           — ReliabilityReport, NormTable 타입
│   │   ├── reliability.ts     — Cronbach α, ICC 계산
│   │   ├── norm-builder.ts    — 노름 테이블 생성
│   │   └── index.ts
│   ├── fairness/
│   │   ├── types.ts           — FairnessReport, DIFResult 타입
│   │   ├── bias-detector.ts   — 집단 간 분포 비교
│   │   ├── dif-analyzer.ts    — Mantel-Haenszel DIF 분석
│   │   ├── adverse-impact.ts  — 4/5 규칙 적용
│   │   └── index.ts
│   ├── compliance/
│   │   ├── types.ts           — ConsentRecord, AuditEntry, TriangulatedScore 타입
│   │   ├── triangulation.ts   — AI+인간 가중 융합
│   │   ├── consent-manager.ts — 동의 관리
│   │   ├── coaching-engine.ts — 즉시 코칭 피드백 생성
│   │   └── index.ts
│   ├── assessment-store/
│   │   ├── types.ts           — DB 스키마 타입
│   │   ├── store.ts           — IndexedDB CRUD 래퍼
│   │   ├── migrations.ts      — LocalStorage → IndexedDB 마이그레이션
│   │   └── index.ts
│   ├── hr-connector/
│   │   ├── types.ts           — Employee, OrgChart 타입
│   │   ├── connector.ts       — CSV/API/LDAP 어댑터
│   │   ├── masking.ts         — 개인정보 마스킹
│   │   └── index.ts
│   ├── audit-logger/
│   │   ├── types.ts           — AuditEvent 타입
│   │   ├── logger.ts          — 감사 이벤트 기록
│   │   └── index.ts
│   └── statistics/
│       ├── descriptive.ts     — 평균, 표준편차, 백분위
│       ├── reliability.ts     — Cronbach α, ICC(2,1) 계산
│       ├── dif.ts             — Mantel-Haenszel 통계량
│       └── index.ts
├── components/leadership/
│   ├── (기존 컴포넌트 유지)
│   ├── EvidenceMapView.tsx     — 증거 맵 서브탭
│   ├── DerailerDashboard.tsx   — 탈선 탐지 서브탭
│   ├── BEITimeline.tsx         — BEI 서브탭
│   ├── GrowthChart.tsx         — 성장 추이 서브탭
│   ├── ValidationConsole.tsx   — 타당화 콘솔 (Step 5)
│   ├── FairnessMonitor.tsx     — 공정성 모니터 (Step 5)
│   ├── ISOAuditView.tsx        — ISO 감사 (Step 5)
│   ├── ConsentForm.tsx         — 동의서 (Step 1)
│   ├── HRConnectorPanel.tsx    — 인사DB 연동 (Step 1)
│   └── IntegratedReport.tsx    — 심층 리포트 (Step 4)
├── app/api/
│   ├── evidence/
│   │   └── map/route.ts
│   ├── derailer/
│   │   └── analyze/route.ts
│   ├── bei/
│   │   ├── extract/route.ts
│   │   └── code/route.ts
│   ├── growth/
│   │   ├── timeline/route.ts
│   │   └── similarity/route.ts
│   ├── validation/
│   │   ├── reliability/route.ts
│   │   └── norms/route.ts
│   ├── fairness/
│   │   ├── analyze/route.ts
│   │   └── dif/route.ts
│   └── compliance/
│       ├── triangulate/route.ts
│       ├── consent/route.ts
│       └── audit-log/route.ts
└── hooks/
    ├── useEvidence.ts
    ├── useDerailer.ts
    ├── useBEI.ts
    ├── useGrowth.ts
    ├── useValidation.ts
    ├── useFairness.ts
    └── useCompliance.ts
```

---

## 모듈 상세 설계

### Module 1: evidence/ — 증거 기반 설명 가능성

**목적**: 모든 AI 점수에 대해 "왜 이 점수인지" 영상 증거를 자동 연결한다.

**핵심 타입**:
```typescript
interface EvidenceClip {
  rubricItemId: string;        // 루브릭 기준 ID
  rubricItemText: string;      // "환경 분석(PEST)을 체계적으로 수행"
  videoTimestamp: {
    start: number;             // 초 단위
    end: number;
  };
  confidence: number;          // 0-100%
  matchedText: string;         // TwelveLabs Search 매칭 텍스트
  searchQuery: string;         // 사용된 검색 쿼리
}

interface EvidenceMap {
  competencyKey: string;
  score: number;
  clips: EvidenceClip[];
  coverageRate: number;        // 루브릭 기준 중 증거가 있는 비율
  overallConfidence: number;   // 전체 증거 신뢰도 평균
}
```

**로직**:
1. 루브릭 기준 텍스트에서 검색 쿼리 생성 (각 기준당 2-3개 변형)
2. TwelveLabs Search API로 영상 내 해당 구간 검색
3. 신뢰도 임계값(60%) 이상만 필터링
4. 동일 구간 중복 제거 (5초 이내 겹침)
5. EvidenceMap 구조로 반환

**API**: `POST /api/evidence/map`
- 입력: `{ videoId, indexId, competencyKey, rubricItems[] }`
- 출력: `EvidenceMap`
- 내부: TwelveLabs `search` API 호출 (rubricItem당 1회)

**UI**: EvidenceMapView.tsx
- 좌측: 루브릭 기준 목록 (증거 유/무 아이콘)
- 우측: 비디오 플레이어 (클릭 시 해당 구간 재생)
- 하단: 증거 커버리지 바 (몇 % 기준에 증거가 있는지)

---

### Module 2: derailer/ — 탈선 요인 탐지

**목적**: Hogan HDS 11개 탈선 패턴을 원전 리더십 맥락에 맞게 영상에서 자동 탐지한다.

**11개 탈선 패턴 (원전 맥락화)**:

| # | 패턴명 | Hogan 원본 | 원전 맥락 행동 예시 |
|---|--------|-----------|-------------------|
| 1 | 과도한 지시형 | Bold | 비상 시 일방적 지시, 팀원 의견 무시 |
| 2 | 회피형 | Cautious | 의사결정 지연, 책임 회피, 상급자 의존 |
| 3 | 변덕형 | Excitable | 감정적 반응, 일관성 없는 지시 변경 |
| 4 | 과잉신중형 | Reserved | 정보 공유 거부, 폐쇄적 소통 |
| 5 | 독선형 | Arrogant | 자신의 판단만 고집, 피드백 거부 |
| 6 | 과시형 | Colorful | 과도한 자기 PR, 실질보다 외형 중시 |
| 7 | 수동공격형 | Leisurely | 표면적 동의 후 비협조, 소극적 저항 |
| 8 | 무관심형 | Mischievous | 규정/절차 경시, 위험 감수 과다 |
| 9 | 과잉순응형 | Dutiful | 상급자 의견에 무조건 동의, 독립적 판단 부재 |
| 10 | 완벽주의형 | Diligent | 사소한 사항에 집착, 큰 그림 놓침 |
| 11 | 고립형 | Imaginative | 팀과 단절, 독자적 행동, 소통 부재 |

**핵심 타입**:
```typescript
interface DerailerPattern {
  id: string;                  // 'bold' | 'cautious' | ...
  name: string;                // '과도한 지시형'
  hoganScale: string;          // 'Bold'
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  score: number;               // 0-10 (높을수록 위험)
  evidence: {
    timestamp: { start: number; end: number };
    description: string;       // "12:34에서 팀원 발언을 차단하고 일방적 지시"
    signal: 'verbal' | 'vocal' | 'facial' | 'postural';
  }[];
  developmentTip: string;      // 개발 권고사항
}

interface DerailerProfile {
  participantId: string;
  scenarioType: 'normal' | 'emergency';
  patterns: DerailerPattern[];
  topRisks: DerailerPattern[];  // 상위 3개
  overallRiskLevel: 'low' | 'moderate' | 'high';
}
```

**로직**:
1. TwelveLabs `generate` API에 탈선 패턴별 프롬프트 전송
2. 멀티모달 신호(음성 긴장, 표정 변화, 자세 변화)와 교차 검증
3. 시나리오 맥락(비상/일상)에 따라 가중치 조정
   - 비상 시나리오: 회피형, 변덕형 가중치 1.5배
   - 일상 시나리오: 과잉순응형, 무관심형 가중치 1.5배
4. 위험도 분류: 0-3 low / 4-6 moderate / 7-8 high / 9-10 critical

**API**: `POST /api/derailer/analyze`
- 입력: `{ videoId, indexId, transcript, multimodalSignals, scenarioType }`
- 출력: `DerailerProfile`

**UI**: DerailerDashboard.tsx
- 11개 패턴 게이지 차트 (반원형 게이지, 색상 코딩)
- 상위 3개 위험 패턴 하이라이트 카드
- 증거 영상 구간 클릭 재생
- 개발 권고사항 패널

---

### Module 3: bei/ — BEI 자동화

**목적**: 발언을 STAR 구조로 자동 파싱하고 역량별로 코딩한다.

**핵심 타입**:
```typescript
interface STARStructure {
  situation: {
    text: string;
    timestamp: { start: number; end: number };
  };
  task: {
    text: string;
    timestamp: { start: number; end: number };
  };
  action: {
    text: string;
    timestamp: { start: number; end: number };
  };
  result: {
    text: string;
    timestamp: { start: number; end: number };
  };
  completeness: number;        // 0-100% (STAR 4요소 완성도)
}

interface BEIEvent {
  id: string;
  speakerId: string;
  star: STARStructure;
  codedCompetencies: {
    competencyKey: string;
    confidence: number;        // 0-100%
    level: 'threshold' | 'differentiating';  // 기본 vs 차별화 역량
  }[];
  qualityScore: number;        // 행동사건의 질적 수준 (1-5)
}

interface BEIAnalysis {
  events: BEIEvent[];
  competencyDistribution: Record<string, number>;  // 역량별 행동사건 수
  differentiatingCompetencies: string[];            // 차별화 역량 목록
  totalEvents: number;
  averageCompleteness: number;
}
```

**로직**:
1. TwelveLabs transcript에서 발언 단위로 분리
2. TwelveLabs `generate` API에 STAR 파싱 프롬프트 전송
   - "이 발언에서 상황(S), 과제(T), 행동(A), 결과(R) 요소를 분리하시오"
3. 파싱된 STAR 구조에 역량 코딩 적용
   - 행동(A) 요소를 역량 프레임워크의 행동 지표와 매칭
4. 차별화 역량 식별: 우수 수행자에게만 나타나는 행동 패턴

**API**:
- `POST /api/bei/extract` — `{ videoId, transcript }` → `BEIEvent[]`
- `POST /api/bei/code` — `{ events[], competencies[] }` → `BEIAnalysis`

**UI**: BEITimeline.tsx
- 수평 타임라인에 BEI 이벤트 마커 표시
- 각 마커 클릭 시 STAR 4요소 카드 확장
- S/T/A/R 각 요소에 영상 구간 연결
- 역량 코딩 태그 (색상별 역량)
- 차별화 역량에 별표 아이콘

---

### Module 4: growth/ — 역량 성장 추이 추적

**목적**: 동일 인물의 과거↔현재 영상을 비교하여 역량 성장을 정량적으로 추적한다.

**핵심 타입**:
```typescript
interface GrowthDataPoint {
  sessionId: string;
  date: string;                // ISO 8601
  competencyScores: Record<string, number>;
  overallScore: number;
  videoId?: string;            // Embeddings 비교용
}

interface GrowthTimeline {
  employeeId: string;
  employeeName: string;
  dataPoints: GrowthDataPoint[];
  trends: {
    competencyKey: string;
    direction: 'improving' | 'stable' | 'declining';
    changeRate: number;        // 세션당 변화율
    projectedScore: number;    // 다음 세션 예상 점수
  }[];
  plateauCompetencies: string[];  // 정체 역량
  breakthroughCompetencies: string[];  // 돌파 역량
}

interface SimilarityReport {
  videoId1: string;
  videoId2: string;
  overallSimilarity: number;   // 0-1 코사인 유사도
  segmentSimilarities: {
    segment: string;
    similarity: number;
    interpretation: string;
  }[];
}
```

**로직**:
1. IndexedDB에서 동일 employeeId의 과거 세션 데이터 조회
2. 역량별 점수 시계열 생성
3. 선형 회귀로 추세선 계산 (direction + changeRate)
4. 정체 역량: 3회 이상 연속 변화 < 0.5점
5. TwelveLabs Embeddings API로 과거/현재 영상 유사도 비교 (선택적)

**API**:
- `POST /api/growth/timeline` — `{ employeeId, sessions[] }` → `GrowthTimeline`
- `POST /api/growth/similarity` — `{ videoId1, videoId2, indexId }` → `SimilarityReport`

**UI**: GrowthChart.tsx
- Recharts 라인 차트: X축 세션 날짜, Y축 점수 (역량별 라인)
- 추세선 오버레이 (점선)
- 정체/돌파 역량 배지
- 이전 세션 선택 → 비디오 유사도 비교 모달

---

### Module 5: validation/ — 심리측정 타당화 + 노름

**목적**: AI 평가의 과학적 신뢰성을 입증하고, 비교 기준(노름)을 제공한다.

**핵심 타입**:
```typescript
interface ReliabilityReport {
  cronbachAlpha: number;       // 내적 일관성 (목표: ≥ 0.6)
  icc: {                       // 평가자간 신뢰도
    type: 'ICC(2,1)';
    value: number;             // 목표: > 0.4
    ci95: [number, number];    // 95% 신뢰구간
  };
  itemAnalysis: {
    competencyKey: string;
    itemTotalCorrelation: number;  // 문항-전체 상관
    alphaIfDeleted: number;        // 해당 문항 삭제 시 alpha
  }[];
  sampleSize: number;
  adequacy: 'insufficient' | 'exploratory' | 'adequate' | 'robust';
  // <10: insufficient, 10-29: exploratory, 30-49: adequate, 50+: robust
  recommendations: string[];
}

interface NormTable {
  groupBy: string;             // 'jobLevel' | 'department' | 'tenure'
  groups: {
    groupName: string;
    n: number;
    percentiles: Record<string, {  // competencyKey
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      mean: number;
      sd: number;
    }>;
  }[];
  lastUpdated: string;
}
```

**로직**:
1. IndexedDB에서 전체 평가 데이터셋 수집
2. Cronbach's α 계산: 역량 점수 간 내적 일관성
3. ICC(2,1) 계산: AI 점수 vs 인간 평가자 점수 일치도
4. 문항 분석: 각 역량의 문항-전체 상관, 삭제 시 α 변화
5. 노름 생성: 인사DB 메타데이터(직급/부서/경력)로 그룹별 백분위 산출
6. 표본 크기 적정성 판단 + 권고사항

**API**:
- `POST /api/validation/reliability` — `{ dataset[] }` → `ReliabilityReport`
- `POST /api/validation/norms` — `{ dataset[], groupBy, hrData[] }` → `NormTable`

**UI**: ValidationConsole.tsx
- 신뢰도 게이지: α / ICC 값 + 목표 대비 색상 (초록/노랑/빨강)
- 문항 분석 테이블: 문항-전체 상관, 삭제 시 α
- 표본 크기 진행 바: 현재 N명 / 목표 30명
- 노름 테이블: 그룹별 백분위 히트맵
- 적정성 배지: insufficient → exploratory → adequate → robust

---

### Module 6: fairness/ — 편향/공정성 모니터링

**목적**: AI 평가가 특정 집단에게 불리하지 않음을 통계적으로 검증한다.

**핵심 타입**:
```typescript
interface FairnessReport {
  analyzedGroups: {
    variable: string;          // 'gender' | 'age' | 'tenure'
    groups: string[];          // ['male', 'female'] 등
    scoreDistributions: Record<string, {
      n: number;
      mean: number;
      sd: number;
      effectSize: number;      // Cohen's d
    }>;
    adverseImpact: {
      fourFifthsRatio: number; // 4/5 규칙 (≥ 0.8이면 적합)
      impacted: boolean;
    };
  }[];
  overallFairness: 'pass' | 'warning' | 'fail';
  alerts: string[];
}

interface DIFResult {
  competencyKey: string;
  groupVariable: string;
  mantelHaenszelChi2: number;
  pValue: number;
  effectSize: number;          // Delta MH
  classification: 'A' | 'B' | 'C';  // A: 무시, B: 중간, C: 큰 DIF
  flagged: boolean;
}
```

**로직**:
1. 인사DB에서 인구통계 변수 추출 (성별, 연령대, 경력 구간)
2. 집단 간 점수 분포 비교 (독립표본 t-test, Cohen's d)
3. 4/5 규칙 적용: 합격 비율 = 소수집단 합격률 / 다수집단 합격률
4. Mantel-Haenszel DIF 분석: 역량별로 집단 간 차등 기능 검사
5. DIF 분류: |Delta MH| < 1.0 → A등급(무시), 1.0-1.5 → B등급, > 1.5 → C등급(큰 DIF)
6. 경고 알림 생성

**API**:
- `POST /api/fairness/analyze` — `{ scores[], demographics[] }` → `FairnessReport`
- `POST /api/fairness/dif` — `{ itemResponses[], groupVar }` → `DIFResult[]`

**UI**: FairnessMonitor.tsx
- 전체 공정성 상태: PASS/WARNING/FAIL 배지
- 집단별 점수 분포 박스플롯 (Recharts)
- 4/5 비율 게이지 (0.8 이상 초록, 미만 빨강)
- DIF 히트맵: 역량 × 집단변수 매트릭스 (A/B/C 색상)
- 경고 알림 패널 (조치 필요 항목)

---

### Module 7: compliance/ — ISO 10667 + 삼각측정 + 코칭

**목적**: 국제 표준 준수, AI+인간 점수 융합, 평가 직후 코칭 피드백.

#### 7a. 삼각측정 (Triangulation)

```typescript
interface TriangulationConfig {
  weights: {
    ai: number;                // 기본 0.6
    human: number;             // 기본 0.4
  };
  minimumAgreement: number;    // AI-인간 점수 차이 허용 범위 (기본 2점)
  conflictResolution: 'weighted' | 'human_override' | 'flag_for_review';
}

interface TriangulatedScore {
  competencyKey: string;
  aiScore: number;
  humanScore: number;
  finalScore: number;
  agreement: 'agree' | 'minor_diff' | 'major_diff';
  method: string;              // 적용된 융합 방법
}
```

**로직**:
1. AI 점수와 인간 관찰 평가 점수 수집
2. 차이 계산: |AI - Human|
   - ≤ 1점: agree → 가중 평균
   - 2점: minor_diff → 가중 평균 + 플래그
   - ≥ 3점: major_diff → conflictResolution 정책에 따라 처리
3. 최종 점수 = (AI × weight_ai) + (Human × weight_human)

#### 7b. ISO 10667 준수

```typescript
interface ConsentRecord {
  participantId: string;
  sessionId: string;
  consentType: 'video_recording' | 'ai_analysis' | 'data_retention' | 'report_sharing';
  agreed: boolean;
  timestamp: string;
  version: string;             // 동의서 버전
}

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: 'system' | 'evaluator' | 'participant';
  action: string;              // 'session_created' | 'video_uploaded' | 'score_generated' | ...
  details: Record<string, unknown>;
  sessionId: string;
}

interface DataRetentionPolicy {
  retentionPeriod: number;     // 일 단위 (기본 365일)
  autoDeleteEnabled: boolean;
  anonymizationAfter: number;  // 일 단위 (기본 730일)
}
```

**ISO 10667 체크리스트 (Part 1 + Part 2)**:
1. 평가 목적 명시 (리더십 역량 개발)
2. 참여자 동의 (4개 항목별 개별 동의)
3. 평가 방법 타당도/신뢰도 근거 (validation 모듈 연동)
4. 평가자 자격/훈련 기록
5. 결과 활용 범위 제한 (개발 목적만)
6. 데이터 보호 (보존 기간, 익명화 정책)
7. 참여자 결과 접근권 보장
8. 이의 제기 절차
9. 감사 추적 (모든 평가 행위 로깅)
10. 정기 검토/갱신 주기

#### 7c. 즉시 코칭 피드백

```typescript
interface CoachingFeedback {
  participantId: string;
  sessionId: string;
  generatedAt: string;
  strengths: {
    competencyKey: string;
    description: string;
    evidence: string;          // 증거 요약
  }[];
  developmentAreas: {
    competencyKey: string;
    currentLevel: string;
    targetLevel: string;
    actionItems: string[];     // 구체적 행동 과제
    suggestedResources: string[];
  }[];
  comparedToPrevious?: {
    improved: string[];        // 이전 대비 개선된 역량
    maintained: string[];      // 유지
    needsAttention: string[];  // 주의 필요
  };
}
```

**로직**:
1. 평가 완료 즉시 피드백 생성 (Solar Pro 2 API 활용)
2. 이전 세션 피드백의 developmentAreas와 비교
3. 개선 과제 달성 여부 자동 판단 (점수 변화 기반)
4. 다음 개발 과제 자동 생성

**API**:
- `POST /api/compliance/triangulate` — `{ aiScores, humanScores, config }` → `TriangulatedScore[]`
- `POST /api/compliance/consent` — `{ participantId, consentType, agreed }` → `ConsentRecord`
- `GET /api/compliance/audit-log` — `{ sessionId }` → `AuditEntry[]`

**UI**:
- ConsentForm.tsx: 4개 동의 항목 체크박스 + 서명
- ISOAuditView.tsx: 감사 로그 테이블 + 체크리스트 진행률
- IntegratedReport.tsx에 코칭 피드백 섹션 포함

---

### Shared: assessment-store/ — IndexedDB 영구 저장

**목적**: LocalStorage를 대체하여 대용량 평가 데이터를 영구 저장한다.

**DB 스키마**:
```typescript
interface AssessmentDB {
  sessions: {                  // 평가 세션
    id: string;
    date: string;
    groupId: string;
    status: 'active' | 'completed' | 'archived';
  };
  participants: {              // 참여자
    id: string;
    employeeId?: string;       // 인사DB 연계
    name: string;
    jobLevel: number;
    demographics?: {           // 공정성 분석용 (암호화)
      gender?: string;
      ageGroup?: string;
      tenureGroup?: string;
    };
  };
  scores: {                    // 평가 점수
    id: string;
    sessionId: string;
    participantId: string;
    competencyKey: string;
    aiScore: number;
    humanScore?: number;
    finalScore?: number;
    rubricScores?: Record<string, number>;
    evidence?: EvidenceClip[];
  };
  consents: ConsentRecord[];
  auditLog: AuditEntry[];
  beiEvents: BEIEvent[];
  derailerProfiles: DerailerProfile[];
  coachingFeedback: CoachingFeedback[];
}
```

**마이그레이션**: 기존 LocalStorage의 `group-store`, `leadership-session` 데이터를 IndexedDB로 자동 마이그레이션. 마이그레이션 완료 후 LocalStorage 데이터는 백업으로 유지.

---

### Shared: hr-connector/ — 인사 DB 연계

**목적**: 인사 정보를 안전하게 연동하여 노름 구축, 편향 분석, 조직도 기반 평가에 활용한다.

**3가지 연동 모드**:

| 모드 | 방식 | 적합한 경우 |
|------|------|-----------|
| A: CSV/Excel | 파일 업로드 → 파싱 → IndexedDB 저장 | 파일럿/소규모 |
| B: REST API | 설정된 엔드포인트 호출 → 실시간 조회 | 운영 환경 |
| C: LDAP/AD | 디렉토리 서비스 연동 → 조직도 자동 구축 | 대규모 기관 |

**초기 구현**: 모드 A (CSV) 먼저 구현. 모드 B, C는 인터페이스만 정의.

**보안**:
- 개인정보(이름, 사원번호) 클라이언트 측 암호화 (AES-256)
- 분석용 데이터는 비식별화 후 사용
- 인사DB 원본은 저장하지 않음 — 필요 필드만 추출 후 마스킹

**핵심 타입**:
```typescript
interface Employee {
  employeeId: string;
  name: string;                // 마스킹: "홍*동"
  department: string;
  jobLevel: number;
  gender?: string;             // 공정성 분석용
  ageGroup?: string;           // '20s' | '30s' | '40s' | '50s+'
  tenureYears?: number;
  hireDate?: string;
}

interface HRConnectorConfig {
  mode: 'csv' | 'api' | 'ldap';
  apiEndpoint?: string;
  ldapConfig?: { host: string; baseDN: string; };
  fieldMapping: Record<string, string>;  // CSV 헤더 매핑
  encryptionKey: string;       // 클라이언트 측 암호화 키
}
```

---

### Shared: statistics/ — 통계 유틸리티

**순수 TypeScript 통계 함수** (외부 라이브러리 의존 없음):

```typescript
// descriptive.ts
function mean(values: number[]): number;
function standardDeviation(values: number[]): number;
function percentile(values: number[], p: number): number;
function cohenD(group1: number[], group2: number[]): number;

// reliability.ts
function cronbachAlpha(itemScores: number[][]): number;
function icc21(rater1: number[], rater2: number[]): { value: number; ci95: [number, number] };
function itemTotalCorrelation(itemScores: number[][], itemIndex: number): number;

// dif.ts
function mantelHaenszel(responses: number[][], groupVar: number[], scoreVar: number[]): {
  chi2: number; pValue: number; deltaMH: number;
};
function fourFifthsRule(passRates: Record<string, number>): {
  ratio: number; impacted: boolean;
};
```

---

## 데이터 흐름

```
참여자 동의 (ConsentForm)
    ↓
인사DB 연동 (HRConnectorPanel) → Employee 데이터 → IndexedDB
    ↓
영상 업로드 → TwelveLabs 인덱싱
    ↓
AI 분석 파이프라인 (기존 8Phase)
    ├── evidence/ → 증거 매핑
    ├── derailer/ → 탈선 탐지
    ├── bei/ → STAR 파싱
    └── 멀티모달 5채널
    ↓
인간 평가자 점수 입력
    ↓
compliance/triangulation → 최종 삼각측정 점수
    ↓
compliance/coaching → 즉시 코칭 피드백
    ↓
모든 데이터 → IndexedDB 저장
    ↓
growth/ → 성장 추이 (과거 데이터 비교)
    ↓
validation/ → 신뢰도/노름 분석 (누적 데이터)
fairness/ → 편향 모니터링 (누적 데이터)
    ↓
audit-logger → ISO 10667 감사 로그
```

---

## UI 워크플로우 상세

### Step 1: 동의/조 구성
- 기존 조 구성 UI 유지
- **추가**: 동의서 체크박스 4개 (영상 촬영, AI 분석, 데이터 보존, 리포트 공유)
- **추가**: 사원번호 입력 필드 → 인사DB 자동 매칭 (또는 CSV 일괄 업로드)
- 동의 미완료 시 다음 단계 진행 불가 (ISO 10667 필수)

### Step 2: 영상 업로드
- 기존과 동일 (변경 없음)

### Step 3: AI 분석 (5개 서브탭)
- **역량평가**: 기존 8Phase + 삼각측정 (인간 점수 입력 UI 추가)
- **증거맵**: 루브릭 기준 목록 + 비디오 플레이어 연동
- **탈선탐지**: 11패턴 게이지 + 위험 구간 재생
- **BEI**: STAR 타임라인 + 역량 코딩 태그
- **성장추이**: 라인 차트 + 이전 세션 비교

### Step 4: 심층 리포트
- 기존 AnalysisReport 확장
- 밝은면(역량 점수) + 어두운면(탈선 위험도) 통합 레이더 차트
- 각 점수에 증거 링크 내장
- BEI 핵심 사례 요약
- 노름 비교 (동일 직급 백분위)
- 즉시 코칭 피드백 카드
- PDF 내보내기

### Step 5: 검증/관리 (관리자 전용)
- **타당화 콘솔**: α/ICC 게이지, 문항 분석, 노름 테이블, 표본 크기 가이드
- **공정성 모니터**: 전체 상태 배지, 박스플롯, 4/5 비율, DIF 히트맵
- **ISO 감사**: 감사 로그 테이블, 체크리스트 진행률, 동의 현황, 데이터 보존 정책

---

## 모듈 간 의존성

```
evidence     → twelvelabs-client, audit-logger
derailer     → twelvelabs-client, audit-logger
bei          → twelvelabs-client, audit-logger
growth       → assessment-store, twelvelabs-client (Embeddings), statistics
validation   → assessment-store, hr-connector, statistics, audit-logger
fairness     → assessment-store, hr-connector, statistics, audit-logger
compliance   → assessment-store, hr-connector, audit-logger
```

모든 코어 모듈은 `assessment-store`에 결과를 저장하고, `audit-logger`로 행위를 기록한다.
모듈 간 직접 의존은 없다 — 공유 인프라를 통해서만 통신한다.

---

## 기술 결정 사항

| 결정 | 선택 | 이유 |
|------|------|------|
| 데이터 저장 | IndexedDB (Dexie.js 래퍼) | 대용량 + 구조화 쿼리 + 브라우저 영속성 |
| 통계 계산 | 순수 TypeScript | 외부 의존성 최소화, 번들 크기 제어 |
| 차트 | Recharts (기존) | 기존 코드베이스 일관성 |
| 암호화 | Web Crypto API (AES-256-GCM) | 브라우저 네이티브, 추가 라이브러리 불필요 |
| BEI/탈선 분석 | TwelveLabs generate API + 구조화 프롬프트 | 영상 맥락 이해 + 텍스트 분석 통합 |
| 노름 비교 | 백분위 기반 | 직관적 해석, 비정규 분포에도 적용 가능 |

---

## 제약 및 가정

1. **표본 크기 한계**: 현재 ~10명 미만 데이터. 타당화/노름/편향 분석은 "탐색적" 수준으로 시작하며, 데이터 축적에 따라 자동으로 적정성 레벨 상향.
2. **인사 DB**: 초기에는 CSV 업로드만 지원. REST API/LDAP는 인터페이스만 정의.
3. **인증/인가**: 현재 없음. Step 5(검증/관리)는 향후 관리자 인증 추가 시 제한.
4. **서버 DB 없음**: 모든 데이터는 브라우저 IndexedDB에 저장. 다중 기기 동기화는 범위 밖.
5. **ISO 인증 심사**: 프레임워크와 문서화 체계를 구축하되, 실제 인증 신청은 데이터 축적 후.
6. **탈선 탐지**: AI 프롬프트 기반이므로 Hogan HDS의 심리측정적 엄밀성과는 차이 있음. "행동 관찰 기반 탈선 위험 신호 탐지"로 포지셔닝.
