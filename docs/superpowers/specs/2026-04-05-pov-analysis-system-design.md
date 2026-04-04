# POV 영상분석 시스템 — 설계 문서

## 1. 개요

### 1.1 목적
HPO센터 평가관이 원전 운전원의 1인칭 시점(POV) 훈련 영상을 업로드하면, AI가 자동으로 SOP 절차 이행 여부, 손-물체 상호작용, 숙련도를 분석하여 구조화된 평가 리포트를 생성하는 시스템.

### 1.2 핵심 결정사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 시스템 수준 | TwelveLabs + 전문 AI 파이프라인 | POC로 TwelveLabs 능력 증명 + 수술 분야 검증 아키텍처 차용 |
| 손-물체 인식 범위 | 도구 + 조작 대상 + 상태 변화 | pov-standards.ts에 밸브 상태 이미 정의, 자연스러운 확장 |
| 숙련자 기준 | 하이브리드 (수동 등록 → 자동 누적) | POC는 수동, 프로덕션에서 자동 갱신 |
| 주 사용자 | 평가관 (AI 보조 평가) | 기존 PovReviewSession이 평가관 중심 설계 |
| SOP 이탈 깊이 | 단계 + 순서 검증 (품질 확장 가능) | 순서는 안전 직결, 품질은 Pegasus 정확도 의존 |

### 1.3 기존 구현과의 관계
현재 Tab 3에는 5단계 상태 머신(select → upload → analyzing → report → review), 8개 SOP 절차, 11개 HPO 도구, 등급 체계가 구현되어 있으나 AI 분석은 데모 데이터로 대체 중. 이 설계는 데모 데이터를 실제 TwelveLabs API + 전문 분석 엔진으로 교체하고, 손-물체 분석과 숙련자 비교 기능을 추가한다.

---

## 2. 아키텍처

### 2.1 전체 파이프라인

```
[Phase 1: 입력]
  POV 영상 업로드 + SOP 절차 선택 + 골드스탠다드 영상(선택)
      │
      ▼
[Phase 2: TwelveLabs 인덱싱]
  Marengo 3.0 (visual + audio) → khnp-pov-training 인덱스
  상태 폴링 5초 간격 → 완료 대기
      │
      ▼
[Phase 3: AI 분석 파이프라인] ← 핵심
  3A. SOP 단계 검출 (Marengo Search)
  3B. 손-물체 상호작용 분석 (Pegasus Analyze)
  3C. 시퀀스 매칭 (DTW Algorithm)
  3D. HPO 도구 적용 검증 (Marengo Search + Pegasus)
  3E. 임베딩 유사도 비교 (Marengo Embed)
  3F. 종합 스코어링 (Scoring Engine)
      │
      ▼
[Phase 4: 평가관 대시보드]
  Overview | Steps Timeline | Hand-Object | Comparison
      │
      ▼
[Phase 5: 디브리핑 세션]
  AI 판정 오버라이드 + 모범사례 등록 + 최종 리포트 확정
```

### 2.2 모듈 의존 관계

```
Phase 2 (인덱싱 완료)
  ├── 3A (단계 검출) → 3B (손-물체) → 3C (시퀀스 매칭) ──┐
  │                                                      ├── 3F (종합 스코어링)
  ├── 3D (HPO 검증) ────────────────────────────────────┤
  └── 3E (임베딩 비교) ─────────────────────────────────┘
```

3A→3B→3C는 순차 실행 (3B는 3A의 검출 구간을 입력으로 사용, 3C는 3A의 순서를 사용). 3D, 3E는 3A/3B와 병렬 실행 가능. 3F는 전체 결과를 취합.

---

## 3. AI 분석 파이프라인 상세

### 3A. SOP 단계 검출 (Step Detection)

**목적:** SOP 각 단계를 영상에서 수행했는지 탐지하고, 수행 시점(타임스탬프)을 추출한다.

**입력:**
- `videoId`: 인덱싱 완료된 영상 ID
- `procedure`: pov-standards.ts의 절차 객체 (단계 목록 + 기대 상태)

