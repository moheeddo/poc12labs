// src/lib/session-store.ts
import type { TrainingSession } from './session-types';

const sessions = new Map<string, TrainingSession>();

export function createSession(session: TrainingSession): void {
  sessions.set(session.id, session);
}

export function getSession(id: string): TrainingSession | undefined {
  return sessions.get(id);
}

export function updateSession(id: string, patch: Partial<TrainingSession>): TrainingSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  const updated = { ...session, ...patch };
  sessions.set(id, updated);
  return updated;
}

export function updateOperator(
  sessionId: string,
  role: 'operatorA' | 'operatorB',
  patch: Partial<TrainingSession['operators'][0]>
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  const idx = session.operators.findIndex(o => o.role === role);
  if (idx >= 0) {
    session.operators[idx] = { ...session.operators[idx], ...patch };
    sessions.set(sessionId, session);
  }
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}
