// =============================================
// 6인 조 관리 — localStorage 기반 스토어
// localStorage 접근 불가 / 용량 초과 방어 포함
// =============================================

import type { GroupSession } from "./group-types";
import { COMPETENCY_ORDER } from "./group-types";

const STORAGE_KEY = "khnp-group-sessions";

// 로드 시 정규화 — 과거 4역량 시절 저장된 세션(currentStep=3·orphan 슬롯)이
// 3역량 코드에서 인덱스 범위를 벗어나 크래시/silent mis-write를 내지 않도록 1회 보정
function normalizeSession(s: GroupSession): GroupSession {
  if (!s || !Array.isArray(s.competencies)) return s;
  const max = COMPETENCY_ORDER.length - 1;
  const currentStep = Math.min(Math.max(0, s.currentStep ?? 0), max);
  // 역량 수가 현재(3)보다 많으면 orphan 슬롯 절단
  const sliced = s.competencies.length > COMPETENCY_ORDER.length
    ? s.competencies.slice(0, COMPETENCY_ORDER.length)
    : s.competencies;
  // 과거 저장본에 memberScores 필드가 누락된 competency 방어 — 없으면 {} 로 backfill.
  // (GroupDashboard 집계가 c.memberScores[id] 접근 시 undefined['id'] 로 크래시나던
  //  "Application error: client-side exception"의 근본 데이터 원인 차단)
  let mutated = false;
  const competencies = sliced.map((c) => {
    if (c && (c.memberScores == null || typeof c.memberScores !== "object")) {
      mutated = true;
      return { ...c, memberScores: {} };
    }
    return c;
  });
  return currentStep === s.currentStep && sliced === s.competencies && !mutated
    ? s
    : { ...s, currentStep, competencies };
}

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
    // 배열인지 검증 + 단계/역량 인덱스 정규화(stale 세션 방어)
    return Array.isArray(parsed) ? parsed.map(normalizeSession) : [];
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
