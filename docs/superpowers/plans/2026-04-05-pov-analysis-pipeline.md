# POV 영상분석 AI 파이프라인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데모 데이터를 실제 TwelveLabs AI 분석으로 교체하고, 손-물체 분석/DTW 시퀀스 매칭/숙련자 비교 기능을 추가하여 글로벌 최고 수준의 POV 훈련 평가 시스템을 구현한다.

**Architecture:** TwelveLabs Marengo(검색/임베딩) + Pegasus(분석)를 백엔드에서 호출하고, 6개 분석 모듈(단계검출, 손-물체, DTW, HPO, 임베딩비교, 스코어링)을 오케스트레이션. 결과는 4탭 대시보드 + 디브리핑 세션으로 표시.

**Tech Stack:** Next.js 14 App Router, TypeScript, TwelveLabs API (Marengo 3.0 + Pegasus 1.2), Recharts, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-05-pov-analysis-system-design.md`

---

## 파일 구조 맵

### 새로 생성

| 파일 | 역할 |
|------|------|
| `src/lib/pov-query-templates.ts` | SOP 단계별 영어 쿼리 템플릿 (8개 절차) |
| `src/lib/pov-dtw.ts` | DTW 시퀀스 매칭 알고리즘 |
| `src/lib/pov-scoring.ts` | 종합 스코어링 엔진 |
| `src/lib/pov-gold-standard.ts` | 골드스탠다드 영상 관리 (JSON 파일 기반) |
| `src/lib/pov-analysis-engine.ts` | 분석 파이프라인 오케스트레이터 |
| `src/hooks/usePovAnalysis.ts` | 분석 트리거 + 상태 폴링 훅 |
| `src/hooks/useGoldStandard.ts` | 골드스탠다드 CRUD 훅 |
| `src/app/api/twelvelabs/pov-analyze/route.ts` | 분석 파이프라인 API |
| `src/app/api/twelvelabs/pov-analyze/status/route.ts` | 분석 진행 상태 API |
| `src/app/api/twelvelabs/gold-standard/route.ts` | 골드스탠다드 CRUD API |
| `src/components/pov/AnalysisProgress.tsx` | 분석 진행률 UI |
| `src/components/pov/StepsTimeline.tsx` | SOP 시퀀스 타임라인 |
| `src/components/pov/HandObjectTimeline.tsx` | 손-물체 이벤트 타임라인 |
| `src/components/pov/ComparisonView.tsx` | 숙련자 비교 + 유사도 히트맵 |
| `src/components/pov/GoldStandardManager.tsx` | 골드스탠다드 등록/관리 UI |
| `src/__tests__/pov-dtw.test.ts` | DTW 단위 테스트 |
| `src/__tests__/pov-scoring.test.ts` | 스코어링 단위 테스트 |
| `src/__tests__/pov-query-templates.test.ts` | 쿼리 템플릿 단위 테스트 |
| `data/gold-standards.json` | 골드스탠다드 영상 저장소 |

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/types.ts` | DetectedStep, HandObjectEvent, SequenceAlignment 등 새 인터페이스 추가 |
| `src/lib/pov-standards.ts` | StepQueryTemplate 필드 추가 |
| `src/components/pov/PovAnalysis.tsx` | 데모→실제 분석 연동, report 탭에 새 컴포넌트 연결 |
| `src/components/pov/PovReviewSession.tsx` | AI 판정 오버라이드 + 모범사례 등록 기능 |
| `src/lib/twelvelabs.ts` | embedVideo() 함수 추가 |

---

## Task 1: 타입 정의 확장

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: 분석 파이프라인 인터페이스 추가**

`src/lib/types.ts` 파일 끝에 다음을 추가한다:

```typescript
// === POV 분석 파이프라인 타입 ===

export interface DetectedStep {
  stepId: string;
  status: 'pass' | 'fail' | 'partial';
  confidence: number;
  timestamp: number;
  endTime: number;
  searchScore: number;
  thumbnailUrl?: string;
}

export interface HandObjectEvent {
  stepId: string;
  timestamp: number;
  endTime: number;
  heldObject: string;
  targetEquipment: string;
  actionType: string;
  stateBefore: string;
  stateAfter: string;
  matchesSOP: boolean;
  confidence: number;
  rawDescription: string;
}

export interface AlignmentPair {
  sopIndex: number;
  detectedIndex: number | null;
  cost: number;
}

export interface SequenceAlignment {
  sopSequence: string[];
  detectedSequence: string[];
  alignmentPath: AlignmentPair[];
  deviations: PovSopDeviation[];
  complianceScore: number;
  criticalDeviations: number;
}

export interface PovSopDeviation {
  type: 'swap' | 'skip' | 'insert' | 'delay';
  stepIds: string[];
  timestamp?: number;
  severity: 'critical' | 'major' | 'minor';
  description: string;
}

export interface HpoToolResult {
  toolId: string;
  toolName: string;
  category: 'fundamental' | 'conditional';
  detected: boolean;
  detectionCount: number;
  timestamps: number[];
  confidence: number;
}

export interface SegmentSimilarity {
  expertStart: number;
  expertEnd: number;
  traineeStart: number;
  traineeEnd: number;
  similarity: number;
}

export interface EmbeddingComparison {
  segmentPairs: SegmentSimilarity[];
  averageSimilarity: number;
  gapSegments: SegmentSimilarity[];
  heatmapData: number[];
}

export interface GoldStandard {
  id: string;
  procedureId: string;
  videoId: string;
  registeredBy: string;
  registeredAt: string;
  segmentRange?: { start: number; end: number };
  averageScore: number;
  embeddings?: number[][];
}

export interface AnalysisJob {
  id: string;
  videoId: string;
  procedureId: string;
  goldStandardId?: string;
  status: 'indexing' | 'analyzing' | 'scoring' | 'complete' | 'error';
  progress: number;
  stages: {
    stepDetection: StageStatus;
    handObject: StageStatus;
    sequenceMatch: StageStatus;
    hpoVerification: StageStatus;
    embeddingComparison: StageStatus;
    scoring: StageStatus;
  };
  result?: PovEvaluationReport;
  error?: string;
}

export type StageStatus = 'pending' | 'running' | 'done' | 'error';

export interface StepQueryTemplate {
  stepId: string;
  sopText: string;
  actionQuery: string;
  objectQuery: string;
  stateQuery: string;
}
```

- [ ] **Step 2: PovEvaluationReport 확장**

`src/lib/types.ts`의 `PovEvaluationReport` 인터페이스에 새 필드를 추가한다. 기존 필드는 모두 유지하고 끝에 추가:

```typescript
// PovEvaluationReport 인터페이스 끝에 추가 (기존 필드 아래)
  handObjectEvents?: HandObjectEvent[];
  sequenceAlignment?: SequenceAlignment;
  hpoResults?: HpoToolResult[];
  embeddingComparison?: EmbeddingComparison;
  analysisMetadata?: {
    analyzedAt: string;
    pipelineVersion: string;
    totalApiCalls: number;
    processingTimeMs: number;
  };
```

- [ ] **Step 3: 타입 빌드 검증**

Run: `cd /Users/dohan/poc12labs && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음 (또는 기존과 동일한 에러만)

- [ ] **Step 4: 커밋**

```bash
git add src/lib/types.ts
git commit -m "feat(pov): 분석 파이프라인 타입 정의 추가

DetectedStep, HandObjectEvent, SequenceAlignment, HpoToolResult,
EmbeddingComparison, GoldStandard, AnalysisJob 등 AI 파이프라인 인터페이스"
```

---

## Task 2: DTW 시퀀스 매칭 알고리즘

**Files:**
- Create: `src/lib/pov-dtw.ts`
- Create: `src/__tests__/pov-dtw.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// src/__tests__/pov-dtw.test.ts
import { alignSequences, detectDeviations } from '@/lib/pov-dtw';

describe('alignSequences', () => {
  it('동일한 시퀀스는 완벽한 정렬', () => {
    const sop = ['1.1', '1.2', '1.3', '2.1', '2.2'];
    const detected = ['1.1', '1.2', '1.3', '2.1', '2.2'];
    const result = alignSequences(sop, detected, new Set());
    expect(result.complianceScore).toBe(100);
    expect(result.deviations).toHaveLength(0);
    expect(result.criticalDeviations).toBe(0);
  });

  it('누락된 단계를 SKIP으로 탐지', () => {
    const sop = ['1.1', '1.2', '1.3', '2.1', '2.2'];
    const detected = ['1.1', '1.3', '2.1', '2.2'];
    const result = alignSequences(sop, detected, new Set());
    const skips = result.deviations.filter(d => d.type === 'skip');
    expect(skips).toHaveLength(1);
    expect(skips[0].stepIds).toContain('1.2');
  });

  it('순서 역전을 SWAP으로 탐지', () => {
    const sop = ['1.1', '1.2', '1.3'];
    const detected = ['1.1', '1.3', '1.2'];
    const result = alignSequences(sop, detected, new Set());
    const swaps = result.deviations.filter(d => d.type === 'swap');
    expect(swaps).toHaveLength(1);
    expect(swaps[0].stepIds).toEqual(expect.arrayContaining(['1.2', '1.3']));
  });

  it('추가 행동을 INSERT로 탐지', () => {
    const sop = ['1.1', '1.2', '1.3'];
    const detected = ['1.1', '1.2', 'X.1', '1.3'];
    const result = alignSequences(sop, detected, new Set());
    const inserts = result.deviations.filter(d => d.type === 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].stepIds).toContain('X.1');
  });

  it('핵심 단계 누락은 critical severity', () => {
    const sop = ['1.1', '1.2', '1.3'];
    const detected = ['1.1', '1.3'];
    const criticalSteps = new Set(['1.2']);
    const result = alignSequences(sop, detected, criticalSteps);
    const skips = result.deviations.filter(d => d.type === 'skip');
    expect(skips[0].severity).toBe('critical');
    expect(result.criticalDeviations).toBe(1);
  });

  it('빈 검출 시퀀스는 모든 단계 SKIP', () => {
    const sop = ['1.1', '1.2', '1.3'];
    const detected: string[] = [];
    const result = alignSequences(sop, detected, new Set());
    expect(result.complianceScore).toBe(0);
    expect(result.deviations.filter(d => d.type === 'skip')).toHaveLength(3);
  });
});

