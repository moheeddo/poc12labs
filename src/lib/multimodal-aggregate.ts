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

// =============================================
// 적응형 반복진단 파라미터 — 시뮬레이션(scripts/n-run-simulation, 2026-06-19)으로 도출
//   · 한계효용 무릎(knee) = 3회: SEM 누적감소 42%, 3→4회 한계감소 7.7%p로 급락
//   · 5회: 누적 55% · 7회: 62%(한계감소<3%p, 비용 대비 무의미) → 상한 7
//   · 고정 N으로 정밀도 보장 불가(σ별 필요 N 상이) → 신뢰구간 게이트 순차 반복
//   · 밴드 경계 사례는 N=7로도 오분류 ~30% → CI가 등급 경계를 가로지르면 HITL 강제
// =============================================
export const RECOMMENDED_RUNS = 3;     // 기본 출발 회차 (한계효용 무릎)
export const MAX_RUNS = 7;              // 비용 상한 (한계감소<3%p)
export const PRECISION_TARGET = 0.5;   // 목표 95% CI 반폭 (0~9 척도 ≈ 100점 환산 ±5.5)
const BAND_CUTS = [3.0, 5.5, 7.5];     // 해석 밴드 경계 (미흡|보통미만|보통이상|매우우수)

export type RecommendationStatus = "sufficient" | "more_runs" | "hitl_required";
export interface DiagnosisRecommendation {
  status: RecommendationStatus;
  ciHalfWidth: number | null;   // 95% CI 반폭 (정밀도 지표)
  straddlesBand: boolean;       // CI가 등급 경계를 가로지르는가 (경계 사례)
  suggestedTotalRuns: number;   // 권장 누적 회차
  message: string;
}

export interface AggregateStat {
  mean: number;
  median: number;   // 대표값 (강건 — 이상치 회차에 둔감)
  mode: number;     // 0.5 단위 버킷 최빈값
  stdev: number;    // 표본표준편차
  sem: number;      // 평균의 표준오차 = stdev / √n
  ciHalfRaw: number; // 95% CI 반폭(t·sem, 0~9 clamp 전 원시값) — 정밀도 게이트용
  ci95: [number, number]; // 평균의 95% 신뢰구간 (소표본 t-분포 적용, 0~9 clamp, 표시용)
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
  recommendation: DiagnosisRecommendation; // 적응형 반복진단 권고 (신뢰구간 게이트)
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
  const med = median(xs);
  const sd = sampleStdev(xs);
  const sem = xs.length >= 2 ? sd / Math.sqrt(xs.length) : 0;
  const margin = tValue95(xs.length) * sem;
  return {
    mean: round1(mu),
    median: round1(med),
    mode: round1(mode(xs)),
    stdev: Math.round(sd * 100) / 100,
    sem: Math.round(sem * 100) / 100,
    // 정밀도 판정용 비클램프 반폭(t·sem) — clamp 전 원시값을 게이트에 써야
    // fail-open(최상·최하위자 '추가진단 불필요' 오판) 방지
    ciHalfRaw: Math.round(margin * 100) / 100,
    // ci95는 헤드라인(중앙값)을 중심으로 표시 — 표시 CI = 판정구간 = 헤드라인을 단일 통계량으로 통일
    // (평균 중심이면 비대칭 분포에서 표시 CI와 straddle 판정구간이 갈라져 자기모순 발생)
    ci95: [round1(clamp09(med - margin)), round1(clamp09(med + margin))],
    min: round1(Math.min(...xs)),
    max: round1(Math.max(...xs)),
    range: round1(Math.max(...xs) - Math.min(...xs)),
    n: xs.length,
  };
}

