import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { GoldStandard } from './types';
import { getSegmentedEmbeddings } from './twelvelabs';
import { getDataPath } from './data-path';

const DATA_PATH = getDataPath('gold-standards.json');

function readStore(): GoldStandard[] {
  if (!existsSync(DATA_PATH)) return [];
  const raw = readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeStore(data: GoldStandard[]): void {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function listGoldStandards(procedureId?: string): GoldStandard[] {
  const all = readStore();
  if (procedureId) return all.filter(gs => gs.procedureId === procedureId);
  return all;
}

export function getGoldStandard(id: string): GoldStandard | null {
  return readStore().find(gs => gs.id === id) || null;
}

export function registerGoldStandard(
  procedureId: string, videoId: string, registeredBy: string,
  averageScore: number, segmentRange?: { start: number; end: number }
): GoldStandard {
  const store = readStore();
  const gs: GoldStandard = {
    id: `gs-${Date.now()}`, procedureId, videoId, registeredBy,
    registeredAt: new Date().toISOString(), segmentRange, averageScore,
  };
  store.push(gs);
  writeStore(store);
  return gs;
}

export function deleteGoldStandard(id: string): boolean {
  const store = readStore();
  const idx = store.findIndex(gs => gs.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  writeStore(store);
  return true;
}

export function updateGoldStandardEmbeddings(id: string, embeddings: number[][]): boolean {
  const store = readStore();
  const gs = store.find(g => g.id === id);
  if (!gs) return false;
  gs.embeddings = embeddings;
  writeStore(store);
  return true;
}

// ── 골드스탠다드 자동화 유틸리티 ────────────────

/** 절차별 최고 점수 골드스탠다드 반환 */
export function getBestGoldStandard(procedureId: string): GoldStandard | null {
  const standards = listGoldStandards(procedureId);
  if (standards.length === 0) return null;
  return standards.reduce((best, curr) => curr.averageScore > best.averageScore ? curr : best);
}

/** 캐시된 임베딩 반환, 없으면 TwelveLabs API 호출 후 캐시 저장 */
export async function getOrFetchEmbeddings(gs: GoldStandard, durationSec: number = 120): Promise<number[][]> {
  // 이미 캐시된 임베딩이 있으면 즉시 반환 (API 호출 생략)
  if (gs.embeddings && gs.embeddings.length > 0) return gs.embeddings;

  // 캐시 미스 — TwelveLabs API로 임베딩 추출 (10초 단위 세그먼트)
  const segments = await getSegmentedEmbeddings(gs.videoId, durationSec, 10);
  const embeddings = segments.map(s => s.embedding).filter(e => e.length > 0);

  // 추출된 임베딩을 스토어에 캐시 저장 (다음 호출 시 API 재호출 불필요)
  updateGoldStandardEmbeddings(gs.id, embeddings);
  return embeddings;
}

/** A등급(85점) 이상 리포트 영상의 골드스탠다드 후보 여부 판정 */
export function suggestGoldStandardCandidate(
  procedureId: string,
  videoId: string,
  score: number,
): { eligible: boolean; reason: string } {
  // 85점 미만이면 A등급 미달 — 후보 불가
  if (score < 85) {
    return { eligible: false, reason: `점수 ${score}점 — A등급(85점) 미달` };
  }

  const existing = listGoldStandards(procedureId);

  // 이미 동일 영상이 등록되어 있는 경우
  const alreadyRegistered = existing.some(gs => gs.videoId === videoId);
  if (alreadyRegistered) {
    return { eligible: false, reason: '이미 등록된 영상' };
  }

  // 더 높은 점수의 골드스탠다드가 존재하는 경우 — 등록 가능하지만 최고점은 아님
  const betterExists = existing.some(gs => gs.averageScore > score);
  if (betterExists) {
    const topScore = Math.max(...existing.map(gs => gs.averageScore));
    return {
      eligible: true,
      reason: `등록 가능 (더 높은 점수의 기준 영상 존재: ${topScore}점)`,
    };
  }

  // 현재 점수가 최고점 — 골드스탠다드로 가장 적합
  return { eligible: true, reason: '최고 점수 — 골드스탠다드 추천' };
}
