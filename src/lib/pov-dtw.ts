// src/lib/pov-dtw.ts
// DTW(Dynamic Time Warping)를 활용한 SOP 순서 vs 실제 수행 순서 비교 모듈
// SKIP(단계 누락), SWAP(순서 역전), INSERT(SOP 외 추가 행동) 이탈 유형을 탐지한다.

import type { SequenceAlignment, AlignmentPair, PovSopDeviation } from './types';

/**
 * DTW(Dynamic Time Warping)로 SOP 순서와 실제 수행 순서를 정렬하고 이탈을 탐지한다.
 *
 * @param sopSequence     SOP 기준 단계 ID 배열 (예: ['1.1', '1.2', '1.3'])
 * @param detectedSequence 영상에서 탐지된 단계 ID 배열
 * @param criticalSteps   핵심 단계 Set — 누락 시 severity를 'critical'로 상향
 * @returns SequenceAlignment — 정렬 경로, 이탈 목록, 준수율, 핵심 이탈 횟수
 */
export function alignSequences(
  sopSequence: string[],
  detectedSequence: string[],
  criticalSteps: Set<string>
): SequenceAlignment {
  const n = sopSequence.length;
  const m = detectedSequence.length;

  // 검출 시퀀스가 비어 있으면 모든 SOP 단계를 SKIP 처리
  if (m === 0) {
    return {
      sopSequence,
      detectedSequence,
      alignmentPath: sopSequence.map((_, i) => ({ sopIndex: i, detectedIndex: null, cost: 1 })),
      deviations: sopSequence.map(id => ({
        type: 'skip' as const,
        stepIds: [id],
        severity: criticalSteps.has(id) ? 'critical' as const : 'major' as const,
        description: `단계 ${id} 미수행`,
      })),
      complianceScore: 0,
      criticalDeviations: sopSequence.filter(id => criticalSteps.has(id)).length,
    };
  }

  /**
   * 두 단계 ID 간 비교 비용 계산
   * - 동일: 0 (완벽 매칭)
   * - 핵심 단계 불일치: 3 (가중 감점)
   * - 일반 단계 불일치: 1
   * - 빈 문자열(SKIP 연산용): 1 또는 가중치
   */
  const cost = (a: string, b: string): number => {
    if (a === b) return 0;
    return criticalSteps.has(a) ? 3 : 1;
  };

  // DTW 동적 프로그래밍 테이블 초기화 (n+1) × (m+1)
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  dp[0][0] = 0;

  // SOP 단계를 모두 건너뛰는 경우 (SKIP 누적)
  for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + cost(sopSequence[i - 1], '');
  // 검출 단계만 있는 경우 (INSERT 누적)
  for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + 1;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const matchCost = cost(sopSequence[i - 1], detectedSequence[j - 1]);
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + matchCost,               // 매칭 (또는 불일치)
        dp[i - 1][j] + cost(sopSequence[i - 1], ''), // SOP 단계 SKIP
        dp[i][j - 1] + 1,                            // 검출 단계 INSERT
      );
    }
  }

  // 역추적으로 최적 정렬 경로 복원
  const path: AlignmentPair[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      dp[i][j] === dp[i - 1][j - 1] + cost(sopSequence[i - 1], detectedSequence[j - 1])
    ) {
      // 매칭 (일치 또는 불일치 치환)
      path.unshift({
        sopIndex: i - 1,
        detectedIndex: j - 1,
        cost: cost(sopSequence[i - 1], detectedSequence[j - 1]),
      });
      i--; j--;
    } else if (
      i > 0 &&
      dp[i][j] === dp[i - 1][j] + cost(sopSequence[i - 1], '')
    ) {
      // SOP 단계 SKIP (검출 시퀀스에 해당 단계 없음)
      path.unshift({ sopIndex: i - 1, detectedIndex: null, cost: cost(sopSequence[i - 1], '') });
      i--;
    } else {
      // 검출 시퀀스에만 있는 단계 INSERT
      path.unshift({ sopIndex: -1, detectedIndex: j - 1, cost: 1 });
      j--;
    }
  }

  // 이탈 탐지 및 최종 점수 계산
  const deviations = detectDeviations(sopSequence, detectedSequence, path, criticalSteps);
  const criticalDeviationCount = deviations.filter(d => d.severity === 'critical').length;

  // 준수율: SOP 단계 중 정확히 매칭된 단계 비율
  const matchedCount = path.filter(
    p => p.sopIndex >= 0 && p.detectedIndex !== null && p.cost === 0
  ).length;
  const complianceScore = n > 0 ? Math.round((matchedCount / n) * 100) : 0;

  return {
    sopSequence,
    detectedSequence,
    alignmentPath: path,
    deviations,
    complianceScore,
    criticalDeviations: criticalDeviationCount,
  };
}