describe('detectDeviations', () => {
  it('복합 이탈: SKIP + SWAP 동시 발생', () => {
    const sop = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'];
    const detected = ['1.1', '1.3', '2.2', '2.1', '2.3'];
    const result = alignSequences(sop, detected, new Set());
    const types = result.deviations.map(d => d.type);
    expect(types).toContain('skip');
    expect(types).toContain('swap');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/dohan/poc12labs && npx jest src/__tests__/pov-dtw.test.ts --no-cache 2>&1 | tail -5`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: DTW 알고리즘 구현**

```typescript
// src/lib/pov-dtw.ts
import type { SequenceAlignment, AlignmentPair, PovSopDeviation } from './types';

/**
 * DTW(Dynamic Time Warping)로 SOP 순서와 실제 수행 순서를 정렬하고 이탈을 탐지한다.
 *
 * @param sopSequence - SOP에 정의된 단계 ID 순서
 * @param detectedSequence - 영상에서 검출된 단계 ID (타임스탬프순)
 * @param criticalSteps - 핵심 단계 ID 집합 (이탈 시 가중 감점)
 */
export function alignSequences(
  sopSequence: string[],
  detectedSequence: string[],
  criticalSteps: Set<string>
): SequenceAlignment {
  const n = sopSequence.length;
  const m = detectedSequence.length;

  if (m === 0) {
    return {
      sopSequence,
      detectedSequence,
      alignmentPath: sopSequence.map((_, i) => ({ sopIndex: i, detectedIndex: null, cost: 1 })),
      deviations: sopSequence.map(id => ({
        type: 'skip' as const,
        stepIds: [id],
        severity: criticalSteps.has(id) ? 'critical' as const : 'major' as const,
        description: `단계 ${id} 미수행`,
      })),
      complianceScore: 0,
      criticalDeviations: sopSequence.filter(id => criticalSteps.has(id)).length,
    };
  }

  // DTW 비용 행렬 계산
  const cost = (a: string, b: string): number => (a === b ? 0 : criticalSteps.has(a) ? 3 : 1);

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + cost(sopSequence[i - 1], '');
  for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + 1;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const c = cost(sopSequence[i - 1], detectedSequence[j - 1]);
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + c,  // match/mismatch
        dp[i - 1][j] + cost(sopSequence[i - 1], ''),  // SOP 단계 skip
        dp[i][j - 1] + 1,       // detected에 추가 행동
      );
    }
  }

  // 역추적으로 정렬 경로 추출
  const path: AlignmentPair[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + cost(sopSequence[i - 1], detectedSequence[j - 1])) {
      path.unshift({ sopIndex: i - 1, detectedIndex: j - 1, cost: cost(sopSequence[i - 1], detectedSequence[j - 1]) });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + cost(sopSequence[i - 1], '')) {
      path.unshift({ sopIndex: i - 1, detectedIndex: null, cost: cost(sopSequence[i - 1], '') });
      i--;
    } else {
      path.unshift({ sopIndex: -1, detectedIndex: j - 1, cost: 1 });
      j--;
    }
  }

  const deviations = detectDeviations(sopSequence, detectedSequence, path, criticalSteps);
  const criticalDeviationCount = deviations.filter(d => d.severity === 'critical').length;

  // 준수율: 정확히 매칭된 단계 수 / SOP 전체 단계 수
  const matchedCount = path.filter(p => p.sopIndex >= 0 && p.detectedIndex !== null && p.cost === 0).length;
  const complianceScore = n > 0 ? Math.round((matchedCount / n) * 100) : 0;

  return {
    sopSequence,
    detectedSequence,
    alignmentPath: path,
    deviations,
    complianceScore,
    criticalDeviations: criticalDeviationCount,
  };
}

/**
 * 정렬 경로에서 이탈 유형을 분류한다.
 */
