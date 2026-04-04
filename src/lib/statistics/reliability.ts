import { mean, sampleStandardDeviation, pearsonR } from "./descriptive";
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
  const FL = F / 3.84;
  const FU = F * 3.84;
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