**처리:**
1. SOP 각 단계의 `sopText`(한국어)를 영어 자연어 쿼리(`actionQuery`)로 변환
2. Marengo Search API로 각 단계별 검색 (병렬, rate limit 고려)
3. 검색 결과의 confidence 기반 판정:
   - confidence >= 0.6 → `pass`
   - 0.3 <= confidence < 0.6 → `partial`
   - confidence < 0.3 또는 결과 없음 → `fail` (미수행)
4. 검출된 단계를 타임스탬프 순으로 정렬

**출력:**
```typescript
interface DetectedStep {
  stepId: string;          // "1.1", "2.3" 등
  status: "pass" | "fail" | "partial";
  confidence: number;      // 0-1
  timestamp: number;       // 시작 시점 (초)
  endTime: number;         // 종료 시점 (초)
  searchScore: number;     // Marengo 검색 점수
  thumbnailUrl?: string;   // 썸네일 URL
}
```

**TwelveLabs API:**
```
POST /search
{
  "index_id": "khnp-pov-training",
  "query_text": "<actionQuery>",
  "search_options": ["visual", "audio"],
  "threshold": { "min": 0.3 },
  "sort_option": "score",
  "page_limit": 5,
  "filter": { "id": ["<videoId>"] }
}
```

**쿼리 엔지니어링:**
각 SOP 단계에 3종 쿼리 템플릿을 사전 정의한다:
- `actionQuery`: 행동 기반 ("hand turning valve handle to open position")
- `objectQuery`: 물체 기반 ("valve labeled VG-003")
- `stateQuery`: 상태 기반 ("valve indicator showing open")

1차 검색은 `actionQuery`로 수행하고, 결과가 불명확하면(0.3~0.6) `objectQuery`로 보강 검색한다.

### 3B. 손-물체 상호작용 분석 (Hand-Object Analysis)

**목적:** 각 검출 구간에서 운전원이 손에 들고 있는 도구, 조작하는 대상, 전후 상태 변화를 추출한다.

**입력:**
- `videoId`
- `detectedSteps[]`: 3A에서 검출된 단계 구간
- `procedure`: 기대 장비/상태 목록

**처리:**
1. 각 검출 구간(timestamp ~ endTime)에 대해 Pegasus Analyze 호출
2. 프롬프트 엔지니어링:
   ```
   This is a first-person POV video of a nuclear power plant operator
   performing maintenance procedures. For this video segment:
   1. What tool or object is the operator holding in their hands?
   2. What equipment or control are they interacting with?
   3. What is the state of the equipment before the action?
   4. What is the state after the action?
   5. Is the action performed correctly and completely?
   Respond in structured JSON format.
   ```
3. LLM 응답을 JSON으로 파싱
4. SOP 기대값과 교차 검증 (matchesSOP 판정)

**출력:**
```typescript
interface HandObjectEvent {
  stepId: string;
  timestamp: number;
  endTime: number;
  heldObject: string;         // "렌치", "체크리스트", "맨손" 등
  targetEquipment: string;    // "VG-003", "TK-101" 등
  actionType: string;         // "turn_valve", "check_gauge", "write_record" 등
  stateBefore: string;        // "closed", "normal_range" 등
  stateAfter: string;         // "open", "above_threshold" 등
  matchesSOP: boolean;        // SOP 기대값과 일치 여부
  confidence: number;         // Pegasus 분석 신뢰도
  rawDescription: string;     // Pegasus 원문 응답 (디버깅/감사용)
}
```

**인식 대상 분류:**

| 카테고리 | 항목 |
|----------|------|
| 도구 (Held Objects) | 렌치, 드라이버, 체크리스트, 키, 무전기, 보호장갑, 계측기, 펜, 클립보드 |
| 조작 대상 (Targets) | 밸브 핸들, 스위치, 버튼, 계기판, 펌프 레버, 차단기, 제어반 |
| 상태 변화 (States) | 열림↔닫힘, 기동↔정지, ON↔OFF, 정상↔비정상, 증가↔감소 |

### 3C. 시퀀스 매칭 (DTW Algorithm)

**목적:** 검출된 단계의 실제 수행 순서를 SOP 정의 순서와 비교하여 이탈을 탐지한다.

