import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import type { GoldStandard } from './types';

const DATA_PATH = path.join(process.cwd(), 'data', 'gold-standards.json');

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
