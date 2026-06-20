import type { EvidenceClip, EvidenceMap } from "./types";

export function generateSearchQueries(rubricText: string): string[] {
  const queries = [rubricText.slice(0, 60)];
  const parenMatch = rubricText.match(/\(([^)]+)\)/);
  if (parenMatch) queries.push(parenMatch[1]);
  const verbPhrases = rubricText.match(/[가-힣]+(?:하|을|를|이|가)\s*[가-힣]+/g);
  if (verbPhrases && verbPhrases.length > 0) queries.push(verbPhrases[0]);
  return queries;
}

// TwelveLabs Search API의 confidence는 범주형 문자열("high"/"medium"/"low"/"none")이다.
// parseFloat("high")=NaN→0이 되면 buildEvidenceMap의 threshold(기본 60)에서 전 클립이
// 탈락해 증거맵이 항상 비어 반환된다(wrong-result). pov-analysis-engine.parseConfidence와 동일 스케일로 변환.
function toConfidenceNumber(c: string | number): number {
  if (typeof c === "number") return c;
  const lower = c?.toLowerCase?.() ?? "";
  if (lower === "high") return 85;
  if (lower === "medium") return 60;
  if (lower === "low") return 30;
  if (lower === "none") return 0;
  const parsed = parseFloat(c);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapSearchResultToClip(
  rubricItemId: string, rubricItemText: string, searchQuery: string,
  result: { start: number; end: number; confidence: string; text?: string }
): EvidenceClip {
  return {
    rubricItemId, rubricItemText,
    videoTimestamp: { start: result.start, end: result.end },
    confidence: toConfidenceNumber(result.confidence),
    matchedText: result.text || "", searchQuery,
  };
}

export function deduplicateClips(clips: EvidenceClip[]): EvidenceClip[] {
  if (clips.length <= 1) return clips;
  const sorted = [...clips].sort((a, b) => a.videoTimestamp.start - b.videoTimestamp.start);
  const result: EvidenceClip[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];
    const overlap = prev.videoTimestamp.end - curr.videoTimestamp.start;
    if (overlap < 5) { result.push(curr); }
    else if (curr.confidence > prev.confidence) { result[result.length - 1] = curr; }
  }
  return result;
}

export function buildEvidenceMap(
  competencyKey: string, score: number, rubricItemIds: string[],
  clips: EvidenceClip[], confidenceThreshold: number = 60
): EvidenceMap {
  const filtered = clips.filter((c) => c.confidence >= confidenceThreshold);
  const deduped = deduplicateClips(filtered);
  const coveredItems = new Set(deduped.map((c) => c.rubricItemId));
  const coverageRate = rubricItemIds.length > 0 ? coveredItems.size / rubricItemIds.length : 0;
  const totalConfidence = deduped.length > 0 ? deduped.reduce((s, c) => s + c.confidence, 0) / deduped.length : 0;
  return { competencyKey, score, clips: deduped, coverageRate, overallConfidence: totalConfidence };
}
