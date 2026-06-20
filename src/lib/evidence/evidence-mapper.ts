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

// 같은 루브릭 항목 안에서만 시간 중복 병합. 서로 다른 rubricItemId는 같은 시각이라도
// 별개 근거이므로 병합하면 한쪽 항목의 증거가 손실된다(이전: id 무관 병합 버그).
function dedupWithinItem(clips: EvidenceClip[]): EvidenceClip[] {
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

export function deduplicateClips(clips: EvidenceClip[]): EvidenceClip[] {
  if (clips.length <= 1) return clips;
  // rubricItemId 단위로 그룹핑(삽입 순서 보존) 후 그룹 내에서만 시간 dedup
  const byItem = new Map<string, EvidenceClip[]>();
  for (const c of clips) {
    const arr = byItem.get(c.rubricItemId);
    if (arr) arr.push(c);
    else byItem.set(c.rubricItemId, [c]);
  }
  const out: EvidenceClip[] = [];
  for (const group of byItem.values()) out.push(...dedupWithinItem(group));
  return out;
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
