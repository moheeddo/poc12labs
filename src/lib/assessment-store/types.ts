import type { AuditEntry } from "../audit-logger/types";

export interface DBSession {
  id: string; name: string; createdAt: string; completedAt?: string;
  status: "active" | "completed" | "archived"; groupId?: string;
}
export interface DBParticipant {
  id: string; sessionId: string; employeeId?: string; name: string; jobLevel: number;
  demographics?: { gender?: string; ageGroup?: string; tenureGroup?: string; department?: string };
}
export interface DBScore {
  id: string; sessionId: string; participantId: string; competencyKey: string;
  aiScore: number; humanScore?: number; finalScore?: number;
  rubricScores?: Record<string, number>; createdAt: string;
}
export interface DBConsent {
  id: string; participantId: string; sessionId: string;
  consentType: "video_recording" | "ai_analysis" | "data_retention" | "report_sharing";
  agreed: boolean; timestamp: string; version: string;
}
export interface DBBEIEvent {
  id: string; sessionId: string; participantId: string; competencyKey: string;
  star: { situation: { text: string; start: number; end: number }; task: { text: string; start: number; end: number }; action: { text: string; start: number; end: number }; result: { text: string; start: number; end: number } };
  completeness: number; qualityScore: number; createdAt: string;
}
export interface DBDerailerProfile {
  id: string; sessionId: string; participantId: string; scenarioType: "normal" | "emergency";
  patterns: { id: string; name: string; riskLevel: "low" | "moderate" | "high" | "critical"; score: number }[];
  createdAt: string;
}
export interface DBCoachingFeedback {
  id: string; sessionId: string; participantId: string;
  strengths: { competencyKey: string; description: string }[];
  developmentAreas: { competencyKey: string; actionItems: string[] }[];
  createdAt: string;
}

// AuditEntry re-export (types.ts에서 직접 임포트 가능하도록)
export type { AuditEntry };
