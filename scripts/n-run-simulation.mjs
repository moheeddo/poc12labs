// =============================================================
// N차 반복 진단 최적 횟수·오차범위 시뮬레이션 (특허 근거 · 재현 가능)
// 실행: node scripts/n-run-simulation.mjs
//
// 모델: 잠재 진점수(latent true score) + 회차별 관측 노이즈(모델 확률성 + 측정 모호함).
//   총점 = 핵심 4개 항목(M1~M4) 평균. 항목 독립 가정 시 σ_total = σ_item / 2.
// 목적: (A) SEM·95%CI 반폭의 N 의존성, (B) 목표 정밀도 달성 최소 N,
//       (C) 등급 경계 사례의 N별 오분류율, (D) 한계효용 곡선 → 최적 N·상한 도출.
// 결과 요약(2026-06-19):
//   · 한계효용 무릎 = 3회(누적 SEM 감소 42%); 5회 55%; 7회 62%(한계감소<3%p) → 상한 7
//   · 고정 N으로 정밀도 보장 불가(σ=0.2→3, 0.4→5, 0.6→10) → 신뢰구간 게이트 순차 반복
//   · 밴드 경계 사례는 N=7에도 오분류 ~30% → CI가 등급 경계 가로지르면 HITL 강제
// =============================================================
function randn() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const T95 = { 2: 12.71, 3: 4.30, 4: 3.18, 5: 2.78, 6: 2.57, 7: 2.45, 8: 2.36, 9: 2.31, 10: 2.26 };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const clamp09 = (x) => Math.max(0, Math.min(9, x));

const TRIALS = 20000;
const sigmas = [0.2, 0.4, 0.6, 0.8, 1.0];
const Ns = [1, 2, 3, 4, 5, 6, 7, 8, 10];
const trueTotal = 6.4;
const tau = 0.5;

console.log("=== D. 한계효용 곡선 (SEM 감소율, σ=1.0 정규화) — 최적 N 근거 ===");
let p = null;
for (const N of Ns) {
  const sem = 1 / Math.sqrt(N), red = (1 - sem) * 100, marg = p !== null ? (p - sem) * 100 : NaN;
  console.log(`N=${N}: SEM=${sem.toFixed(3)} 누적감소=${red.toFixed(1)}% 한계감소=${isNaN(marg) ? "-" : marg.toFixed(1) + "%p"}`);
  p = sem;
}

console.log("\n=== B. 최소 N: 95%CI 반폭 ≤ 0.5 (σ별) — 고정 N 한계 근거 ===");
for (const sig of sigmas) {
  let opt = null;
  for (const N of [2, 3, 4, 5, 6, 7, 8, 10]) { const t = T95[N] || 1.96; if (t * sig / Math.sqrt(N) <= tau) { opt = N; break; } }
  console.log(`σ=${sig.toFixed(1)} → 최소 N = ${opt ?? ">10"}`);
}

console.log("\n=== C. 등급 경계(5.6) 오분류율 — 경계 HITL 에스컬레이션 근거 ===");
for (const sig of [0.4, 0.6, 0.8]) {
  let line = `σ=${sig.toFixed(1)}: `;
  for (const N of [1, 3, 5, 7]) {
    let mis = 0;
    for (let it = 0; it < TRIALS; it++) {
      const runs = []; for (let k = 0; k < N; k++) runs.push(clamp09(5.6 + sig * randn()));
      const md = median(runs); if (!(md >= 5.5 && md < 7.5)) mis++;
    }
    line += `N=${N}:${(100 * mis / TRIALS).toFixed(1)}%  `;
  }
  console.log(line);
}
void trueTotal;