**입력:**
- `sopSequence`: SOP에 정의된 단계 순서 (string[])
- `detectedSequence`: 3A에서 검출된 단계를 타임스탬프 순 정렬한 순서 (string[])

**처리:**
1. Dynamic Time Warping으로 두 시퀀스의 최적 정렬 경로 계산
2. 정렬 결과에서 이탈 유형 분류:
   - **SWAP**: 인접 단계의 순서 역전
   - **SKIP**: SOP에 있으나 검출되지 않은 단계
   - **INSERT**: SOP에 없는 행동이 삽입됨
   - **DELAY**: 단계 간 시간 간격이 기대 범위 초과
3. 핵심 단계(critical step) 이탈은 가중 감점

**출력:**
```typescript
interface SequenceAlignment {
  sopSequence: string[];
  detectedSequence: string[];
  alignmentPath: AlignmentPair[];
  deviations: SopDeviation[];
  complianceScore: number;         // 0-100
  criticalDeviations: number;      // 핵심단계 이탈 수
}

interface AlignmentPair {
  sopIndex: number;                // SOP 시퀀스 인덱스
  detectedIndex: number | null;    // 검출 시퀀스 인덱스 (null = 미검출)
  cost: number;                    // 정렬 비용
}

interface SopDeviation {
  type: "swap" | "skip" | "insert" | "delay";
  stepIds: string[];               // 관련 단계 ID
  timestamp?: number;              // 영상 시점
  severity: "critical" | "major" | "minor";
  description: string;             // 자연어 설명
}
```

**DTW 구현:**
- 순수 TypeScript로 구현 (외부 라이브러리 불필요)
- 비용 함수: 단계 일치 = 0, 불일치 = 1, 핵심 단계 불일치 = 3
- O(n*m) 시간복잡도, 절차당 최대 38단계이므로 성능 문제 없음

### 3D. HPO 도구 적용 검증

**목적:** 11개 HPO 도구의 적용 여부를 검색으로 확인한다.

**처리:**
1. 기본 4종(상황인식, STAR, 의사소통, 절차준수)은 필수 검색
2. 조건부 7종은 절차 특성에 따라 선택 검색
3. 각 도구에 대해 Marengo Search로 적용 장면 검색
4. 검출 횟수와 타임스탬프 기록

**쿼리 예시:**
```
STAR 자기진단 → "operator pausing before action, verbally confirming the step"
동료점검 → "two operators checking together, one pointing at equipment"
의사소통 → "operator speaking into radio or to colleague"
```

**출력:**
```typescript
interface HpoToolResult {
  toolId: string;              // "star", "peer_check" 등
  toolName: string;            // "자기진단(STAR)"
  category: "fundamental" | "conditional";
  detected: boolean;
  detectionCount: number;
  timestamps: number[];
  confidence: number;
}
```

### 3E. 임베딩 유사도 비교

**목적:** 골드스탠다드 영상과 평가 영상을 세그먼트별로 비교하여 정량적 숙련도 격차를 측정한다.

**전제 조건:** 골드스탠다드 영상이 등록되어 있을 때만 실행.

**처리:**
1. 양쪽 영상을 10초 세그먼트로 분할
2. 각 세그먼트에 대해 Marengo Embed API 호출 → 512차원 벡터
3. 세그먼트 쌍별 코사인 유사도 계산
4. DTW로 세그먼트 최적 매칭 (영상 길이가 다를 수 있음)

**TwelveLabs API:**
```
POST /embed
{
  "video_id": "<videoId>",
  "video_embedding_scope": {
    "start_offset_sec": 0,
    "end_offset_sec": 10
  }
}
```

**출력:**
```typescript
interface EmbeddingComparison {
  segmentPairs: SegmentSimilarity[];
  averageSimilarity: number;      // 0-1
  gapSegments: SegmentSimilarity[]; // similarity < 0.5
  heatmapData: number[][];        // 시각화용 2D 매트릭스
}

interface SegmentSimilarity {
  expertStart: number;
  expertEnd: number;
  traineeStart: number;
  traineeEnd: number;
  similarity: number;   // 코사인 유사도 0-1
}
```

### 3F. 종합 스코어링

