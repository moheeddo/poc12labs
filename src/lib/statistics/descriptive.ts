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
  const m1 = mean(group1), m2 = mean(group2);
  const sd1 = sampleStandardDeviation(group1), sd2 = sampleStandardDeviation(group2);
  const pooledSD = Math.sqrt(((group1.length - 1) * sd1 ** 2 + (group2.length - 1) * sd2 ** 2) / (group1.length + group2.length - 2));
  if (pooledSD === 0) return 0;
  return Math.abs(m1 - m2) / pooledSD;
}
export function pearsonR(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const mx = mean(x), my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; dx2 += dx ** 2; dy2 += dy ** 2;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}
export function percentiles(values: number[]): { p10: number; p25: number; p50: number; p75: number; p90: number; mean: number; sd: number } {
  return { p10: percentile(values, 10), p25: percentile(values, 25), p50: percentile(values, 50), p75: percentile(values, 75), p90: percentile(values, 90), mean: mean(values), sd: sampleStandardDeviation(values) };
}
