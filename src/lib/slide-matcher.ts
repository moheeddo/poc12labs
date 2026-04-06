// src/lib/slide-matcher.ts
import type { ParsedSlide, SlideCoverage, ConceptMatch, DeliveryQuality } from "./lecture-types";
import type { TranscriptSegment } from "./types";

// 슬라이드 노트와 전사 텍스트의 유사도를 단어 겹침 기반으로 계산
export function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^\w가-힣\s]/g, "").split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().replace(/[^\w가-힣\s]/g, "").split(/\s+/).filter(Boolean));
  if (wordsA.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / wordsA.size;
}

// Layer 1: 슬라이드별 커버리지 계산 (로컬 폴백용)
export function computeSlideCoverages(
  slides: ParsedSlide[],
  transcript: TranscriptSegment[]
): SlideCoverage[] {
  const fullText = transcript.map((s) => s.value).join(" ");

  return slides.map((slide) => {
    if (!slide.notes.trim()) {
      return {
        slideIndex: slide.index,
        slideTitle: slide.title,
        coveragePercent: 0,
        matchedSegments: [],
      };
    }

    // 각 전사 세그먼트와의 유사도 계산
    const matched = transcript
      .map((seg) => ({ ...seg, similarity: wordOverlap(slide.notes, seg.value) }))
      .filter((seg) => seg.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    const coveragePercent = Math.min(
      100,
      Math.round(wordOverlap(slide.notes, fullText) * 100)
    );

    return {
      slideIndex: slide.index,
      slideTitle: slide.title,
      coveragePercent,
      matchedSegments: matched.map((m) => ({
        start: m.start,
        end: m.end,
        text: m.value,
      })),
    };
  });
}

// Layer 2: LLM 출력을 ConceptMatch 타입으로 파싱
export function parseConceptMatches(raw: Record<string, unknown>[]): ConceptMatch[] {
  return raw.map((item) => ({
    concept: String(item.concept || ""),
    definition: String(item.definition || ""),
    slideIndex: Number(item.slideIndex || 0),
    status: (item.status as ConceptMatch["status"]) || "missing",
    timestamp: item.timestamp ? Number(item.timestamp) : undefined,
    evidence: item.evidence ? String(item.evidence) : undefined,
  }));
}

// Layer 3: LLM 출력을 DeliveryQuality 타입으로 파싱
export function parseDeliveryQualities(raw: Record<string, unknown>[]): DeliveryQuality[] {
  return raw.map((item) => {
    const ex = Number(item.exampleUsage || 0);
    const rep = Number(item.repetitionSummary || 0);
    const inter = Number(item.learnerInteraction || 0);
    const logic = Number(item.logicalConnection || 0);
    return {
      conceptOrSlide: String(item.conceptOrSlide || ""),
      exampleUsage: ex,
      repetitionSummary: rep,
      learnerInteraction: inter,
      logicalConnection: logic,
      totalScore: ex + rep + inter + logic,
    };
  });
}