**가중 합산 공식:**
```
종합점수 = 절차준수점수 × 0.40
         + HPO도구점수 × 0.30
         + 기본수칙점수 × 0.20
         + 유사도점수 × 0.10   // 골드스탠다드 없으면: 절차 0.44 + HPO 0.33 + 기본수칙 0.23
```

**등급 매핑:**

| 등급 | 점수 | 의미 |
|------|------|------|
| S | 95+ | 탁월 — 절차 완벽 + HPO 마스터 |
| A | 85+ | 우수 — 정확 + 우수한 HPO |
| B | 70+ | 양호 — 양호한 준수 + 부분 HPO |
| C | 55+ | 보통 — 일부 이탈 + HPO 개선 필요 |
| D | 40+ | 미흡 — 다수 이탈 + 재훈련 필요 |
| F | <40 | 부적합 — 안전 문제 |

**핵심 단계 감점 규칙:**
- 핵심 단계(critical step) 1건 이탈: -5점
- 핵심 단계 3건 이상 이탈: 자동 D등급 이하

---

## 4. UI/대시보드 설계

### 4.1 Overview 탭
- 등급 배지 (S~F, 색상 코딩)
- 종합 점수 (0-100)
- 4대 영역 점수 프로그레스 바 (절차/HPO/기본수칙/유사도)
- 주요 통계: 수행 단계 수, 이탈 건수, HPO 적용 수, 소요시간
- 5대 기본수칙 레이더 차트 (Recharts RadarChart)
- AI 종합 소견: 강점/개선/권고 3섹션

### 4.2 Steps Timeline 탭
- SOP 단계별 행 (테이블 형태)
- 각 행에 영상 타임라인 바: 수행 구간을 시각적으로 표시
- 상태 배지: Pass(녹)/Fail(적)/Partial(황)/Skip(회)
- 이탈 구간 빨간 하이라이트 + 이탈 유형(SWAP/SKIP/INSERT/DELAY) 라벨
- 행 클릭 → 해당 구간 영상 재생 + 손-물체 분석 상세 패널

### 4.3 Hand-Object 탭
- 좌측: 영상 플레이어 + 현재 프레임 분석 오버레이 (손에 든 것/조작 대상/상태 변화)
- 우측: 이벤트 타임라인 (시간순 스크롤)
  - 각 이벤트: 시간 + 도구 → 대상 + 상태 변화
  - SOP 일치(녹색 좌측 보더) / 불일치(적색 좌측 보더) 컬러 코딩
- 하단 통계: 도구 종류 수, 조작 이벤트 수, 상태 변화 수

### 4.4 Comparison 탭
- 상단: 숙련자/평가 대상 나란히 영상 플레이어 (동기화 재생)
- 하단: 임베딩 유사도 히트맵 (10초 세그먼트 바)
  - 녹색(>0.8), 황색(0.5~0.8), 적색(<0.5)
  - 평균 유사도 수치
  - 격차 구간 클릭 → 양쪽 영상 점프
- 골드스탠다드 미등록 시: 등록 안내 + 현재 영상을 기준으로 등록 옵션 표시

### 4.5 디브리핑 세션 (Phase 5) 강화
기존 PovReviewSession 컴포넌트를 확장:
- AI 판정 오버라이드: 각 단계 Pass/Fail 수정 + 수정 사유 기록
- 신뢰도 낮은 항목(<0.6) 우선 표시 (평가관 검토 유도)
- 모범사례 등록: "골드스탠다드로 등록" 버튼 + 구간 발췌 등록
- 최종 리포트 확정: 수정 반영 → PDF 내보내기 + 훈련 이력 저장

---

## 5. 데이터 모델

### 5.1 새로 추가/확장하는 타입