// 실제 산출된 점수(0 포함)는 등급으로 해석 — '산출 보류'는 total=null일 때만(호출부에서 분기)
function interpret(score: number): string {
  if (score >= 7.5) return "매우 우수";
  if (score >= 5.5) return "보통 이상";
  if (score >= 3.0) return "보통 미만";
  return "미흡";
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

  // ── 적응형 반복진단 권고 (신뢰구간 게이트 + 경계 HITL 에스컬레이션) ──
  // 정밀도는 clamp 전 원시 반폭(ciHalfRaw) 사용 — 최상·최하위 점수에서 ci95 clamp로 좁아져
  // 'sufficient'로 새는 fail-open 방지.
  const ciHalf = total ? total.ciHalfRaw : null;
  // straddle은 헤드라인(중앙값)과 동일 통계량 기준 — median 중심 ±CI반폭. 경계에 '닿는' 경우 포함.
  // 단 분산 0(ciHalf=0, 완전 일관)인데 median이 경계에 정확히 앉은 경우는 안정적이므로 HITL 제외.
  const medLo = total && ciHalf !== null ? total.median - ciHalf : 0;
  const medHi = total && ciHalf !== null ? total.median + ciHalf : 0;
  const straddlesBand = total && ciHalf !== null && ciHalf > 0
    ? BAND_CUTS.some((c) => medLo <= c && medHi >= c)
    : false;
  const n = results.length;
  let recommendation: DiagnosisRecommendation;
  // 회차 부족 가드: n<3이면 표본분산이 없거나(퇴화 CI) 무릎(knee) 미만이라
  // 정밀도를 '증명'할 수 없음 — 영점분산을 영점불확실성으로 단정하지 않도록 'sufficient' 차단.
  const validN = total ? total.n : 0;
  if (!total || validN < RECOMMENDED_RUNS) {
    // 일부 회차가 N/A라 유효표본이 부족할 수 있으므로(runCount는 이미 클 수 있음),
    // 권장 누적회차는 현재 회차보다 항상 크게 잡아 '추가 진단' 버튼이 사라지는 막다른 길 방지.
    const suggested = Math.min(MAX_RUNS, Math.max(RECOMMENDED_RUNS, n + 1));
    recommendation = { status: n >= MAX_RUNS ? "hitl_required" : "more_runs", ciHalfWidth: total ? ciHalf : null, straddlesBand: false, suggestedTotalRuns: suggested,
      message: !total
        ? `채점 가능 항목 부족 — 최소 ${RECOMMENDED_RUNS}회 진단으로 객관성 확보를 권장합니다.`
        : n >= MAX_RUNS
          ? `유효 채점 회차가 ${validN}회뿐입니다(다수 회차 N/A). 전문가(코치) 검토·확정이 필요합니다.`
          : `유효 채점 회차가 ${validN}회로 부족합니다. ${suggested}회까지 추가 진단을 권장합니다.` };
  } else if (straddlesBand) {
    recommendation = { status: "hitl_required", ciHalfWidth: ciHalf, straddlesBand: true, suggestedTotalRuns: n,
      message: `신뢰구간(${total.ci95[0].toFixed(1)}~${total.ci95[1].toFixed(1)})이 등급 경계를 가로지릅니다. 반복만으로 해소되지 않는 경계 사례 — 전문가(코치) 확정이 필요합니다.` };
  } else if (ciHalf !== null && ciHalf <= PRECISION_TARGET) {
    recommendation = { status: "sufficient", ciHalfWidth: ciHalf, straddlesBand: false, suggestedTotalRuns: n,
      message: `목표 정밀도 달성(95% CI ±${ciHalf.toFixed(2)} ≤ ±${PRECISION_TARGET}). 추가 진단 없이 신뢰할 수 있습니다.` };
  } else if (n < MAX_RUNS) {
    const next = Math.min(MAX_RUNS, n + 2);
    recommendation = { status: "more_runs", ciHalfWidth: ciHalf, straddlesBand: false, suggestedTotalRuns: next,
      message: `정밀도 미달(95% CI ±${ciHalf?.toFixed(2)} > ±${PRECISION_TARGET}). ${next}회까지 추가 진단을 권장합니다.` };
  } else {
    recommendation = { status: "hitl_required", ciHalfWidth: ciHalf, straddlesBand: false, suggestedTotalRuns: MAX_RUNS,
      message: `최대 ${MAX_RUNS}회에도 변동이 큽니다(95% CI ±${ciHalf?.toFixed(2)}). 전문가(코치) 검토·확정이 필요합니다.` };
  }

  return {
    competencyKey,
    competencyLabel,
    runCount: results.length,
    totalRuns,
    total,
    items,
    recommendation,
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
