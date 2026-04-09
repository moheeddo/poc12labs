// src/lib/transcript-sync.ts
import type { TranscriptSegment } from './types';
import type { SyncResult } from './session-types';

/**
 * Levenshtein 거리 (퍼지 매칭용)
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * 정규화: 공백 압축, 소문자, 마침표/쉼표 제거
 */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?'"]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 두 전사문 간 퍼지 매칭으로 타임 오프셋 추정
 * @returns SyncResult — offsetAtoB는 B_time = A_time + offset
 */
export function syncTranscripts(
  transcriptA: TranscriptSegment[],
  transcriptB: TranscriptSegment[],
): SyncResult {
  const matches: { phrase: string; timeA: number; timeB: number; offset: number }[] = [];

  for (const segA of transcriptA) {
    const normA = normalize(segA.text);
    if (normA.length < 4) continue;

    for (const segB of transcriptB) {
      const normB = normalize(segB.text);
      if (normB.length < 4) continue;

      const maxLen = Math.max(normA.length, normB.length);
      const dist = levenshtein(normA, normB);
      const similarity = 1 - dist / maxLen;

      if (similarity >= 0.8) {
        matches.push({
          phrase: segA.text,
          timeA: segA.start,
          timeB: segB.start,
          offset: segB.start - segA.start,
        });
        break;
      }
    }
  }

  if (matches.length === 0) {
    return { offsetAtoB: 0, confidence: 0, matchedPhrases: [] };
  }

  const offsets = matches.map(m => m.offset).sort((a, b) => a - b);
  const medianOffset = offsets[Math.floor(offsets.length / 2)];

  const validMatches = matches.filter(m => Math.abs(m.offset - medianOffset) <= 5);

  const confidence = validMatches.length >= 5 ? 95 :
                     validMatches.length >= 3 ? 80 :
                     validMatches.length >= 1 ? 50 : 0;

  return {
    offsetAtoB: medianOffset,
    confidence,
    matchedPhrases: validMatches.map(m => ({
      phrase: m.phrase,
      timeA: m.timeA,
      timeB: m.timeB,
    })),
  };
}
