"use client";

import { Shield, CheckCircle, AlertTriangle, Clock, FileText } from "lucide-react";
import type { AuditEntry } from "@/lib/audit-logger";
import type { ConsentRecord } from "@/lib/compliance";

interface ISOAuditViewProps {
  auditEntries: AuditEntry[];
  consents: ConsentRecord[];
  loading?: boolean;
}

// ISO 10667 체크리스트 항목 정의
interface ChecklistItem {
  id: number;
  label: string;
  description: string;
  check: (entries: AuditEntry[], consents: ConsentRecord[]) => boolean;
}

const ISO_CHECKLIST: ChecklistItem[] = [
  {
    id: 1,
    label: "평가 목적 명시",
    description: "평가의 목적과 활용 방안을 참여자에게 사전 고지",
    check: () => true, // 항상 완료
  },
  {
    id: 2,
    label: "참여자 동의",
    description: "모든 참여자에게 서면 또는 전자 동의 취득",
    check: (_entries, consents) => consents.length > 0 && consents.some((c) => c.agreed),
  },
  {
    id: 3,
    label: "타당도/신뢰도 근거",
    description: "평가 도구의 심리측정적 근거 문서화",
    check: (entries) => entries.some((e) => e.action === "norm_calculated"),
  },
  {
    id: 4,
    label: "평가자 자격 기록",
    description: "평가에 참여한 평가자의 자격 및 훈련 이력 관리",
    check: (entries) =>
      entries.some((e) => e.actor === "evaluator" && e.action === "analysis_completed"),
  },
  {
    id: 5,
    label: "결과 활용 범위 제한",
    description: "평가 결과의 활용 범위를 명시하고 목적 외 사용 금지",
    check: (_entries, consents) =>
      consents.some((c) => c.consentType === "report_sharing"),
  },
  {
    id: 6,
    label: "데이터 보호",
    description: "개인정보보호법 및 GDPR 준수 데이터 관리 체계",
    check: (_entries, consents) =>
      consents.some((c) => c.consentType === "data_retention"),
  },
  {
    id: 7,
    label: "참여자 결과 접근권",
    description: "참여자가 자신의 평가 결과에 접근하고 확인할 권리 보장",
    check: (entries) =>
      entries.some((e) => e.action === "report_generated" || e.action === "report_exported"),
  },
  {
    id: 8,
    label: "이의 제기 절차",
    description: "평가 결과에 대한 이의 신청 및 검토 절차 마련",
    check: (entries) =>
      entries.some((e) => e.action === "score_overridden"),
  },
  {
    id: 9,
    label: "감사 추적",
    description: "모든 평가 활동에 대한 로그 기록 및 보존",
    check: (entries) => entries.length > 0,
  },
  {
    id: 10,
    label: "정기 검토 주기",
    description: "평가 도구 및 절차에 대한 정기적 검토 계획 수립",
    check: (entries) =>
      entries.some((e) => e.action === "fairness_analyzed"),
  },
];

// 감사 로그 액션 한국어 레이블
const ACTION_LABELS: Record<string, string> = {
  session_created: "세션 생성",
  session_completed: "세션 완료",
  consent_given: "동의 완료",
  consent_revoked: "동의 철회",
  video_uploaded: "영상 업로드",
  analysis_started: "분석 시작",
  analysis_completed: "분석 완료",
  score_generated: "점수 생성",
  score_overridden: "점수 수동 수정",
  report_generated: "리포트 생성",
  report_exported: "리포트 내보내기",
  data_accessed: "데이터 접근",
  data_deleted: "데이터 삭제",
  hr_data_imported: "인사 데이터 가져오기",
  norm_calculated: "노름 산출",
  fairness_analyzed: "공정성 분석",
};

