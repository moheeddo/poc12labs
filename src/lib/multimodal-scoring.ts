// =============================================
// 멀티모달 행동기반 채점 엔진 (역량별 · 루브릭 데이터 구동) v1.0
// 출처: 한수원_리더십_역량평가_루브릭_v1.0 AI 기술 정의서
//
// 핵심 설계 (파일럿 피드백 반영):
//   - 단일 출처(SSOT): ASSESSMENT_BY_KEY[competencyKey].mItems 의 band를 그대로 채점에 사용
//     → 역량(비전제시/구성원육성/신뢰형성)마다 자기 루브릭으로 채점 (피드백 ①)
//   - 필수지표(category=required & scoreReflected)만 채점, 참고지표는 표시만 (피드백 ③)
//   - M5(보조 항목, totalReflected=false)는 numeric score 미산출 → 총점 제외 (피드백 ②)
//   - 총점 = mean(채점 가능한 M1~M4), 채점 가능 항목 3개 이상일 때만 산출
//   - 점수 변환: 상위 3 · 중상 2 · 중하 1 · 미흡 0 → M_score = mean × 3 (0~9)
// =============================================

import { ASSESSMENT_BY_KEY } from "./leadership-rubric-data";
import type { OperatingBand, RubricIndicator, IndicatorCategory } from "./leadership-rubric-data";
import type { LeadershipCompetencyKey } from "./types";

// ─── 타입 정의 ───

export interface IndicatorJudgment {
  name: string;                  // 시스템 변수명
  label: string;                 // 고객용 지표명
  value: number | boolean | null;
  unit: string;
  category: IndicatorCategory;   // required | supplementary | conditional
  scoreReflected: boolean;       // 채점 반영 여부
  judgment: "상위" | "중상" | "중하" | "미흡" | "참고" | "N/A";
  score: 3 | 2 | 1 | 0 | null;
  band?: OperatingBand;          // 운영 밴드 (표시용)
  meaning: string;
}

export interface ItemScore {
  id: string;                    // m1 | m2 | m3 | m4 | m5
  name: string;                  // 고객용 항목명
  aiLabel: string;               // AI 영문명
  channel: string;               // 항목 코드 표기 (M1~M5)
  totalReflected: boolean;       // 총점 반영 여부 (M5만 false)
  indicators: IndicatorJudgment[];
  itemScore: number | null;      // 0~9 (M5·미채점·N/A는 null)
  naCount: number;
  observation: string;
}

export interface MultimodalScoreResult {
  competencyKey: string;
  competencyLabel: string;
  items: ItemScore[];
  totalScore: number | null;     // 0~9 or null (산출 보류)
  totalScore100: number | null;  // 100점 환산
  interpretation: string;        // 매우 우수 / 보통 이상 / 보통 미만 / 미흡 / 산출 보류
  scorableItemCount: number;     // 채점된 핵심(M1~M4) 항목 수
  coreItemCount: number;         // 총점 반영 대상 항목 수 (보통 4)
  naItems: string[];
  naSummary: Record<string, string>;  // 지표명 → N/A 사유
}

// 추출 신호: m-항목 코드(m1~m5) → 변수명 → 값
export type ChannelSignals = Record<string, number | boolean | string | null | undefined>;
export type ExtractedSignals = Record<string, ChannelSignals | undefined>;

// =============================================
// 밴드 문자열 인터프리터 (루브릭 band → 점수)
// 밴드 문자열(예: "70% 이상", "55~69%", "0.5 미만 또는 11.0 초과")을
// 파싱하여 값 → 3/2/1/0 으로 변환한다. 단일 출처는 루브릭 데이터.
// =============================================

const EPS = 1e-9;

// 한 밴드 tier 문자열 → 숫자 구간 목록
function parseTierIntervals(tier: string): Array<[number, number]> {
  const intervals: Array<[number, number]> = [];
  for (const part of tier.split("또는")) {
    const nums = (part.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (nums.length === 0) continue;
    if (/이상/.test(part)) intervals.push([nums[0], Infinity]);
    else if (/초과/.test(part)) intervals.push([nums[0] + EPS, Infinity]);
    else if (/이하/.test(part)) intervals.push([-Infinity, nums[0]]);
    else if (/미만/.test(part)) intervals.push([-Infinity, nums[0] - EPS]);
    else if (nums.length >= 2) intervals.push([Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])]);
    else intervals.push([nums[0], nums[0]]);
  }
  return intervals;
}

type BandShape = "higher" | "lower" | "range";

