/**
 * slide-matcher 유틸리티 테스트
 * - wordOverlap: 단어 겹침 기반 유사도 계산
 * - computeSlideCoverages: 슬라이드별 커버리지 계산
 * - parseConceptMatches / parseDeliveryQualities: LLM 출력 파싱
 */
import { describe, it, expect } from "vitest";
import {
  wordOverlap,
  computeSlideCoverages,
  parseConceptMatches,
  parseDeliveryQualities,
} from "@/lib/slide-matcher";
import type { ParsedSlide } from "@/lib/lecture-types";
import type { TranscriptSegment } from "@/lib/types";

describe("wordOverlap", () => {
  it("동일 문자열 → 1.0", () => {
    expect(wordOverlap("원자력 발전소 안전", "원자력 발전소 안전")).toBe(1.0);
  });

  it("겹침 없음 → 0", () => {
    expect(wordOverlap("원자력 발전소", "축구 야구 농구")).toBe(0);
  });

  it("빈 문자열 → 0", () => {
    expect(wordOverlap("", "원자력 발전소")).toBe(0);
    expect(wordOverlap("", "")).toBe(0);
  });

  it("부분 겹침 시 비율 반환", () => {
    // a: "원자력", "발전소", "안전" (3단어)
    // b에서 겹치는 단어: "원자력", "안전" (2/3)
    const result = wordOverlap("원자력 발전소 안전", "원자력 안전 관리");
    expect(result).toBeCloseTo(2 / 3, 5);
  });

  it("대소문자 무시", () => {
    expect(wordOverlap("Hello World", "hello world")).toBe(1.0);
  });

  it("특수문자 제거 후 비교", () => {
    expect(wordOverlap("안전, 관리!", "안전 관리")).toBe(1.0);
  });

  it("b가 빈 문자열이면 겹침 0", () => {
    // a에 단어가 있지만 b가 비어있으면 겹침 없음
    expect(wordOverlap("원자력 발전소", "")).toBe(0);
  });
});

describe("computeSlideCoverages", () => {
  const makeSlide = (index: number, title: string, notes: string): ParsedSlide => ({
    index,
    title,
    bodyText: "",
    notes,
  });

  const makeSegment = (start: number, end: number, text: string): TranscriptSegment => ({
    start,
    end,
    text,
  });

  it("빈 노트 → coveragePercent 0", () => {
    const slides = [makeSlide(0, "빈 슬라이드", "")];
    const transcript = [makeSegment(0, 10, "발표 내용")];

    const result = computeSlideCoverages(slides, transcript);
    expect(result).toHaveLength(1);
    expect(result[0].coveragePercent).toBe(0);
    expect(result[0].matchedSegments).toEqual([]);
  });

  it("빈 전사 → coveragePercent 0", () => {
    const slides = [makeSlide(0, "슬라이드 1", "원자력 안전 관리")];
    const transcript: TranscriptSegment[] = [];

    const result = computeSlideCoverages(slides, transcript);
    expect(result).toHaveLength(1);
    expect(result[0].coveragePercent).toBe(0);
  });

  it("매칭 세그먼트 유사도 내림차순 정렬 확인", () => {
    const slides = [makeSlide(0, "슬라이드 1", "원자력 발전소 안전 관리 절차")];
    const transcript = [
      makeSegment(0, 5, "축구 경기"),             // 겹침 없음 → 필터링됨
      makeSegment(5, 10, "원자력 발전소"),          // 겹침 2/5 = 0.4
      makeSegment(10, 15, "원자력 발전소 안전 관리"), // 겹침 4/5 = 0.8
    ];

    const result = computeSlideCoverages(slides, transcript);
    expect(result[0].matchedSegments.length).toBeGreaterThan(0);

    // 유사도 높은 세그먼트가 먼저 나와야 함
    if (result[0].matchedSegments.length >= 2) {
      expect(result[0].matchedSegments[0].start).toBe(10); // 유사도 0.8
      expect(result[0].matchedSegments[1].start).toBe(5);  // 유사도 0.4
    }
  });

  it("coveragePercent가 0~100 범위", () => {
    const slides = [makeSlide(0, "슬라이드", "원자력")];
    const transcript = [makeSegment(0, 5, "원자력 발전소 안전 관리")];

    const result = computeSlideCoverages(slides, transcript);
    expect(result[0].coveragePercent).toBeGreaterThanOrEqual(0);
    expect(result[0].coveragePercent).toBeLessThanOrEqual(100);
  });

  it("여러 슬라이드 처리", () => {
    const slides = [
      makeSlide(0, "1번", "원자력"),
      makeSlide(1, "2번", "안전"),
      makeSlide(2, "3번", ""),
    ];
    const transcript = [makeSegment(0, 10, "원자력 안전")];

    const result = computeSlideCoverages(slides, transcript);
    expect(result).toHaveLength(3);
    expect(result[0].slideIndex).toBe(0);
    expect(result[1].slideIndex).toBe(1);
    expect(result[2].coveragePercent).toBe(0); // 빈 노트
  });
});

describe("parseConceptMatches", () => {
  it("정상 파싱", () => {
    const raw = [
      {
        concept: "비상냉각",
        definition: "비상 시 원자로 냉각 절차",
        slideIndex: 2,
        status: "found",
        timestamp: 30,
        evidence: "30초에 설명",
      },
    ];

    const result = parseConceptMatches(raw);
    expect(result).toHaveLength(1);
    expect(result[0].concept).toBe("비상냉각");
    expect(result[0].status).toBe("found");
    expect(result[0].timestamp).toBe(30);
  });

  it("누락 필드에 기본값 적용", () => {
    const raw = [{}];
    const result = parseConceptMatches(raw);
    expect(result[0].concept).toBe("");
    expect(result[0].slideIndex).toBe(0);
    expect(result[0].status).toBe("missing");
    expect(result[0].timestamp).toBeUndefined();
    expect(result[0].evidence).toBeUndefined();
  });
});

describe("parseDeliveryQualities", () => {
  it("정상 파싱 및 totalScore 계산", () => {
    const raw = [
      {
        conceptOrSlide: "슬라이드 1",
        exampleUsage: 8,
        repetitionSummary: 7,
        learnerInteraction: 6,
        logicalConnection: 9,
      },
    ];

    const result = parseDeliveryQualities(raw);
    expect(result).toHaveLength(1);
    expect(result[0].totalScore).toBe(30); // 8+7+6+9
    expect(result[0].conceptOrSlide).toBe("슬라이드 1");
  });

  it("누락 필드에 0 적용", () => {
    const raw = [{ conceptOrSlide: "테스트" }];
    const result = parseDeliveryQualities(raw);
    expect(result[0].totalScore).toBe(0);
  });
});
