// =============================================
// 6인 조 관리 — localStorage 기반 스토어
// =============================================

import type { GroupSession } from "./group-types";

const STORAGE_KEY = "khnp-group-sessions";

export function loadAllSessions(): GroupSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAllSessions(sessions: GroupSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function loadSession(id: string): GroupSession | null {
  return loadAllSessions().find((s) => s.id === id) || null;
}

export function saveSession(session: GroupSession) {
  const all = loadAllSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    all[idx] = session;
  } else {
    all.push(session);
  }
  saveAllSessions(all);
}

export function deleteSession(id: string) {
  saveAllSessions(loadAllSessions().filter((s) => s.id !== id));
}