// 밴드 모양 판정: 미흡(poor) tier의 방향으로 결정
function detectBandShape(band: OperatingBand): BandShape {
  const all = [band.upper, band.midHigh, band.midLow, band.poor];
  if (all.some((b) => b.includes("또는"))) return "range";
  if (/미만|이하/.test(band.poor)) return "higher"; // 나쁜 끝이 낮은 값 → 높을수록 좋음
  if (/초과|이상/.test(band.poor)) return "lower";  // 나쁜 끝이 높은 값 → 낮을수록 좋음
  return "higher";
}

function tierLow(tier: string): number {
  const ivs = parseTierIntervals(tier);
  return ivs.length ? Math.min(...ivs.map((i) => i[0])) : -Infinity;
}
function tierHigh(tier: string): number {
  const ivs = parseTierIntervals(tier);
  return ivs.length ? Math.max(...ivs.map((i) => i[1])) : Infinity;
}

// 값이 어느 tier에 속하는지 (구간 멤버십 + gap 시 최근접 tier 스냅)
function scoreByRange(value: number, band: OperatingBand): 3 | 2 | 1 | 0 {
  const tiers: Array<{ score: 3 | 2 | 1 | 0; ivs: Array<[number, number]> }> = [
    { score: 3, ivs: parseTierIntervals(band.upper) },
    { score: 2, ivs: parseTierIntervals(band.midHigh) },
    { score: 1, ivs: parseTierIntervals(band.midLow) },
    { score: 0, ivs: parseTierIntervals(band.poor) },
  ];
  for (const t of tiers) {
    if (t.ivs.some(([lo, hi]) => value >= lo - EPS && value <= hi + EPS)) return t.score;
  }
  // gap (정수 밴드의 반올림 틈): 최근접 구간으로 스냅, 동률이면 보수적으로 낮은 점수
  // (평가 시스템 — 경계 중점에서 점수를 부풀리지 않음. 예: talk_ratio 55.5 → 중상)
  let best: { score: 3 | 2 | 1 | 0; dist: number } = { score: 0, dist: Infinity };
  for (const t of tiers) {
    for (const [lo, hi] of t.ivs) {
      const d = value < lo ? lo - value : value > hi ? value - hi : 0;
      if (d < best.dist - EPS || (Math.abs(d - best.dist) < EPS && t.score < best.score)) {
        best = { score: t.score, dist: d };
      }
    }
  }
  return best.score;
}

function scoreHigher(value: number, band: OperatingBand): 3 | 2 | 1 | 0 {
  if (value >= tierLow(band.upper)) return 3;
  if (value >= tierLow(band.midHigh)) return 2;
  if (value >= tierLow(band.midLow)) return 1;
  return 0;
}
function scoreLower(value: number, band: OperatingBand): 3 | 2 | 1 | 0 {
  if (value <= tierHigh(band.upper)) return 3;
  if (value <= tierHigh(band.midHigh)) return 2;
  if (value <= tierHigh(band.midLow)) return 1;
  return 0;
}

// 비율(%) 정규화: 추출 규약은 비율 지표를 0~1로 emit한다(extract 프롬프트 "비율 지표는 0.0~1.0").
// %단위 지표의 밴드는 0~100 스케일이므로 0~1 값은 ×100으로 맞춘다.
// 예) coverage 1%=0.01→1(미흡), 100%=1.0→100(상위). 빈도/초/ST/dB 등 카운트 단위는 정규화하지 않는다(unit!=="%").
function normalizeValue(value: number, ind: RubricIndicator): number {
  const isPercent = ind.unit === "%" || (ind.band ? /%/.test(ind.band.upper + ind.band.midHigh) : false);
  if (isPercent && Math.abs(value) <= 1.0) return value * 100;
  return value;
}

/**
 * 필수지표 1개를 루브릭 밴드 기준으로 채점 (3/2/1/0)
 * 단일 출처: 루브릭 데이터의 band 문자열을 직접 해석한다.
 */
export function scoreIndicatorByBand(value: number, ind: RubricIndicator): 3 | 2 | 1 | 0 | null {
  if (!ind.band) return null;
  if (value === null || value === undefined || isNaN(value)) return null;
  const v = normalizeValue(value, ind);
  switch (detectBandShape(ind.band)) {
    case "higher": return scoreHigher(v, ind.band);
    case "lower": return scoreLower(v, ind.band);
    case "range": return scoreByRange(v, ind.band);
  }
}

const JUDGMENT_MAP: Record<number, "상위" | "중상" | "중하" | "미흡"> = {
  3: "상위", 2: "중상", 1: "중하", 0: "미흡",
};

// =============================================
// 채점 엔진 (역량별)
// =============================================

/**
 * 추출된 멀티모달 신호를 해당 역량의 루브릭으로 채점
 * @param signals  m-항목 코드(m1~m5) → 변수명 → 값
 * @param competencyKey  visionPresentation | trustBuilding | memberDevelopment
 */
