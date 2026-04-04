import type { EvidenceClip, EvidenceMap } from "./types";

export function generateSearchQueries(rubricText: string): string[] {
  const queries = [rubricText.slice(0, 60)];
  const parenMatch = rubricText.match(/\(([^)]+)\)/);
  if (parenMatch) queries.push(parenMatch[1]);
  const verbPhrases = rubricText.match(/[가-힣]+(?:하|을|를|이|가)\s*[가-힣]+/g);
  if (verbPhrases && verbPhrases.length > 0) queries.push(verbPhrases[0]);
  return queries;
}

export function mapSearchResultToClip(
  rubricItemId: string, rubricItemText: string, searchQuery: string,
  result: { start: number; end: number; confidence: string; text?: string }
): EvidenceClip {
  return {
    rubricItemId, rubricItemText,
    videoTimestamp: { start: result.start, end: result.end },
    confidence: parseFloat(result.confidence) || 0,
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
