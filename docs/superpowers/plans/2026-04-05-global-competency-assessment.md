# 글로벌 수준 역량진단 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KHNP 리더십코칭 역량진단을 글로벌 수준(Korn Ferry/DDI/Hogan급)으로 고도화 — 10개 기능 갭을 7개 독립 모듈 + 5개 공유 인프라로 구현

**Architecture:** 마이크로 모듈 아키텍처. 각 모듈(`src/lib/<module>/`)이 독립적으로 동작하며, 공유 인프라(`assessment-store`, `statistics`, `audit-logger`, `hr-connector`)를 통해서만 통신. UI는 기존 리더십코칭 탭의 5단계 워크플로우로 확장.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Dexie.js (IndexedDB), Vitest, TwelveLabs API v1.3, Solar Pro 2 API

**Spec:** `docs/superpowers/specs/2026-04-05-global-competency-assessment-design.md`

---

## Task 0: 개발 환경 설정 (Vitest + Dexie.js)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/setup.ts`

- [ ] **Step 1: Vitest + Dexie.js 설치**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install dexie
```

- [ ] **Step 2: Vitest 설정 파일 생성**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/lib/__tests__/setup.ts"],
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: 테스트 셋업 파일 생성**

```typescript
// src/lib/__tests__/setup.ts
import "fake-indexeddb/auto";
```

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 4: package.json에 test 스크립트 추가**

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 테스트 실행 확인**

```bash
npm test
```
Expected: No tests found (아직 테스트 파일 없음), 에러 없이 종료

- [ ] **Step 6: 커밋**

```bash
git add vitest.config.ts src/lib/__tests__/setup.ts package.json package-lock.json
git commit -m "chore: Vitest + Dexie.js + fake-indexeddb 개발 환경 설정"
```

---

## Task 1: statistics/ — 통계 유틸리티 모듈

**Files:**
- Create: `src/lib/statistics/descriptive.ts`
- Create: `src/lib/statistics/reliability.ts`
- Create: `src/lib/statistics/dif.ts`
- Create: `src/lib/statistics/index.ts`
- Create: `src/lib/statistics/__tests__/descriptive.test.ts`
- Create: `src/lib/statistics/__tests__/reliability.test.ts`
- Create: `src/lib/statistics/__tests__/dif.test.ts`

### Step 1-4: descriptive.ts (기술 통계)

- [ ] **Step 1: 기술 통계 테스트 작성**

```typescript
// src/lib/statistics/__tests__/descriptive.test.ts
import { describe, it, expect } from "vitest";
import { mean, standardDeviation, percentile, cohenD, pearsonR } from "../descriptive";

