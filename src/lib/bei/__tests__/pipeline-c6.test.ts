import { describe, it, expect } from "vitest";
import { parseSTARFromResponse, scoreSTARQuality } from "@/lib/bei/star-parser";
import { DERAILER_PATTERNS } from "@/lib/derailer/derailer-patterns";

// 사이클6/7 핵심 분석 파이프라인 회귀 잠금

describe("STAR 파서 — 라인시작 앵커(단일문자 오매칭 방지) (사이클6)", () => {
  it("상황 텍스트의 stray 'A:'가 행동(action) 섹션으로 오매칭되지 않는다", () => {
    const md = [
      "상황: 냉각 계통 경보 발생. (질문 A: 무엇이 문제인가?) 02:15",
      "과제: 원인 파악 03:00",
      "행동: 절차서를 확인하고 밸브를 차단했다 04:00",
      "결과: 5분 내 정상화 05:00",
    ].join("\n");
    const star = parseSTARFromResponse(md, 0);
    // 행동 섹션은 진짜 '행동:' 라벨에서 추출돼야 한다(stray 'A:'가 아니라)
    expect(star.action.text).toContain("밸브를 차단");
    expect(star.action.text).not.toContain("무엇이 문제인가");
    // 결과 섹션도 올바르게
    expect(star.result.text).toContain("정상화");
  });

  it("정상 STAR 4요소가 모두 파싱되고 completeness=1 (presence 기반)", () => {
    const md = "상황: A 05:00\n과제: B 06:00\n행동: C 07:00\n결과: D 08:00";
    const star = parseSTARFromResponse(md, 0);
    expect(star.situation.text).toBeTruthy();
    expect(star.task.text).toBeTruthy();
    expect(star.action.text).toBeTruthy();
    expect(star.result.text).toBeTruthy();
    expect(star.completeness).toBeGreaterThan(0.9); // 4요소 존재 → ~1
  });

  it("일부 요소만 있으면 completeness가 비례해 낮다", () => {
    const md = "상황: 무언가 발생 01:00\n행동: 대응함 02:00";
    const star = parseSTARFromResponse(md, 0);
    expect(star.completeness).toBeLessThan(1);
    expect(star.completeness).toBeGreaterThan(0);
  });

  it("scoreSTARQuality는 1~5 척도 내", () => {
    const md = "상황: A 01:00\n과제: B 02:00\n행동: C를 구체적으로 실행 03:00\n결과: 30% 개선 04:00";
    const q = scoreSTARQuality(parseSTARFromResponse(md, 0));
    expect(q).toBeGreaterThanOrEqual(1);
    expect(q).toBeLessThanOrEqual(5);
  });
});

describe("Derailer 패턴 — Hogan HDS 정식 척도만 사용 (사이클6)", () => {
  // Hogan HDS 11개 정식 척도
  const VALID_HDS = new Set([
    "Excitable", "Skeptical", "Cautious", "Reserved", "Leisurely",
    "Bold", "Mischievous", "Colorful", "Imaginative", "Diligent", "Dutiful",
  ]);

  it("모든 패턴의 hoganScale이 정식 HDS 척도다 ('Argumentative' 같은 비척도 금지)", () => {
    for (const p of DERAILER_PATTERNS) {
      expect(VALID_HDS.has(p.hoganScale), `${p.id} → ${p.hoganScale}`).toBe(true);
    }
  });

  it("'arrogant'(독선형) 패턴은 Skeptical로 매핑된다", () => {
    const arrogant = DERAILER_PATTERNS.find((p) => p.id === "arrogant");
    expect(arrogant?.hoganScale).toBe("Skeptical");
  });

  it("패턴은 11개이며 척도가 중복 없이 11개 모두 사용된다", () => {
    expect(DERAILER_PATTERNS.length).toBe(11);
    const scales = new Set(DERAILER_PATTERNS.map((p) => p.hoganScale));
    expect(scales.size).toBe(11);
  });
});
