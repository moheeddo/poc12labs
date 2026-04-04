export type AuditAction =
  | "session_created" | "session_completed" | "consent_given" | "consent_revoked"
  | "video_uploaded" | "analysis_started" | "analysis_completed"
  | "score_generated" | "score_overridden" | "report_generated" | "report_exported"
  | "data_accessed" | "data_deleted" | "hr_data_imported" | "norm_calculated" | "fairness_analyzed";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: "system" | "evaluator" | "participant" | "admin";
  action: AuditAction;
  sessionId?: string;
  participantId?: string;
  details: Record<string, unknown>;
}
