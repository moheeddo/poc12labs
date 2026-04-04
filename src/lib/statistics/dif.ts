import { mean } from "./descriptive";
export function fourFifthsRule(passRates: Record<string, number>): { ratio: number; impacted: boolean; referenceGroup: string; focalGroup: string } {
  const entries = Object.entries(passRates);
  if (entries.length < 2) return { ratio: 1, impacted: false, referenceGroup: "", focalGroup: "" };
  entries.sort((a, b) => b[1] - a[1]);
  const [refGroup, refRate] = entries[0];
  const [focalGroup, focalRate] = entries[entries.length - 1];
  const ratio = refRate === 0 ? 0 : focalRate / refRate;
  return { ratio, impacted: ratio < 0.8, referenceGroup: refGroup, focalGroup };
}
export function mantelHaenszel(responses: number[], groupVar: number[], scoreVar: number[]): { chi2: number; pValue: number; deltaMH: number; classification: "A" | "B" | "C" } {
  const n = responses.length;
  if (n < 6) return { chi2: 0, pValue: 1, deltaMH: 0, classification: "A" };
  const sorted = [...scoreVar].sort((a, b) => a - b);
  const t1 = sorted[Math.floor(n / 3)], t2 = sorted[Math.floor((2 * n) / 3)];
  const strata = scoreVar.map((s) => (s <= t1 ? 0 : s <= t2 ? 1 : 2));
  const median = mean(responses);
  let numerator = 0, denominator = 0, alphaSum = 0, alphaDenom = 0;
  for (let stratum = 0; stratum < 3; stratum++) {
    const idx = strata.map((s, i) => (s === stratum ? i : -1)).filter((i) => i >= 0);
    if (idx.length < 2) continue;
    const T = idx.length;
    let a = 0, b = 0, c = 0, d = 0;
    for (const i of idx) {
      const isGroup0 = groupVar[i] === 0, isHigh = responses[i] >= median;
      if (isGroup0 && isHigh) a++; else if (isGroup0 && !isHigh) b++;
      else if (!isGroup0 && isHigh) c++; else d++;
    }
    const expectedA = ((a + b) * (a + c)) / T;
    numerator += a - expectedA;
    const varA = ((a + b) * (c + d) * (a + c) * (b + d)) / (T * T * (T - 1 || 1));
    denominator += varA;
    alphaSum += (a * d) / (T || 1);
    alphaDenom += (b * c) / (T || 1);
  }
  const chi2 = denominator === 0 ? 0 : (Math.abs(numerator) - 0.5) ** 2 / denominator;
  const pValue = chi2 === 0 ? 1 : Math.exp(-chi2 / 2);
  const alphaMH = alphaDenom === 0 ? 1 : alphaSum / alphaDenom;
  const deltaMH = alphaMH <= 0 ? 0 : Math.abs(-2.35 * Math.log(alphaMH));
  const classification: "A" | "B" | "C" = deltaMH < 1.0 ? "A" : deltaMH < 1.5 ? "B" : "C";
  return { chi2, pValue, deltaMH, classification };
}
