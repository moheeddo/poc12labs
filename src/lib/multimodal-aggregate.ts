// =============================================
// N차수 반복 진단 집계 엔진 v1.0
// 출처: 영상진단 파일럿 결과보고(26.6.18) — "진단할 때마다 점수가 바뀜(B부장 7.9→7.7)"
//   → "영상을 N차수 진단하여 최빈값/평균값 산출하여 객관성 확보 필요"
//
// 같은 영상·같은 역량을 N회 진단한 결과를 모아 항목·총점의
// 평균/중앙값/최빈값/표준편차를 산출하고 진단 일관성을 등급화한다.
// HITL(Human-in-the-loop): 분산이 크면 전문가 검토를 강제하는 신호로 사용.
// =============================================

import type { MultimodalScoreResult } from "./multimodal-scoring";

export type ConsistencyLevel = "높음" | "보통" | "낮음";

export interface AggregateStat {
  mean: number;
  median: number;   // 대표값 (강건 — 이상치 회차에 둔감)
  mode: number;     // 0.5 단위 버킷 최빈값
  stdev: number;    // 표본표준편차
  sem: number;      // 평균의 표준오차 = stdev / √n
  ci95: [number, number]; // 평균의 95% 신뢰구간 (소표본 t-분포 적용, 0~9 clamp)
  min: number;
  max: number;
  range: number;    // max - min
  n: number;        // 유효 표본 수
}

export interface AggregatedItem {
  id: string;
  name: string;
  channel: string;
  totalReflected: boolean;
  runs: (number | null)[];   // 회차별 itemScore
  stat: AggregateStat | null; // 유효 표본 없으면 null
}

export interface AggregatedScore {
  competencyKey: string;
  competencyLabel: string;
  runCount: number;
  totalRuns: (number | null)[];     // 회차별 총점
  total: AggregateStat | null;       // 총점 집계
  items: AggregatedItem[];
  consistency: {
    level: ConsistencyLevel;
    stdev: number;          // 총점 표준편차
    range: number;          // 총점 최대-최소
    label: string;          // 사람이 읽는 설명
    requiresReview: boolean; // HITL 검토 권고 여부
  };
  interpretation: string;   // 평균 기준 해석 등급
  representativeIndex: number; // 중앙값에 가장 가까운 회차 인덱스 (상세 지표 표시용)
}

// ─── 기초 통계 ───

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 0.5 단위 버킷 최빈값 (연속 점수의 최빈값 근사). 동률이면 평균에 가까운 버킷.
function mode(xs: number[]): number {
  const buckets = new Map<number, number>();
  for (const x of xs) {
    const b = Math.round(x * 2) / 2;
    buckets.set(b, (buckets.get(b) || 0) + 1);
  }
  const mu = mean(xs);
  let best = xs[0];
  let bestCount = -1;
  for (const [b, c] of buckets) {
    if (c > bestCount || (c === bestCount && Math.abs(b - mu) < Math.abs(best - mu))) {
      best = b;
      bestCount = c;
    }
  }
  return best;
}

// 표본표준편차 (n-1 보정 — 회차를 표본으로 봄)
function sampleStdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mu = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - mu) ** 2, 0) / (xs.length - 1));
}

// 소표본 95% 신뢰구간용 t-값 (df = n-1). 회차 수가 적으므로 t-분포 사용.
// 표에 없는 큰 n은 가장 가까운 하위 df로 보수적 폴백(과신 방지). 1.96(z)으로 떨어지지 않음.
function tValue95(n: number): number {
  const table: Record<number, number> = {
    2: 12.71, 3: 4.30, 4: 3.18, 5: 2.78, 6: 2.57, 7: 2.45, 8: 2.36, 9: 2.31, 10: 2.26,
    12: 2.20, 15: 2.14, 20: 2.09, 25: 2.06, 30: 2.04,
  };
  if (table[n]) return table[n];
  // 표 미정의 구간: 가장 가까운 하위(보수적으로 큰 t) 사용
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  let t = 2.04;
  for (const k of keys) if (k <= n) t = table[k];
  return n > 30 ? 2.0 : t; // df>30이면 정규근사에 충분히 근접
}

