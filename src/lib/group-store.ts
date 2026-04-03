// =============================================
// 6인 조 관리 — localStorage 기반 스토어
// localStorage 접근 불가 / 용량 초과 방어 포함
// =============================================

import type { GroupSession } from "./group-types";

const STORAGE_KEY = "khnp-group-sessions";

// localStorage 접근 가능 여부 확인
function isStorageAvailable(): boolean {
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function loadAllSessions(): GroupSession[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // 배열인지 검증
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAllSessions(sessions: GroupSession[]) {
  if (!isStorageAvailable()) {
    console.warn("[GroupStore] localStorage 접근 불가 — 데이터가 저장되지 않습니다");
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    // QuotaExceededError — 용량 초과 시 오래된 세션 정리 후 재시도
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("[GroupStore] localStorage 용량 초과 — 오래된 세션 정리 후 재시도");
      try {
        // 최근 5개 세션만 유지
        const trimmed = sessions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        console.error("[GroupStore] localStorage 저장 실패 — 용량 부족");
      }
    } else {
      console.error("[GroupStore] localStorage 저장 실패", e);
    }
  }
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