export function detectDeviations(
  sopSequence: string[],
  detectedSequence: string[],
  path: AlignmentPair[],
  criticalSteps: Set<string>
): PovSopDeviation[] {
  const deviations: PovSopDeviation[] = [];

  // SKIP 탐지: SOP 단계가 detected에 매핑되지 않은 경우
  for (const pair of path) {
    if (pair.sopIndex >= 0 && pair.detectedIndex === null) {
      const stepId = sopSequence[pair.sopIndex];
      deviations.push({
        type: 'skip',
        stepIds: [stepId],
        severity: criticalSteps.has(stepId) ? 'critical' : 'major',
        description: `단계 ${stepId} 미수행`,
      });
    }
  }

  // INSERT 탐지: detected에 있으나 SOP에 없는 행동
  for (const pair of path) {
    if (pair.sopIndex === -1 && pair.detectedIndex !== null) {
      const stepId = detectedSequence[pair.detectedIndex];
      deviations.push({
        type: 'insert',
        stepIds: [stepId],
        severity: 'minor',
        description: `SOP에 없는 행동 삽입: ${stepId}`,
      });
    }
  }

  // SWAP 탐지: 매칭된 단계들의 검출 순서가 SOP 순서와 다른 경우
  const matchedPairs = path.filter(p => p.sopIndex >= 0 && p.detectedIndex !== null && p.cost === 0);
  for (let k = 0; k < matchedPairs.length - 1; k++) {
    const curr = matchedPairs[k];
    const next = matchedPairs[k + 1];
    // SOP에서는 curr가 next보다 앞이지만, detected에서는 역전
    if (curr.detectedIndex! > next.detectedIndex!) {
      const id1 = sopSequence[curr.sopIndex];
      const id2 = sopSequence[next.sopIndex];
      const isCritical = criticalSteps.has(id1) || criticalSteps.has(id2);
      deviations.push({
        type: 'swap',
        stepIds: [id1, id2],
        severity: isCritical ? 'critical' : 'major',
        description: `단계 ${id1}과 ${id2} 순서 역전`,
      });
    }
  }

  return deviations;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/dohan/poc12labs && npx jest src/__tests__/pov-dtw.test.ts --no-cache 2>&1 | tail -10`
Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pov-dtw.ts src/__tests__/pov-dtw.test.ts
git commit -m "feat(pov): DTW 시퀀스 매칭 알고리즘 구현 + 테스트

SOP 순서 vs 실제 수행 순서 비교, SWAP/SKIP/INSERT 이탈 탐지,
핵심 단계 가중 감점, 준수율 점수 계산"
```

---

## Task 3: 종합 스코어링 엔진

**Files:**
- Create: `src/lib/pov-scoring.ts`
- Create: `src/__tests__/pov-scoring.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// src/__tests__/pov-scoring.test.ts
import {
  calculateOverallScore,
  calculateProcedureScore,
  calculateHpoScore,
  calculateFundamentalsScore,
  getGrade,
} from '@/lib/pov-scoring';
import type { DetectedStep, HpoToolResult, FundamentalScore } from '@/lib/types';

describe('calculateProcedureScore', () => {
  it('모든 단계 pass면 100점', () => {
    const steps: DetectedStep[] = [
      { stepId: '1.1', status: 'pass', confidence: 0.9, timestamp: 10, endTime: 20, searchScore: 0.9 },
      { stepId: '1.2', status: 'pass', confidence: 0.8, timestamp: 25, endTime: 35, searchScore: 0.8 },
    ];
    expect(calculateProcedureScore(steps, 2, 0)).toBe(100);
  });

  it('절반 pass면 약 50점', () => {
    const steps: DetectedStep[] = [
      { stepId: '1.1', status: 'pass', confidence: 0.9, timestamp: 10, endTime: 20, searchScore: 0.9 },
      { stepId: '1.2', status: 'fail', confidence: 0.1, timestamp: 0, endTime: 0, searchScore: 0.1 },
    ];
    // pass=1, partial=0, total=2 → baseScore=50, criticalPenalty=0 → 50
    expect(calculateProcedureScore(steps, 2, 0)).toBe(50);
  });

  it('partial은 0.5 가중치', () => {
    const steps: DetectedStep[] = [
      { stepId: '1.1', status: 'pass', confidence: 0.9, timestamp: 10, endTime: 20, searchScore: 0.9 },
      { stepId: '1.2', status: 'partial', confidence: 0.5, timestamp: 25, endTime: 30, searchScore: 0.5 },
    ];
    // (1 + 0.5) / 2 * 100 = 75
    expect(calculateProcedureScore(steps, 2, 0)).toBe(75);
  });

  it('핵심단계 이탈 1건당 -5점', () => {
    const steps: DetectedStep[] = [
      { stepId: '1.1', status: 'pass', confidence: 0.9, timestamp: 10, endTime: 20, searchScore: 0.9 },
      { stepId: '1.2', status: 'pass', confidence: 0.8, timestamp: 25, endTime: 35, searchScore: 0.8 },
    ];
    // base=100, critical=2 → 100 - 10 = 90
    expect(calculateProcedureScore(steps, 2, 2)).toBe(90);
  });
});

describe('calculateHpoScore', () => {
  it('기본4종 모두 적용 + 조건부 일부 적용', () => {
    const results: HpoToolResult[] = [
      { toolId: 'situationAwareness', toolName: '상황인식', category: 'fundamental', detected: true, detectionCount: 2, timestamps: [10, 30], confidence: 0.8 },
      { toolId: 'selfCheck', toolName: 'STAR', category: 'fundamental', detected: true, detectionCount: 1, timestamps: [20], confidence: 0.7 },
      { toolId: 'communication', toolName: '의사소통', category: 'fundamental', detected: true, detectionCount: 3, timestamps: [5, 15, 25], confidence: 0.9 },
      { toolId: 'procedureCompliance', toolName: '절차준수', category: 'fundamental', detected: true, detectionCount: 1, timestamps: [40], confidence: 0.75 },
      { toolId: 'peerCheck', toolName: '동료점검', category: 'conditional', detected: true, detectionCount: 1, timestamps: [50], confidence: 0.6 },
      { toolId: 'preJobBriefing', toolName: '작업전회의', category: 'conditional', detected: false, detectionCount: 0, timestamps: [], confidence: 0 },
    ];
    const score = calculateHpoScore(results);
    // 기본 4/4 = 100% × 0.7 = 70, 조건부 1/2 = 50% × 0.3 = 15 → 85
    expect(score).toBe(85);
  });

  it('기본4종 미적용 시 낮은 점수', () => {
    const results: HpoToolResult[] = [
      { toolId: 'situationAwareness', toolName: '상황인식', category: 'fundamental', detected: false, detectionCount: 0, timestamps: [], confidence: 0 },
      { toolId: 'selfCheck', toolName: 'STAR', category: 'fundamental', detected: false, detectionCount: 0, timestamps: [], confidence: 0 },
    ];
    const score = calculateHpoScore(results);
    // 기본 0/2 = 0% × 0.7 = 0, 조건부 없음 → 0
    expect(score).toBe(0);
  });
});

describe('calculateOverallScore', () => {
  it('골드스탠다드 없으면 가중치 재분배 (0.44/0.33/0.23)', () => {
    const score = calculateOverallScore(80, 70, 60, undefined);
    // 80×0.44 + 70×0.33 + 60×0.23 = 35.2 + 23.1 + 13.8 = 72.1 → 72
    expect(score).toBe(72);
  });

  it('골드스탠다드 있으면 4분할 가중치 (0.40/0.30/0.20/0.10)', () => {
    const score = calculateOverallScore(80, 70, 60, 90);
    // 80×0.40 + 70×0.30 + 60×0.20 + 90×0.10 = 32+21+12+9 = 74
    expect(score).toBe(74);
  });
});

describe('getGrade', () => {
  it('등급 경계값 테스트', () => {
    expect(getGrade(95)).toBe('S');
    expect(getGrade(94)).toBe('A');
    expect(getGrade(85)).toBe('A');
    expect(getGrade(84)).toBe('B');
    expect(getGrade(70)).toBe('B');
    expect(getGrade(55)).toBe('C');
    expect(getGrade(40)).toBe('D');
    expect(getGrade(39)).toBe('F');
    expect(getGrade(0)).toBe('F');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/dohan/poc12labs && npx jest src/__tests__/pov-scoring.test.ts --no-cache 2>&1 | tail -5`
Expected: FAIL

- [ ] **Step 3: 스코어링 엔진 구현**

```typescript
// src/lib/pov-scoring.ts
import type { DetectedStep, HpoToolResult, FundamentalScore } from './types';

/**
 * 절차 준수 점수: pass/partial/fail 비율 + 핵심단계 감점
 */
export function calculateProcedureScore(
  steps: DetectedStep[],
  totalSteps: number,
  criticalDeviations: number
): number {
  if (totalSteps === 0) return 0;

  const passCount = steps.filter(s => s.status === 'pass').length;
  const partialCount = steps.filter(s => s.status === 'partial').length;

  const baseScore = ((passCount + partialCount * 0.5) / totalSteps) * 100;
  const penalty = criticalDeviations * 5;

  return Math.max(0, Math.round(baseScore - penalty));
}

/**
 * HPO 도구 점수: 기본4종(70%) + 조건부(30%)
 */
export function calculateHpoScore(results: HpoToolResult[]): number {
  const fundamentals = results.filter(r => r.category === 'fundamental');
  const conditionals = results.filter(r => r.category === 'conditional');

  const fundRate = fundamentals.length > 0
    ? fundamentals.filter(r => r.detected).length / fundamentals.length
    : 0;
  const condRate = conditionals.length > 0
    ? conditionals.filter(r => r.detected).length / conditionals.length
    : 0;

  // 조건부가 없으면 기본만으로 100%
  if (conditionals.length === 0) {
    return Math.round(fundRate * 100);
  }

  return Math.round(fundRate * 100 * 0.7 + condRate * 100 * 0.3);
}

/**
 * 기본수칙 점수: 5개 수칙 평균
 */
export function calculateFundamentalsScore(scores: FundamentalScore[]): number {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  return Math.round(avg);
}

/**
 * 종합 점수: 가중 합산
 * 골드스탠다드 없으면: 절차 0.44 + HPO 0.33 + 기본수칙 0.23
 * 골드스탠다드 있으면: 절차 0.40 + HPO 0.30 + 기본수칙 0.20 + 유사도 0.10
 */
export function calculateOverallScore(
  procedureScore: number,
  hpoScore: number,
  fundamentalsScore: number,
  similarityScore?: number
): number {
  if (similarityScore !== undefined) {
    return Math.round(
      procedureScore * 0.40 +
      hpoScore * 0.30 +
      fundamentalsScore * 0.20 +
      similarityScore * 0.10
    );
  }
  return Math.round(
    procedureScore * 0.44 +
    hpoScore * 0.33 +
    fundamentalsScore * 0.23
  );
}

/**
 * 등급 매핑
 */
export function getGrade(score: number): string {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * 핵심단계 3건 이상 이탈 시 자동 D 이하
 */
export function applyGradeOverride(grade: string, criticalDeviations: number): string {
  if (criticalDeviations >= 3 && ['S', 'A', 'B', 'C'].includes(grade)) {
    return 'D';
  }
  return grade;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/dohan/poc12labs && npx jest src/__tests__/pov-scoring.test.ts --no-cache 2>&1 | tail -10`
Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pov-scoring.ts src/__tests__/pov-scoring.test.ts
git commit -m "feat(pov): 종합 스코어링 엔진 구현 + 테스트

절차준수/HPO/기본수칙/유사도 가중 합산, S~F 등급 매핑,
핵심단계 감점, 골드스탠다드 없을 때 가중치 재분배"
```

---

## Task 4: 쿼리 템플릿 시스템

**Files:**
- Create: `src/lib/pov-query-templates.ts`
- Create: `src/__tests__/pov-query-templates.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// src/__tests__/pov-query-templates.test.ts
import { getQueryTemplates, getHpoQueries } from '@/lib/pov-query-templates';

describe('getQueryTemplates', () => {
  it('appendix-1 절차의 쿼리 템플릿 반환', () => {
    const templates = getQueryTemplates('appendix-1');
    expect(templates.length).toBeGreaterThan(0);
    // 각 템플릿에 필수 필드 존재
    templates.forEach(t => {
      expect(t.stepId).toBeTruthy();
      expect(t.sopText).toBeTruthy();
      expect(t.actionQuery).toBeTruthy();
      expect(t.objectQuery).toBeTruthy();
      expect(t.stateQuery).toBeTruthy();
      // 영어 쿼리여야 함
      expect(t.actionQuery).toMatch(/[a-zA-Z]/);
    });
  });

  it('존재하지 않는 절차는 빈 배열 반환', () => {
    const templates = getQueryTemplates('nonexistent');
    expect(templates).toEqual([]);
  });

  it('모든 절차에 대해 쿼리 생성 가능', () => {
    const procedureIds = [
      'appendix-1', 'appendix-2', 'appendix-3', 'appendix-4',
      'appendix-5', 'appendix-6', 'appendix-7', 'appendix-8',
    ];
    procedureIds.forEach(id => {
      const templates = getQueryTemplates(id);
      expect(templates.length).toBeGreaterThan(0);
    });
  });
});

describe('getHpoQueries', () => {
  it('11개 HPO 도구에 대한 검색 쿼리 반환', () => {
    const queries = getHpoQueries();
    expect(queries.length).toBe(11);
    queries.forEach(q => {
      expect(q.toolId).toBeTruthy();
      expect(q.searchQuery).toBeTruthy();
      expect(q.searchQuery).toMatch(/[a-zA-Z]/);
      expect(['fundamental', 'conditional']).toContain(q.category);
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/dohan/poc12labs && npx jest src/__tests__/pov-query-templates.test.ts --no-cache 2>&1 | tail -5`
Expected: FAIL

- [ ] **Step 3: 쿼리 템플릿 구현**

`src/lib/pov-query-templates.ts`를 생성한다. 파일이 길기 때문에 핵심 구조만 보여준다. 실제 구현 시 `pov-standards.ts`의 각 절차 단계를 읽어서 영어 쿼리를 매핑해야 한다.

```typescript
// src/lib/pov-query-templates.ts
import type { StepQueryTemplate } from './types';
import { HPO_PROCEDURES, HPO_TOOLS } from './pov-standards';

interface HpoQuery {
  toolId: string;
  toolName: string;
  category: 'fundamental' | 'conditional';
  searchQuery: string;
}

/**
 * SOP 단계 → 영어 자연어 쿼리 변환 규칙:
 * 1. 밸브 조작: "hand turning/opening/closing valve handle" + 장비ID
 * 2. 계기 확인: "looking at gauge/display/indicator" + 장비ID
 * 3. 펌프 기동/정지: "pressing start/stop button on pump control panel"
 * 4. 기록 작성: "writing on checklist/clipboard"
 * 5. 상태 확인: "checking equipment status indicator/label"
 */

// 공통 행동 패턴을 장비 유형별로 매핑
const ACTION_PATTERNS: Record<string, { action: string; object: string; state: (s: string) => string }> = {
  valve: {
    action: 'hand turning valve handle',
    object: 'valve with label',
    state: (s: string) => s === '열림' ? 'valve indicator showing open position' : 'valve indicator showing closed position',
  },
  pump: {
    action: 'pressing pump control button on panel',
    object: 'pump control panel',
    state: (s: string) => s === '기동중' ? 'pump running indicator light on' : 'pump stopped indicator light off',
  },
  tank: {
    action: 'looking at tank level gauge display',
    object: 'tank level indicator',
    state: (s: string) => `tank level display showing ${s}`,
  },
  gauge: {
    action: 'checking gauge reading on instrument panel',
    object: 'pressure/temperature gauge',
    state: (s: string) => `gauge needle pointing to ${s}`,
  },
  switch: {
    action: 'flipping switch on control panel',
    object: 'control switch',
    state: (s: string) => s === 'ON' ? 'switch in on position' : 'switch in off position',
  },
};

/**
 * 장비 ID에서 장비 유형 추론
 */
function inferEquipmentType(equipmentId: string): string {
  if (!equipmentId) return 'gauge';
  const upper = equipmentId.toUpperCase();
  if (upper.startsWith('VG') || upper.startsWith('V-') || upper.includes('밸브')) return 'valve';
  if (upper.startsWith('P-') || upper.includes('펌프') || upper.includes('PUMP')) return 'pump';
  if (upper.startsWith('TK') || upper.includes('탱크') || upper.includes('TANK')) return 'tank';
  if (upper.includes('SW') || upper.includes('스위치')) return 'switch';
  return 'gauge';
}

/**
 * 단일 SOP 단계를 영어 쿼리 템플릿으로 변환
 */
function buildQueryTemplate(
  stepId: string,
  sopText: string,
  equipmentId: string,
  expectedState: string
): StepQueryTemplate {
  const type = inferEquipmentType(equipmentId);
  const pattern = ACTION_PATTERNS[type] || ACTION_PATTERNS.gauge;
  const equipLabel = equipmentId || 'equipment';

  return {
    stepId,
    sopText,
    actionQuery: `${pattern.action} ${equipLabel}`,
    objectQuery: `${pattern.object} ${equipLabel}`,
    stateQuery: pattern.state(expectedState),
  };
}

/**
 * 절차 ID에 해당하는 모든 단계의 쿼리 템플릿 생성
 */
export function getQueryTemplates(procedureId: string): StepQueryTemplate[] {
  const procedure = HPO_PROCEDURES.find(p => p.id === procedureId);
  if (!procedure) return [];

  const templates: StepQueryTemplate[] = [];
  for (const section of procedure.sections) {
    for (const step of section.steps) {
      templates.push(buildQueryTemplate(
        step.id,
        step.description,
        step.equipmentId || '',
        step.expectedState || ''
      ));
    }
  }
  return templates;
}

/**
 * 11개 HPO 도구 검색 쿼리
 */
export function getHpoQueries(): HpoQuery[] {
  return HPO_TOOLS.map(tool => ({
    toolId: tool.id,
    toolName: tool.name,
    category: tool.category as 'fundamental' | 'conditional',
    searchQuery: tool.searchQueries?.[0] ||
      getDefaultHpoQuery(tool.id),
  }));
}

function getDefaultHpoQuery(toolId: string): string {
  const queryMap: Record<string, string> = {
    situationAwareness: 'operator scanning control panels and monitoring displays attentively',
    selfCheck: 'operator pausing before action and verbally confirming the step using STAR method',
    communication: 'operator speaking clearly into radio or communicating with colleague about procedure status',
    procedureCompliance: 'operator reading procedure document and following written steps carefully',
    preJobBriefing: 'group of operators gathered discussing the job plan before starting work',
    verificationTechnique: 'operator pointing at equipment label and verifying identification before operating',
    peerCheck: 'two operators together checking and confirming each other work at equipment',
    labeling: 'operator placing or checking identification tag label on equipment',
    stepMarkup: 'operator marking completed step on procedure checklist with pen',
    turnover: 'operator handoff briefing explaining status to incoming shift personnel',
    postJobReview: 'operators gathered after task completion reviewing what happened during the job',
  };
  return queryMap[toolId] || `operator performing ${toolId} technique`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/dohan/poc12labs && npx jest src/__tests__/pov-query-templates.test.ts --no-cache 2>&1 | tail -10`
Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pov-query-templates.ts src/__tests__/pov-query-templates.test.ts
git commit -m "feat(pov): SOP→영어 쿼리 템플릿 시스템 구현 + 테스트

장비유형 자동추론, 행동/물체/상태 3종 쿼리 생성,
11개 HPO 도구 검색 쿼리, 8개 절차 전체 지원"
```

---

## Task 5: 골드스탠다드 관리 모듈

**Files:**
- Create: `src/lib/pov-gold-standard.ts`
- Create: `data/gold-standards.json`

- [ ] **Step 1: JSON 저장소 초기화**

```json
// data/gold-standards.json
[]
```

- [ ] **Step 2: 골드스탠다드 모듈 구현**

```typescript
// src/lib/pov-gold-standard.ts
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import type { GoldStandard } from './types';

const DATA_PATH = path.join(process.cwd(), 'data', 'gold-standards.json');

function readStore(): GoldStandard[] {
  if (!existsSync(DATA_PATH)) return [];
  const raw = readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeStore(data: GoldStandard[]): void {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function listGoldStandards(procedureId?: string): GoldStandard[] {
  const all = readStore();
  if (procedureId) return all.filter(gs => gs.procedureId === procedureId);
  return all;
}

export function getGoldStandard(id: string): GoldStandard | null {
  return readStore().find(gs => gs.id === id) || null;
}

export function registerGoldStandard(
  procedureId: string,
  videoId: string,
  registeredBy: string,
  averageScore: number,
  segmentRange?: { start: number; end: number }
): GoldStandard {
  const store = readStore();
  const gs: GoldStandard = {
    id: `gs-${Date.now()}`,
    procedureId,
    videoId,
    registeredBy,
    registeredAt: new Date().toISOString(),
    segmentRange,
    averageScore,
  };
  store.push(gs);
  writeStore(store);
  return gs;
}

export function deleteGoldStandard(id: string): boolean {
  const store = readStore();
  const idx = store.findIndex(gs => gs.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  writeStore(store);
  return true;
}

export function updateGoldStandardEmbeddings(id: string, embeddings: number[][]): boolean {
  const store = readStore();
  const gs = store.find(g => g.id === id);
  if (!gs) return false;
  gs.embeddings = embeddings;
  writeStore(store);
  return true;
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pov-gold-standard.ts data/gold-standards.json
git commit -m "feat(pov): 골드스탠다드 관리 모듈 (JSON 파일 기반 CRUD)"
```

---

## Task 6: TwelveLabs 서버 클라이언트 확장

**Files:**
- Modify: `src/lib/twelvelabs.ts`

- [ ] **Step 1: embedVideo 함수 추가**

`src/lib/twelvelabs.ts` 끝에 임베딩 함수를 추가한다:

```typescript
/**
 * 영상 세그먼트의 임베딩 벡터를 추출한다.
 */
export async function getVideoEmbedding(
  videoId: string,
  startSec: number,
  endSec: number
): Promise<number[]> {
  const res = await fetch(`${API_URL}/embed`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_id: videoId,
      video_embedding_scope: {
        start_offset_sec: startSec,
        end_offset_sec: endSec,
      },
    }),
  });
  if (!res.ok) throw new Error(`Embed API error: ${res.status}`);
  const data = await res.json();
  return data.video_embedding?.segments?.[0]?.embeddings_float ?? [];
}

/**
 * 영상 전체를 segmentSec 간격으로 나눠 임베딩 배열을 반환한다.
 */
export async function getSegmentedEmbeddings(
  videoId: string,
  durationSec: number,
  segmentSec: number = 10
): Promise<{ start: number; end: number; embedding: number[] }[]> {
  const segments: { start: number; end: number; embedding: number[] }[] = [];
  const promises: Promise<void>[] = [];

  for (let start = 0; start < durationSec; start += segmentSec) {
    const end = Math.min(start + segmentSec, durationSec);
    const idx = segments.length;
    segments.push({ start, end, embedding: [] });

    promises.push(
      getVideoEmbedding(videoId, start, end)
        .then(emb => { segments[idx].embedding = emb; })
        .catch(() => { segments[idx].embedding = []; })
    );

    // Rate limit: 최대 10개 병렬
    if (promises.length >= 10) {
      await Promise.allSettled(promises);
      promises.length = 0;
    }
  }
  if (promises.length > 0) await Promise.allSettled(promises);

  return segments;
}
```

- [ ] **Step 2: 빌드 검증**

Run: `cd /Users/dohan/poc12labs && npx tsc --noEmit 2>&1 | head -10`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/twelvelabs.ts
git commit -m "feat(pov): TwelveLabs 임베딩 API 클라이언트 함수 추가

getVideoEmbedding (단일 세그먼트), getSegmentedEmbeddings (전체 분할),
rate limit 고려한 병렬 처리 (최대 10개 동시)"
```

---

## Task 7: 분석 파이프라인 오케스트레이터

**Files:**
- Create: `src/lib/pov-analysis-engine.ts`

- [ ] **Step 1: 오케스트레이터 구현**

```typescript
// src/lib/pov-analysis-engine.ts
import type {
  AnalysisJob,
  DetectedStep,
  HandObjectEvent,
  HpoToolResult,
  EmbeddingComparison,
  SegmentSimilarity,
  PovEvaluationReport,
  FundamentalScore,
} from './types';
import { searchVideos, analyzeVideo, generateWithPrompt } from './twelvelabs';
import { getSegmentedEmbeddings } from './twelvelabs';
import { getQueryTemplates, getHpoQueries } from './pov-query-templates';
import { alignSequences } from './pov-dtw';
import {
  calculateProcedureScore,
  calculateHpoScore,
  calculateFundamentalsScore,
  calculateOverallScore,
  getGrade,
  applyGradeOverride,
} from './pov-scoring';
import { HPO_PROCEDURES } from './pov-standards';
import { getGoldStandard } from './pov-gold-standard';
import { TWELVELABS_INDEXES } from './constants';

// 인메모리 작업 저장소
const jobs = new Map<string, AnalysisJob>();

export function getJob(jobId: string): AnalysisJob | undefined {
  return jobs.get(jobId);
}

/**
 * 전체 분석 파이프라인을 시작한다.
 */
export async function startAnalysis(
  videoId: string,
  procedureId: string,
  goldStandardId?: string
): Promise<string> {
  const jobId = `pov-${Date.now()}`;
  const job: AnalysisJob = {
    id: jobId,
    videoId,
    procedureId,
    goldStandardId,
    status: 'analyzing',
    progress: 0,
    stages: {
      stepDetection: 'pending',
      handObject: 'pending',
      sequenceMatch: 'pending',
      hpoVerification: 'pending',
      embeddingComparison: 'pending',
      scoring: 'pending',
    },
  };
  jobs.set(jobId, job);

  // 비동기로 파이프라인 실행
  runPipeline(job).catch(err => {
    job.status = 'error';
    job.error = err.message;
  });

  return jobId;
}

async function runPipeline(job: AnalysisJob): Promise<void> {
  const procedure = HPO_PROCEDURES.find(p => p.id === job.procedureId);
  if (!procedure) throw new Error(`절차 ${job.procedureId}를 찾을 수 없습니다`);

  const indexId = TWELVELABS_INDEXES.pov;

  // 3A: SOP 단계 검출
  job.stages.stepDetection = 'running';
  job.progress = 10;
  const detectedSteps = await detectSteps(indexId, job.videoId, job.procedureId);
  job.stages.stepDetection = 'done';
  job.progress = 30;

  // 3B: 손-물체 분석 (3A 결과에 의존)
  job.stages.handObject = 'running';
  const handObjectEvents = await analyzeHandObjects(job.videoId, detectedSteps);
  job.stages.handObject = 'done';
  job.progress = 45;

  // 3C: 시퀀스 매칭 (3A 결과에 의존)
  job.stages.sequenceMatch = 'running';
  const allStepIds = procedure.sections.flatMap(s => s.steps.map(st => st.id));
  const criticalStepIds = new Set(
    procedure.sections.flatMap(s => s.steps.filter(st => st.isCritical).map(st => st.id))
  );
  const detectedIds = detectedSteps
    .filter(s => s.status === 'pass' || s.status === 'partial')
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(s => s.stepId);
  const alignment = alignSequences(allStepIds, detectedIds, criticalStepIds);
  job.stages.sequenceMatch = 'done';
  job.progress = 55;

  // 3D: HPO 도구 검증 (독립)
  job.stages.hpoVerification = 'running';
  const hpoResults = await verifyHpoTools(indexId, job.videoId);
  job.stages.hpoVerification = 'done';
  job.progress = 70;

  // 3E: 임베딩 비교 (골드스탠다드 있을 때만)
  let embeddingComparison: EmbeddingComparison | undefined;
  if (job.goldStandardId) {
    job.stages.embeddingComparison = 'running';
    embeddingComparison = await compareEmbeddings(job.videoId, job.goldStandardId);
    job.stages.embeddingComparison = 'done';
  } else {
    job.stages.embeddingComparison = 'done';
  }
  job.progress = 85;

  // 3F: 종합 스코어링
  job.stages.scoring = 'running';
  const totalSteps = allStepIds.length;
  const procedureScore = calculateProcedureScore(detectedSteps, totalSteps, alignment.criticalDeviations);
  const hpoScore = calculateHpoScore(hpoResults);

  // 기본수칙 점수: Pegasus 분석으로 5대 수칙 평가 (간략 구현)
  const fundamentalScores = await evaluateFundamentals(job.videoId);
  const fundamentalsScore = calculateFundamentalsScore(fundamentalScores);

  const similarityScore = embeddingComparison?.averageSimilarity
    ? Math.round(embeddingComparison.averageSimilarity * 100)
    : undefined;

  const overallScore = calculateOverallScore(procedureScore, hpoScore, fundamentalsScore, similarityScore);
  let grade = getGrade(overallScore);
  grade = applyGradeOverride(grade, alignment.criticalDeviations);

  // 리포트 조립
  const report: PovEvaluationReport = {
    id: `report-${Date.now()}`,
    procedureId: job.procedureId,
    procedureTitle: procedure.title,
    videoId: job.videoId,
    date: new Date().toISOString().split('T')[0],
    stepEvaluations: detectedSteps.map(s => ({
      stepId: s.stepId,
      description: '',
      status: s.status,
      confidence: Math.round(s.confidence * 100),
      timestamp: s.timestamp,
      note: s.status === 'fail' ? '검출되지 않음' : undefined,
    })),
    procedureComplianceScore: procedureScore,
    hpoEvaluations: hpoResults.map(r => ({
      toolId: r.toolId,
      toolName: r.toolName,
      applied: r.detected,
      score: Math.round(r.confidence * 100),
      evidence: r.detected
        ? `${r.detectionCount}회 검출 (${r.timestamps.map(t => formatTime(t)).join(', ')})`
        : '미검출',
    })),
    hpoOverallScore: hpoScore,
    fundamentalScores,
    overallScore,
    grade,
    deviations: alignment.deviations.map(d => ({
      stepId: d.stepIds[0],
      expected: d.type === 'skip' ? '수행' : '정상 순서',
      actual: d.description,
      severity: d.severity === 'critical' ? 'critical' : d.severity === 'major' ? 'high' : 'medium',
      timestamp: d.timestamp,
    })),
    strengths: generateStrengths(procedureScore, hpoResults, alignment),
    improvements: generateImprovements(alignment, hpoResults),
    summary: `전체 ${totalSteps}단계 중 ${detectedSteps.filter(s => s.status === 'pass').length}단계 정상 수행. ${alignment.deviations.length}건 이탈 탐지. 등급 ${grade}(${overallScore}점).`,
    // 새 필드
    handObjectEvents,
    sequenceAlignment: alignment,
    hpoResults,
    embeddingComparison,
    analysisMetadata: {
      analyzedAt: new Date().toISOString(),
      pipelineVersion: '1.0.0',
      totalApiCalls: detectedSteps.length + hpoResults.length + (embeddingComparison ? 20 : 0) + 5,
      processingTimeMs: 0,
    },
  };

  job.stages.scoring = 'done';
  job.result = report;
  job.status = 'complete';
  job.progress = 100;
}

// === 서브모듈 함수들 ===

async function detectSteps(
  indexId: string,
  videoId: string,
  procedureId: string
): Promise<DetectedStep[]> {
  const templates = getQueryTemplates(procedureId);
  const results: DetectedStep[] = [];

  // 배치 처리 (5개씩 병렬)
  for (let i = 0; i < templates.length; i += 5) {
    const batch = templates.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map(async template => {
        try {
          const searchResult = await searchVideos(indexId, template.actionQuery);
          // videoId에 해당하는 결과만 필터
          const match = searchResult?.data?.find(
            (r: { video_id: string }) => r.video_id === videoId
          );
          if (match && match.confidence >= 0.3) {
            return {
              stepId: template.stepId,
              status: match.confidence >= 0.6 ? 'pass' as const : 'partial' as const,
              confidence: match.confidence,
              timestamp: match.start || 0,
              endTime: match.end || 0,
              searchScore: match.score || match.confidence,
            };
          }
          // 보강 검색: objectQuery
          const objResult = await searchVideos(indexId, template.objectQuery);
          const objMatch = objResult?.data?.find(
            (r: { video_id: string }) => r.video_id === videoId
          );
          if (objMatch && objMatch.confidence >= 0.3) {
            return {
              stepId: template.stepId,
              status: objMatch.confidence >= 0.6 ? 'pass' as const : 'partial' as const,
              confidence: objMatch.confidence,
              timestamp: objMatch.start || 0,
              endTime: objMatch.end || 0,
              searchScore: objMatch.score || objMatch.confidence,
            };
          }
          return {
            stepId: template.stepId,
            status: 'fail' as const,
            confidence: 0,
            timestamp: 0,
            endTime: 0,
            searchScore: 0,
          };
        } catch {
          return {
            stepId: template.stepId,
            status: 'fail' as const,
            confidence: 0,
            timestamp: 0,
            endTime: 0,
            searchScore: 0,
          };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }
  return results;
}

async function analyzeHandObjects(
  videoId: string,
  detectedSteps: DetectedStep[]
): Promise<HandObjectEvent[]> {
  const passedSteps = detectedSteps.filter(s => s.status !== 'fail' && s.timestamp > 0);
  const events: HandObjectEvent[] = [];

  for (const step of passedSteps) {
    try {
      const prompt = `This is a first-person POV video of a nuclear power plant operator. For the segment from ${step.timestamp}s to ${step.endTime}s:
1. What tool or object is the operator holding? (e.g., wrench, checklist, bare hands, radio)
2. What equipment are they interacting with? (e.g., valve VG-003, pump panel, gauge display)
3. What was the equipment state before the action? (e.g., closed, off, normal)
4. What is the state after? (e.g., open, on, above threshold)
5. What type of action is this? (e.g., turn_valve, check_gauge, press_button, write_record)
Respond ONLY in JSON: {"heldObject":"...","targetEquipment":"...","stateBefore":"...","stateAfter":"...","actionType":"..."}`;

      const response = await generateWithPrompt(videoId, prompt);
      const parsed = parseHandObjectResponse(response, step);
      if (parsed) events.push(parsed);
    } catch {
      // 분석 실패 시 기본 이벤트
      events.push({
        stepId: step.stepId,
        timestamp: step.timestamp,
        endTime: step.endTime,
        heldObject: '미확인',
        targetEquipment: '미확인',
        actionType: 'unknown',
        stateBefore: '미확인',
        stateAfter: '미확인',
        matchesSOP: false,
        confidence: 0,
        rawDescription: '분석 실패',
      });
    }
  }
  return events;
}

function parseHandObjectResponse(raw: string, step: DetectedStep): HandObjectEvent | null {
  try {
    // JSON 블록 추출
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const data = JSON.parse(jsonMatch[0]);
    return {
      stepId: step.stepId,
      timestamp: step.timestamp,
      endTime: step.endTime,
      heldObject: data.heldObject || '미확인',
      targetEquipment: data.targetEquipment || '미확인',
      actionType: data.actionType || 'unknown',
      stateBefore: data.stateBefore || '미확인',
      stateAfter: data.stateAfter || '미확인',
      matchesSOP: true, // SOP 교차검증은 이후 추가
      confidence: step.confidence,
      rawDescription: raw,
    };
  } catch {
    return null;
  }
}

async function verifyHpoTools(indexId: string, videoId: string): Promise<HpoToolResult[]> {
  const queries = getHpoQueries();
  const results: HpoToolResult[] = [];

  for (let i = 0; i < queries.length; i += 5) {
    const batch = queries.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map(async q => {
        try {
          const searchResult = await searchVideos(indexId, q.searchQuery);
          const matches = searchResult?.data?.filter(
            (r: { video_id: string }) => r.video_id === videoId
          ) || [];
          return {
            toolId: q.toolId,
            toolName: q.toolName,
            category: q.category,
            detected: matches.length > 0 && matches[0].confidence >= 0.4,
            detectionCount: matches.length,
            timestamps: matches.map((m: { start: number }) => m.start || 0),
            confidence: matches[0]?.confidence || 0,
          };
        } catch {
          return {
            toolId: q.toolId,
            toolName: q.toolName,
            category: q.category,
            detected: false,
            detectionCount: 0,
            timestamps: [],
            confidence: 0,
          };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') results.push(result.value);
    }
  }
  return results;
}

async function compareEmbeddings(
  videoId: string,
  goldStandardId: string
): Promise<EmbeddingComparison | undefined> {
  const gs = getGoldStandard(goldStandardId);
  if (!gs) return undefined;

  try {
    // 양쪽 영상 임베딩 (10초 세그먼트, 최대 2분 가정)
    const durationSec = 120;
    const [traineeSegments, expertSegments] = await Promise.all([
      getSegmentedEmbeddings(videoId, durationSec, 10),
      gs.embeddings
        ? Promise.resolve(gs.embeddings.map((emb, i) => ({
            start: i * 10,
            end: (i + 1) * 10,
            embedding: emb,
          })))
        : getSegmentedEmbeddings(gs.videoId, durationSec, 10),
    ]);

    // 코사인 유사도 계산
    const pairs: SegmentSimilarity[] = [];
    const heatmap: number[] = [];

    for (let t = 0; t < traineeSegments.length; t++) {
      let maxSim = 0;
      let bestE = 0;
      for (let e = 0; e < expertSegments.length; e++) {
        const sim = cosineSimilarity(
          traineeSegments[t].embedding,
          expertSegments[e].embedding
        );
        if (sim > maxSim) {
          maxSim = sim;
          bestE = e;
        }
      }
      pairs.push({
        expertStart: expertSegments[bestE]?.start || 0,
        expertEnd: expertSegments[bestE]?.end || 0,
        traineeStart: traineeSegments[t].start,
        traineeEnd: traineeSegments[t].end,
        similarity: maxSim,
      });
      heatmap.push(maxSim);
    }

    const avg = heatmap.length > 0
      ? heatmap.reduce((a, b) => a + b, 0) / heatmap.length
      : 0;

    return {
      segmentPairs: pairs,
      averageSimilarity: Math.round(avg * 100) / 100,
      gapSegments: pairs.filter(p => p.similarity < 0.5),
      heatmapData: heatmap,
    };
  } catch {
    return undefined;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function evaluateFundamentals(videoId: string): Promise<FundamentalScore[]> {
  // Pegasus로 5대 기본수칙 평가 요청
  const prompt = `Evaluate this nuclear plant operator training video on 5 competencies. Score each 0-100:
1. Monitoring (감시): How well does the operator monitor displays and indicators?
2. Control (제어): How precise and deliberate are their control actions?
3. Conservative Bias (보수적 판단): Do they err on the side of caution?
4. Teamwork (팀워크): How well do they communicate and coordinate?
5. Knowledge (지식): Do they demonstrate understanding of systems?
Respond ONLY in JSON: {"monitoring":N,"control":N,"conservativeBias":N,"teamwork":N,"knowledge":N}`;

  try {
    const response = await generateWithPrompt(videoId, prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패');
    const data = JSON.parse(jsonMatch[0]);

    return [
      { id: 'monitor', name: '감시', score: data.monitoring || 50, grade: '', feedback: '' },
      { id: 'control', name: '제어', score: data.control || 50, grade: '', feedback: '' },
      { id: 'conservativeBias', name: '보수적 판단', score: data.conservativeBias || 50, grade: '', feedback: '' },
      { id: 'teamwork', name: '팀워크', score: data.teamwork || 50, grade: '', feedback: '' },
      { id: 'knowledge', name: '지식', score: data.knowledge || 50, grade: '', feedback: '' },
    ];
  } catch {
    return [
      { id: 'monitor', name: '감시', score: 50, grade: 'C', feedback: '평가 불가' },
      { id: 'control', name: '제어', score: 50, grade: 'C', feedback: '평가 불가' },
      { id: 'conservativeBias', name: '보수적 판단', score: 50, grade: 'C', feedback: '평가 불가' },
      { id: 'teamwork', name: '팀워크', score: 50, grade: 'C', feedback: '평가 불가' },
      { id: 'knowledge', name: '지식', score: 50, grade: 'C', feedback: '평가 불가' },
    ];
  }
}

function generateStrengths(
  procedureScore: number,
  hpoResults: HpoToolResult[],
  alignment: ReturnType<typeof alignSequences>
): string[] {
  const strengths: string[] = [];
  if (procedureScore >= 80) strengths.push('절차 준수율이 우수합니다');
  if (alignment.complianceScore >= 90) strengths.push('SOP 순서를 정확히 따랐습니다');
  const appliedFund = hpoResults.filter(r => r.category === 'fundamental' && r.detected);
  if (appliedFund.length >= 3) strengths.push(`기본 HPO 도구 ${appliedFund.length}종 적용`);
  if (strengths.length === 0) strengths.push('전반적인 절차 이해도가 확인됩니다');
  return strengths;
}

function generateImprovements(
  alignment: ReturnType<typeof alignSequences>,
  hpoResults: HpoToolResult[]
): string[] {
  const improvements: string[] = [];
  const skips = alignment.deviations.filter(d => d.type === 'skip');
  if (skips.length > 0) improvements.push(`${skips.length}개 단계 누락 — 반복 훈련 필요`);
  const swaps = alignment.deviations.filter(d => d.type === 'swap');
  if (swaps.length > 0) improvements.push(`${swaps.length}건 순서 오류 — SOP 순서 숙지 필요`);
  const missingFund = hpoResults.filter(r => r.category === 'fundamental' && !r.detected);
  if (missingFund.length > 0) {
    improvements.push(`기본 HPO 미적용: ${missingFund.map(r => r.toolName).join(', ')}`);
  }
  return improvements;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 2: 빌드 검증**

Run: `cd /Users/dohan/poc12labs && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음 (또는 기존과 동일)

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pov-analysis-engine.ts
git commit -m "feat(pov): AI 분석 파이프라인 오케스트레이터 구현

6단계 파이프라인: 단계검출→손물체→시퀀스매칭→HPO→임베딩→스코어링,
인메모리 작업 관리, 배치 병렬처리, 에러 복구"
```

---

## Task 8: API 라우트

**Files:**
- Create: `src/app/api/twelvelabs/pov-analyze/route.ts`
- Create: `src/app/api/twelvelabs/pov-analyze/status/route.ts`
- Create: `src/app/api/twelvelabs/gold-standard/route.ts`

- [ ] **Step 1: 분석 트리거 API**

```typescript
// src/app/api/twelvelabs/pov-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { startAnalysis } from '@/lib/pov-analysis-engine';

export async function POST(req: NextRequest) {
  try {
    const { videoId, procedureId, goldStandardId } = await req.json();

    if (!videoId || !procedureId) {
      return NextResponse.json(
        { error: 'videoId와 procedureId는 필수입니다' },
        { status: 400 }
      );
    }

    const jobId = await startAnalysis(videoId, procedureId, goldStandardId);

    return NextResponse.json({ jobId, status: 'analyzing' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '분석 시작 실패' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 진행 상태 API**

```typescript
// src/app/api/twelvelabs/pov-analyze/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/pov-analysis-engine';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'jobId 필요' }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: '작업을 찾을 수 없습니다' }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    stages: job.stages,
    result: job.status === 'complete' ? job.result : undefined,
    error: job.error,
  });
}
```

- [ ] **Step 3: 골드스탠다드 CRUD API**

```typescript
// src/app/api/twelvelabs/gold-standard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  listGoldStandards,
  registerGoldStandard,
  deleteGoldStandard,
} from '@/lib/pov-gold-standard';

export async function GET(req: NextRequest) {
  const procedureId = req.nextUrl.searchParams.get('procedureId') || undefined;
  const standards = listGoldStandards(procedureId);
  return NextResponse.json(standards);
}

export async function POST(req: NextRequest) {
  try {
    const { procedureId, videoId, registeredBy, averageScore, segmentRange } = await req.json();

    if (!procedureId || !videoId) {
      return NextResponse.json({ error: 'procedureId와 videoId 필수' }, { status: 400 });
    }

    const gs = registerGoldStandard(
      procedureId,
      videoId,
      registeredBy || '평가관',
      averageScore || 0,
      segmentRange
    );
    return NextResponse.json(gs);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '등록 실패' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id 필요' }, { status: 400 });
  }
  const deleted = deleteGoldStandard(id);
  return NextResponse.json({ deleted });
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/twelvelabs/pov-analyze/ src/app/api/twelvelabs/gold-standard/
git commit -m "feat(pov): 분석 트리거/상태 + 골드스탠다드 CRUD API 라우트"
```

---

## Task 9: 클라이언트 훅

**Files:**
- Create: `src/hooks/usePovAnalysis.ts`
- Create: `src/hooks/useGoldStandard.ts`

- [ ] **Step 1: 분석 파이프라인 훅**

```typescript
// src/hooks/usePovAnalysis.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import type { AnalysisJob, PovEvaluationReport } from '@/lib/types';

interface AnalysisState {
  jobId: string | null;
  status: AnalysisJob['status'] | 'idle';
  progress: number;
  stages: AnalysisJob['stages'] | null;
  report: PovEvaluationReport | null;
  error: string | null;
}

export function usePovAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    jobId: null,
    status: 'idle',
    progress: 0,
    stages: null,
    report: null,
    error: null,
  });
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 클린업
  useEffect(() => stopPolling, [stopPolling]);

  const startAnalysis = useCallback(async (
    videoId: string,
    procedureId: string,
    goldStandardId?: string
  ) => {
    stopPolling();
    setState({ jobId: null, status: 'analyzing', progress: 0, stages: null, report: null, error: null });

    try {
      const res = await fetch('/api/twelvelabs/pov-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, procedureId, goldStandardId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '분석 시작 실패');

      setState(prev => ({ ...prev, jobId: data.jobId }));

      // 3초 간격 폴링
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/twelvelabs/pov-analyze/status?jobId=${data.jobId}`);
          const statusData = await statusRes.json();

          setState(prev => ({
            ...prev,
            status: statusData.status,
            progress: statusData.progress,
            stages: statusData.stages,
            report: statusData.result || prev.report,
            error: statusData.error || null,
          }));

          if (statusData.status === 'complete' || statusData.status === 'error') {
            stopPolling();
          }
        } catch {
          // 폴링 실패는 무시, 다음 폴링에서 재시도
        }
      }, 3000);
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : '알 수 없는 오류',
      }));
    }
  }, [stopPolling]);

  return { ...state, startAnalysis, stopPolling };
}
```

- [ ] **Step 2: 골드스탠다드 훅**

```typescript
// src/hooks/useGoldStandard.ts
import { useState, useCallback } from 'react';
import type { GoldStandard } from '@/lib/types';

export function useGoldStandard() {
  const [standards, setStandards] = useState<GoldStandard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStandards = useCallback(async (procedureId?: string) => {
    setLoading(true);
    try {
      const url = procedureId
        ? `/api/twelvelabs/gold-standard?procedureId=${procedureId}`
        : '/api/twelvelabs/gold-standard';
      const res = await fetch(url);
      const data = await res.json();
      setStandards(data);
    } catch {
      setStandards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (
    procedureId: string,
    videoId: string,
    averageScore: number
  ) => {
    const res = await fetch('/api/twelvelabs/gold-standard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procedureId, videoId, averageScore }),
    });
    const gs = await res.json();
    setStandards(prev => [...prev, gs]);
    return gs as GoldStandard;
  }, []);

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/twelvelabs/gold-standard?id=${id}`, { method: 'DELETE' });
    setStandards(prev => prev.filter(gs => gs.id !== id));
  }, []);

  return { standards, loading, fetchStandards, register, remove };
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/hooks/usePovAnalysis.ts src/hooks/useGoldStandard.ts
git commit -m "feat(pov): 분석 파이프라인 + 골드스탠다드 클라이언트 훅

usePovAnalysis: 분석 트리거/폴링/상태 관리
useGoldStandard: CRUD + 로딩 상태"
```

---

## Task 10: AnalysisProgress 컴포넌트

**Files:**
- Create: `src/components/pov/AnalysisProgress.tsx`

- [ ] **Step 1: 분석 진행률 UI 구현**

```typescript
// src/components/pov/AnalysisProgress.tsx
'use client';
import type { AnalysisJob } from '@/lib/types';

interface Props {
  progress: number;
  stages: AnalysisJob['stages'] | null;
  status: string;
  error?: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  stepDetection: 'SOP 단계 검출',
  handObject: '손-물체 분석',
  sequenceMatch: '시퀀스 매칭',
  hpoVerification: 'HPO 도구 검증',
  embeddingComparison: '숙련도 비교',
  scoring: '종합 스코어링',
};

const STATUS_ICON: Record<string, string> = {
  pending: '○',
  running: '◉',
  done: '✓',
  error: '✗',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-zinc-500',
  running: 'text-amber-400 animate-pulse',
  done: 'text-emerald-400',
  error: 'text-red-400',
};

export default function AnalysisProgress({ progress, stages, status, error }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {/* 프로그레스 원형 */}
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor"
            className="text-zinc-800" strokeWidth="8" />
          <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor"
            className="text-amber-500 transition-all duration-500"
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${progress * 3.52} 352`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-zinc-100">{progress}%</span>
        </div>
      </div>

      <p className="text-zinc-400 text-sm">
        {status === 'error' ? 'AI 분석 중 오류 발생' : 'AI 분석 진행 중...'}
      </p>

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">{error}</p>
      )}

      {/* 단계별 상태 */}
      {stages && (
        <div className="w-full max-w-md space-y-2">
          {Object.entries(stages).map(([key, stageStatus]) => (
            <div key={key} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-900/50">
              <span className={`text-lg font-mono ${STATUS_COLOR[stageStatus]}`}>
                {STATUS_ICON[stageStatus]}
              </span>
              <span className={`text-sm ${stageStatus === 'running' ? 'text-zinc-100' : 'text-zinc-400'}`}>
                {STAGE_LABELS[key] || key}
              </span>
              {stageStatus === 'done' && (
                <span className="ml-auto text-xs text-emerald-500">완료</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/AnalysisProgress.tsx
git commit -m "feat(pov): 분석 진행률 UI — 원형 프로그레스 + 6단계 상태 표시"
```

---

## Task 11: StepsTimeline 컴포넌트

**Files:**
- Create: `src/components/pov/StepsTimeline.tsx`

- [ ] **Step 1: SOP 시퀀스 타임라인 구현**

```typescript
// src/components/pov/StepsTimeline.tsx
'use client';
import type { DetectedStep, SequenceAlignment, PovSopDeviation } from '@/lib/types';
import type { Procedure } from '@/lib/pov-standards';

interface Props {
  detectedSteps: DetectedStep[];
  alignment: SequenceAlignment;
  procedure: Procedure;
  videoDuration: number;
  onSeek: (time: number) => void;
}

const STATUS_STYLES = {
  pass: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', label: 'Pass' },
  partial: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400', label: 'Partial' },
  fail: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', label: 'Fail' },
  skipped: { bg: 'bg-zinc-500/20', border: 'border-zinc-500/40', text: 'text-zinc-400', label: 'Skip' },
};

export default function StepsTimeline({ detectedSteps, alignment, procedure, videoDuration, onSeek }: Props) {
  const stepMap = new Map(detectedSteps.map(s => [s.stepId, s]));
  const deviationMap = new Map<string, PovSopDeviation>();
  alignment.deviations.forEach(d => {
    d.stepIds.forEach(id => deviationMap.set(id, d));
  });

  const allSteps = procedure.sections.flatMap(s =>
    s.steps.map(step => ({
      ...step,
      sectionTitle: s.title,
      detected: stepMap.get(step.id),
      deviation: deviationMap.get(step.id),
    }))
  );

  return (
    <div className="space-y-1">
      {/* 헤더 */}
      <div className="grid grid-cols-[60px_180px_1fr_70px_60px_40px] gap-2 px-3 py-2 text-xs text-zinc-500 font-semibold border-b border-zinc-800">
        <span>단계</span>
        <span>설명</span>
        <span>타임라인</span>
        <span>상태</span>
        <span>신뢰도</span>
        <span>이탈</span>
      </div>

      {allSteps.map(step => {
        const detected = step.detected;
        const status = detected?.status || 'skipped';
        const style = STATUS_STYLES[status as keyof typeof STATUS_STYLES] || STATUS_STYLES.skipped;
        const hasDeviation = !!step.deviation;
        const rowBg = hasDeviation ? 'bg-red-500/5' : '';

        return (
          <div
            key={step.id}
            className={`grid grid-cols-[60px_180px_1fr_70px_60px_40px] gap-2 px-3 py-2 items-center
              rounded-md cursor-pointer hover:bg-zinc-800/50 transition-colors ${rowBg}`}
            onClick={() => detected?.timestamp && onSeek(detected.timestamp)}
          >
            {/* 단계 ID */}
            <span className={`text-xs font-mono font-bold ${hasDeviation ? 'text-red-300' : 'text-zinc-200'}`}>
              {step.id}
              {step.isCritical && <span className="text-amber-500 ml-1">★</span>}
            </span>

            {/* 설명 */}
            <span className="text-xs text-zinc-400 truncate">{step.description}</span>

            {/* 타임라인 바 */}
            <div className="relative h-5 bg-zinc-800/50 rounded">
              {detected && detected.timestamp > 0 && videoDuration > 0 && (
                <div
                  className={`absolute h-full rounded ${style.bg} border ${style.border}`}
                  style={{
                    left: `${(detected.timestamp / videoDuration) * 100}%`,
                    width: `${Math.max(((detected.endTime - detected.timestamp) / videoDuration) * 100, 1)}%`,
                  }}
                />
              )}
              {!detected?.timestamp && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] text-zinc-600 italic">검출 안됨</span>
                </div>
              )}
            </div>

            {/* 상태 배지 */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
              {style.label}
            </span>

            {/* 신뢰도 */}
            <span className={`text-xs ${style.text}`}>
              {detected?.confidence ? `${Math.round(detected.confidence * 100)}%` : '—'}
            </span>

            {/* 이탈 */}
            <span className="text-center">
              {hasDeviation && (
                <span className="text-red-400 text-sm" title={step.deviation!.description}>
                  ⚠
                </span>
              )}
            </span>
          </div>
        );
      })}

      {/* 이탈 요약 */}
      {alignment.deviations.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <p className="text-xs font-semibold text-red-400 mb-2">이탈 요약 ({alignment.deviations.length}건)</p>
          {alignment.deviations.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-zinc-400 py-1">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono
                ${d.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {d.type.toUpperCase()}
              </span>
              <span>{d.description}</span>
              {d.timestamp && (
                <button onClick={() => onSeek(d.timestamp!)}
                  className="text-blue-400 hover:underline ml-auto">
                  {Math.floor(d.timestamp / 60)}:{String(Math.floor(d.timestamp % 60)).padStart(2, '0')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/StepsTimeline.tsx
git commit -m "feat(pov): SOP 시퀀스 타임라인 컴포넌트

단계별 영상 구간 바, Pass/Fail/Partial/Skip 상태 배지,
이탈 하이라이트(SWAP/SKIP), 클릭→영상 시점 이동"
```

---

## Task 12: HandObjectTimeline 컴포넌트

**Files:**
- Create: `src/components/pov/HandObjectTimeline.tsx`

- [ ] **Step 1: 손-물체 타임라인 구현**

```typescript
// src/components/pov/HandObjectTimeline.tsx
'use client';
import { useState } from 'react';
import type { HandObjectEvent } from '@/lib/types';

interface Props {
  events: HandObjectEvent[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export default function HandObjectTimeline({ events, currentTime, onSeek }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<HandObjectEvent | null>(null);

  // 현재 시점에 해당하는 이벤트
  const activeEvent = events.find(e => currentTime >= e.timestamp && currentTime <= e.endTime);

  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const stats = {
    tools: new Set(events.map(e => e.heldObject).filter(o => o !== '미확인')).size,
    actions: events.length,
    stateChanges: events.filter(e => e.stateBefore !== e.stateAfter && e.stateBefore !== '미확인').length,
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 좌측: 현재 프레임 분석 */}
      <div className="space-y-4">
        {/* 오버레이 카드 */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-500 font-semibold mb-3">
            현재 프레임 분석 ({formatTime(currentTime)})
          </p>
          {activeEvent ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl">🖐️</p>
                <p className="text-[10px] text-amber-400 font-semibold">손에 든 것</p>
                <p className="text-sm text-zinc-200">{activeEvent.heldObject}</p>
              </div>
              <div>
                <p className="text-2xl">🎯</p>
                <p className="text-[10px] text-amber-400 font-semibold">조작 대상</p>
                <p className="text-sm text-zinc-200">{activeEvent.targetEquipment}</p>
              </div>
              <div>
                <p className="text-2xl">🔄</p>
                <p className="text-[10px] text-amber-400 font-semibold">상태 변화</p>
                <p className="text-sm text-zinc-200">
                  {activeEvent.stateBefore} → {activeEvent.stateAfter}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-4">이 시점에 검출된 상호작용 없음</p>
          )}
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-zinc-100">{stats.tools}</p>
            <p className="text-[9px] text-zinc-500">도구 종류</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-zinc-100">{stats.actions}</p>
            <p className="text-[9px] text-zinc-500">조작 이벤트</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-zinc-100">{stats.stateChanges}</p>
            <p className="text-[9px] text-zinc-500">상태 변화</p>
          </div>
        </div>
      </div>

      {/* 우측: 이벤트 타임라인 */}
      <div>
        <p className="text-xs text-zinc-500 font-semibold mb-2">손-물체 이벤트 타임라인</p>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2">
          {sortedEvents.map((event, i) => {
            const isActive = activeEvent === event;
            const borderColor = event.matchesSOP ? 'border-l-emerald-500' : 'border-l-red-500';
            const bg = isActive ? 'bg-amber-500/10' : event.matchesSOP ? 'bg-emerald-500/5' : 'bg-red-500/5';

            return (
              <div
                key={i}
                className={`grid grid-cols-[42px_1fr] gap-2 ${bg} border-l-2 ${borderColor}
                  pl-3 pr-2 py-2 rounded-r-md cursor-pointer hover:bg-zinc-800/50 transition-colors`}
                onClick={() => { onSeek(event.timestamp); setSelectedEvent(event); }}
              >
                <span className="text-[10px] text-zinc-500 font-mono">{formatTime(event.timestamp)}</span>
                <div>
                  <p className="text-xs text-zinc-200">
                    <strong>{event.heldObject}</strong> → {event.targetEquipment}
                  </p>
                  <p className={`text-[10px] ${event.matchesSOP ? 'text-emerald-400' : 'text-red-400'}`}>
                    {event.stateBefore} → {event.stateAfter}
                    {event.matchesSOP ? ' · SOP 일치' : ' · SOP 불일치'}
                  </p>
                </div>
              </div>
            );
          })}
          {sortedEvents.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-8">손-물체 이벤트가 검출되지 않았습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/HandObjectTimeline.tsx
git commit -m "feat(pov): 손-물체 타임라인 컴포넌트

현재 프레임 분석 오버레이, 이벤트 타임라인 스크롤,
SOP 일치/불일치 컬러 코딩, 통계 카드"
```

---

## Task 13: ComparisonView 컴포넌트

**Files:**
- Create: `src/components/pov/ComparisonView.tsx`

- [ ] **Step 1: 숙련자 비교 뷰 구현**

```typescript
// src/components/pov/ComparisonView.tsx
'use client';
import type { EmbeddingComparison, GoldStandard } from '@/lib/types';

interface Props {
  comparison?: EmbeddingComparison;
  goldStandard?: GoldStandard | null;
  onRegisterGoldStandard?: () => void;
}

export default function ComparisonView({ comparison, goldStandard, onRegisterGoldStandard }: Props) {
  if (!goldStandard || !comparison) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-4xl opacity-30">📊</div>
        <p className="text-zinc-400 text-sm">이 절차의 골드스탠다드 영상이 등록되지 않았습니다.</p>
        <p className="text-zinc-500 text-xs">숙련자 기준 영상을 등록하면 임베딩 유사도 비교가 가능합니다.</p>
        {onRegisterGoldStandard && (
          <button
            onClick={onRegisterGoldStandard}
            className="mt-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg
              text-amber-400 text-sm hover:bg-amber-500/20 transition-colors"
          >
            현재 영상을 골드스탠다드로 등록
          </button>
        )}
      </div>
    );
  }

  const { segmentPairs, averageSimilarity, gapSegments, heatmapData } = comparison;

  return (
    <div className="space-y-6">
      {/* 평균 유사도 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 font-semibold">임베딩 유사도 히트맵 (10초 세그먼트)</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">평균 유사도:</span>
          <span className={`text-lg font-bold ${
            averageSimilarity >= 0.8 ? 'text-emerald-400' :
            averageSimilarity >= 0.5 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {averageSimilarity.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 히트맵 바 */}
      <div>
        <div className="flex gap-0.5 h-8 rounded overflow-hidden">
          {heatmapData.map((sim, i) => (
            <div
              key={i}
              className="flex-1 transition-colors cursor-pointer hover:opacity-80"
              style={{ backgroundColor: getSimColor(sim) }}
              title={`${i * 10}s~${(i + 1) * 10}s · 유사도: ${sim.toFixed(2)}`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-zinc-600">0:00</span>
          <span className="text-[9px] text-zinc-600">
            {Math.floor((heatmapData.length * 10) / 60)}:{String((heatmapData.length * 10) % 60).padStart(2, '0')}
          </span>
        </div>

        {/* 범례 */}
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(16,185,129,0.7)' }} />
            <span className="text-[9px] text-zinc-500">높음 (&gt;0.8)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(245,158,11,0.5)' }} />
            <span className="text-[9px] text-zinc-500">중간 (0.5~0.8)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.5)' }} />
            <span className="text-[9px] text-zinc-500">격차 (&lt;0.5)</span>
          </div>
        </div>
      </div>

      {/* 격차 구간 목록 */}
      {gapSegments.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <p className="text-xs font-semibold text-red-400 mb-2">격차 구간 ({gapSegments.length}건)</p>
          <div className="space-y-1">
            {gapSegments.map((seg, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="font-mono text-red-300">
                  {formatTime(seg.traineeStart)}~{formatTime(seg.traineeEnd)}
                </span>
                <span>유사도 {seg.similarity.toFixed(2)}</span>
                <span className="text-zinc-600">
                  (숙련자 {formatTime(seg.expertStart)}~{formatTime(seg.expertEnd)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getSimColor(sim: number): string {
  if (sim >= 0.8) return `rgba(16,185,129,${0.3 + sim * 0.5})`;
  if (sim >= 0.5) return `rgba(245,158,11,${0.2 + sim * 0.4})`;
  return `rgba(239,68,68,${0.2 + sim * 0.4})`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/ComparisonView.tsx
git commit -m "feat(pov): 숙련자 비교 뷰 — 유사도 히트맵 + 격차 구간 목록

골드스탠다드 미등록 시 등록 안내, 히트맵 바 시각화,
녹/황/적 컬러 매핑, 격차 구간 클릭 연동"
```

---

## Task 14: GoldStandardManager 컴포넌트

**Files:**
- Create: `src/components/pov/GoldStandardManager.tsx`

- [ ] **Step 1: 골드스탠다드 관리 UI 구현**

```typescript
// src/components/pov/GoldStandardManager.tsx
'use client';
import { useEffect } from 'react';
import { useGoldStandard } from '@/hooks/useGoldStandard';
import type { GoldStandard } from '@/lib/types';

interface Props {
  procedureId: string;
  currentVideoId?: string;
  currentScore?: number;
  onSelect: (gs: GoldStandard) => void;
}

export default function GoldStandardManager({ procedureId, currentVideoId, currentScore, onSelect }: Props) {
  const { standards, loading, fetchStandards, register, remove } = useGoldStandard();

  useEffect(() => {
    fetchStandards(procedureId);
  }, [procedureId, fetchStandards]);

  const handleRegister = async () => {
    if (!currentVideoId) return;
    const gs = await register(procedureId, currentVideoId, currentScore || 0);
    onSelect(gs);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 font-semibold">골드스탠다드 영상</p>
        {currentVideoId && currentScore && currentScore >= 85 && (
          <button
            onClick={handleRegister}
            className="text-[10px] px-2 py-1 bg-emerald-500/10 border border-emerald-500/30
              rounded text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            현재 영상을 기준으로 등록
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500">로딩 중...</p>
      ) : standards.length === 0 ? (
        <p className="text-xs text-zinc-500">등록된 골드스탠다드 없음</p>
      ) : (
        <div className="space-y-1.5">
          {standards.map(gs => (
            <div
              key={gs.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/50
                cursor-pointer hover:bg-zinc-800/50 transition-colors"
              onClick={() => onSelect(gs)}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div className="flex-1">
                <p className="text-xs text-zinc-200">점수 {gs.averageScore}점</p>
                <p className="text-[10px] text-zinc-500">
                  {new Date(gs.registeredAt).toLocaleDateString('ko-KR')} · {gs.registeredBy}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); remove(gs.id); }}
                className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/pov/GoldStandardManager.tsx
git commit -m "feat(pov): 골드스탠다드 관리 UI — 목록/등록/삭제/선택"
```

---

## Task 15: PovAnalysis.tsx 연동 — 데모→실제 분석

**Files:**
- Modify: `src/components/pov/PovAnalysis.tsx`

이 태스크는 기존 PovAnalysis.tsx의 데모 리포트 생성 로직을 실제 파이프라인으로 교체하고, 새 탭 컴포넌트를 연결한다. 파일이 크므로(869줄) 핵심 변경점만 서술한다.

- [ ] **Step 1: import 추가**

파일 상단에 새 import를 추가:

```typescript
import { usePovAnalysis } from '@/hooks/usePovAnalysis';
import AnalysisProgress from './AnalysisProgress';
import StepsTimeline from './StepsTimeline';
import HandObjectTimeline from './HandObjectTimeline';
import ComparisonView from './ComparisonView';
import GoldStandardManager from './GoldStandardManager';
```

- [ ] **Step 2: usePovAnalysis 훅 연결**

컴포넌트 내부에서 `usePovAnalysis` 훅을 사용하고, 기존 데모 리포트 생성 함수 호출을 파이프라인으로 교체:

```typescript
// 기존 demo report 생성 로직 대신:
const analysis = usePovAnalysis();

// "analyzing" phase에서 실제 분석 시작
// 기존 setTimeout(generateDemoReport, 2000) 부분을 교체:
const handleAnalyze = (videoId: string) => {
  analysis.startAnalysis(videoId, selectedProcedure!.id, selectedGoldStandard?.id);
};

// analysis.status가 'complete'이면 report phase로 전환, analysis.report를 사용
```

- [ ] **Step 3: analyzing phase UI 교체**

기존 로딩 스피너 대신 `AnalysisProgress` 컴포넌트 사용:

```typescript
// phase === 'analyzing' 분기 안:
<AnalysisProgress
  progress={analysis.progress}
  stages={analysis.stages}
  status={analysis.status}
  error={analysis.error}
/>
```

- [ ] **Step 4: report 탭에 새 컴포넌트 연결**

기존 4탭(Overview, Steps, HPO, Fundamentals)에 새 탭 2개를 추가하고, 기존 StepsTab을 StepsTimeline으로 교체:

```typescript
// 탭 목록 확장
const REPORT_TABS = [
  { id: 'overview', label: '종합' },
  { id: 'steps', label: '절차 타임라인' },
  { id: 'handObject', label: '손-물체' },
  { id: 'hpo', label: 'HPO' },
  { id: 'comparison', label: '숙련자 비교' },
  { id: 'fundamentals', label: '기본수칙' },
];

// 새 탭 렌더링:
{activeReportTab === 'steps' && report.sequenceAlignment && (
  <StepsTimeline
    detectedSteps={report.stepEvaluations.map(s => ({
      stepId: s.stepId, status: s.status, confidence: s.confidence / 100,
      timestamp: s.timestamp || 0, endTime: (s.timestamp || 0) + 10,
      searchScore: s.confidence / 100,
    }))}
    alignment={report.sequenceAlignment}
    procedure={selectedProcedure!}
    videoDuration={videoDuration}
    onSeek={handleSeek}
  />
)}

{activeReportTab === 'handObject' && (
  <HandObjectTimeline
    events={report.handObjectEvents || []}
    currentTime={currentTime}
    onSeek={handleSeek}
  />
)}

{activeReportTab === 'comparison' && (
  <ComparisonView
    comparison={report.embeddingComparison}
    goldStandard={selectedGoldStandard}
    onRegisterGoldStandard={handleRegisterGoldStandard}
  />
)}
```

- [ ] **Step 5: 골드스탠다드 선택 UI 추가**

upload phase에 골드스탠다드 선택 패널 추가:

```typescript
// upload phase의 적절한 위치에:
<GoldStandardManager
  procedureId={selectedProcedure!.id}
  currentVideoId={uploadResult?.videoId}
  currentScore={report?.overallScore}
  onSelect={(gs) => setSelectedGoldStandard(gs)}
/>
```

- [ ] **Step 6: 빌드 검증**

Run: `cd /Users/dohan/poc12labs && npm run build 2>&1 | tail -20`
Expected: 빌드 성공 (또는 기존 경고만)

- [ ] **Step 7: 커밋**

```bash
git add src/components/pov/PovAnalysis.tsx
git commit -m "feat(pov): PovAnalysis 실제 분석 파이프라인 연동

데모→실제 TwelveLabs 분석 교체, AnalysisProgress/StepsTimeline/
HandObjectTimeline/ComparisonView/GoldStandardManager 통합,
6탭 리포트(종합/절차/손물체/HPO/비교/기본수칙)"
```

---

## Task 16: PovReviewSession 강화 — 오버라이드 + 모범사례

**Files:**
- Modify: `src/components/pov/PovReviewSession.tsx`

- [ ] **Step 1: AI 판정 오버라이드 기능 추가**

기존 PovReviewSession에 다음 기능을 추가:

1. 각 단계의 Pass/Fail 상태를 평가관이 수정할 수 있는 드롭다운
2. 수정 사유를 기록하는 텍스트 입력
3. 신뢰도 0.6 미만 항목을 상단에 표시하여 우선 검토 유도

```typescript
// 기존 feedbacks state 옆에 추가:
const [overrides, setOverrides] = useState<Record<string, {
  originalStatus: string;
  newStatus: string;
  reason: string;
}>>({});

const handleOverride = (stepId: string, newStatus: string, reason: string) => {
  setOverrides(prev => ({
    ...prev,
    [stepId]: {
      originalStatus: report.stepEvaluations.find(s => s.stepId === stepId)?.status || '',
      newStatus,
      reason,
    },
  }));
};
```

- [ ] **Step 2: 모범사례 등록 버튼 추가**

리뷰 세션 하단에 "골드스탠다드로 등록" 버튼을 추가. 등급 A 이상이면 자동 추천 배지 표시:

```typescript
// 리뷰 세션 하단:
{report.overallScore >= 85 && (
  <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-emerald-400 font-semibold">모범사례 등록 추천</p>
        <p className="text-xs text-zinc-400">이 영상은 등급 {report.grade}로 골드스탠다드 후보입니다.</p>
      </div>
      <button
        onClick={handleRegisterGoldStandard}
        className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40
          rounded-lg text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
      >
        골드스탠다드로 등록
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3: 빌드 검증**

Run: `cd /Users/dohan/poc12labs && npm run build 2>&1 | tail -10`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add src/components/pov/PovReviewSession.tsx
git commit -m "feat(pov): 디브리핑 세션 강화 — AI 판정 오버라이드 + 모범사례 등록

단계별 상태 수정 + 사유 기록, 저신뢰도 우선 표시,
등급 A+ 자동 추천 → 골드스탠다드 등록 원클릭"
```

---

## Task 17: 통합 테스트 + 빌드 검증

**Files:** 전체 프로젝트

- [ ] **Step 1: 전체 단위 테스트 실행**

Run: `cd /Users/dohan/poc12labs && npx jest --passWithNoTests 2>&1 | tail -15`
Expected: 모든 테스트 PASS

- [ ] **Step 2: TypeScript 빌드 검증**

Run: `cd /Users/dohan/poc12labs && npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: Next.js 빌드**

Run: `cd /Users/dohan/poc12labs && npm run build 2>&1 | tail -20`
Expected: 빌드 성공

- [ ] **Step 4: 개발 서버 기동 확인**

Run: `cd /Users/dohan/poc12labs && timeout 10 npm run dev 2>&1 | head -10`
Expected: "Ready" 메시지

- [ ] **Step 5: 최종 커밋 (필요 시)**

모든 테스트/빌드 통과 확인 후, 미커밋 파일이 있으면 정리.

```bash
git status
# 필요 시:
git add -A && git commit -m "chore(pov): 통합 빌드 검증 완료"
```
