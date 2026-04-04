// =============================================
// POV 분석 결과 서버사이드 캐시
// JSON 파일 기반, 최대 100개 유지
// 캐시 키: ${videoId}-${procedureId}
// =============================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import type { PovEvaluationReport } from './types';

const CACHE_PATH = path.join(process.cwd(), 'data', 'analysis-cache.json');

interface CacheEntry {
  key: string;
  videoId: string;
  procedureId: string;
  report: PovEvaluationReport;
  cachedAt: string;
  pipelineVersion: string;
}

/** 캐시 파일 읽기 */
function readCache(): CacheEntry[] {
  if (!existsSync(CACHE_PATH)) return [];
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as CacheEntry[];
  } catch {
    // 파일 손상 시 빈 배열 반환
    return [];
  }
}

/** 캐시 파일 저장 */
function writeCache(data: CacheEntry[]): void {
  const dir = path.dirname(CACHE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 캐시된 분석 리포트 조회
 * @returns 캐시 히트 시 PovEvaluationReport, 미스 시 null
 */
export function getCachedReport(videoId: string, procedureId: string): PovEvaluationReport | null {
  const key = `${videoId}-${procedureId}`;
  const entry = readCache().find((e) => e.key === key);
  return entry?.report ?? null;
}

/**
 * 분석 리포트 캐시 저장
 * - 동일 키가 있으면 교체
 * - 최대 100개 초과 시 가장 오래된 항목 제거
 */
export function cacheReport(
  videoId: string,
  procedureId: string,
  report: PovEvaluationReport,
  version: string
): void {
  const cache = readCache();
  const key = `${videoId}-${procedureId}`;

  const entry: CacheEntry = {
    key,
    videoId,
    procedureId,
    report,
    cachedAt: new Date().toISOString(),
    pipelineVersion: version,
  };

  // 기존 엔트리 교체 또는 새로 추가
  const idx = cache.findIndex((e) => e.key === key);
  if (idx >= 0) {
    cache[idx] = entry;
  } else {
    cache.push(entry);
  }

  // 최대 100개 캐시 유지 (초과 시 가장 오래된 항목 제거)
  if (cache.length > 100) {
    cache.shift();
  }

  writeCache(cache);
}

/**
 * 캐시 삭제
 * @param videoId 지정 시 해당 영상의 캐시만 삭제, 미지정 시 전체 삭제
 * @returns 삭제된 항목 수
 */
export function clearCache(videoId?: string): number {
  if (!videoId) {
    const count = readCache().length;
    writeCache([]);
    return count;
  }

  const cache = readCache();
  const filtered = cache.filter((e) => e.videoId !== videoId);
  writeCache(filtered);
  return cache.length - filtered.length;
}