export function scoreMultimodalSignals(
  signals: ExtractedSignals,
  competencyKey: LeadershipCompetencyKey | string,
): MultimodalScoreResult {
  const data = ASSESSMENT_BY_KEY[competencyKey];
  const naSummary: Record<string, string> = {};

  // 역량 정의가 없으면 빈 결과 (방어)
  if (!data) {
    return {
      competencyKey: String(competencyKey),
      competencyLabel: String(competencyKey),
      items: [], totalScore: null, totalScore100: null, interpretation: "산출 보류",
      scorableItemCount: 0, coreItemCount: 0, naItems: [], naSummary: {},
    };
  }

  const items: ItemScore[] = data.mItems.map((m) => {
    const code = m.code.toLowerCase();
    const channelData = signals[code];
    const observation = (channelData?.observation as string) || "";

    const indicators: IndicatorJudgment[] = m.indicators.map((ind) => {
      const rawValue = channelData?.[ind.variableName];
      const isScorable = ind.category === "required" && ind.scoreReflected && !!ind.band;

      // 참고지표(상시/조건부/내부): 표시만, 채점 안 함
      if (!isScorable) {
        const numVal = typeof rawValue === "number" ? rawValue : null;
        const boolVal = typeof rawValue === "boolean" ? rawValue : null;
        return {
          name: ind.variableName, label: ind.customerLabel,
          value: numVal !== null ? numVal : boolVal,
          unit: ind.unit || "", category: ind.category, scoreReflected: false,
          judgment: rawValue === undefined || rawValue === null ? "N/A" : "참고",
          score: null, band: ind.band, meaning: ind.meaning,
        };
      }

      // 필수지표: 채점
      const value = typeof rawValue === "number" ? rawValue : null;
      if (value === null) {
        naSummary[ind.variableName] = !channelData
          ? `${m.code} 채널 데이터 미제공`
          : `${ind.customerLabel} 값 산출 불가`;
        return {
          name: ind.variableName, label: ind.customerLabel, value: null,
          unit: ind.unit || "", category: ind.category, scoreReflected: true,
          judgment: "N/A", score: null, band: ind.band, meaning: ind.meaning,
        };
      }
      const score = scoreIndicatorByBand(value, ind);
      return {
        name: ind.variableName, label: ind.customerLabel, value,
        unit: ind.unit || "", category: ind.category, scoreReflected: true,
        judgment: score !== null ? JUDGMENT_MAP[score] : "N/A",
        score, band: ind.band, meaning: ind.meaning,
      };
    });

    // 항목 점수: 채점 대상(필수·scoreReflected) 지표만 평균 × 3
    // M5(totalReflected=false)는 채점 대상 지표가 없으므로 자연히 null → 총점 제외
    const scored = indicators.filter((i) => i.scoreReflected && i.score !== null);
    const naCount = indicators.filter((i) => i.scoreReflected && i.score === null).length;
    let itemScore: number | null = null;
    if (m.totalReflected && scored.length > 0) {
      const avg = scored.reduce((s, i) => s + (i.score || 0), 0) / scored.length;
      itemScore = Math.min(9, Math.round(avg * 3 * 10) / 10);
    }

    return {
      id: code, name: m.customerLabel, aiLabel: m.aiLabel, channel: m.code,
      totalReflected: m.totalReflected, indicators, itemScore, naCount, observation,
    };
  });

  // 총점: 총점 반영(M1~M4) 항목 중 채점 가능한 것의 평균, 3개 이상일 때만
  const coreItems = items.filter((i) => i.totalReflected);
  const scorableItems = coreItems.filter((i) => i.itemScore !== null);
  const naItems = coreItems.filter((i) => i.itemScore === null).map((i) => i.name);

  let totalScore: number | null = null;
  let totalScore100: number | null = null;
  let interpretation = "산출 보류";

  if (scorableItems.length >= 3) {
    totalScore = Math.round(
      (scorableItems.reduce((s, i) => s + (i.itemScore || 0), 0) / scorableItems.length) * 10,
    ) / 10;
    totalScore100 = Math.round((totalScore / 9) * 100);
    if (totalScore >= 7.5) interpretation = "매우 우수";
    else if (totalScore >= 5.5) interpretation = "보통 이상";
    else if (totalScore >= 3.0) interpretation = "보통 미만";
    else interpretation = "미흡";
  }

  return {
    competencyKey: String(competencyKey),
    competencyLabel: data.label,
    items,
    totalScore,
    totalScore100,
    interpretation,
    scorableItemCount: scorableItems.length,
    coreItemCount: coreItems.length,
    naItems,
    naSummary,
  };
}
