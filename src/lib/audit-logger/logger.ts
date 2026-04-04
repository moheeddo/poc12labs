import type { AuditEntry, AuditAction } from "./types";

let buffer: AuditEntry[] = [];
let persistFn: ((entry: AuditEntry) => Promise<void>) | null = null;

export function setAuditPersistence(fn: (entry: AuditEntry) => Promise<void>) {
  persistFn = fn;
  const pending = [...buffer];
  buffer = [];
  pending.forEach((e) => fn(e));
}

export function logAudit(
  action: AuditAction,
  actor: AuditEntry["actor"],
  details: Record<string, unknown> = {},
  sessionId?: string,
  participantId?: string
): AuditEntry {
  const entry: AuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor, action, sessionId, participantId, details,
  };
  if (persistFn) { persistFn(entry); } else { buffer.push(entry); }
  return entry;
}

export function getBufferedEntries(): AuditEntry[] { return [...buffer]; }