describe("descriptive statistics", () => {
  const data = [2, 4, 4, 4, 5, 5, 7, 9];

  it("mean", () => {
    expect(mean(data)).toBe(5);
  });

  it("standardDeviation (population)", () => {
    // SD = sqrt(sum((x-mean)^2)/N) = sqrt(32/8) = 2
    expect(standardDeviation(data)).toBeCloseTo(2, 5);
  });

  it("percentile", () => {
    expect(percentile(data, 50)).toBeCloseTo(4.5, 1);
    expect(percentile(data, 25)).toBeCloseTo(4, 1);
    expect(percentile(data, 75)).toBeCloseTo(6, 1);
  });

  it("cohenD", () => {
    const g1 = [2, 3, 4, 5, 6];
    const g2 = [4, 5, 6, 7, 8];
    // mean diff = 2, pooled SD ~= 1.58 → d ~= 1.26
    const d = cohenD(g1, g2);
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(1.5);
  });

  it("pearsonR", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    expect(pearsonR(x, y)).toBeCloseTo(1.0, 5);
  });

  it("empty array returns 0", () => {
    expect(mean([])).toBe(0);
    expect(standardDeviation([])).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/lib/statistics/__tests__/descriptive.test.ts
```
Expected: FAIL — 모듈 없음

- [ ] **Step 3: descriptive.ts 구현**

```typescript
// src/lib/statistics/descriptive.ts

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function sampleStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function cohenD(group1: number[], group2: number[]): number {
  const m1 = mean(group1);
  const m2 = mean(group2);
  const sd1 = sampleStandardDeviation(group1);
  const sd2 = sampleStandardDeviation(group2);
  const pooledSD = Math.sqrt(
    ((group1.length - 1) * sd1 ** 2 + (group2.length - 1) * sd2 ** 2) /
    (group1.length + group2.length - 2)
  );
  if (pooledSD === 0) return 0;
  return Math.abs(m1 - m2) / pooledSD;
}

export function pearsonR(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx ** 2;
    dy2 += dy ** 2;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

export function percentiles(values: number[]): {
  p10: number; p25: number; p50: number; p75: number; p90: number;
  mean: number; sd: number;
} {
  return {
    p10: percentile(values, 10),
    p25: percentile(values, 25),
    p50: percentile(values, 50),
    p75: percentile(values, 75),
    p90: percentile(values, 90),
    mean: mean(values),
    sd: sampleStandardDeviation(values),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/lib/statistics/__tests__/descriptive.test.ts
```
Expected: PASS 전체

### Step 5-8: reliability.ts (신뢰도 계산)

- [ ] **Step 5: 신뢰도 테스트 작성**

```typescript
// src/lib/statistics/__tests__/reliability.test.ts
import { describe, it, expect } from "vitest";
import { cronbachAlpha, icc21, itemTotalCorrelation } from "../reliability";

describe("reliability", () => {
  // 4명 피평가자 × 3개 역량 점수
  const itemScores = [
    [7, 8, 6],  // 피평가자1
    [5, 6, 5],  // 피평가자2
    [8, 9, 7],  // 피평가자3
    [4, 5, 4],  // 피평가자4
  ];

  it("cronbachAlpha: 높은 내적 일관성", () => {
    const alpha = cronbachAlpha(itemScores);
    // 이 데이터는 상관이 높으므로 alpha > 0.8
    expect(alpha).toBeGreaterThan(0.8);
    expect(alpha).toBeLessThanOrEqual(1.0);
  });

  it("cronbachAlpha: 단일 항목이면 0", () => {
    expect(cronbachAlpha([[1], [2], [3]])).toBe(0);
  });

  it("icc21: AI vs 인간 일치도", () => {
    const rater1 = [7, 5, 8, 4, 6]; // AI
    const rater2 = [6, 5, 7, 4, 7]; // 인간
    const result = icc21(rater1, rater2);
    expect(result.value).toBeGreaterThan(0.5);
    expect(result.value).toBeLessThanOrEqual(1.0);
    expect(result.ci95[0]).toBeLessThan(result.value);
    expect(result.ci95[1]).toBeGreaterThan(result.value);
  });

  it("itemTotalCorrelation", () => {
    const r = itemTotalCorrelation(itemScores, 0);
    expect(r).toBeGreaterThan(0.5);
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

```bash
npx vitest run src/lib/statistics/__tests__/reliability.test.ts
```
Expected: FAIL

- [ ] **Step 7: reliability.ts 구현**

```typescript
// src/lib/statistics/reliability.ts
import { mean, sampleStandardDeviation, pearsonR } from "./descriptive";

/**
 * Cronbach's α — 내적 일관성 신뢰도
 * itemScores: N명 × K개 항목 점수 (2D 배열)
 */
export function cronbachAlpha(itemScores: number[][]): number {
  const n = itemScores.length; // 피평가자 수
  if (n < 2) return 0;
  const k = itemScores[0].length; // 항목 수
  if (k < 2) return 0;

  // 각 항목의 분산
  const itemVariances: number[] = [];
  for (let j = 0; j < k; j++) {
    const col = itemScores.map((row) => row[j]);
    itemVariances.push(sampleStandardDeviation(col) ** 2);
  }

  // 총점의 분산
  const totals = itemScores.map((row) => row.reduce((s, v) => s + v, 0));
  const totalVariance = sampleStandardDeviation(totals) ** 2;

  if (totalVariance === 0) return 0;

  const sumItemVariance = itemVariances.reduce((s, v) => s + v, 0);
  return (k / (k - 1)) * (1 - sumItemVariance / totalVariance);
}

/**
 * ICC(2,1) — 평가자간 신뢰도 (two-way random, single measures)
 * rater1, rater2: 동일 피평가자에 대한 두 평가자의 점수
 */
export function icc21(
  rater1: number[],
  rater2: number[]
): { value: number; ci95: [number, number] } {
  const n = rater1.length;
  if (n < 3) return { value: 0, ci95: [0, 0] };

  const k = 2; // 평가자 수
  // Two-way ANOVA 분해
  const grandMean = mean([...rater1, ...rater2]);

  // 피평가자 효과 (MSR)
  let SSR = 0;
  for (let i = 0; i < n; i++) {
    const subjectMean = (rater1[i] + rater2[i]) / k;
    SSR += k * (subjectMean - grandMean) ** 2;
  }
  const MSR = SSR / (n - 1);

  // 평가자 효과 (MSC)
  const rater1Mean = mean(rater1);
  const rater2Mean = mean(rater2);
  const SSC = n * ((rater1Mean - grandMean) ** 2 + (rater2Mean - grandMean) ** 2);
  const MSC = SSC / (k - 1);

  // 잔차 (MSE)
  let SSE = 0;
  for (let i = 0; i < n; i++) {
    const subjectMean = (rater1[i] + rater2[i]) / k;
    SSE += (rater1[i] - subjectMean - rater1Mean + grandMean) ** 2;
    SSE += (rater2[i] - subjectMean - rater2Mean + grandMean) ** 2;
  }
  const dfE = (n - 1) * (k - 1);
  const MSE = dfE > 0 ? SSE / dfE : 0;

  // ICC(2,1) = (MSR - MSE) / (MSR + (k-1)*MSE + k*(MSC-MSE)/n)
  const denom = MSR + (k - 1) * MSE + (k * (MSC - MSE)) / n;
  const iccValue = denom === 0 ? 0 : (MSR - MSE) / denom;

  // 95% CI (Shrout & Fleiss 근사)
  const F = MSR / MSE;
  const dfR = n - 1;
  // F 분포 근사 CI
  const FL = F / 3.84; // 대략적 하한 (정확한 F분포 대신 근사)
  const FU = F * 3.84;
  const ciLow = Math.max(0, (FL - 1) / (FL + k - 1));
  const ciHigh = Math.min(1, (FU - 1) / (FU + k - 1));

  return {
    value: Math.max(0, Math.min(1, iccValue)),
    ci95: [Math.max(0, ciLow), Math.min(1, ciHigh)],
  };
}

/**
 * 문항-전체 상관 (corrected item-total correlation)
 */
export function itemTotalCorrelation(itemScores: number[][], itemIndex: number): number {
  const n = itemScores.length;
  const k = itemScores[0].length;
  if (n < 3 || k < 2) return 0;

  const itemCol = itemScores.map((row) => row[itemIndex]);
  // 해당 항목 제외한 총점
  const restTotals = itemScores.map((row) =>
    row.reduce((s, v, j) => (j === itemIndex ? s : s + v), 0)
  );

  return pearsonR(itemCol, restTotals);
}

/**
 * 해당 항목 삭제 시 alpha
 */
export function alphaIfDeleted(itemScores: number[][], deleteIndex: number): number {
  const reduced = itemScores.map((row) => row.filter((_, j) => j !== deleteIndex));
  return cronbachAlpha(reduced);
}
```

- [ ] **Step 8: 테스트 통과 확인**

```bash
npx vitest run src/lib/statistics/__tests__/reliability.test.ts
```
Expected: PASS 전체

### Step 9-12: dif.ts (DIF 분석)

- [ ] **Step 9: DIF 테스트 작성**

```typescript
// src/lib/statistics/__tests__/dif.test.ts
import { describe, it, expect } from "vitest";
import { mantelHaenszel, fourFifthsRule } from "../dif";

describe("DIF analysis", () => {
  it("fourFifthsRule: 공정한 경우", () => {
    const result = fourFifthsRule({ male: 0.8, female: 0.75 });
    expect(result.ratio).toBeCloseTo(0.9375, 2);
    expect(result.impacted).toBe(false);
  });

  it("fourFifthsRule: 불리한 영향", () => {
    const result = fourFifthsRule({ male: 0.9, female: 0.6 });
    expect(result.ratio).toBeCloseTo(0.667, 2);
    expect(result.impacted).toBe(true);
  });

  it("mantelHaenszel: 기본 작동", () => {
    // 10명, 2그룹, 점수 0~9를 3등분 (low/mid/high)
    const responses = [7, 5, 8, 6, 4, 7, 3, 8, 5, 6]; // 특정 역량 점수
    const groupVar = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]; // 0=남, 1=여
    const scoreVar = [35, 28, 40, 32, 22, 36, 18, 39, 27, 31]; // 총점 (매칭용)

    const result = mantelHaenszel(responses, groupVar, scoreVar);
    expect(result.chi2).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeGreaterThan(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(["A", "B", "C"]).toContain(result.classification);
  });
});
```

- [ ] **Step 10: 테스트 실패 확인**

```bash
npx vitest run src/lib/statistics/__tests__/dif.test.ts
```
Expected: FAIL

- [ ] **Step 11: dif.ts 구현**

```typescript
// src/lib/statistics/dif.ts
import { mean } from "./descriptive";

/**
 * 4/5 규칙 (Adverse Impact)
 * passRates: 집단별 합격률 (예: { male: 0.8, female: 0.6 })
 */
export function fourFifthsRule(passRates: Record<string, number>): {
  ratio: number;
  impacted: boolean;
  referenceGroup: string;
  focalGroup: string;
} {
  const entries = Object.entries(passRates);
  if (entries.length < 2) return { ratio: 1, impacted: false, referenceGroup: "", focalGroup: "" };

  // 가장 높은 합격률 그룹 = reference
  entries.sort((a, b) => b[1] - a[1]);
  const [refGroup, refRate] = entries[0];
  const [focalGroup, focalRate] = entries[entries.length - 1];

  const ratio = refRate === 0 ? 0 : focalRate / refRate;
  return {
    ratio,
    impacted: ratio < 0.8,
    referenceGroup: refGroup,
    focalGroup: focalGroup,
  };
}

/**
 * Mantel-Haenszel DIF 분석 (간략화 버전)
 * responses: 특정 역량 점수 배열 (0-9)
 * groupVar: 집단 변수 (0 또는 1)
 * scoreVar: 총점 (매칭 변수)
 */
export function mantelHaenszel(
  responses: number[],
  groupVar: number[],
  scoreVar: number[]
): {
  chi2: number;
  pValue: number;
  deltaMH: number;
  classification: "A" | "B" | "C";
} {
  const n = responses.length;
  if (n < 6) return { chi2: 0, pValue: 1, deltaMH: 0, classification: "A" };

  // 총점 기준으로 3등분 (low/mid/high)
  const sorted = [...scoreVar].sort((a, b) => a - b);
  const t1 = sorted[Math.floor(n / 3)];
  const t2 = sorted[Math.floor((2 * n) / 3)];

  const strata = scoreVar.map((s) => (s <= t1 ? 0 : s <= t2 ? 1 : 2));

  // 각 층에서 2×2 테이블 구성 (고점/저점 × 집단0/집단1)
  // 중앙값 기준으로 고점/저점 분리
  const median = mean(responses);

  let numerator = 0;
  let denominator = 0;
  let alphaSum = 0;
  let alphaDenom = 0;

  for (let stratum = 0; stratum < 3; stratum++) {
    const idx = strata.map((s, i) => (s === stratum ? i : -1)).filter((i) => i >= 0);
    if (idx.length < 2) continue;

    const T = idx.length;
    // a = 집단0 & 고점, b = 집단0 & 저점, c = 집단1 & 고점, d = 집단1 & 저점
    let a = 0, b = 0, c = 0, d = 0;
    for (const i of idx) {
      const isGroup0 = groupVar[i] === 0;
      const isHigh = responses[i] >= median;
      if (isGroup0 && isHigh) a++;
      else if (isGroup0 && !isHigh) b++;
      else if (!isGroup0 && isHigh) c++;
      else d++;
    }

    const expectedA = ((a + b) * (a + c)) / T;
    numerator += a - expectedA;

    const varA = ((a + b) * (c + d) * (a + c) * (b + d)) / (T * T * (T - 1 || 1));
    denominator += varA;

    // Alpha MH
    alphaSum += (a * d) / (T || 1);
    alphaDenom += (b * c) / (T || 1);
  }

  const chi2 = denominator === 0 ? 0 : (Math.abs(numerator) - 0.5) ** 2 / denominator;

  // p-value 근사 (chi2 분포, df=1)
  const pValue = chi2 === 0 ? 1 : Math.exp(-chi2 / 2);

  // Delta MH = -2.35 * ln(alpha MH)
  const alphaMH = alphaDenom === 0 ? 1 : alphaSum / alphaDenom;
  const deltaMH = alphaMH <= 0 ? 0 : Math.abs(-2.35 * Math.log(alphaMH));

  // ETS 분류
  const classification: "A" | "B" | "C" =
    deltaMH < 1.0 ? "A" : deltaMH < 1.5 ? "B" : "C";

  return { chi2, pValue, deltaMH, classification };
}
```

- [ ] **Step 12: 테스트 통과 확인 + 커밋**

```bash
npx vitest run src/lib/statistics/
```
Expected: PASS 전체

```bash
git add src/lib/statistics/
git commit -m "feat: statistics 모듈 — 기술통계, 신뢰도(α/ICC), DIF 분석"
```

- [ ] **Step 13: index.ts 배럴 파일 생성**

```typescript
// src/lib/statistics/index.ts
export { mean, standardDeviation, sampleStandardDeviation, percentile, percentiles, cohenD, pearsonR } from "./descriptive";
export { cronbachAlpha, icc21, itemTotalCorrelation, alphaIfDeleted } from "./reliability";
export { mantelHaenszel, fourFifthsRule } from "./dif";
```

---

## Task 2: audit-logger/ — 감사 로깅 모듈

**Files:**
- Create: `src/lib/audit-logger/types.ts`
- Create: `src/lib/audit-logger/logger.ts`
- Create: `src/lib/audit-logger/index.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/audit-logger/types.ts

export type AuditAction =
  | "session_created"
  | "session_completed"
  | "consent_given"
  | "consent_revoked"
  | "video_uploaded"
  | "analysis_started"
  | "analysis_completed"
  | "score_generated"
  | "score_overridden"
  | "report_generated"
  | "report_exported"
  | "data_accessed"
  | "data_deleted"
  | "hr_data_imported"
  | "norm_calculated"
  | "fairness_analyzed";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: "system" | "evaluator" | "participant" | "admin";
  action: AuditAction;
  sessionId?: string;
  participantId?: string;
  details: Record<string, unknown>;
}
```

- [ ] **Step 2: logger.ts 생성**

```typescript
// src/lib/audit-logger/logger.ts
import type { AuditEntry, AuditAction } from "./types";

// 메모리 버퍼 — assessment-store 연결 전까지 임시 저장
let buffer: AuditEntry[] = [];
let persistFn: ((entry: AuditEntry) => Promise<void>) | null = null;

export function setAuditPersistence(fn: (entry: AuditEntry) => Promise<void>) {
  persistFn = fn;
  // 버퍼 플러시
  const pending = [...buffer];
  buffer = [];
  pending.forEach((e) => fn(e));
}

export function logAudit(
  action: AuditAction,
  actor: AuditEntry["actor"],
  details: Record<string, unknown> = {},
  sessionId?: string,
  participantId?: string
): AuditEntry {
  const entry: AuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    sessionId,
    participantId,
    details,
  };

  if (persistFn) {
    persistFn(entry);
  } else {
    buffer.push(entry);
  }

  return entry;
}

export function getBufferedEntries(): AuditEntry[] {
  return [...buffer];
}
```

- [ ] **Step 3: index.ts 배럴 + 커밋**

```typescript
// src/lib/audit-logger/index.ts
export type { AuditEntry, AuditAction } from "./types";
export { logAudit, setAuditPersistence, getBufferedEntries } from "./logger";
```

```bash
git add src/lib/audit-logger/
git commit -m "feat: audit-logger 모듈 — ISO 10667 감사 추적 인프라"
```

---

## Task 3: assessment-store/ — IndexedDB 영구 저장소

**Files:**
- Create: `src/lib/assessment-store/types.ts`
- Create: `src/lib/assessment-store/store.ts`
- Create: `src/lib/assessment-store/migrations.ts`
- Create: `src/lib/assessment-store/index.ts`
- Create: `src/lib/assessment-store/__tests__/store.test.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/assessment-store/types.ts
import type { AuditEntry } from "../audit-logger/types";

export interface DBSession {
  id: string;
  name: string;
  createdAt: string;
  completedAt?: string;
  status: "active" | "completed" | "archived";
  groupId?: string;
}

export interface DBParticipant {
  id: string;
  sessionId: string;
  employeeId?: string;
  name: string;
  jobLevel: number;
  demographics?: {
    gender?: string;
    ageGroup?: string;
    tenureGroup?: string;
    department?: string;
  };
}

export interface DBScore {
  id: string;
  sessionId: string;
  participantId: string;
  competencyKey: string;
  aiScore: number;
  humanScore?: number;
  finalScore?: number;
  rubricScores?: Record<string, number>;
  createdAt: string;
}

export interface DBConsent {
  id: string;
  participantId: string;
  sessionId: string;
  consentType: "video_recording" | "ai_analysis" | "data_retention" | "report_sharing";
  agreed: boolean;
  timestamp: string;
  version: string;
}

export interface DBBEIEvent {
  id: string;
  sessionId: string;
  participantId: string;
  competencyKey: string;
  star: {
    situation: { text: string; start: number; end: number };
    task: { text: string; start: number; end: number };
    action: { text: string; start: number; end: number };
    result: { text: string; start: number; end: number };
  };
  completeness: number;
  qualityScore: number;
  createdAt: string;
}

export interface DBDerailerProfile {
  id: string;
  sessionId: string;
  participantId: string;
  scenarioType: "normal" | "emergency";
  patterns: {
    id: string;
    name: string;
    riskLevel: "low" | "moderate" | "high" | "critical";
    score: number;
  }[];
  createdAt: string;
}

export interface DBCoachingFeedback {
  id: string;
  sessionId: string;
  participantId: string;
  strengths: { competencyKey: string; description: string }[];
  developmentAreas: { competencyKey: string; actionItems: string[] }[];
  createdAt: string;
}
```

- [ ] **Step 2: store.ts 구현 (Dexie.js)**

```typescript
// src/lib/assessment-store/store.ts
import Dexie, { type Table } from "dexie";
import type {
  DBSession, DBParticipant, DBScore, DBConsent,
  DBBEIEvent, DBDerailerProfile, DBCoachingFeedback,
} from "./types";
import type { AuditEntry } from "../audit-logger/types";

export class AssessmentDB extends Dexie {
  sessions!: Table<DBSession, string>;
  participants!: Table<DBParticipant, string>;
  scores!: Table<DBScore, string>;
  consents!: Table<DBConsent, string>;
  auditLog!: Table<AuditEntry, string>;
  beiEvents!: Table<DBBEIEvent, string>;
  derailerProfiles!: Table<DBDerailerProfile, string>;
  coachingFeedback!: Table<DBCoachingFeedback, string>;

  constructor() {
    super("khnp-assessment-db");

    this.version(1).stores({
      sessions: "id, status, createdAt",
      participants: "id, sessionId, employeeId, [sessionId+employeeId]",
      scores: "id, sessionId, participantId, competencyKey, [sessionId+participantId], [sessionId+competencyKey]",
      consents: "id, participantId, sessionId, [sessionId+participantId]",
      auditLog: "id, sessionId, action, timestamp",
      beiEvents: "id, sessionId, participantId, [sessionId+participantId]",
      derailerProfiles: "id, sessionId, participantId, [sessionId+participantId]",
      coachingFeedback: "id, sessionId, participantId, [sessionId+participantId]",
    });
  }
}

export const db = new AssessmentDB();

// CRUD 헬퍼
export async function addSession(session: DBSession) {
  return db.sessions.add(session);
}

export async function getSession(id: string) {
  return db.sessions.get(id);
}

export async function getAllSessions() {
  return db.sessions.orderBy("createdAt").reverse().toArray();
}

export async function addParticipant(participant: DBParticipant) {
  return db.participants.add(participant);
}

export async function getParticipantsBySession(sessionId: string) {
  return db.participants.where("sessionId").equals(sessionId).toArray();
}

export async function addScore(score: DBScore) {
  return db.scores.add(score);
}

export async function getScoresBySession(sessionId: string) {
  return db.scores.where("sessionId").equals(sessionId).toArray();
}

export async function getScoresByParticipant(sessionId: string, participantId: string) {
  return db.scores.where("[sessionId+participantId]").equals([sessionId, participantId]).toArray();
}

export async function getAllScores() {
  return db.scores.toArray();
}

export async function addConsent(consent: DBConsent) {
  return db.consents.add(consent);
}

export async function getConsentsBySession(sessionId: string) {
  return db.consents.where("sessionId").equals(sessionId).toArray();
}

export async function addAuditEntry(entry: AuditEntry) {
  return db.auditLog.add(entry);
}

export async function getAuditLogBySession(sessionId: string) {
  return db.auditLog.where("sessionId").equals(sessionId).sortBy("timestamp");
}

export async function addBEIEvent(event: DBBEIEvent) {
  return db.beiEvents.add(event);
}

export async function addDerailerProfile(profile: DBDerailerProfile) {
  return db.derailerProfiles.add(profile);
}

export async function addCoachingFeedback(feedback: DBCoachingFeedback) {
  return db.coachingFeedback.add(feedback);
}

// 전체 데이터 내보내기 (타당화/공정성 분석용)
export async function exportAllData() {
  const [sessions, participants, scores, consents] = await Promise.all([
    db.sessions.toArray(),
    db.participants.toArray(),
    db.scores.toArray(),
    db.consents.toArray(),
  ]);
  return { sessions, participants, scores, consents };
}
```

- [ ] **Step 3: 테스트 작성**

```typescript
// src/lib/assessment-store/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { db, addSession, getSession, getAllSessions, addScore, getScoresBySession } from "../store";

describe("assessment-store", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("세션 추가 및 조회", async () => {
    await addSession({ id: "s1", name: "테스트 세션", createdAt: "2026-04-05", status: "active" });
    const session = await getSession("s1");
    expect(session?.name).toBe("테스트 세션");
  });

  it("전체 세션 목록 (최신순)", async () => {
    await addSession({ id: "s1", name: "세션1", createdAt: "2026-04-01", status: "active" });
    await addSession({ id: "s2", name: "세션2", createdAt: "2026-04-05", status: "active" });
    const all = await getAllSessions();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("s2");
  });

  it("점수 추가 및 세션별 조회", async () => {
    await addScore({
      id: "sc1", sessionId: "s1", participantId: "p1",
      competencyKey: "visionPresentation", aiScore: 7, createdAt: "2026-04-05",
    });
    await addScore({
      id: "sc2", sessionId: "s1", participantId: "p1",
      competencyKey: "trustBuilding", aiScore: 6, createdAt: "2026-04-05",
    });
    const scores = await getScoresBySession("s1");
    expect(scores).toHaveLength(2);
  });
});
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/lib/assessment-store/
```
Expected: PASS

- [ ] **Step 5: migrations.ts (LocalStorage → IndexedDB)**

```typescript
// src/lib/assessment-store/migrations.ts
import { db, addSession, addScore } from "./store";
import type { DBSession, DBScore } from "./types";

const MIGRATION_KEY = "khnp-migration-v1-done";

export async function migrateFromLocalStorage(): Promise<{ migrated: boolean; count: number }> {
  if (typeof window === "undefined") return { migrated: false, count: 0 };
  if (localStorage.getItem(MIGRATION_KEY)) return { migrated: false, count: 0 };

  const raw = localStorage.getItem("khnp-group-sessions");
  if (!raw) {
    localStorage.setItem(MIGRATION_KEY, "true");
    return { migrated: false, count: 0 };
  }

  try {
    const sessions = JSON.parse(raw);
    if (!Array.isArray(sessions)) return { migrated: false, count: 0 };

    let count = 0;
    for (const session of sessions) {
      const dbSession: DBSession = {
        id: session.id,
        name: session.name || "마이그레이션 세션",
        createdAt: session.createdAt || new Date().toISOString(),
        status: "completed",
        groupId: session.id,
      };

      try {
        await addSession(dbSession);
        count++;
      } catch {
        // 이미 존재하면 건너뛰기
      }

      // 역량별 점수 마이그레이션
      if (session.competencies && Array.isArray(session.competencies)) {
        for (const comp of session.competencies) {
          if (!comp.memberScores) continue;
          for (const [memberId, scoreData] of Object.entries(comp.memberScores)) {
            const sd = scoreData as { overallScore?: number; bars?: Record<string, number>; analyzed?: boolean };
            if (!sd.analyzed) continue;
            const score: DBScore = {
              id: `mig-${session.id}-${memberId}-${comp.competencyKey}`,
              sessionId: session.id,
              participantId: memberId,
              competencyKey: comp.competencyKey,
              aiScore: sd.overallScore || 0,
              rubricScores: sd.bars,
              createdAt: session.createdAt || new Date().toISOString(),
            };
            try { await addScore(score); } catch { /* 중복 무시 */ }
          }
        }
      }
    }

    localStorage.setItem(MIGRATION_KEY, "true");
    return { migrated: true, count };
  } catch {
    return { migrated: false, count: 0 };
  }
}
```

- [ ] **Step 6: index.ts + 커밋**

```typescript
// src/lib/assessment-store/index.ts
export type { DBSession, DBParticipant, DBScore, DBConsent, DBBEIEvent, DBDerailerProfile, DBCoachingFeedback } from "./types";
export {
  db, addSession, getSession, getAllSessions,
  addParticipant, getParticipantsBySession,
  addScore, getScoresBySession, getScoresByParticipant, getAllScores,
  addConsent, getConsentsBySession,
  addAuditEntry, getAuditLogBySession,
  addBEIEvent, addDerailerProfile, addCoachingFeedback,
  exportAllData,
} from "./store";
export { migrateFromLocalStorage } from "./migrations";
```

```bash
git add src/lib/assessment-store/
git commit -m "feat: assessment-store 모듈 — IndexedDB 영구 저장 + LS 마이그레이션"
```

---

## Task 4: hr-connector/ — 인사 DB 연계 모듈

**Files:**
- Create: `src/lib/hr-connector/types.ts`
- Create: `src/lib/hr-connector/connector.ts`
- Create: `src/lib/hr-connector/masking.ts`
- Create: `src/lib/hr-connector/index.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/hr-connector/types.ts

export interface Employee {
  employeeId: string;
  name: string;
  department: string;
  jobLevel: number;
  gender?: string;
  ageGroup?: "20s" | "30s" | "40s" | "50s+";
  tenureYears?: number;
  hireDate?: string;
}

export interface HRConnectorConfig {
  mode: "csv" | "api" | "ldap";
  fieldMapping: Record<string, string>;
}

export interface HRImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  employees: Employee[];
}
```

- [ ] **Step 2: masking.ts 생성**

```typescript
// src/lib/hr-connector/masking.ts

export function maskName(name: string): string {
  if (name.length <= 1) return "*";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

export function maskEmployeeId(id: string): string {
  if (id.length <= 4) return "****";
  return id.slice(0, 2) + "*".repeat(id.length - 4) + id.slice(-2);
}

export function calculateAgeGroup(birthYear: number): "20s" | "30s" | "40s" | "50s+" {
  const age = new Date().getFullYear() - birthYear;
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  return "50s+";
}

export function calculateTenureYears(hireDate: string): number {
  const hire = new Date(hireDate);
  const now = new Date();
  return Math.floor((now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}
```

- [ ] **Step 3: connector.ts (CSV 파싱)**

```typescript
// src/lib/hr-connector/connector.ts
import type { Employee, HRConnectorConfig, HRImportResult } from "./types";
import { calculateTenureYears } from "./masking";

const DEFAULT_MAPPING: Record<string, string> = {
  employeeId: "사원번호",
  name: "성명",
  department: "부서",
  jobLevel: "직급",
  gender: "성별",
  hireDate: "입사일",
};

export function parseCSV(
  csvText: string,
  config?: Partial<HRConnectorConfig>
): HRImportResult {
  const mapping = { ...DEFAULT_MAPPING, ...config?.fieldMapping };
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return { success: false, imported: 0, errors: ["데이터 없음"], employees: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const employees: Employee[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    if (values.length < 3) {
      errors.push(`${i + 1}행: 필드 부족`);
      continue;
    }

    const getField = (key: string): string => {
      const header = mapping[key];
      const idx = headers.indexOf(header);
      return idx >= 0 ? values[idx] : "";
    };

    const employeeId = getField("employeeId");
    const name = getField("name");
    if (!employeeId || !name) {
      errors.push(`${i + 1}행: 사원번호 또는 성명 누락`);
      continue;
    }

    const hireDate = getField("hireDate");
    const jobLevelRaw = getField("jobLevel");
    const jobLevel = parseInt(jobLevelRaw) || inferJobLevel(jobLevelRaw);

    employees.push({
      employeeId,
      name,
      department: getField("department") || "미분류",
      jobLevel,
      gender: getField("gender") || undefined,
      hireDate: hireDate || undefined,
      tenureYears: hireDate ? calculateTenureYears(hireDate) : undefined,
    });
  }

  return {
    success: errors.length === 0,
    imported: employees.length,
    errors,
    employees,
  };
}

function inferJobLevel(raw: string): number {
  const map: Record<string, number> = {
    임원: 1, 부장: 2, 차장: 3, 과장: 3, 대리: 4, 사원: 4,
    "1직급": 1, "2직급": 2, "3직급": 3, "4직급": 4,
  };
  return map[raw] || 3;
}
```

- [ ] **Step 4: index.ts + 커밋**

```typescript
// src/lib/hr-connector/index.ts
export type { Employee, HRConnectorConfig, HRImportResult } from "./types";
export { parseCSV } from "./connector";
export { maskName, maskEmployeeId, calculateAgeGroup, calculateTenureYears } from "./masking";
```

```bash
git add src/lib/hr-connector/
git commit -m "feat: hr-connector 모듈 — CSV 인사DB 연동 + 개인정보 마스킹"
```

---

## Task 5: evidence/ — 증거 기반 설명 가능성 모듈

**Files:**
- Create: `src/lib/evidence/types.ts`
- Create: `src/lib/evidence/evidence-mapper.ts`
- Create: `src/lib/evidence/index.ts`
- Create: `src/app/api/evidence/map/route.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/evidence/types.ts

export interface EvidenceClip {
  rubricItemId: string;
  rubricItemText: string;
  videoTimestamp: { start: number; end: number };
  confidence: number;
  matchedText: string;
  searchQuery: string;
}

export interface EvidenceMap {
  competencyKey: string;
  score: number;
  clips: EvidenceClip[];
  coverageRate: number;
  overallConfidence: number;
}
```

- [ ] **Step 2: evidence-mapper.ts 생성**

```typescript
// src/lib/evidence/evidence-mapper.ts
import type { EvidenceClip, EvidenceMap } from "./types";

/**
 * 루브릭 기준 텍스트에서 검색 쿼리 변형 생성
 */
export function generateSearchQueries(rubricText: string): string[] {
  // 핵심 키워드 추출 (30자 이내 구간)
  const queries = [rubricText.slice(0, 60)];
  // 괄호 안 용어가 있으면 별도 쿼리
  const parenMatch = rubricText.match(/\(([^)]+)\)/);
  if (parenMatch) {
    queries.push(parenMatch[1]);
  }
  // 핵심 동사구 추출
  const verbPhrases = rubricText.match(/[가-힣]+(?:하|을|를|이|가)\s*[가-힣]+/g);
  if (verbPhrases && verbPhrases.length > 0) {
    queries.push(verbPhrases[0]);
  }
  return queries;
}

/**
 * TwelveLabs 검색 결과를 EvidenceClip으로 변환
 */
export function mapSearchResultToClip(
  rubricItemId: string,
  rubricItemText: string,
  searchQuery: string,
  result: { start: number; end: number; confidence: string; text?: string }
): EvidenceClip {
  return {
    rubricItemId,
    rubricItemText,
    videoTimestamp: { start: result.start, end: result.end },
    confidence: parseFloat(result.confidence) || 0,
    matchedText: result.text || "",
    searchQuery,
  };
}

/**
 * 중복 구간 제거 (5초 이내 겹침)
 */
export function deduplicateClips(clips: EvidenceClip[]): EvidenceClip[] {
  if (clips.length <= 1) return clips;
  const sorted = [...clips].sort((a, b) => a.videoTimestamp.start - b.videoTimestamp.start);
  const result: EvidenceClip[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];
    const overlap = prev.videoTimestamp.end - curr.videoTimestamp.start;
    if (overlap < 5) {
      result.push(curr);
    } else if (curr.confidence > prev.confidence) {
      result[result.length - 1] = curr;
    }
  }
  return result;
}

/**
 * 클립 목록을 EvidenceMap으로 조합
 */
export function buildEvidenceMap(
  competencyKey: string,
  score: number,
  rubricItemIds: string[],
  clips: EvidenceClip[],
  confidenceThreshold: number = 60
): EvidenceMap {
  const filtered = clips.filter((c) => c.confidence >= confidenceThreshold);
  const deduped = deduplicateClips(filtered);

  const coveredItems = new Set(deduped.map((c) => c.rubricItemId));
  const coverageRate = rubricItemIds.length > 0
    ? coveredItems.size / rubricItemIds.length
    : 0;

  const totalConfidence = deduped.length > 0
    ? deduped.reduce((s, c) => s + c.confidence, 0) / deduped.length
    : 0;

  return {
    competencyKey,
    score,
    clips: deduped,
    coverageRate,
    overallConfidence: totalConfidence,
  };
}
```

- [ ] **Step 3: API 라우트 생성**

```typescript
// src/app/api/evidence/map/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchVideos } from "@/lib/twelvelabs";
import { generateSearchQueries, mapSearchResultToClip, buildEvidenceMap } from "@/lib/evidence/evidence-mapper";

export async function POST(req: NextRequest) {
  try {
    const { videoId, indexId, competencyKey, score, rubricItems } = await req.json();

    if (!indexId || !competencyKey || !rubricItems?.length) {
      return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 });
    }

    const allClips: Array<{
      rubricItemId: string; rubricItemText: string;
      videoTimestamp: { start: number; end: number };
      confidence: number; matchedText: string; searchQuery: string;
    }> = [];

    for (const item of rubricItems) {
      const queries = generateSearchQueries(item.criteria);
      for (const query of queries) {
        try {
          const result = await searchVideos(indexId, query);
          if (result.data) {
            for (const r of result.data) {
              if (videoId && r.video_id !== videoId) continue;
              allClips.push(
                mapSearchResultToClip(item.id, item.criteria, query, {
                  start: r.start,
                  end: r.end,
                  confidence: r.confidence,
                })
              );
            }
          }
        } catch {
          // 개별 검색 실패 시 건너뛰기
        }
      }
    }

    const evidenceMap = buildEvidenceMap(competencyKey, score || 0, rubricItems.map((i: { id: string }) => i.id), allClips);
    return NextResponse.json(evidenceMap);
  } catch (error) {
    return NextResponse.json({ error: "증거 매핑 실패" }, { status: 500 });
  }
}
```

- [ ] **Step 4: index.ts + 커밋**

```typescript
// src/lib/evidence/index.ts
export type { EvidenceClip, EvidenceMap } from "./types";
export { generateSearchQueries, mapSearchResultToClip, deduplicateClips, buildEvidenceMap } from "./evidence-mapper";
```

```bash
git add src/lib/evidence/ src/app/api/evidence/
git commit -m "feat: evidence 모듈 — 루브릭↔영상구간 증거 매핑 + API"
```

---

## Task 6: derailer/ — 탈선 요인 탐지 모듈

**Files:**
- Create: `src/lib/derailer/types.ts`
- Create: `src/lib/derailer/derailer-patterns.ts`
- Create: `src/lib/derailer/derailer-detector.ts`
- Create: `src/lib/derailer/index.ts`
- Create: `src/app/api/derailer/analyze/route.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/derailer/types.ts

export interface DerailerEvidence {
  timestamp: { start: number; end: number };
  description: string;
  signal: "verbal" | "vocal" | "facial" | "postural";
}

export interface DerailerPattern {
  id: string;
  name: string;
  hoganScale: string;
  riskLevel: "low" | "moderate" | "high" | "critical";
  score: number;
  evidence: DerailerEvidence[];
  developmentTip: string;
}

export interface DerailerProfile {
  participantId: string;
  scenarioType: "normal" | "emergency";
  patterns: DerailerPattern[];
  topRisks: DerailerPattern[];
  overallRiskLevel: "low" | "moderate" | "high";
}
```

- [ ] **Step 2: derailer-patterns.ts (11개 패턴 정의)**

```typescript
// src/lib/derailer/derailer-patterns.ts

export interface DerailerDef {
  id: string;
  name: string;
  hoganScale: string;
  description: string;
  searchQueries: string[];
  emergencyWeight: number;
  normalWeight: number;
  developmentTip: string;
}

export const DERAILER_PATTERNS: DerailerDef[] = [
  {
    id: "bold",
    name: "과도한 지시형",
    hoganScale: "Bold",
    description: "비상 시 일방적 지시, 팀원 의견 무시",
    searchQueries: [
      "일방적으로 지시하는 장면",
      "팀원 발언을 차단하는 모습",
      "강압적인 어조로 명령",
    ],
    emergencyWeight: 1.5,
    normalWeight: 1.0,
    developmentTip: "팀원의 전문성을 인정하고, 지시 전 의견을 먼저 구하는 습관을 기르세요.",
  },
  {
    id: "cautious",
    name: "회피형",
    hoganScale: "Cautious",
    description: "의사결정 지연, 책임 회피, 상급자 의존",
    searchQueries: [
      "결정을 미루거나 회피하는 장면",
      "상급자에게 판단을 위임",
      "모호한 답변이나 망설임",
    ],
    emergencyWeight: 1.5,
    normalWeight: 1.0,
    developmentTip: "불완전한 정보 속에서도 적시에 판단하는 훈련이 필요합니다.",
  },
  {
    id: "excitable",
    name: "변덕형",
    hoganScale: "Excitable",
    description: "감정적 반응, 일관성 없는 지시 변경",
    searchQueries: [
      "감정적으로 반응하는 장면",
      "이전 지시를 번복",
      "목소리가 급격히 높아짐",
    ],
    emergencyWeight: 1.5,
    normalWeight: 1.0,
    developmentTip: "스트레스 상황에서 감정 조절 기법(심호흡, 일시 정지)을 활용하세요.",
  },
  {
    id: "reserved",
    name: "과잉신중형",
    hoganScale: "Reserved",
    description: "정보 공유 거부, 폐쇄적 소통",
    searchQueries: [
      "정보를 공유하지 않는 모습",
      "질문에 최소한으로만 답변",
      "팀원과 거리를 두는 태도",
    ],
    emergencyWeight: 1.0,
    normalWeight: 1.2,
    developmentTip: "정보의 적시 공유가 팀 안전에 직결됨을 인식하고, 능동적 공유를 실천하세요.",
  },
  {
    id: "arrogant",
    name: "독선형",
    hoganScale: "Arrogant",
    description: "자신의 판단만 고집, 피드백 거부",
    searchQueries: [
      "다른 의견을 무시하는 장면",
      "자신의 방식만 고집",
      "피드백을 거부하거나 방어적 반응",
    ],
    emergencyWeight: 1.0,
    normalWeight: 1.3,
    developmentTip: "팀원의 다양한 관점이 더 나은 의사결정으로 이어진다는 것을 경험적으로 학습하세요.",
  },
  {
    id: "colorful",
    name: "과시형",
    hoganScale: "Colorful",
    description: "과도한 자기 PR, 실질보다 외형 중시",
    searchQueries: [
      "자기 성과를 과도하게 강조",
      "본질보다 표현에 치중",
      "관심을 독점하려는 행동",
    ],
    emergencyWeight: 0.8,
    normalWeight: 1.0,
    developmentTip: "성과는 결과로 말하게 하고, 팀 기여를 부각하는 소통 방식을 연습하세요.",
  },
  {
    id: "leisurely",
    name: "수동공격형",
    hoganScale: "Leisurely",
    description: "표면적 동의 후 비협조, 소극적 저항",
    searchQueries: [
      "동의했지만 실행하지 않는 모습",
      "소극적으로 저항하는 행동",
      "불만을 간접적으로 표현",
    ],
    emergencyWeight: 1.2,
    normalWeight: 1.0,
    developmentTip: "의견 불일치가 있을 때 직접적이고 건설적으로 표현하는 연습이 필요합니다.",
  },
  {
    id: "mischievous",
    name: "무관심형",
    hoganScale: "Mischievous",
    description: "규정/절차 경시, 위험 감수 과다",
    searchQueries: [
      "절차를 건너뛰는 장면",
      "규정을 무시하는 발언",
      "안전 확인을 생략",
    ],
    emergencyWeight: 1.3,
    normalWeight: 1.5,
    developmentTip: "원전에서 절차 준수는 안전의 근간입니다. 모든 단계를 체크리스트로 확인하세요.",
  },
  {
    id: "dutiful",
    name: "과잉순응형",
    hoganScale: "Dutiful",
    description: "상급자 의견에 무조건 동의, 독립적 판단 부재",
    searchQueries: [
      "상급자 의견에 무조건 동의",
      "자기 의견 없이 따르는 모습",
      "독립적 판단을 하지 않음",
    ],
    emergencyWeight: 1.0,
    normalWeight: 1.2,
    developmentTip: "안전에 관한 사안에서는 직급에 관계없이 자신의 전문적 판단을 표명해야 합니다.",
  },
  {
    id: "diligent",
    name: "완벽주의형",
    hoganScale: "Diligent",
    description: "사소한 사항에 집착, 큰 그림 놓침",
    searchQueries: [
      "세부 사항에 과도하게 집착",
      "전체 맥락을 놓치는 모습",
      "시간 관리가 되지 않음",
    ],
    emergencyWeight: 1.2,
    normalWeight: 0.8,
    developmentTip: "우선순위 매트릭스를 활용하여 핵심 사안에 집중하는 훈련이 필요합니다.",
  },
  {
    id: "imaginative",
    name: "고립형",
    hoganScale: "Imaginative",
    description: "팀과 단절, 독자적 행동, 소통 부재",
    searchQueries: [
      "팀과 분리되어 행동",
      "소통 없이 독자적으로 진행",
      "팀 활동에 참여하지 않음",
    ],
    emergencyWeight: 1.3,
    normalWeight: 1.0,
    developmentTip: "정기적인 상황 공유와 팀 미팅 참여를 통해 팀 연결성을 유지하세요.",
  },
];
```

- [ ] **Step 3: derailer-detector.ts 구현**

```typescript
// src/lib/derailer/derailer-detector.ts
import type { DerailerPattern, DerailerProfile } from "./types";
import { DERAILER_PATTERNS, type DerailerDef } from "./derailer-patterns";

/**
 * TwelveLabs generate 응답을 파싱하여 탈선 점수 산출
 */
export function parseDerailerResponse(
  patternDef: DerailerDef,
  aiResponse: string,
  scenarioType: "normal" | "emergency"
): DerailerPattern {
  // AI 응답에서 점수/증거 추출
  const scoreMatch = aiResponse.match(/점수[:\s]*(\d+)/);
  const rawScore = scoreMatch ? parseInt(scoreMatch[1]) : estimateScore(aiResponse);

  const weight = scenarioType === "emergency"
    ? patternDef.emergencyWeight
    : patternDef.normalWeight;
  const adjustedScore = Math.min(10, Math.round(rawScore * weight));

  const riskLevel = adjustedScore <= 3 ? "low"
    : adjustedScore <= 6 ? "moderate"
    : adjustedScore <= 8 ? "high"
    : "critical";

  // 증거 추출 (타임스탬프 패턴 매칭)
  const evidence: DerailerPattern["evidence"] = [];
  const timeMatches = aiResponse.matchAll(/(\d{1,2}):(\d{2})(?:\s*[-~]\s*(\d{1,2}):(\d{2}))?/g);
  for (const m of timeMatches) {
    const start = parseInt(m[1]) * 60 + parseInt(m[2]);
    const end = m[3] ? parseInt(m[3]) * 60 + parseInt(m[4]) : start + 30;
    // 타임스탬프 주변 텍스트를 설명으로 사용
    const idx = m.index || 0;
    const context = aiResponse.slice(Math.max(0, idx - 50), idx + m[0].length + 50).trim();
    evidence.push({
      timestamp: { start, end },
      description: context,
      signal: "verbal",
    });
  }

  return {
    id: patternDef.id,
    name: patternDef.name,
    hoganScale: patternDef.hoganScale,
    riskLevel,
    score: adjustedScore,
    evidence,
    developmentTip: patternDef.developmentTip,
  };
}

function estimateScore(text: string): number {
  const negative = ["관찰됨", "발견", "나타남", "보임", "확인", "우려"];
  const positive = ["없음", "관찰되지", "발견되지", "나타나지"];
  const negCount = negative.filter((w) => text.includes(w)).length;
  const posCount = positive.filter((w) => text.includes(w)).length;
  if (posCount > negCount) return 2;
  if (negCount === 0 && posCount === 0) return 3;
  return Math.min(10, 3 + negCount * 2);
}

/**
 * 전체 프로필 구성
 */
export function buildDerailerProfile(
  participantId: string,
  scenarioType: "normal" | "emergency",
  patterns: DerailerPattern[]
): DerailerProfile {
  const sorted = [...patterns].sort((a, b) => b.score - a.score);
  const topRisks = sorted.filter((p) => p.riskLevel !== "low").slice(0, 3);

  const maxScore = Math.max(...patterns.map((p) => p.score), 0);
  const overallRiskLevel = maxScore <= 4 ? "low" : maxScore <= 7 ? "moderate" : "high";

  return {
    participantId,
    scenarioType,
    patterns: sorted,
    topRisks,
    overallRiskLevel,
  };
}

/**
 * TwelveLabs generate에 보낼 프롬프트 생성
 */
export function buildDerailerPrompt(patternDef: DerailerDef): string {
  return `이 영상에서 리더십 탈선 요인 "${patternDef.name}" (${patternDef.hoganScale}) 패턴을 분석하세요.

탈선 정의: ${patternDef.description}

다음 형식으로 답변:
1. 점수: 0~10 (0=전혀 관찰 안됨, 10=매우 심각하게 관찰됨)
2. 관찰된 행동: 구체적 장면과 타임스탬프 (MM:SS 형식)
3. 근거: 어떤 언어적/비언어적 신호에서 판단했는지

한국어로 답변하세요.`;
}
```

- [ ] **Step 4: API 라우트 + index.ts + 커밋**

```typescript
// src/app/api/derailer/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateWithPrompt } from "@/lib/twelvelabs";
import { DERAILER_PATTERNS } from "@/lib/derailer/derailer-patterns";
import { parseDerailerResponse, buildDerailerProfile, buildDerailerPrompt } from "@/lib/derailer/derailer-detector";

export async function POST(req: NextRequest) {
  try {
    const { videoId, participantId, scenarioType = "normal" } = await req.json();
    if (!videoId) return NextResponse.json({ error: "videoId 필수" }, { status: 400 });

    const patterns = [];
    for (const def of DERAILER_PATTERNS) {
      try {
        const prompt = buildDerailerPrompt(def);
        const result = await generateWithPrompt(videoId, prompt);
        const pattern = parseDerailerResponse(def, result.data, scenarioType);
        patterns.push(pattern);
      } catch {
        // 개별 패턴 분석 실패 시 기본값
        patterns.push({
          id: def.id, name: def.name, hoganScale: def.hoganScale,
          riskLevel: "low" as const, score: 0, evidence: [],
          developmentTip: def.developmentTip,
        });
      }
    }

    const profile = buildDerailerProfile(participantId || "unknown", scenarioType, patterns);
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: "탈선 분석 실패" }, { status: 500 });
  }
}
```

```typescript
// src/lib/derailer/index.ts
export type { DerailerPattern, DerailerProfile, DerailerEvidence } from "./types";
export { DERAILER_PATTERNS } from "./derailer-patterns";
export { parseDerailerResponse, buildDerailerProfile, buildDerailerPrompt } from "./derailer-detector";
```

```bash
git add src/lib/derailer/ src/app/api/derailer/
git commit -m "feat: derailer 모듈 — Hogan HDS 11패턴 탈선 탐지 + API"
```

---

## Task 7: bei/ — BEI 자동화 모듈

**Files:**
- Create: `src/lib/bei/types.ts`
- Create: `src/lib/bei/star-parser.ts`
- Create: `src/lib/bei/competency-coder.ts`
- Create: `src/lib/bei/index.ts`
- Create: `src/app/api/bei/extract/route.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/bei/types.ts

export interface STARElement {
  text: string;
  timestamp: { start: number; end: number };
}

export interface STARStructure {
  situation: STARElement;
  task: STARElement;
  action: STARElement;
  result: STARElement;
  completeness: number;
}

export interface BEIEvent {
  id: string;
  speakerId: string;
  star: STARStructure;
  codedCompetencies: {
    competencyKey: string;
    confidence: number;
    level: "threshold" | "differentiating";
  }[];
  qualityScore: number;
}

export interface BEIAnalysis {
  events: BEIEvent[];
  competencyDistribution: Record<string, number>;
  differentiatingCompetencies: string[];
  totalEvents: number;
  averageCompleteness: number;
}
```

- [ ] **Step 2: star-parser.ts 구현**

```typescript
// src/lib/bei/star-parser.ts
import type { STARStructure, STARElement } from "./types";

const EMPTY_ELEMENT: STARElement = { text: "", timestamp: { start: 0, end: 0 } };

/**
 * TwelveLabs generate 응답에서 STAR 구조 파싱
 */
export function parseSTARFromResponse(aiResponse: string, baseTimestamp: number = 0): STARStructure {
  const sections: Record<string, STARElement> = {
    situation: { ...EMPTY_ELEMENT },
    task: { ...EMPTY_ELEMENT },
    action: { ...EMPTY_ELEMENT },
    result: { ...EMPTY_ELEMENT },
  };

  // S/T/A/R 라벨로 분리
  const patterns: Record<string, RegExp> = {
    situation: /(?:상황|Situation|S)[:\s]*([^\n]+(?:\n(?![STAR과행결])[^\n]+)*)/i,
    task: /(?:과제|Task|T)[:\s]*([^\n]+(?:\n(?![STAR상행결])[^\n]+)*)/i,
    action: /(?:행동|Action|A)[:\s]*([^\n]+(?:\n(?![STAR상과결])[^\n]+)*)/i,
    result: /(?:결과|Result|R)[:\s]*([^\n]+(?:\n(?![STAR상과행])[^\n]+)*)/i,
  };

  let offset = baseTimestamp;
  for (const [key, regex] of Object.entries(patterns)) {
    const match = aiResponse.match(regex);
    if (match) {
      const text = match[1].trim();
      // 타임스탬프 추출
      const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
      const start = timeMatch ? parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) : offset;
      sections[key] = {
        text: text.replace(/\d{1,2}:\d{2}(?:\s*[-~]\s*\d{1,2}:\d{2})?/g, "").trim(),
        timestamp: { start, end: start + 30 },
      };
      offset = start + 30;
    }
  }

  const filled = Object.values(sections).filter((s) => s.text.length > 0).length;
  const completeness = (filled / 4) * 100;

  return {
    situation: sections.situation,
    task: sections.task,
    action: sections.action,
    result: sections.result,
    completeness,
  };
}

/**
 * STAR 품질 점수 (1-5)
 */
export function scoreSTARQuality(star: STARStructure): number {
  let score = 0;
  // 완성도 기반 (4요소 모두 있으면 +2)
  score += star.completeness >= 100 ? 2 : star.completeness >= 75 ? 1.5 : star.completeness >= 50 ? 1 : 0.5;
  // Action 구체성 (길이 기반 근사)
  if (star.action.text.length > 100) score += 1.5;
  else if (star.action.text.length > 50) score += 1;
  else score += 0.5;
  // Result 구체성
  if (star.result.text.length > 50) score += 1;
  else if (star.result.text.length > 20) score += 0.5;
  // 전체 1-5 범위로 클램프
  return Math.max(1, Math.min(5, Math.round(score * 10) / 10));
}

export function buildSTARPrompt(transcript: string): string {
  return `아래 발언 내용에서 행동사건(Behavioral Event)을 추출하고, STAR 구조로 분리하세요.

발언 내용:
${transcript}

다음 형식으로 답변:
상황(S): [발언자가 처한 상황 설명]
과제(T): [해결해야 할 과제/목표]
행동(A): [실제로 취한 구체적 행동 — 가장 상세하게]
결과(R): [행동의 결과/성과]

각 요소에 해당하는 영상 타임스탬프(MM:SS)를 함께 표기하세요.
한국어로 답변하세요.`;
}
```

- [ ] **Step 3: competency-coder.ts 구현**

```typescript
// src/lib/bei/competency-coder.ts
import type { BEIEvent, BEIAnalysis, STARStructure } from "./types";
import type { LeadershipCompetencyKey } from "@/lib/types";

// 역량별 행동 키워드 (Action 요소에서 매칭)
const COMPETENCY_KEYWORDS: Record<string, string[]> = {
  visionPresentation: ["전략", "비전", "목표", "방향", "PEST", "환경분석", "동기부여", "발표"],
  trustBuilding: ["합의", "갈등", "조율", "경청", "공감", "신뢰", "공정", "토론"],
  memberDevelopment: ["코칭", "피드백", "성장", "멘토링", "교육", "지도", "육성"],
  rationalDecision: ["데이터", "분석", "의사결정", "대안", "리스크", "우선순위", "근거"],
  visionPractice: ["실행", "협업", "주도적", "목표달성"],
  communication: ["전달", "소통", "명확", "설득", "보고"],
  selfDevelopment: ["학습", "개선", "역량개발", "자기성찰"],
  problemSolving: ["문제", "원인", "해결", "창의", "개선방안"],
};

export function codeCompetency(
  star: STARStructure
): { competencyKey: string; confidence: number; level: "threshold" | "differentiating" }[] {
  const actionText = star.action.text + " " + star.result.text;
  const results: { competencyKey: string; confidence: number; level: "threshold" | "differentiating" }[] = [];

  for (const [key, keywords] of Object.entries(COMPETENCY_KEYWORDS)) {
    const matched = keywords.filter((kw) => actionText.includes(kw));
    if (matched.length === 0) continue;

    const confidence = Math.min(100, (matched.length / keywords.length) * 100 * 2);
    // Action이 구체적이고 결과가 긍정적이면 differentiating
    const level = star.action.text.length > 80 && star.result.text.length > 30
      ? "differentiating" : "threshold";

    results.push({ competencyKey: key, confidence, level });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

export function buildBEIAnalysis(events: BEIEvent[]): BEIAnalysis {
  const distribution: Record<string, number> = {};
  for (const event of events) {
    for (const coded of event.codedCompetencies) {
      distribution[coded.competencyKey] = (distribution[coded.competencyKey] || 0) + 1;
    }
  }

  const differentiating = new Set<string>();
  for (const event of events) {
    for (const coded of event.codedCompetencies) {
      if (coded.level === "differentiating") differentiating.add(coded.competencyKey);
    }
  }

  const avgCompleteness = events.length > 0
    ? events.reduce((s, e) => s + e.star.completeness, 0) / events.length
    : 0;

  return {
    events,
    competencyDistribution: distribution,
    differentiatingCompetencies: Array.from(differentiating),
    totalEvents: events.length,
    averageCompleteness: avgCompleteness,
  };
}
```

- [ ] **Step 4: API 라우트 + index.ts + 커밋**

```typescript
// src/app/api/bei/extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateWithPrompt } from "@/lib/twelvelabs";
import { parseSTARFromResponse, scoreSTARQuality, buildSTARPrompt } from "@/lib/bei/star-parser";
import { codeCompetency, buildBEIAnalysis } from "@/lib/bei/competency-coder";
import type { BEIEvent } from "@/lib/bei/types";

export async function POST(req: NextRequest) {
  try {
    const { videoId, transcriptSegments } = await req.json();
    if (!videoId) return NextResponse.json({ error: "videoId 필수" }, { status: 400 });

    const events: BEIEvent[] = [];
    const segments = transcriptSegments || [{ text: "", speakerId: "speaker-1" }];

    // 영상 전체를 STAR 분석
    const prompt = buildSTARPrompt(
      segments.map((s: { text: string }) => s.text).join("\n")
    );

    const result = await generateWithPrompt(videoId, prompt);
    const star = parseSTARFromResponse(result.data);
    const quality = scoreSTARQuality(star);
    const coded = codeCompetency(star);

    if (star.completeness > 25) {
      events.push({
        id: `bei-${Date.now()}`,
        speakerId: segments[0]?.speakerId || "unknown",
        star,
        codedCompetencies: coded,
        qualityScore: quality,
      });
    }

    const analysis = buildBEIAnalysis(events);
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json({ error: "BEI 추출 실패" }, { status: 500 });
  }
}
```

```typescript
// src/lib/bei/index.ts
export type { STARStructure, STARElement, BEIEvent, BEIAnalysis } from "./types";
export { parseSTARFromResponse, scoreSTARQuality, buildSTARPrompt } from "./star-parser";
export { codeCompetency, buildBEIAnalysis } from "./competency-coder";
```

```bash
git add src/lib/bei/ src/app/api/bei/
git commit -m "feat: bei 모듈 — STAR 구조 파싱 + 역량 코딩 자동화 + API"
```

---

## Task 8: growth/ — 역량 성장 추이 추적 모듈

**Files:**
- Create: `src/lib/growth/types.ts`
- Create: `src/lib/growth/growth-tracker.ts`
- Create: `src/lib/growth/embedding-compare.ts`
- Create: `src/lib/growth/index.ts`
- Create: `src/app/api/growth/timeline/route.ts`
- Create: `src/app/api/growth/similarity/route.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/growth/types.ts

export interface GrowthDataPoint {
  sessionId: string;
  date: string;
  competencyScores: Record<string, number>;
  overallScore: number;
  videoId?: string;
}

export interface CompetencyTrend {
  competencyKey: string;
  direction: "improving" | "stable" | "declining";
  changeRate: number;
  projectedScore: number;
}

export interface GrowthTimeline {
  employeeId: string;
  employeeName: string;
  dataPoints: GrowthDataPoint[];
  trends: CompetencyTrend[];
  plateauCompetencies: string[];
  breakthroughCompetencies: string[];
}

export interface SimilarityReport {
  videoId1: string;
  videoId2: string;
  overallSimilarity: number;
  interpretation: string;
}
```

- [ ] **Step 2: growth-tracker.ts 구현**

```typescript
// src/lib/growth/growth-tracker.ts
import type { GrowthDataPoint, CompetencyTrend, GrowthTimeline } from "./types";
import { mean, pearsonR } from "@/lib/statistics";

/**
 * 역량별 추세 계산 (선형 회귀)
 */
export function calculateTrend(scores: number[]): { direction: "improving" | "stable" | "declining"; changeRate: number; projected: number } {
  if (scores.length < 2) return { direction: "stable", changeRate: 0, projected: scores[0] || 0 };

  const x = scores.map((_, i) => i);
  const y = scores;
  const mx = mean(x);
  const my = mean(y);

  let num = 0, den = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - mx) * (y[i] - my);
    den += (x[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  const projected = Math.max(1, Math.min(9, slope * x.length + intercept));

  const direction = slope > 0.3 ? "improving" : slope < -0.3 ? "declining" : "stable";

  return { direction, changeRate: slope, projected };
}

/**
 * 성장 타임라인 구성
 */
export function buildGrowthTimeline(
  employeeId: string,
  employeeName: string,
  dataPoints: GrowthDataPoint[]
): GrowthTimeline {
  if (dataPoints.length === 0) {
    return { employeeId, employeeName, dataPoints: [], trends: [], plateauCompetencies: [], breakthroughCompetencies: [] };
  }

  // 날짜순 정렬
  const sorted = [...dataPoints].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 모든 역량 키 수집
  const allKeys = new Set<string>();
  sorted.forEach((dp) => Object.keys(dp.competencyScores).forEach((k) => allKeys.add(k)));

  const trends: CompetencyTrend[] = [];
  const plateauCompetencies: string[] = [];
  const breakthroughCompetencies: string[] = [];

  for (const key of allKeys) {
    const scores = sorted.map((dp) => dp.competencyScores[key]).filter((s) => s !== undefined);
    if (scores.length < 2) continue;

    const trend = calculateTrend(scores);
    trends.push({
      competencyKey: key,
      direction: trend.direction,
      changeRate: trend.changeRate,
      projectedScore: trend.projected,
    });

    // 정체: 3회 이상 연속, 변화 < 0.5점
    if (scores.length >= 3) {
      const recent = scores.slice(-3);
      const maxDiff = Math.max(...recent) - Math.min(...recent);
      if (maxDiff < 0.5) plateauCompetencies.push(key);
    }

    // 돌파: 최근 변화율 > 1점
    if (scores.length >= 2) {
      const lastChange = scores[scores.length - 1] - scores[scores.length - 2];
      if (lastChange >= 1) breakthroughCompetencies.push(key);
    }
  }

  return { employeeId, employeeName, dataPoints: sorted, trends, plateauCompetencies, breakthroughCompetencies };
}
```

- [ ] **Step 3: embedding-compare.ts + API 라우트**

```typescript
// src/lib/growth/embedding-compare.ts

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function interpretSimilarity(similarity: number): string {
  if (similarity >= 0.9) return "매우 유사 — 거의 동일한 행동 패턴";
  if (similarity >= 0.7) return "유사 — 핵심 행동이 비슷하나 세부 차이 존재";
  if (similarity >= 0.5) return "보통 — 일부 공통 패턴이 있으나 상당한 차이";
  if (similarity >= 0.3) return "상이 — 행동 패턴이 크게 다름";
  return "매우 상이 — 완전히 다른 행동 패턴";
}
```

```typescript
// src/app/api/growth/timeline/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildGrowthTimeline } from "@/lib/growth/growth-tracker";

export async function POST(req: NextRequest) {
  try {
    const { employeeId, employeeName, dataPoints } = await req.json();
    const timeline = buildGrowthTimeline(employeeId, employeeName || "Unknown", dataPoints || []);
    return NextResponse.json(timeline);
  } catch (error) {
    return NextResponse.json({ error: "성장 추이 분석 실패" }, { status: 500 });
  }
}
```

```typescript
// src/app/api/growth/similarity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cosineSimilarity, interpretSimilarity } from "@/lib/growth/embedding-compare";

export async function POST(req: NextRequest) {
  try {
    const { embedding1, embedding2, videoId1, videoId2 } = await req.json();

    if (!embedding1 || !embedding2) {
      return NextResponse.json({ error: "embeddings 필수" }, { status: 400 });
    }

    const similarity = cosineSimilarity(embedding1, embedding2);
    return NextResponse.json({
      videoId1, videoId2,
      overallSimilarity: similarity,
      interpretation: interpretSimilarity(similarity),
    });
  } catch (error) {
    return NextResponse.json({ error: "유사도 비교 실패" }, { status: 500 });
  }
}
```

- [ ] **Step 4: index.ts + 커밋**

```typescript
// src/lib/growth/index.ts
export type { GrowthDataPoint, CompetencyTrend, GrowthTimeline, SimilarityReport } from "./types";
export { calculateTrend, buildGrowthTimeline } from "./growth-tracker";
export { cosineSimilarity, interpretSimilarity } from "./embedding-compare";
```

```bash
git add src/lib/growth/ src/app/api/growth/
git commit -m "feat: growth 모듈 — 역량 성장 추이 추적 + 임베딩 유사도 비교"
```

---

## Task 9: validation/ — 심리측정 타당화 + 노름 모듈

**Files:**
- Create: `src/lib/validation/types.ts`
- Create: `src/lib/validation/reliability-analyzer.ts`
- Create: `src/lib/validation/norm-builder.ts`
- Create: `src/lib/validation/index.ts`
- Create: `src/app/api/validation/reliability/route.ts`
- Create: `src/app/api/validation/norms/route.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/validation/types.ts

export type SampleAdequacy = "insufficient" | "exploratory" | "adequate" | "robust";

export interface ItemAnalysisResult {
  competencyKey: string;
  itemTotalCorrelation: number;
  alphaIfDeleted: number;
}

export interface ReliabilityReport {
  cronbachAlpha: number;
  icc: { type: "ICC(2,1)"; value: number; ci95: [number, number] };
  itemAnalysis: ItemAnalysisResult[];
  sampleSize: number;
  adequacy: SampleAdequacy;
  recommendations: string[];
}

export interface NormGroupStats {
  groupName: string;
  n: number;
  percentiles: Record<string, {
    p10: number; p25: number; p50: number; p75: number; p90: number;
    mean: number; sd: number;
  }>;
}

export interface NormTable {
  groupBy: string;
  groups: NormGroupStats[];
  lastUpdated: string;
}
```

- [ ] **Step 2: reliability-analyzer.ts 구현**

```typescript
// src/lib/validation/reliability-analyzer.ts
import type { ReliabilityReport, SampleAdequacy, ItemAnalysisResult } from "./types";
import { cronbachAlpha, icc21, itemTotalCorrelation, alphaIfDeleted } from "@/lib/statistics";

export function classifySampleAdequacy(n: number): SampleAdequacy {
  if (n < 10) return "insufficient";
  if (n < 30) return "exploratory";
  if (n < 50) return "adequate";
  return "robust";
}

export function generateRecommendations(
  alpha: number,
  iccValue: number,
  sampleSize: number,
  adequacy: SampleAdequacy
): string[] {
  const recs: string[] = [];

  if (adequacy === "insufficient") {
    recs.push(`현재 표본 크기(${sampleSize}명)가 부족합니다. 최소 10명 이상의 데이터가 필요합니다.`);
  } else if (adequacy === "exploratory") {
    recs.push(`탐색적 수준(${sampleSize}명). 30명 이상 축적 시 본격적 타당화 분석이 가능합니다.`);
  }

  if (alpha < 0.6) {
    recs.push(`내적 일관성(α=${alpha.toFixed(2)})이 낮습니다. 역량 정의 또는 평가 기준 재검토가 필요합니다.`);
  } else if (alpha >= 0.8) {
    recs.push(`내적 일관성(α=${alpha.toFixed(2)})이 우수합니다.`);
  }

  if (iccValue < 0.4) {
    recs.push(`평가자간 일치도(ICC=${iccValue.toFixed(2)})가 낮습니다. AI-인간 점수 차이 원인을 분석하세요.`);
  } else if (iccValue >= 0.6) {
    recs.push(`평가자간 일치도(ICC=${iccValue.toFixed(2)})가 양호합니다.`);
  }

  return recs;
}

/**
 * 전체 신뢰도 리포트 생성
 * dataset: { participantId, competencyScores: Record<string, number>, humanScores?: Record<string, number> }[]
 */
export function analyzeReliability(
  dataset: {
    participantId: string;
    competencyScores: Record<string, number>;
    humanScores?: Record<string, number>;
  }[]
): ReliabilityReport {
  const n = dataset.length;
  const adequacy = classifySampleAdequacy(n);

  // 역량 키 수집
  const keys = [...new Set(dataset.flatMap((d) => Object.keys(d.competencyScores)))];

  // 항목 점수 행렬 구성 (N × K)
  const itemMatrix = dataset.map((d) => keys.map((k) => d.competencyScores[k] || 0));

  const alpha = itemMatrix.length >= 2 && keys.length >= 2 ? cronbachAlpha(itemMatrix) : 0;

  // ICC: AI vs Human (인간 점수가 있는 참여자만)
  const withHuman = dataset.filter((d) => d.humanScores && Object.keys(d.humanScores).length > 0);
  let iccResult = { value: 0, ci95: [0, 0] as [number, number] };

  if (withHuman.length >= 3) {
    const aiScores = withHuman.flatMap((d) => keys.map((k) => d.competencyScores[k] || 0));
    const humanScores = withHuman.flatMap((d) => keys.map((k) => d.humanScores?.[k] || 0));
    iccResult = icc21(aiScores, humanScores);
  }

  // 문항 분석
  const itemAnalysis: ItemAnalysisResult[] = keys.map((key, idx) => ({
    competencyKey: key,
    itemTotalCorrelation: itemMatrix.length >= 3 ? itemTotalCorrelation(itemMatrix, idx) : 0,
    alphaIfDeleted: itemMatrix.length >= 2 && keys.length >= 3 ? alphaIfDeleted(itemMatrix, idx) : alpha,
  }));

  const recommendations = generateRecommendations(alpha, iccResult.value, n, adequacy);

  return {
    cronbachAlpha: alpha,
    icc: { type: "ICC(2,1)", value: iccResult.value, ci95: iccResult.ci95 },
    itemAnalysis,
    sampleSize: n,
    adequacy,
    recommendations,
  };
}
```

- [ ] **Step 3: norm-builder.ts 구현**

```typescript
// src/lib/validation/norm-builder.ts
import type { NormTable, NormGroupStats } from "./types";
import { percentiles } from "@/lib/statistics";

export function buildNormTable(
  dataset: { participantId: string; competencyScores: Record<string, number>; group: string }[],
  groupBy: string
): NormTable {
  // 그룹별 분류
  const grouped: Record<string, typeof dataset> = {};
  for (const d of dataset) {
    if (!grouped[d.group]) grouped[d.group] = [];
    grouped[d.group].push(d);
  }

  // 역량 키 수집
  const allKeys = [...new Set(dataset.flatMap((d) => Object.keys(d.competencyScores)))];

  const groups: NormGroupStats[] = Object.entries(grouped).map(([groupName, members]) => {
    const groupPercentiles: Record<string, ReturnType<typeof percentiles>> = {};
    for (const key of allKeys) {
      const scores = members.map((m) => m.competencyScores[key]).filter((s) => s !== undefined);
      groupPercentiles[key] = percentiles(scores);
    }
    return { groupName, n: members.length, percentiles: groupPercentiles };
  });

  return { groupBy, groups, lastUpdated: new Date().toISOString() };
}

/**
 * 특정 점수의 백분위 위치 계산
 */
export function getPercentileRank(score: number, allScores: number[]): number {
  if (allScores.length === 0) return 50;
  const sorted = [...allScores].sort((a, b) => a - b);
  const below = sorted.filter((s) => s < score).length;
  const equal = sorted.filter((s) => s === score).length;
  return Math.round(((below + equal / 2) / sorted.length) * 100);
}
```

- [ ] **Step 4: API 라우트 + index.ts + 커밋**

```typescript
// src/app/api/validation/reliability/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeReliability } from "@/lib/validation/reliability-analyzer";

export async function POST(req: NextRequest) {
  try {
    const { dataset } = await req.json();
    if (!dataset?.length) return NextResponse.json({ error: "데이터셋 필수" }, { status: 400 });
    const report = analyzeReliability(dataset);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: "신뢰도 분석 실패" }, { status: 500 });
  }
}
```

```typescript
// src/app/api/validation/norms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildNormTable } from "@/lib/validation/norm-builder";

export async function POST(req: NextRequest) {
  try {
    const { dataset, groupBy } = await req.json();
    if (!dataset?.length) return NextResponse.json({ error: "데이터셋 필수" }, { status: 400 });
    const norms = buildNormTable(dataset, groupBy || "jobLevel");
    return NextResponse.json(norms);
  } catch (error) {
    return NextResponse.json({ error: "노름 생성 실패" }, { status: 500 });
  }
}
```

```typescript
// src/lib/validation/index.ts
export type { ReliabilityReport, NormTable, NormGroupStats, SampleAdequacy, ItemAnalysisResult } from "./types";
export { analyzeReliability, classifySampleAdequacy } from "./reliability-analyzer";
export { buildNormTable, getPercentileRank } from "./norm-builder";
```

```bash
git add src/lib/validation/ src/app/api/validation/
git commit -m "feat: validation 모듈 — 심리측정 타당화(α/ICC) + 노름 구축"
```

---

## Task 10: fairness/ — 편향/공정성 모니터링 모듈

**Files:**
- Create: `src/lib/fairness/types.ts`
- Create: `src/lib/fairness/bias-detector.ts`
- Create: `src/lib/fairness/index.ts`
- Create: `src/app/api/fairness/analyze/route.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/fairness/types.ts

export interface GroupDistribution {
  variable: string;
  groups: string[];
  scoreDistributions: Record<string, {
    n: number; mean: number; sd: number; effectSize: number;
  }>;
  adverseImpact: { fourFifthsRatio: number; impacted: boolean };
}

export interface FairnessReport {
  analyzedGroups: GroupDistribution[];
  overallFairness: "pass" | "warning" | "fail";
  alerts: string[];
}
```

- [ ] **Step 2: bias-detector.ts 구현**

```typescript
// src/lib/fairness/bias-detector.ts
import type { FairnessReport, GroupDistribution } from "./types";
import { mean, sampleStandardDeviation, cohenD } from "@/lib/statistics";
import { fourFifthsRule } from "@/lib/statistics";

interface ScoreEntry {
  participantId: string;
  overallScore: number;
  demographics: Record<string, string>;
}

export function analyzeFairness(
  scores: ScoreEntry[],
  groupVariables: string[] = ["gender", "ageGroup", "tenureGroup"]
): FairnessReport {
  const analyzedGroups: GroupDistribution[] = [];
  const alerts: string[] = [];
  let hasFailure = false;
  let hasWarning = false;

  for (const variable of groupVariables) {
    // 변수별 그룹 분류
    const grouped: Record<string, number[]> = {};
    for (const entry of scores) {
      const group = entry.demographics[variable];
      if (!group) continue;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(entry.overallScore);
    }

    const groups = Object.keys(grouped);
    if (groups.length < 2) continue;

    // 분포 통계
    const distributions: GroupDistribution["scoreDistributions"] = {};
    for (const [group, vals] of Object.entries(grouped)) {
      distributions[group] = {
        n: vals.length,
        mean: mean(vals),
        sd: sampleStandardDeviation(vals),
        effectSize: 0,
      };
    }

    // 효과 크기 (각 그룹 vs 전체 최대 그룹)
    const allScores = scores.map((s) => s.overallScore);
    for (const [group, vals] of Object.entries(grouped)) {
      distributions[group].effectSize = cohenD(vals, allScores);
    }

    // 4/5 규칙: 점수 5점 이상을 "합격"으로 간주
    const passRates: Record<string, number> = {};
    for (const [group, vals] of Object.entries(grouped)) {
      passRates[group] = vals.filter((v) => v >= 5).length / vals.length;
    }
    const aiResult = fourFifthsRule(passRates);

    if (aiResult.impacted) {
      hasFailure = true;
      alerts.push(`${variable}: ${aiResult.focalGroup} 그룹에 불리한 영향 감지 (4/5 비율: ${aiResult.ratio.toFixed(2)})`);
    }

    // 효과 크기 경고
    for (const [group, dist] of Object.entries(distributions)) {
      if (dist.effectSize > 0.8) {
        hasWarning = true;
        alerts.push(`${variable}/${group}: 큰 효과 크기 (d=${dist.effectSize.toFixed(2)}) — 점수 차이 주의`);
      }
    }

    analyzedGroups.push({
      variable,
      groups,
      scoreDistributions: distributions,
      adverseImpact: { fourFifthsRatio: aiResult.ratio, impacted: aiResult.impacted },
    });
  }

  const overallFairness = hasFailure ? "fail" : hasWarning ? "warning" : "pass";

  return { analyzedGroups, overallFairness, alerts };
}
```

- [ ] **Step 3: API 라우트 + index.ts + 커밋**

```typescript
// src/app/api/fairness/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeFairness } from "@/lib/fairness/bias-detector";

export async function POST(req: NextRequest) {
  try {
    const { scores, groupVariables } = await req.json();
    if (!scores?.length) return NextResponse.json({ error: "점수 데이터 필수" }, { status: 400 });
    const report = analyzeFairness(scores, groupVariables);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: "공정성 분석 실패" }, { status: 500 });
  }
}
```

```typescript
// src/lib/fairness/index.ts
export type { FairnessReport, GroupDistribution } from "./types";
export { analyzeFairness } from "./bias-detector";
```

```bash
git add src/lib/fairness/ src/app/api/fairness/
git commit -m "feat: fairness 모듈 — 편향 탐지 + 4/5 규칙 + 효과크기 분석"
```

---

## Task 11: compliance/ — ISO 10667 + 삼각측정 + 코칭 모듈

**Files:**
- Create: `src/lib/compliance/types.ts`
- Create: `src/lib/compliance/triangulation.ts`
- Create: `src/lib/compliance/consent-manager.ts`
- Create: `src/lib/compliance/coaching-engine.ts`
- Create: `src/lib/compliance/index.ts`
- Create: `src/app/api/compliance/triangulate/route.ts`
- Create: `src/app/api/compliance/consent/route.ts`
- Create: `src/app/api/compliance/audit-log/route.ts`

- [ ] **Step 1: types.ts 생성**

```typescript
// src/lib/compliance/types.ts

export interface TriangulationConfig {
  weights: { ai: number; human: number };
  minimumAgreement: number;
  conflictResolution: "weighted" | "human_override" | "flag_for_review";
}

export interface TriangulatedScore {
  competencyKey: string;
  aiScore: number;
  humanScore: number;
  finalScore: number;
  agreement: "agree" | "minor_diff" | "major_diff";
  method: string;
}

export interface ConsentRecord {
  id: string;
  participantId: string;
  sessionId: string;
  consentType: "video_recording" | "ai_analysis" | "data_retention" | "report_sharing";
  agreed: boolean;
  timestamp: string;
  version: string;
}

export interface CoachingFeedback {
  participantId: string;
  sessionId: string;
  generatedAt: string;
  strengths: { competencyKey: string; description: string; evidence: string }[];
  developmentAreas: {
    competencyKey: string;
    currentLevel: string;
    targetLevel: string;
    actionItems: string[];
  }[];
  comparedToPrevious?: {
    improved: string[];
    maintained: string[];
    needsAttention: string[];
  };
}

export const DEFAULT_TRIANGULATION_CONFIG: TriangulationConfig = {
  weights: { ai: 0.6, human: 0.4 },
  minimumAgreement: 2,
  conflictResolution: "weighted",
};
```

- [ ] **Step 2: triangulation.ts 구현**

```typescript
// src/lib/compliance/triangulation.ts
import type { TriangulatedScore, TriangulationConfig } from "./types";
import { DEFAULT_TRIANGULATION_CONFIG } from "./types";

export function triangulate(
  aiScores: Record<string, number>,
  humanScores: Record<string, number>,
  config: TriangulationConfig = DEFAULT_TRIANGULATION_CONFIG
): TriangulatedScore[] {
  const allKeys = new Set([...Object.keys(aiScores), ...Object.keys(humanScores)]);
  const results: TriangulatedScore[] = [];

  for (const key of allKeys) {
    const ai = aiScores[key];
    const human = humanScores[key];

    if (ai === undefined && human === undefined) continue;
    if (ai === undefined) {
      results.push({ competencyKey: key, aiScore: 0, humanScore: human, finalScore: human, agreement: "major_diff", method: "human_only" });
      continue;
    }
    if (human === undefined) {
      results.push({ competencyKey: key, aiScore: ai, humanScore: 0, finalScore: ai, agreement: "major_diff", method: "ai_only" });
      continue;
    }

    const diff = Math.abs(ai - human);
    const agreement = diff <= 1 ? "agree" : diff <= config.minimumAgreement ? "minor_diff" : "major_diff";

    let finalScore: number;
    let method: string;

    if (agreement === "major_diff" && config.conflictResolution === "human_override") {
      finalScore = human;
      method = "human_override (차이 ≥ 3점)";
    } else if (agreement === "major_diff" && config.conflictResolution === "flag_for_review") {
      finalScore = Math.round((ai * config.weights.ai + human * config.weights.human) * 10) / 10;
      method = "가중평균 (검토 필요 플래그)";
    } else {
      finalScore = Math.round((ai * config.weights.ai + human * config.weights.human) * 10) / 10;
      method = `가중평균 (AI ${config.weights.ai} : Human ${config.weights.human})`;
    }

    results.push({ competencyKey: key, aiScore: ai, humanScore: human, finalScore, agreement, method });
  }

  return results;
}
```

- [ ] **Step 3: consent-manager.ts 구현**

```typescript
// src/lib/compliance/consent-manager.ts
import type { ConsentRecord } from "./types";

const CONSENT_VERSION = "1.0.0";

const CONSENT_TYPES = [
  { type: "video_recording" as const, label: "영상 촬영 및 저장 동의", required: true },
  { type: "ai_analysis" as const, label: "AI 기반 역량 분석 동의", required: true },
  { type: "data_retention" as const, label: "평가 데이터 보존 동의 (1년)", required: true },
  { type: "report_sharing" as const, label: "리포트 공유 동의 (교육 담당자)", required: false },
] as const;

export function getConsentItems() {
  return CONSENT_TYPES;
}

export function createConsentRecord(
  participantId: string,
  sessionId: string,
  consentType: ConsentRecord["consentType"],
  agreed: boolean
): ConsentRecord {
  return {
    id: `consent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    participantId,
    sessionId,
    consentType,
    agreed,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
}

export function checkAllRequiredConsents(consents: ConsentRecord[]): {
  allGiven: boolean;
  missing: string[];
} {
  const required = CONSENT_TYPES.filter((c) => c.required);
  const missing: string[] = [];

  for (const req of required) {
    const given = consents.find((c) => c.consentType === req.type && c.agreed);
    if (!given) missing.push(req.label);
  }

  return { allGiven: missing.length === 0, missing };
}
```

- [ ] **Step 4: coaching-engine.ts 구현**

```typescript
// src/lib/compliance/coaching-engine.ts
import type { CoachingFeedback } from "./types";

const LEVEL_LABELS: Record<number, string> = {
  1: "미흡", 2: "미흡", 3: "보통 미만", 4: "보통 미만", 5: "보통 미만",
  6: "보통 이상", 7: "보통 이상", 8: "보통 이상", 9: "매우 우수",
};

export function generateCoachingFeedback(
  participantId: string,
  sessionId: string,
  scores: Record<string, number>,
  competencyLabels: Record<string, string>,
  previousFeedback?: CoachingFeedback
): CoachingFeedback {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  // 강점: 상위 2개
  const strengths = entries.slice(0, 2).map(([key, score]) => ({
    competencyKey: key,
    description: `${competencyLabels[key] || key} 역량에서 ${LEVEL_LABELS[Math.round(score)] || "보통"} 수준을 보여주고 있습니다.`,
    evidence: `현재 점수: ${score.toFixed(1)}점 (9점 만점)`,
  }));

  // 개발 영역: 하위 2개
  const developmentAreas = entries.slice(-2).reverse().map(([key, score]) => {
    const current = LEVEL_LABELS[Math.round(score)] || "보통 미만";
    const targetScore = Math.min(9, Math.round(score) + 2);
    const target = LEVEL_LABELS[targetScore] || "보통 이상";

    return {
      competencyKey: key,
      currentLevel: `${current} (${score.toFixed(1)}점)`,
      targetLevel: `${target} (${targetScore}점)`,
      actionItems: generateActionItems(key, Math.round(score)),
    };
  });

  // 이전 대비 비교
  let comparedToPrevious: CoachingFeedback["comparedToPrevious"];
  if (previousFeedback) {
    const prevScores: Record<string, number> = {};
    for (const s of previousFeedback.strengths) {
      // 이전 점수를 evidence에서 파싱
      const match = s.evidence.match(/(\d+\.?\d*)/);
      if (match) prevScores[s.competencyKey] = parseFloat(match[1]);
    }

    const improved: string[] = [];
    const maintained: string[] = [];
    const needsAttention: string[] = [];

    for (const [key, score] of entries) {
      const prev = prevScores[key];
      if (prev === undefined) continue;
      if (score - prev >= 1) improved.push(competencyLabels[key] || key);
      else if (score - prev <= -1) needsAttention.push(competencyLabels[key] || key);
      else maintained.push(competencyLabels[key] || key);
    }

    if (improved.length || maintained.length || needsAttention.length) {
      comparedToPrevious = { improved, maintained, needsAttention };
    }
  }

  return {
    participantId,
    sessionId,
    generatedAt: new Date().toISOString(),
    strengths,
    developmentAreas,
    comparedToPrevious,
  };
}

function generateActionItems(competencyKey: string, score: number): string[] {
  const baseItems: Record<string, string[]> = {
    visionPresentation: ["PEST 분석 프레임워크 활용 연습", "발표 시 청중 시선 유지 훈련", "핵심 메시지 3개로 구조화"],
    trustBuilding: ["적극적 경청 기법(반영, 요약) 연습", "갈등 상황 시뮬레이션 롤플레이", "팀원 1:1 소통 시간 확보"],
    memberDevelopment: ["코칭 질문법(GROW 모델) 학습", "건설적 피드백 전달 연습", "멘토링 세션 정기 운영"],
    rationalDecision: ["의사결정 매트릭스 도구 활용", "리스크 분석 체크리스트 작성", "데이터 기반 보고서 작성 연습"],
  };

  const items = baseItems[competencyKey] || ["해당 역량 관련 교육 프로그램 참가", "실전 상황에서의 반복 연습"];
  return score <= 5 ? items : items.slice(0, 2);
}
```

- [ ] **Step 5: API 라우트들 + index.ts + 커밋**

```typescript
// src/app/api/compliance/triangulate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { triangulate } from "@/lib/compliance/triangulation";

export async function POST(req: NextRequest) {
  try {
    const { aiScores, humanScores, config } = await req.json();
    if (!aiScores) return NextResponse.json({ error: "AI 점수 필수" }, { status: 400 });
    const result = triangulate(aiScores, humanScores || {}, config);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "삼각측정 실패" }, { status: 500 });
  }
}
```

```typescript
// src/app/api/compliance/consent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createConsentRecord } from "@/lib/compliance/consent-manager";

export async function POST(req: NextRequest) {
  try {
    const { participantId, sessionId, consentType, agreed } = await req.json();
    const record = createConsentRecord(participantId, sessionId, consentType, agreed);
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: "동의 기록 실패" }, { status: 400 });
  }
}
```

```typescript
// src/app/api/compliance/audit-log/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuditLogBySession } from "@/lib/assessment-store";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "sessionId 필수" }, { status: 400 });
    const entries = await getAuditLogBySession(sessionId);
    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json({ error: "감사 로그 조회 실패" }, { status: 500 });
  }
}
```

```typescript
// src/lib/compliance/index.ts
export type { TriangulatedScore, TriangulationConfig, ConsentRecord, CoachingFeedback } from "./types";
export { DEFAULT_TRIANGULATION_CONFIG } from "./types";
export { triangulate } from "./triangulation";
export { getConsentItems, createConsentRecord, checkAllRequiredConsents } from "./consent-manager";
export { generateCoachingFeedback } from "./coaching-engine";
```

```bash
git add src/lib/compliance/ src/app/api/compliance/
git commit -m "feat: compliance 모듈 — 삼각측정 + ISO 10667 동의관리 + 즉시코칭"
```

---

## Task 12: UI — ConsentForm + HRConnectorPanel (Step 1)

**Files:**
- Create: `src/components/leadership/ConsentForm.tsx`
- Create: `src/components/leadership/HRConnectorPanel.tsx`

- [ ] **Step 1: ConsentForm.tsx 생성**

```tsx
// src/components/leadership/ConsentForm.tsx
"use client";

import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { getConsentItems, createConsentRecord, checkAllRequiredConsents } from "@/lib/compliance";
import type { ConsentRecord } from "@/lib/compliance";

interface ConsentFormProps {
  participantId: string;
  sessionId: string;
  onComplete: (consents: ConsentRecord[]) => void;
}

export default function ConsentForm({ participantId, sessionId, onComplete }: ConsentFormProps) {
  const items = getConsentItems();
  const [consents, setConsents] = useState<Record<string, boolean>>({});

  const handleToggle = (type: string) => {
    setConsents((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSubmit = () => {
    const records = items.map((item) =>
      createConsentRecord(participantId, sessionId, item.type, !!consents[item.type])
    );
    onComplete(records);
  };

  const check = checkAllRequiredConsents(
    items.map((item) => createConsentRecord(participantId, sessionId, item.type, !!consents[item.type]))
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
      <h3 className="text-lg font-semibold text-teal-400 mb-4">참여자 동의서 (ISO 10667)</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <label key={item.type} className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => handleToggle(item.type)}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                consents[item.type]
                  ? "bg-teal-500 border-teal-500"
                  : "border-white/30 group-hover:border-white/50"
              }`}
            >
              {consents[item.type] && <Check className="w-3 h-3 text-white" />}
            </div>
            <div>
              <span className="text-sm text-white/90">{item.label}</span>
              {item.required && <span className="ml-2 text-[10px] text-amber-400">필수</span>}
            </div>
          </label>
        ))}
      </div>

      {!check.allGiven && check.missing.length > 0 && (
        <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300">필수 동의 미완료: {check.missing.join(", ")}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!check.allGiven}
        className="mt-4 w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-white/5 disabled:text-white/30 text-sm font-medium transition-colors"
      >
        동의 완료
      </button>
    </div>
  );
}
```

- [ ] **Step 2: HRConnectorPanel.tsx 생성**

```tsx
// src/components/leadership/HRConnectorPanel.tsx
"use client";

import { useState, useCallback } from "react";
import { Upload, Users, AlertCircle, CheckCircle } from "lucide-react";
import { parseCSV } from "@/lib/hr-connector";
import { maskName } from "@/lib/hr-connector";
import type { Employee, HRImportResult } from "@/lib/hr-connector";

interface HRConnectorPanelProps {
  onImport: (employees: Employee[]) => void;
}

export default function HRConnectorPanel({ onImport }: HRConnectorPanelProps) {
  const [result, setResult] = useState<HRImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const importResult = parseCSV(text);
    setResult(importResult);
    if (importResult.employees.length > 0) {
      onImport(importResult.employees);
    }
  }, [onImport]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx"))) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
      <h3 className="text-lg font-semibold text-teal-400 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" /> 인사 DB 연동
      </h3>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? "border-teal-400 bg-teal-400/5" : "border-white/20 hover:border-white/30"
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-white/40" />
        <p className="text-sm text-white/60 mb-2">CSV 파일을 드래그하거나 클릭하여 업로드</p>
        <p className="text-xs text-white/30">필수 열: 사원번호, 성명, 부서, 직급</p>
        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="hr-file"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <label htmlFor="hr-file" className="mt-3 inline-block px-4 py-1.5 text-xs bg-white/10 rounded cursor-pointer hover:bg-white/15">
          파일 선택
        </label>
      </div>

      {result && (
        <div className="mt-4">
          <div className={`flex items-center gap-2 mb-2 ${result.errors.length > 0 ? "text-amber-400" : "text-teal-400"}`}>
            {result.errors.length > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span className="text-sm">{result.imported}명 가져옴{result.errors.length > 0 ? ` (오류 ${result.errors.length}건)` : ""}</span>
          </div>
          {result.employees.length > 0 && (
            <div className="text-xs text-white/50 space-y-1 max-h-32 overflow-y-auto">
              {result.employees.slice(0, 10).map((emp) => (
                <div key={emp.employeeId} className="flex gap-4">
                  <span>{maskName(emp.name)}</span>
                  <span>{emp.department}</span>
                  <span>{emp.jobLevel}직급</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/leadership/ConsentForm.tsx src/components/leadership/HRConnectorPanel.tsx
git commit -m "feat: ConsentForm + HRConnectorPanel — Step 1 동의/인사DB UI"
```

---

## Task 13: UI — EvidenceMapView + DerailerDashboard (Step 3 서브탭)

**Files:**
- Create: `src/components/leadership/EvidenceMapView.tsx`
- Create: `src/components/leadership/DerailerDashboard.tsx`

- [ ] **Step 1: EvidenceMapView.tsx 생성**

증거 맵 서브탭 — 루브릭 기준 목록 + 비디오 플레이어 연동. `src/lib/evidence/types.ts`의 `EvidenceMap` 타입을 사용하여 좌측에 루브릭 기준 목록(증거 유/무 아이콘), 우측에 선택된 증거의 타임스탬프/신뢰도를 표시. 하단에 커버리지 바(증거가 있는 기준 비율). `onSeekVideo(timestamp)` 콜백으로 비디오 플레이어 연동. 컬러: 신뢰도 80%+ teal, 60-80% amber, 60%- red.

- [ ] **Step 2: DerailerDashboard.tsx 생성**

탈선 탐지 서브탭 — 11개 패턴 게이지 + 상위 3개 위험 카드. `src/lib/derailer/types.ts`의 `DerailerProfile` 타입 사용. 반원형 게이지(0-10)로 각 패턴 위험도 표시, riskLevel별 색상(low=teal, moderate=amber, high=orange, critical=red). 상위 3개 topRisks를 하이라이트 카드로 강조. 각 증거 구간에 `onSeekVideo` 연동. developmentTip을 카드 하단에 표시.

- [ ] **Step 3: 커밋**

```bash
git add src/components/leadership/EvidenceMapView.tsx src/components/leadership/DerailerDashboard.tsx
git commit -m "feat: EvidenceMapView + DerailerDashboard — Step 3 서브탭 UI"
```

---

## Task 14: UI — BEITimeline + GrowthChart (Step 3 서브탭)

**Files:**
- Create: `src/components/leadership/BEITimeline.tsx`
- Create: `src/components/leadership/GrowthChart.tsx`

- [ ] **Step 1: BEITimeline.tsx 생성**

BEI 서브탭 — 수평 타임라인에 BEI 이벤트 마커. `src/lib/bei/types.ts`의 `BEIAnalysis` 타입 사용. 영상 길이 비례 X축, 각 이벤트를 원형 마커로 표시. 클릭 시 STAR 4요소 카드 확장(각 요소에 영상 구간 링크). 역량 코딩 태그(색상별). completeness % 표시. 차별화 역량에 별표 아이콘.

- [ ] **Step 2: GrowthChart.tsx 생성**

성장 추이 서브탭 — Recharts 라인 차트. `src/lib/growth/types.ts`의 `GrowthTimeline` 타입 사용. X축: 세션 날짜, Y축: 1-9점. 역량별 컬러 라인. 추세선(점선) 오버레이. 정체/돌파 역량 배지. 데이터 없으면 "2회 이상 평가 데이터 필요" 안내.

- [ ] **Step 3: 커밋**

```bash
git add src/components/leadership/BEITimeline.tsx src/components/leadership/GrowthChart.tsx
git commit -m "feat: BEITimeline + GrowthChart — Step 3 서브탭 UI"
```

---

## Task 15: UI — ValidationConsole + FairnessMonitor + ISOAuditView (Step 5)

**Files:**
- Create: `src/components/leadership/ValidationConsole.tsx`
- Create: `src/components/leadership/FairnessMonitor.tsx`
- Create: `src/components/leadership/ISOAuditView.tsx`

- [ ] **Step 1: ValidationConsole.tsx 생성**

타당화 콘솔 — 신뢰도 게이지(α, ICC), 문항 분석 테이블, 표본 크기 진행 바, 노름 테이블. `src/lib/validation/types.ts`의 `ReliabilityReport`, `NormTable` 타입 사용. α/ICC 게이지: 0.6 미만 빨강, 0.6-0.8 노랑, 0.8+ 초록. adequacy 배지(insufficient→exploratory→adequate→robust). 노름 테이블: 그룹별 백분위 히트맵. IndexedDB에서 데이터 로드하여 자동 분석.

- [ ] **Step 2: FairnessMonitor.tsx 생성**

공정성 모니터 — 전체 상태 배지(PASS/WARNING/FAIL), 집단별 점수 분포 박스플롯(Recharts), 4/5 비율 게이지(0.8 기준), 경고 알림 패널. `src/lib/fairness/types.ts`의 `FairnessReport` 타입 사용.

- [ ] **Step 3: ISOAuditView.tsx 생성**

ISO 감사 뷰 — 감사 로그 테이블(시간순), ISO 10667 체크리스트 10항목 진행률 바, 동의 현황 매트릭스(참여자 × 동의항목), 데이터 보존 정책 표시. `src/lib/audit-logger/types.ts`의 `AuditEntry` 타입 사용.

- [ ] **Step 4: 커밋**

```bash
git add src/components/leadership/ValidationConsole.tsx src/components/leadership/FairnessMonitor.tsx src/components/leadership/ISOAuditView.tsx
git commit -m "feat: ValidationConsole + FairnessMonitor + ISOAuditView — Step 5 관리자 UI"
```

---

## Task 16: UI — IntegratedReport (Step 4 심층 리포트)

**Files:**
- Create: `src/components/leadership/IntegratedReport.tsx`

- [ ] **Step 1: IntegratedReport.tsx 생성**

기존 AnalysisReport.tsx를 확장한 통합 리포트. 구조:
1. **밝은면 + 어두운면 통합 레이더**: Recharts RadarChart에 역량 점수(teal) + 탈선 위험도(amber, 반전 스케일) 동시 표시
2. **증거 링크 내장**: 각 역량 점수 옆 돋보기 아이콘 → 클릭 시 EvidenceMap 클립으로 이동
3. **BEI 핵심 사례 요약**: 상위 3개 STAR 요약 카드
4. **노름 비교**: 동일 직급 백분위 막대 (현재 위치 마커)
5. **삼각측정 표시**: AI점수/인간점수/최종점수 비교 테이블 (agreement 색상)
6. **즉시 코칭 피드백**: 강점 카드(teal) + 개발영역 카드(amber) + 이전 대비 비교 배지
7. **PDF 내보내기 버튼** (window.print 스타일링)

타입 의존: `EvidenceMap`, `DerailerProfile`, `BEIAnalysis`, `TriangulatedScore`, `CoachingFeedback`, `NormTable`

- [ ] **Step 2: 커밋**

```bash
git add src/components/leadership/IntegratedReport.tsx
git commit -m "feat: IntegratedReport — 밝은면+어두운면 통합 심층 리포트"
```

---

## Task 17: 통합 — LeadershipCoaching.tsx 확장

**Files:**
- Modify: `src/components/leadership/LeadershipCoaching.tsx`

- [ ] **Step 1: LeadershipCoaching.tsx 읽기**

현재 컴포넌트의 스텝 바 구조, 상태 관리, 서브 컴포넌트 import를 파악한다.

- [ ] **Step 2: 5단계 스텝 바로 확장**

기존 4단계(조 구성/영상 업로드/AI 분석/결과 리포트)를 5단계로 확장:
- Step 1: "동의/조 구성" — ConsentForm + HRConnectorPanel + 기존 GroupManager
- Step 2: "영상 업로드" — 기존 유지
- Step 3: "AI 분석" — 5개 서브탭 (역량평가/증거맵/탈선탐지/BEI/성장추이)
- Step 4: "심층 리포트" — IntegratedReport
- Step 5: "검증/관리" — ValidationConsole/FairnessMonitor/ISOAuditView

- [ ] **Step 3: Step 3 서브탭 네비게이션 추가**

Step 3 내에 수평 서브탭 바 추가:
```tsx
const ANALYSIS_SUBTABS = [
  { key: "competency", label: "역량평가", color: "teal" },
  { key: "evidence", label: "증거맵", color: "teal" },
  { key: "derailer", label: "탈선탐지", color: "orange" },
  { key: "bei", label: "BEI", color: "purple" },
  { key: "growth", label: "성장추이", color: "blue" },
];
```

- [ ] **Step 4: IndexedDB 마이그레이션 + 감사 로거 연결**

컴포넌트 마운트 시:
- `migrateFromLocalStorage()` 실행
- `setAuditPersistence(addAuditEntry)` 연결
- 세션 생성/점수 저장 시 `logAudit()` 호출

- [ ] **Step 5: 커밋**

```bash
git add src/components/leadership/LeadershipCoaching.tsx
git commit -m "feat: LeadershipCoaching 5단계 확장 — 서브탭 + IndexedDB + 감사로깅"
```

---

## Task 18: 커스텀 훅 — 모듈별 React 훅

**Files:**
- Create: `src/hooks/useEvidence.ts`
- Create: `src/hooks/useDerailer.ts`
- Create: `src/hooks/useBEI.ts`
- Create: `src/hooks/useGrowth.ts`
- Create: `src/hooks/useValidation.ts`
- Create: `src/hooks/useFairness.ts`
- Create: `src/hooks/useCompliance.ts`

- [ ] **Step 1: 7개 훅 생성**

각 훅은 동일 패턴: `useState` + `fetch` wrapper + loading/error 상태.

```typescript
// src/hooks/useEvidence.ts (대표 패턴)
"use client";
import { useState, useCallback } from "react";
import type { EvidenceMap } from "@/lib/evidence";

export function useEvidence() {
  const [evidenceMap, setEvidenceMap] = useState<EvidenceMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvidence = useCallback(async (
    videoId: string, indexId: string, competencyKey: string, score: number, rubricItems: { id: string; criteria: string }[]
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evidence/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, indexId, competencyKey, score, rubricItems }),
      });
      if (!res.ok) throw new Error("증거 매핑 실패");
      const data = await res.json();
      setEvidenceMap(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  return { evidenceMap, loading, error, fetchEvidence };
}
```

나머지 6개 훅도 동일 패턴으로 각 API 엔드포인트 호출.

- [ ] **Step 2: 커밋**

```bash
git add src/hooks/useEvidence.ts src/hooks/useDerailer.ts src/hooks/useBEI.ts src/hooks/useGrowth.ts src/hooks/useValidation.ts src/hooks/useFairness.ts src/hooks/useCompliance.ts
git commit -m "feat: 7개 커스텀 훅 — 모듈별 API 호출 래퍼"
```

---

## Task 19: 빌드 검증 + 최종 정리

**Files:**
- Modify: `.gitignore` (`.superpowers/` 추가)

- [ ] **Step 1: 빌드 확인**

```bash
npm run build
```
Expected: 빌드 성공. 타입 에러 있으면 수정.

- [ ] **Step 2: 전체 테스트 실행**

```bash
npm test
```
Expected: statistics 테스트 + assessment-store 테스트 전체 PASS.

- [ ] **Step 3: .gitignore 업데이트**

`.gitignore`에 `.superpowers/` 추가.

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore: 빌드 검증 + gitignore 정리"
```

- [ ] **Step 5: dev 서버 실행 + 화면 확인**

```bash
npm run dev
```
브라우저에서 리더십코칭 탭 진입 → 5단계 스텝 바 확인, Step 3 서브탭 확인.