```typescript
// 쿼리 템플릿 (pov-standards.ts에 추가)
interface StepQueryTemplate {
  stepId: string;
  sopText: string;           // 한국어 원문
  actionQuery: string;       // 행동 기반 영어 쿼리
  objectQuery: string;       // 물체 기반 영어 쿼리
  stateQuery: string;        // 상태 기반 영어 쿼리
}

// 골드스탠다드 관리
interface GoldStandard {
  id: string;
  procedureId: string;
  videoId: string;
  registeredBy: string;      // 평가관 ID
  registeredAt: string;      // ISO date
  segmentRange?: {           // 부분 등록 시
    start: number;
    end: number;
  };
  averageScore: number;
  embeddings?: number[][];   // 캐시된 세그먼트 임베딩
}

// 분석 작업 상태
interface AnalysisJob {
  id: string;
  videoId: string;
  procedureId: string;
  goldStandardId?: string;
  status: "indexing" | "analyzing" | "scoring" | "complete" | "error";
  progress: number;          // 0-100
  stages: {
    stepDetection: "pending" | "running" | "done" | "error";
    handObject: "pending" | "running" | "done" | "error";
    sequenceMatch: "pending" | "running" | "done" | "error";
    hpoVerification: "pending" | "running" | "done" | "error";
    embeddingComparison: "pending" | "running" | "done" | "error";
    scoring: "pending" | "running" | "done" | "error";
  };
  result?: PovEvaluationReport;  // 기존 타입 확장
  error?: string;
}
```

### 5.2 기존 타입 확장

`PovEvaluationReport`에 추가:
```typescript
interface PovEvaluationReport {
  // ... 기존 필드 유지 ...

  // 새로 추가
  handObjectEvents: HandObjectEvent[];
  sequenceAlignment: SequenceAlignment;
  hpoResults: HpoToolResult[];
  embeddingComparison?: EmbeddingComparison;  // 골드스탠다드 있을 때
  analysisMetadata: {
    analyzedAt: string;
    pipelineVersion: string;
    totalApiCalls: number;
    processingTimeMs: number;
  };
}
```

---

## 6. API 라우트

### 6.1 새로 추가할 라우트

| 라우트 | 메서드 | 용도 |
|--------|--------|------|
| `/api/twelvelabs/pov-analyze` | POST | 전체 분석 파이프라인 트리거 |
| `/api/twelvelabs/pov-analyze/status` | GET | 분석 진행 상태 조회 |
| `/api/twelvelabs/pov-analyze/steps` | POST | 3A: SOP 단계 검출 |
| `/api/twelvelabs/pov-analyze/hand-object` | POST | 3B: 손-물체 분석 |
| `/api/twelvelabs/pov-analyze/hpo` | POST | 3D: HPO 도구 검증 |
| `/api/twelvelabs/gold-standard` | GET/POST/DELETE | 골드스탠다드 관리 |

### 6.2 분석 오케스트레이션

`/api/twelvelabs/pov-analyze` 엔드포인트가 전체 파이프라인을 오케스트레이션:

```
POST /api/twelvelabs/pov-analyze
{
  "videoId": "abc123",
  "procedureId": "appendix-1",
  "goldStandardId": "gs-001"  // optional
}

→ Response: { "jobId": "job-xyz", "status": "analyzing" }
```

진행 상태 폴링:
```
GET /api/twelvelabs/pov-analyze/status?jobId=job-xyz

→ Response: {
    "status": "analyzing",
    "progress": 65,
    "stages": { ... },
    "currentStage": "hpoVerification"
  }
```

---

## 7. 쿼리 엔지니어링 전략

### 7.1 변환 규칙

한국어 SOP 원문을 TwelveLabs에 최적화된 영어 쿼리로 변환하는 규칙:

1. **1인칭 시점 묘사**: "operator's hand" 대신 "hand reaching for", "fingers turning" 등 카메라 시점 행동 묘사
2. **구체적 동작**: "확인" → "looking at gauge display", "checking indicator light"
3. **물체 특징 포함**: "VG-003" 같은 라벨이 있으면 "valve with label" 포함
4. **상태 변화 표현**: "열림 확인" → "handle in open position, indicator showing green"

### 7.2 쿼리 품질 보장

- 각 절차의 쿼리 템플릿은 사전에 수동 검증
- 낮은 신뢰도 결과는 보강 검색(objectQuery → stateQuery 순서)
- 평가관의 오버라이드 기록을 쿼리 개선 피드백으로 활용 (향후)

---

## 8. 파일 구조