// 액터 배지
function ActorBadge({ actor }: { actor: AuditEntry["actor"] }) {
  const config: Record<string, { label: string; className: string }> = {
    system: { label: "시스템", className: "bg-blue-500/15 text-blue-400" },
    evaluator: { label: "평가자", className: "bg-teal-500/15 text-teal-400" },
    participant: { label: "참여자", className: "bg-amber-500/15 text-amber-400" },
    admin: { label: "관리자", className: "bg-purple-500/15 text-purple-400" },
  };
  const { label, className } = config[actor] ?? { label: actor, className: "bg-white/10 text-white/50" };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

// 동의 타입 한국어 레이블
const CONSENT_TYPE_LABELS: Record<string, string> = {
  video_recording: "영상 녹화",
  ai_analysis: "AI 분석",
  data_retention: "데이터 보관",
  report_sharing: "결과 공유",
};

// 참여자 고유 ID 목록 추출
function getUniqueParticipants(consents: ConsentRecord[]): string[] {
  return Array.from(new Set(consents.map((c) => c.participantId)));
}

// 참여자 × 동의 유형 매트릭스에서 특정 셀 확인
function getConsentStatus(
  consents: ConsentRecord[],
  participantId: string,
  type: ConsentRecord["consentType"]
): boolean | null {
  const record = consents.find(
    (c) => c.participantId === participantId && c.consentType === type
  );
  if (!record) return null;
  return record.agreed;
}

export default function ISOAuditView({
  auditEntries,
  consents,
  loading = false,
}: ISOAuditViewProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded bg-white/10" />
        <div className="h-48 rounded-xl bg-white/10" />
        <div className="h-40 rounded-xl bg-white/10" />
        <div className="h-64 rounded-xl bg-white/10" />
      </div>
    );
  }

  // 체크리스트 완료 항목 수 계산
  const checkedItems = ISO_CHECKLIST.filter((item) => item.check(auditEntries, consents));
  const completedCount = checkedItems.length;
  const totalCount = ISO_CHECKLIST.length;
  const completionPct = Math.round((completedCount / totalCount) * 100);

  // 동의 매트릭스용 데이터
  const participants = getUniqueParticipants(consents);
  const consentTypes: ConsentRecord["consentType"][] = [
    "video_recording",
    "ai_analysis",
    "data_retention",
    "report_sharing",
  ];

  // 감사 로그 — 최신 순 정렬 (최대 100개)
  const sortedEntries = [...auditEntries]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100);

  const progressBarColor =
    completionPct >= 80 ? "bg-teal-500" : completionPct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-teal-400" />
        <h3 className="text-base font-semibold text-white">ISO 10667 감사 뷰</h3>
      </div>

      {/* ① ISO 10667 체크리스트 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              ISO 10667 준수 체크리스트
            </h4>
            <span
              className={`text-sm font-bold ${
                completionPct >= 80
                  ? "text-teal-400"
                  : completionPct >= 50
                  ? "text-amber-400"
                  : "text-red-400"
              }`}
            >
              {completedCount}/{totalCount} 완료
            </span>
          </div>
          {/* 진행 막대 */}
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-xs text-white/30">{completionPct}% 달성</p>
          </div>
        </div>
        <ul className="divide-y divide-white/[0.06]">
          {ISO_CHECKLIST.map((item) => {
            const done = item.check(auditEntries, consents);
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors"
              >
                {/* 체크박스 아이콘 */}
                <div className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle className="h-4.5 w-4.5 text-teal-400 h-5 w-5" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-white/20 bg-transparent" />
                  )}
                </div>
                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium ${done ? "text-white/80" : "text-white/40"}`}
                    >
                      {item.id}. {item.label}
                    </span>
                    {done ? (
                      <span className="text-[10px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded px-1.5 py-0.5">
                        완료
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-white/30 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                        미완료
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-white/30 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ② 동의 매트릭스 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
          <FileText className="h-4 w-4 text-white/40" />
          <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            참여자 동의 매트릭스
          </h4>
          <span className="ml-auto text-xs text-white/30">{participants.length}명</span>
        </div>
        {participants.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/30">동의 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="py-2.5 px-4 text-xs font-semibold text-white/40">참여자 ID</th>
                  {consentTypes.map((type) => (
                    <th
                      key={type}
                      className="py-2.5 px-3 text-xs font-semibold text-white/40 text-center"
                    >
                      {CONSENT_TYPE_LABELS[type]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.map((pid) => (
                  <tr
                    key={pid}
                    className="border-t border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono text-xs text-white/60">{pid}</td>
                    {consentTypes.map((type) => {
                      const status = getConsentStatus(consents, pid, type);
                      return (
                        <td key={type} className="py-2.5 px-3 text-center">
                          {status === null ? (
                            <span className="text-white/20 text-lg">—</span>
                          ) : status ? (
                            <CheckCircle className="h-4 w-4 text-teal-400 mx-auto" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-400 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ③ 감사 로그 테이블 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
          <Clock className="h-4 w-4 text-white/40" />
          <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            감사 로그
          </h4>
          <span className="ml-auto text-xs text-white/30">총 {auditEntries.length}건</span>
        </div>
        {sortedEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">감사 로그가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#0f1117] z-10">
                <tr className="bg-white/[0.04]">
                  <th className="py-2.5 px-4 text-xs font-semibold text-white/40 whitespace-nowrap">
                    타임스탬프
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-white/40">액터</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-white/40">액션</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-white/40">세부사항</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => {
                  const date = new Date(entry.timestamp);
                  const dateStr = date.toLocaleDateString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                  });
                  const timeStr = date.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const detailStr = Object.entries(entry.details)
                    .slice(0, 3)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ");

                  return (
                    <tr
                      key={entry.id}
                      className="border-t border-white/[0.05] hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-2 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-white/50">
                          {dateStr}{" "}
                          <span className="text-white/30">{timeStr}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <ActorBadge actor={entry.actor} />
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs text-white/70 whitespace-nowrap">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs text-white/30 font-mono truncate block max-w-[260px]">
                          {detailStr || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
