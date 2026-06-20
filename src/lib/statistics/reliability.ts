import { mean, sampleStandardDeviation, pearsonR } from "./descriptive";

// F(0.975; m, m) 임계값 테이블 — ICC(2,1) k=2에서 자유도 df1=df2=m=n-1.
// 소표본 신뢰구간 정확도를 위해 자유도 의존 임계값을 제공(고정 상수 3.84 대체).
const F975_EQUAL: Record<number, number> = {
  1: 647.79, 2: 39.0, 3: 15.44, 4: 9.6, 5: 7.15, 6: 5.82, 7: 4.99, 8: 4.43,
  9: 4.03, 10: 3.72, 12: 3.28, 15: 2.86, 20: 2.46, 24: 2.27, 30: 2.07,
  40: 1.88, 60: 1.67, 120: 1.43,
};
function fQuantile975Equal(m: number): number {
  if (m <= 1) return F975_EQUAL[1];
  if (F975_EQUAL[m]) return F975_EQUAL[m];
  const keys = Object.keys(F975_EQUAL).map(Number).sort((a, b) => a - b);
  if (m >= keys[keys.length - 1]) return F975_EQUAL[keys[keys.length - 1]];
  let lo = keys[0], hi = keys[keys.length - 1];
  for (const key of keys) if (key <= m) lo = key;
  for (let i = keys.length - 1; i >= 0; i--) if (keys[i] >= m) hi = keys[i];
  if (lo === hi) return F975_EQUAL[lo];
  const t = (m - lo) / (hi - lo);
  return F975_EQUAL[lo] + t * (F975_EQUAL[hi] - F975_EQUAL[lo]);
}

export function cronbachAlpha(itemScores: number[][]): number {
  const n = itemScores.length;
  if (n < 2) return 0;
  const k = itemScores[0].length;
  if (k < 2) return 0;
  const itemVariances: number[] = [];
  for (let j = 0; j < k; j++) {
    const col = itemScores.map((row) => row[j]);
    itemVariances.push(sampleStandardDeviation(col) ** 2);
  }
  const totals = itemScores.map((row) => row.reduce((s, v) => s + v, 0));
  const totalVariance = sampleStandardDeviation(totals) ** 2;
  if (totalVariance === 0) return 0;
  const sumItemVariance = itemVariances.reduce((s, v) => s + v, 0);
  return (k / (k - 1)) * (1 - sumItemVariance / totalVariance);
}
export function icc21(rater1: number[], rater2: number[]): { value: number; ci95: [number, number] } {
  const n = rater1.length;
  if (n < 3) return { value: 0, ci95: [0, 0] };
  const k = 2;
  const grandMean = mean([...rater1, ...rater2]);
  let SSR = 0;
  for (let i = 0; i < n; i++) {
    const subjectMean = (rater1[i] + rater2[i]) / k;
    SSR += k * (subjectMean - grandMean) ** 2;
  }
  const MSR = SSR / (n - 1);
  const rater1Mean = mean(rater1), rater2Mean = mean(rater2);
  const SSC = n * ((rater1Mean - grandMean) ** 2 + (rater2Mean - grandMean) ** 2);
  const MSC = SSC / (k - 1);
  let SSE = 0;
  for (let i = 0; i < n; i++) {
    const subjectMean = (rater1[i] + rater2[i]) / k;
    SSE += (rater1[i] - subjectMean - rater1Mean + grandMean) ** 2;
    SSE += (rater2[i] - subjectMean - rater2Mean + grandMean) ** 2;
  }
  const dfE = (n - 1) * (k - 1);
  const MSE = dfE > 0 ? SSE / dfE : 0;
  const denom = MSR + (k - 1) * MSE + (k * (MSC - MSE)) / n;
  const iccValue = denom === 0 ? 0 : (MSR - MSE) / denom;
  const F = MSR / (MSE || 1);
  // ICC(2,1) 95% CI는 자유도 의존 F 임계값을 써야 한다. k=2면 df1=df2=n-1이므로 F(0.975; m, m).
  // 이전 고정 상수 3.84(≈χ²(1) 임계, m≈9.5에서만 근사)는 소표본서 CI를 과도하게 좁게 만들었다.
  const Fc = fQuantile975Equal(n - 1);
  const FL = F / Fc;
  const FU = F * Fc;
  const ciLow = Math.max(0, (FL - 1) / (FL + k - 1));
  const ciHigh = Math.min(1, (FU - 1) / (FU + k - 1));
  return { value: Math.max(0, Math.min(1, iccValue)), ci95: [Math.max(0, ciLow), Math.min(1, ciHigh)] };
}
export function itemTotalCorrelation(itemScores: number[][], itemIndex: number): number {
  const n = itemScores.length, k = itemScores[0].length;
  if (n < 3 || k < 2) return 0;
  const itemCol = itemScores.map((row) => row[itemIndex]);
  const restTotals = itemScores.map((row) => row.reduce((s, v, j) => (j === itemIndex ? s : s + v), 0));
  return pearsonR(itemCol, restTotals);
}
export function alphaIfDeleted(itemScores: number[][], deleteIndex: number): number {
  const reduced = itemScores.map((row) => row.filter((_, j) => j !== deleteIndex));
  return cronbachAlpha(reduced);
}