```
src/
├── lib/
│   ├── pov-standards.ts          # 기존 + StepQueryTemplate 추가
│   ├── pov-analysis-engine.ts    # NEW: 분석 파이프라인 오케스트레이터
│   ├── pov-dtw.ts                # NEW: DTW 알고리즘
│   ├── pov-scoring.ts            # NEW: 종합 스코어링 엔진
│   ├── pov-query-templates.ts    # NEW: 쿼리 변환 템플릿
│   ├── pov-gold-standard.ts      # NEW: 골드스탠다드 관리
│   └── types.ts                  # 기존 + 새 인터페이스 추가
├── components/pov/
│   ├── PovAnalysis.tsx           # 기존 수정: 실제 분석 연동
│   ├── PovReviewSession.tsx      # 기존 수정: 오버라이드 + 모범사례
│   ├── StepsTimeline.tsx         # NEW: 시퀀스 타임라인 시각화
│   ├── HandObjectTimeline.tsx    # NEW: 손-물체 이벤트 타임라인
│   ├── ComparisonView.tsx        # NEW: 숙련자 비교 뷰
│   ├── SimilarityHeatmap.tsx     # NEW: 유사도 히트맵
│   ├── AnalysisProgress.tsx      # NEW: 분석 진행 상태 UI
│   └── GoldStandardManager.tsx   # NEW: 골드스탠다드 등록/관리
├── hooks/
│   ├── usePovAnalysis.ts         # NEW: 분석 파이프라인 훅
│   └── useGoldStandard.ts        # NEW: 골드스탠다드 CRUD 훅
└── app/api/twelvelabs/
    ├── pov-analyze/
    │   ├── route.ts              # NEW: 분석 트리거
    │   └── status/route.ts       # NEW: 진행 상태
    └── gold-standard/
        └── route.ts              # NEW: 골드스탠다드 CRUD
```

---

## 9. 에러 핸들링

| 시나리오 | 처리 |
|----------|------|
| TwelveLabs API 타임아웃 | 3회 재시도 (exponential backoff), 실패 시 해당 단계만 에러 표시 |
| Marengo 검색 결과 0건 | 해당 단계 "미검출"로 표시, 평가관 수동 판정 유도 |
| Pegasus 응답 JSON 파싱 실패 | 원문 텍스트 보존, 구조화 실패 표시 |
| 골드스탠다드 영상 미등록 | 비교 탭 비활성화, 유사도 점수 제외하고 나머지 가중치 재분배 |
| 영상 인덱싱 실패 | 재업로드 안내, 파일 형식/크기 검증 |
| Rate limit 초과 | 요청 큐잉 + 지수 백오프, 진행률 UI에 지연 표시 |

---

## 10. 성능 고려사항

- SOP 단계별 검색은 병렬 실행 (Promise.allSettled), 단 TwelveLabs rate limit(분당 60회) 고려하여 배치 크기 조절
- 임베딩 비교의 세그먼트 수가 많을 수 있으므로 (20분 영상 = 120세그먼트), 임베딩은 서버 사이드에서 계산하고 결과만 클라이언트에 전달
- 분석 결과는 서버 사이드에 캐시하여 동일 영상 재분석 방지
- DTW 알고리즘은 O(n*m)이나 n,m <= 38이므로 무시할 수 있는 수준

---

## 11. 확장 가능성 (C 수준으로의 확장)

현재 설계에서 향후 품질 평가(C 수준)로 확장할 수 있는 인터페이스:

1. `HandObjectEvent.qualityScore?: number` — 조작 품질 점수 필드 예비
2. `DetectedStep.qualityAnalysis?: string` — Pegasus 품질 분석 텍스트 필드 예비
3. `SopDeviation.qualityDetail?: string` — 이탈의 품질 상세 필드 예비
4. Scoring Engine의 가중치는 설정 파일로 분리하여 조정 가능하게 설계

---

## 12. 비범위 (Out of Scope)

- 실시간 스트리밍 분석 (업로드 후 분석만)
- 커스텀 모델 파인튜닝 (TwelveLabs 기본 모델 사용)
- 훈련생 셀프 리뷰 모드 (평가관 전용)
- 관리자 대시보드/통계 (단일 평가 리포트에 집중)
- 다국어 지원 (한국어 UI 전용)
- 3D 손 포즈 추정 (TwelveLabs 자연어 기반)