function clamp09(x: number): number {
  return Math.max(0, Math.min(9, x));
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function computeStat(values: (number | null)[]): AggregateStat | null {
  const xs = values.filter((v): v is number => v !== null && !isNaN(v));
  if (xs.length === 0) return null;
  const mu = mean(xs);
  const sd = sampleStdev(xs);
  const sem = xs.length >= 2 ? sd / Math.sqrt(xs.length) : 0;
  const margin = tValue95(xs.length) * sem;
  return {
    mean: round1(mu),
    median: round1(median(xs)),
    mode: round1(mode(xs)),
    stdev: Math.round(sd * 100) / 100,
    sem: Math.round(sem * 100) / 100,
    ci95: [round1(clamp09(mu - margin)), round1(clamp09(mu + margin))],
    min: round1(Math.min(...xs)),
    max: round1(Math.max(...xs)),
    range: round1(Math.max(...xs) - Math.min(...xs)),
    n: xs.length,
  };
}

function interpret(score: number): string {
  if (score >= 7.5) return "매우 우수";
  if (score >= 5.5) return "보통 이상";
  if (score >= 3.0) return "보통 미만";
  if (score > 0) return "미흡";
  return "산출 보류";
}

// 총점 표준편차(0~9 scale) → 일관성 등급
// 0~9 척도에서 σ<0.5(≈±5.5점/100) 높음, σ<1.0 보통, 그 이상 낮음
function consistencyLevel(sd: number): ConsistencyLevel {
  if (sd < 0.5) return "높음";
  if (sd < 1.0) return "보통";
  return "낮음";
}

/**
 * N회 진단 결과를 집계 (평균·중앙값·최빈값·표준편차 + 일관성 등급)
 * @param results 같은 영상·같은 역량에 대한 N회 채점 결과
 */
export function aggregateRuns(results: MultimodalScoreResult[]): AggregatedScore {
  const base = results[0];
  const competencyKey = base?.competencyKey || "";
  const competencyLabel = base?.competencyLabel || "";

  // 총점 집계
  const totalRuns = results.map((r) => r.totalScore);
  const total = computeStat(totalRuns);
  // 판정용 원시값(반올림 전) — 표시는 반올림값, 등급/대표회차 판정은 원시값으로 분리
  const validTotals = totalRuns.filter((v): v is number => v !== null && !isNaN(v));
  const rawSd = sampleStdev(validTotals);
  const rawMedian = validTotals.length ? median(validTotals) : 0;

  // 항목 집계 — base의 항목 구조 기준, 회차별 itemScore 수집
  const items: AggregatedItem[] = (base?.items || []).map((bi) => {
    const runs = results.map((r) => r.items.find((it) => it.id === bi.id)?.itemScore ?? null);
    return {
      id: bi.id,
      name: bi.name,
      channel: bi.channel,
      totalReflected: bi.totalReflected,
      runs,
      stat: computeStat(runs),
    };
  });

  const sd = total?.stdev ?? 0;          // 표시용(반올림)
  const range = total?.range ?? 0;
  const level = total ? consistencyLevel(rawSd) : "낮음"; // 판정은 원시 stdev (경계 뒤집힘 방지)
  const requiresReview = level === "낮음";
  const consistencyLabelMap: Record<ConsistencyLevel, string> = {
    높음: `회차 간 총점 표준편차 ${sd.toFixed(2)}점 — 진단이 안정적입니다.`,
    보통: `회차 간 총점 표준편차 ${sd.toFixed(2)}점 — 대체로 일관되나 일부 변동이 있습니다.`,
    낮음: `회차 간 총점 표준편차 ${sd.toFixed(2)}점(범위 ${range.toFixed(1)}점) — 변동이 커 전문가 검토가 필요합니다.`,
  };

  // 중앙값에 가장 가까운 회차 = 대표 회차 (강건 — 원시 median 기준, 상세 지표/보고서 표시용)
  let representativeIndex = 0;
  if (total) {
    let bestDist = Infinity;
    totalRuns.forEach((t, i) => {
      if (t === null) return;
      const d = Math.abs(t - rawMedian);
      if (d < bestDist) { bestDist = d; representativeIndex = i; }
    });
  }

  return {
    competencyKey,
    competencyLabel,
    runCount: results.length,
    totalRuns,
    total,
    items,
    consistency: {
      level,
      stdev: sd,
      range,
      label: consistencyLabelMap[level],
      requiresReview,
    },
    // 대표값(중앙값) 기준 해석 — UI headline(중앙값)과 등급·색을 동일 통계량에서 파생
    interpretation: total ? interpret(total.median) : "산출 보류",
    representativeIndex,
  };
}