/**
 * 정렬 경로를 분석하여 SKIP / INSERT / SWAP 이탈 목록을 반환한다.
 *
 * 탐지 로직:
 * - SKIP: sopIndex >= 0이고 detectedIndex === null인 페어
 * - INSERT: sopIndex === -1인 페어 (SOP 외 추가 행동)
 * - SWAP: SOP 단계들의 실제 검출 위치(firstOccurrence)를 SOP 순서와 비교하여 역전된 인접 쌍 탐지
 *
 * SWAP 탐지 방법:
 * DTW 단조 경로는 역방향 매칭을 허용하지 않으므로, 경로 대신 각 SOP 단계가
 * detectedSequence에서 처음 등장하는 위치를 독립적으로 찾는다.
 * SOP 순서상 인접한 두 단계의 실제 검출 위치가 역전되면 SWAP으로 분류한다.
 */
export function detectDeviations(
  sopSequence: string[],
  detectedSequence: string[],
  path: AlignmentPair[],
  criticalSteps: Set<string>
): PovSopDeviation[] {
  const deviations: PovSopDeviation[] = [];

  // SKIP 탐지: SOP 단계가 검출 시퀀스에 없음
  for (const pair of path) {
    if (pair.sopIndex >= 0 && pair.detectedIndex === null) {
      const stepId = sopSequence[pair.sopIndex];
      deviations.push({
        type: 'skip',
        stepIds: [stepId],
        severity: criticalSteps.has(stepId) ? 'critical' : 'major',
        description: `단계 ${stepId} 미수행`,
      });
    }
  }

  // INSERT 탐지: 검출 시퀀스에만 있는 행동 (SOP 외 추가)
  for (const pair of path) {
    if (pair.sopIndex === -1 && pair.detectedIndex !== null) {
      const stepId = detectedSequence[pair.detectedIndex];
      deviations.push({
        type: 'insert',
        stepIds: [stepId],
        severity: 'minor',
        description: `SOP에 없는 행동 삽입: ${stepId}`,
      });
    }
  }

  // SWAP 탐지: 각 SOP 단계가 detectedSequence에서 처음 등장하는 위치를 파악
  // SOP 순서상 인접 쌍(A→B)에서 B가 A보다 먼저 등장하면 순서 역전(SWAP)으로 판정
  const firstOccurrence = new Map<string, number>();
  for (const id of sopSequence) {
    const idx = detectedSequence.indexOf(id);
    if (idx !== -1) {
      firstOccurrence.set(id, idx);
    }
  }

  // SOP 순서 기준으로 연속하는 두 단계 중 둘 다 검출되었지만 순서가 역전된 경우만 SWAP
  // 이미 SKIP으로 처리된 단계는 제외 (detectedSequence에 없는 경우)
  const skippedIds = new Set(
    deviations.filter(d => d.type === 'skip').flatMap(d => d.stepIds)
  );

  for (let k = 0; k < sopSequence.length - 1; k++) {
    const id1 = sopSequence[k];
    const id2 = sopSequence[k + 1];

    // 둘 다 검출되었고, 둘 다 SKIP이 아닌 경우만 비교
    if (skippedIds.has(id1) || skippedIds.has(id2)) continue;
    const pos1 = firstOccurrence.get(id1);
    const pos2 = firstOccurrence.get(id2);
    if (pos1 === undefined || pos2 === undefined) continue;

    if (pos1 > pos2) {
      // id1이 id2보다 늦게 등장 → 순서 역전
      const isCritical = criticalSteps.has(id1) || criticalSteps.has(id2);
      deviations.push({
        type: 'swap',
        stepIds: [id1, id2],
        severity: isCritical ? 'critical' : 'major',
        description: `단계 ${id1}과 ${id2} 순서 역전`,
      });
    }
  }

  return deviations;
}
