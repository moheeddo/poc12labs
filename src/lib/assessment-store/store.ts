import Dexie, { type Table } from "dexie";
import type { DBSession, DBParticipant, DBScore, DBConsent, DBBEIEvent, DBDerailerProfile, DBCoachingFeedback } from "./types";
import type { AuditEntry } from "../audit-logger/types";

export class AssessmentDB extends Dexie {
  sessions!: Table<DBSession, string>;
  participants!: Table<DBParticipant, string>;
  scores!: Table<DBScore, string>;
  consents!: Table<DBConsent, string>;
  auditLog!: Table<AuditEntry, string>;
  beiEvents!: Table<DBBEIEvent, string>;
  derailerProfiles!: Table<DBDerailerProfile, string>;
  coachingFeedback!: Table<DBCoachingFeedback, string>;

  constructor() {
    super("khnp-assessment-db");
    this.version(1).stores({
      sessions: "id, status, createdAt",
      participants: "id, sessionId, employeeId, [sessionId+employeeId]",
      scores: "id, sessionId, participantId, competencyKey, [sessionId+participantId], [sessionId+competencyKey]",
      consents: "id, participantId, sessionId, [sessionId+participantId]",
      auditLog: "id, sessionId, action, timestamp",
      beiEvents: "id, sessionId, participantId, [sessionId+participantId]",
      derailerProfiles: "id, sessionId, participantId, [sessionId+participantId]",
      coachingFeedback: "id, sessionId, participantId, [sessionId+participantId]",
    });
  }
}

export const db = new AssessmentDB();

// 세션 CRUD
export async function addSession(session: DBSession) { return db.sessions.add(session); }
export async function getSession(id: string) { return db.sessions.get(id); }
export async function getAllSessions() { return db.sessions.orderBy("createdAt").reverse().toArray(); }

// 참가자 CRUD
export async function addParticipant(participant: DBParticipant) { return db.participants.add(participant); }
export async function getParticipantsBySession(sessionId: string) { return db.participants.where("sessionId").equals(sessionId).toArray(); }

// 점수 CRUD
export async function addScore(score: DBScore) { return db.scores.add(score); }
export async function getScoresBySession(sessionId: string) { return db.scores.where("sessionId").equals(sessionId).toArray(); }
export async function getScoresByParticipant(sessionId: string, participantId: string) { return db.scores.where("[sessionId+participantId]").equals([sessionId, participantId]).toArray(); }
export async function getAllScores() { return db.scores.toArray(); }

// 동의 CRUD
export async function addConsent(consent: DBConsent) { return db.consents.add(consent); }
export async function getConsentsBySession(sessionId: string) { return db.consents.where("sessionId").equals(sessionId).toArray(); }

// 감사 로그
export async function addAuditEntry(entry: AuditEntry) { return db.auditLog.add(entry); }
export async function getAuditLogBySession(sessionId: string) { return db.auditLog.where("sessionId").equals(sessionId).sortBy("timestamp"); }

// BEI 이벤트
export async function addBEIEvent(event: DBBEIEvent) { return db.beiEvents.add(event); }

// 디레일러 프로파일
export async function addDerailerProfile(profile: DBDerailerProfile) { return db.derailerProfiles.add(profile); }

// 코칭 피드백
export async function addCoachingFeedback(feedback: DBCoachingFeedback) { return db.coachingFeedback.add(feedback); }

// 전체 데이터 내보내기 (보고서/백업용)
export async function exportAllData() {
  const [sessions, participants, scores, consents] = await Promise.all([
    db.sessions.toArray(), db.participants.toArray(), db.scores.toArray(), db.consents.toArray(),
  ]);
  return { sessions, participants, scores, consents };
}
