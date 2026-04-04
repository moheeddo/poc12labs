"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ArrowLeft, Trophy, TrendingDown, Users, AlertCircle, Printer, FileText, X } from "lucide-react";
import type { GroupSession } from "@/lib/group-types";
import { COMPETENCY_ORDER } from "@/lib/group-types";
import { cn } from "@/lib/utils";

// 6인 색상 팔레트
const MEMBER_COLORS = [
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#3b82f6", // blue
  "#ec4899", // pink
];

// 점수 판정 텍스트
function getScoreLabel(score: number): string {
  if (score >= 8) return "탁월";
  if (score >= 7) return "우수";
  if (score >= 5) return "보통";
  if (score >= 3) return "미흡";
  if (score > 0) return "부족";
  return "미평가";
}

// 점수별 개선 권고
function getImprovementAdvice(score: number, competencyLabel: string): string {
  if (score >= 8) return `${competencyLabel} 역량이 탁월한 수준입니다. 현재 수준을 유지하고 타 구성원의 롤모델로 활용하시기 바랍니다.`;
  if (score >= 7) return `${competencyLabel} 역량이 우수합니다. 9점 수준의 행동 기준을 참고하여 한 단계 더 성장할 수 있습니다.`;
  if (score >= 5) return `${competencyLabel} 역량이 보통 수준입니다. 루브릭의 상위 행동 기준을 참고하여 구체적 행동 개선 계획을 수립하세요.`;
  if (score >= 3) return `${competencyLabel} 역량 개선이 필요합니다. 코칭 면담과 실습 기회를 통해 기본적인 행동 패턴을 강화하세요.`;
  if (score > 0) return `${competencyLabel} 역량이 부족합니다. 해당 역량에 대한 집중적인 교육과 멘토링이 권장됩니다.`;
  return "아직 평가되지 않았습니다.";
}

interface GroupDashboardProps {
  session: GroupSession;
  onBack: () => void;
  onViewMember: (memberId: string) => void;
}

// ── 개인별 상세 보고서 인쇄 모달 ──
interface MemberReportData {
  member: { id: string; name: string; position: string; order: number };
  avgScore: number;
  analyzedCount: number;
  competencyScores: { label: string; score: number; color: string; activityType: string }[];
  rank: number;
  totalMembers: number;
}

function MemberReportModal({
  data,
  sessionName,
  onClose,
}: {
  data: MemberReportData;
  sessionName: string;
  onClose: () => void;
}) {
  // 인쇄 시 body에 클래스 부여하여 다른 요소 숨김
  useEffect(() => {
    document.body.classList.add("print-member-report-active");
    return () => {
      document.body.classList.remove("print-member-report-active");
    };
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 강점 역량 (7점 이상)
  const strengths = data.competencyScores.filter((c) => c.score >= 7);
  // 개선 필요 역량 (5점 미만)
  const improvements = data.competencyScores.filter((c) => c.score > 0 && c.score < 5);

  return (
    <div className="print-member-report-overlay fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto">
      <div className="bg-white w-full max-w-[800px] my-8 mx-4 rounded-xl shadow-2xl print:shadow-none print:my-0 print:mx-0 print:max-w-none print:rounded-none">
        {/* 화면용 상단 바 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-800">개인별 역량진단 보고서 미리보기</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              인쇄 / PDF 저장
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 보고서 본문 (인쇄 대상) */}
        <div className="print-member-report p-8 print:p-0">
          {/* 보고서 헤더 */}
          <div className="member-report-header text-center pb-5 mb-5 border-b-2 border-[#006341]">
            <h1 className="text-xl font-extrabold text-[#006341] mb-1">KHNP 리더십 역량진단 개인 보고서</h1>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{data.member.name} ({data.member.position})</h2>
            <div className="flex justify-center gap-6 text-sm text-slate-500">
              <span>{sessionName}</span>
              <span>{today}</span>
              <span>순위: {data.rank}/{data.totalMembers}위</span>
            </div>
          </div>

          {/* 종합 점수 섹션 */}
          <div className="member-report-section mb-5">
            <h3 className="text-base font-bold text-[#006341] mb-3 pb-1 border-b border-slate-200">1. 종합 점수</h3>
            <div className="flex items-center gap-6 mb-3">
              <div className={cn(
                "px-6 py-4 rounded-xl border-2 text-center",
                data.avgScore >= 7 ? "border-teal-500 bg-teal-50" :
                data.avgScore >= 5 ? "border-amber-500 bg-amber-50" :
                data.avgScore > 0 ? "border-red-400 bg-red-50" :
                "border-slate-200 bg-slate-50"
              )}>
                <p className="text-sm text-slate-500 mb-1">종합 점수</p>
                <p className={cn(
                  "text-3xl font-bold font-mono",
                  data.avgScore >= 7 ? "text-teal-600" :
                  data.avgScore >= 5 ? "text-amber-600" :
                  data.avgScore > 0 ? "text-red-500" :
                  "text-slate-300"
                )}>
                  {data.avgScore > 0 ? data.avgScore.toFixed(1) : "-"}<span className="text-base text-slate-400">/9</span>
                </p>
                <p className={cn(
                  "text-sm font-medium mt-1",
                  data.avgScore >= 7 ? "text-teal-600" :
                  data.avgScore >= 5 ? "text-amber-600" :
                  data.avgScore > 0 ? "text-red-500" :
                  "text-slate-400"
                )}>
                  {getScoreLabel(data.avgScore)}
                </p>
              </div>
              <div className="flex-1 text-sm text-slate-600 leading-relaxed">
                <p>
                  전체 {data.competencyScores.length}개 역량 중 {data.analyzedCount}개 역량이 평가되었습니다.
                  {data.avgScore >= 7 && " 전반적으로 우수한 리더십 역량을 보유하고 있습니다."}
                  {data.avgScore >= 5 && data.avgScore < 7 && " 기본적인 역량은 갖추고 있으나, 일부 영역에서 향상이 필요합니다."}
                  {data.avgScore > 0 && data.avgScore < 5 && " 리더십 역량 강화를 위한 체계적인 개발 계획이 필요합니다."}
                </p>
              </div>
            </div>
          </div>

          {/* 역량별 상세 점수 */}
          <div className="member-report-section mb-5">
            <h3 className="text-base font-bold text-[#006341] mb-3 pb-1 border-b border-slate-200">2. 역량별 상세 점수</h3>
            <table className="w-full border-collapse text-sm mb-3">
              <thead>
                <tr>
                  <th className="bg-[#f0fdfa] border border-[#ccfbf1] px-3 py-2 text-left font-semibold text-[#0f766e]">역량</th>
                  <th className="bg-[#f0fdfa] border border-[#ccfbf1] px-3 py-2 text-left font-semibold text-[#0f766e]">활동유형</th>
                  <th className="bg-[#f0fdfa] border border-[#ccfbf1] px-3 py-2 text-right font-semibold text-[#0f766e] w-20">점수</th>
                  <th className="bg-[#f0fdfa] border border-[#ccfbf1] px-3 py-2 text-center font-semibold text-[#0f766e] w-16">판정</th>
                </tr>
              </thead>
              <tbody>
                {data.competencyScores.map((c) => (
                  <tr key={c.label}>
                    <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">
                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-slate-500">{c.activityType}</td>
                    <td className={cn(
                      "border border-slate-200 px-3 py-2 text-right font-mono font-bold",
                      c.score >= 7 ? "score-excellent text-teal-600" :
                      c.score >= 5 ? "score-good text-amber-600" :
                      c.score > 0 ? "score-poor text-red-500" :
                      "text-slate-300"
                    )}>
                      {c.score > 0 ? c.score.toFixed(1) : "-"}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center text-sm">
                      {getScoreLabel(c.score)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 강점 영역 */}
          {strengths.length > 0 && (
            <div className="member-report-section mb-5">
              <h3 className="text-base font-bold text-[#006341] mb-3 pb-1 border-b border-slate-200">3. 강점 영역</h3>
              <div className="space-y-2">
                {strengths.map((c) => (
                  <div key={c.label} className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
                    <p className="text-sm font-semibold text-teal-700 mb-1">
                      {c.label} ({c.score.toFixed(1)}/9 — {getScoreLabel(c.score)})
                    </p>
                    <p className="text-sm text-slate-600">{getImprovementAdvice(c.score, c.label)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 개선 필요 영역 */}
          {improvements.length > 0 && (
            <div className="member-report-section mb-5">
              <h3 className="text-base font-bold text-[#006341] mb-3 pb-1 border-b border-slate-200">
                {strengths.length > 0 ? "4" : "3"}. 개선 필요 영역
              </h3>
              <div className="space-y-2">
                {improvements.map((c) => (
                  <div key={c.label} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <p className="text-sm font-semibold text-amber-700 mb-1">
                      {c.label} ({c.score.toFixed(1)}/9 — {getScoreLabel(c.score)})
                    </p>
                    <p className="text-sm text-slate-600">{getImprovementAdvice(c.score, c.label)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 개선 권고사항 */}
          <div className="member-report-section mb-5">
            <h3 className="text-base font-bold text-[#006341] mb-3 pb-1 border-b border-slate-200">
              {strengths.length > 0 && improvements.length > 0 ? "5" : strengths.length > 0 || improvements.length > 0 ? "4" : "3"}. 역량별 개선 권고
            </h3>
            <div className="space-y-3">
              {data.competencyScores
                .filter((c) => c.score > 0 && c.score < 8)
                .sort((a, b) => a.score - b.score)
                .map((c, i) => (
                  <div key={c.label} className="flex items-start gap-2 text-sm">
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-700">{c.label} ({c.score.toFixed(1)}점)</p>
                      <p className="text-slate-500 leading-relaxed">{getImprovementAdvice(c.score, c.label)}</p>
                    </div>
                  </div>
                ))}
              {data.competencyScores.filter((c) => c.score > 0 && c.score < 8).length === 0 && (
                <p className="text-sm text-teal-600">모든 평가된 역량에서 탁월한 수준을 보이고 있습니다.</p>
              )}
            </div>
          </div>

          {/* 보고서 푸터 */}
          <div className="text-center text-xs text-slate-400 pt-4 mt-6 border-t border-slate-200">
            <p className="font-medium">KHNP Video AI Platform -- 리더십 역량진단 시스템</p>
            <p>본 보고서는 BARS(Behaviorally Anchored Rating Scales) 방법론과 멀티모달 AI 분석을 결합하여 생성되었습니다.</p>
            <p>출력일: {today} | {sessionName} | {data.member.name} ({data.member.position})</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GroupDashboard({ session, onBack, onViewMember }: GroupDashboardProps) {
  // 개인별 보고서 모달 상태
  const [reportMemberId, setReportMemberId] = useState<string | null>(null);

  // 6명 x 4역량 레이더 데이터
  const radarData = useMemo(() => {
    return COMPETENCY_ORDER.map((comp) => {
      const compState = session.competencies.find((c) => c.competencyKey === comp.key);
      const row: Record<string, string | number> = { subject: comp.label };

      session.members.forEach((m) => {
        const score = compState?.memberScores[m.id];
        row[m.name] = score?.overallScore || 0;
      });

      return row;
    });
  }, [session]);

  // 역량별 순위 테이블
  const rankings = useMemo(() => {
    return COMPETENCY_ORDER.map((comp) => {
      const compState = session.competencies.find((c) => c.competencyKey === comp.key);
      const scored = session.members
        .map((m) => ({
          ...m,
          score: compState?.memberScores[m.id]?.overallScore || 0,
          analyzed: compState?.memberScores[m.id]?.analyzed || false,
        }))
        .sort((a, b) => b.score - a.score);

      // 조 평균 계산 (점수가 있는 멤버만)
      const scoredMembers = scored.filter((m) => m.score > 0);
      const groupAvg = scoredMembers.length > 0
        ? Math.round((scoredMembers.reduce((sum, m) => sum + m.score, 0) / scoredMembers.length) * 10) / 10
        : 0;

      return { comp, members: scored, groupAvg };
    });
  }, [session]);

  // 종합 순위
  const overallRanking = useMemo(() => {
    return session.members
      .map((m) => {
        const scores = session.competencies
          .map((c) => c.memberScores[m.id]?.overallScore || 0)
          .filter((s) => s > 0);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return { ...m, avgScore: Math.round(avg * 10) / 10, analyzedCount: scores.length };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [session]);

  // 분석된 멤버가 하나라도 있는지 확인
  const hasAnyAnalysis = useMemo(() => {
    return session.competencies.some((c) =>
      Object.values(c.memberScores).some((s) => s?.analyzed)
    );
  }, [session]);

  // 개인별 보고서 데이터 생성
  const memberReportData = useMemo((): MemberReportData | null => {
    if (!reportMemberId) return null;
    const member = session.members.find((m) => m.id === reportMemberId);
    if (!member) return null;

    const ranked = overallRanking.findIndex((m) => m.id === reportMemberId);
    const memberRanked = overallRanking.find((m) => m.id === reportMemberId);

    const competencyScores = COMPETENCY_ORDER.map((comp) => {
      const compState = session.competencies.find((c) => c.competencyKey === comp.key);
      const score = compState?.memberScores[reportMemberId]?.overallScore || 0;
      return {
        label: comp.label,
        score,
        color: comp.color,
        activityType: comp.activityType,
      };
    });

    return {
      member,
      avgScore: memberRanked?.avgScore || 0,
      analyzedCount: memberRanked?.analyzedCount || 0,
      competencyScores,
      rank: ranked + 1,
      totalMembers: session.members.length,
    };
  }, [reportMemberId, session, overallRanking]);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 space-y-6 animate-slide-in-right print:py-4 print:space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-500 hover:text-teal-600 transition-colors" aria-label="뒤로 가기">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-teal-600">{session.name} -- 비교 대시보드</h2>
            <p className="text-sm text-slate-500">{session.members.length}명 역량 비교 -- 디브리핑용</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:border-teal-500/30 hover:text-teal-600 transition-all duration-200"
        >
          <Printer className="w-4 h-4" />
          전체 보고서 인쇄
        </button>
      </div>

      {/* 인쇄 전용 보고서 헤더 */}
      <div className="hidden print-report-header">
        <h1>KHNP 리더십 역량진단 보고서</h1>
        <p className="print-report-subtitle">{session.name} -- 조 비교 대시보드</p>
        <div className="print-report-meta">
          <span>출력일: {today}</span>
          <span>참가인원: {session.members.length}명</span>
          <span>평가 역량: {COMPETENCY_ORDER.length}개</span>
        </div>
      </div>

      {/* 인쇄 전용 참가자 목록 표 */}
      <div className="hidden print-members-table">
        <table>
          <thead>
            <tr>
              <th>순번</th>
              <th>성명</th>
              <th>직급</th>
              {COMPETENCY_ORDER.map((comp) => (
                <th key={comp.key}>{comp.label}</th>
              ))}
              <th>종합</th>
              <th>순위</th>
            </tr>
          </thead>
          <tbody>
            {overallRanking.map((m, i) => (
              <tr key={m.id}>
                <td>{m.order}</td>
                <td style={{ fontWeight: 600 }}>{m.name}</td>
                <td>{m.position}</td>
                {COMPETENCY_ORDER.map((comp) => {
                  const compState = session.competencies.find((c) => c.competencyKey === comp.key);
                  const score = compState?.memberScores[m.id]?.overallScore || 0;
                  return (
                    <td key={comp.key} className="print-score-cell">
                      {score > 0 ? score.toFixed(1) : "-"}
                    </td>
                  );
                })}
                <td className="print-score-cell" style={{ fontWeight: 700 }}>
                  {m.avgScore > 0 ? m.avgScore.toFixed(1) : "-"}
                </td>
                <td className="print-score-cell">{i + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 빈 상태: 분석된 멤버가 없을 때 안내 ── */}
      {!hasAnyAnalysis && (
        <div className="bg-amber-50/60 border border-amber-200/50 rounded-xl p-8 text-center animate-fade-in-up">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-amber-800 mb-2">아직 분석된 데이터가 없습니다</h3>
          <p className="text-sm text-amber-700 mb-1">
            비교 대시보드를 보려면 먼저 역량별 영상 분석을 진행해주세요.
          </p>
          <p className="text-xs text-amber-600/70">
            조 관리 화면에서 영상을 업로드하고 &ldquo;분석 시작&rdquo; 버튼을 눌러주세요.
          </p>
          <button
            onClick={onBack}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            조 관리로 돌아가기
          </button>
        </div>
      )}

      {/* 종합 순위 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {overallRanking.map((m, i) => (
          <div
            key={m.id}
            className={cn(
              "text-left rounded-xl p-4 border transition-all",
              i === 0 ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-200/40"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: MEMBER_COLORS[m.order - 1] || "#94a3b8" }}
              >
                {m.order}
              </div>
              {i === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
            </div>
            <p className="text-sm font-bold text-slate-800">{m.name}</p>
            <p className="text-[10px] text-slate-400">{m.position}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={cn(
                "text-lg font-bold font-mono",
                m.avgScore >= 7 ? "text-teal-600" :
                m.avgScore >= 5 ? "text-amber-600" :
                m.avgScore > 0 ? "text-red-500" :
                "text-slate-300"
              )}>
                {m.avgScore > 0 ? m.avgScore.toFixed(1) : "\u2014"}
              </span>
              <span className="text-xs text-slate-400">/9</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{m.analyzedCount}/4 역량</p>

            {/* 버튼 그룹 */}
            <div className="mt-3 flex gap-1.5 no-print">
              <button
                onClick={() => onViewMember(m.id)}
                className="flex-1 text-[10px] font-medium px-2 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/60 hover:border-teal-500/30 hover:text-teal-600 transition-all"
              >
                분석 보기
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setReportMemberId(m.id); }}
                className="flex items-center gap-0.5 text-[10px] font-medium px-2 py-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200/60 hover:bg-teal-100 transition-all"
                title="개인 보고서 인쇄"
              >
                <FileText className="w-3 h-3" />
                보고서
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 6명 겹침 레이더 차트 */}
      <div className="bg-white border border-slate-200/40 rounded-xl p-6 print-page-break-after-chart">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-teal-600" />
          <h3 className="text-base font-semibold text-slate-800">6명 역량 프로파일 비교</h3>
        </div>
        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={480}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 13, fontWeight: 600 }} />
              <PolarRadiusAxis domain={[0, 9]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip />
              {session.members.map((m) => (
                <Radar
                  key={m.id}
                  name={m.name}
                  dataKey={m.name}
                  stroke={MEMBER_COLORS[m.order - 1] || "#94a3b8"}
                  fill={MEMBER_COLORS[m.order - 1] || "#94a3b8"}
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              ))}
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value) => <span className="text-slate-600">{value}</span>}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 역량별 순위 테이블 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print-rankings-grid">
        {rankings.map(({ comp, members, groupAvg }) => (
          <div key={comp.key} className="bg-white border border-slate-200/40 rounded-xl p-4" style={{ borderLeftWidth: "3px", borderLeftColor: comp.color }}>
            <h4 className="text-sm font-bold mb-3" style={{ color: comp.color }}>
              {comp.label}
              <span className="text-xs text-slate-400 font-normal ml-2">{comp.activityType}</span>
            </h4>
            <div className="space-y-1.5">
              {members.map((m, rank) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-mono font-bold w-5 text-center",
                    rank === 0 ? "text-amber-500" : "text-slate-400"
                  )}>
                    {rank + 1}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: MEMBER_COLORS[m.order - 1] }}
                  />
                  <span className="text-sm text-slate-700 flex-1">{m.name}</span>
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(m.score / 9) * 100}%`,
                        backgroundColor: m.score >= 7 ? "#14b8a6" : m.score >= 5 ? "#f59e0b" : m.score > 0 ? "#ef4444" : "#e2e8f0",
                      }}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-mono w-8 text-right",
                    m.score > 0 ? "text-slate-700" : "text-slate-300"
                  )}>
                    {m.score > 0 ? m.score.toFixed(1) : "\u2014"}
                  </span>
                </div>
              ))}
              {/* 조 평균 행 */}
              <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-100">
                <span className="text-xs font-medium w-5 text-center text-slate-400">\u2014</span>
                <div className="w-3 h-3 rounded-full shrink-0 bg-slate-300" />
                <span className="text-xs font-semibold text-slate-500 flex-1">조 평균</span>
                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(groupAvg / 9) * 100}%`,
                      backgroundColor: groupAvg >= 7 ? "#14b8a6" : groupAvg >= 5 ? "#f59e0b" : groupAvg > 0 ? "#ef4444" : "#e2e8f0",
                    }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-mono font-bold w-8 text-right",
                  groupAvg >= 7 ? "text-teal-600" : groupAvg >= 5 ? "text-amber-600" : groupAvg > 0 ? "text-red-500" : "text-slate-300"
                )}>
                  {groupAvg > 0 ? groupAvg.toFixed(1) : "\u2014"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 강점/약점 하이라이트 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top performer */}
        {overallRanking[0]?.avgScore > 0 && (
          <div className="bg-teal-50/50 border border-teal-200/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-teal-600" />
              <p className="text-sm font-semibold text-teal-700">최고 평가자</p>
            </div>
            <p className="text-base font-bold text-teal-800">{overallRanking[0].name}</p>
            <p className="text-sm text-teal-600">종합 {overallRanking[0].avgScore.toFixed(1)}/9</p>
          </div>
        )}
        {/* 개선 필요 */}
        {overallRanking.length > 1 && overallRanking[overallRanking.length - 1]?.avgScore > 0 && (
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-700">집중 코칭 대상</p>
            </div>
            <p className="text-base font-bold text-amber-800">{overallRanking[overallRanking.length - 1].name}</p>
            <p className="text-sm text-amber-600">종합 {overallRanking[overallRanking.length - 1].avgScore.toFixed(1)}/9</p>
          </div>
        )}
      </div>

      {/* 인쇄 전용 보고서 푸터 */}
      <div className="hidden print-report-footer">
        <p>KHNP Video AI Platform -- 리더십 역량진단 시스템</p>
        <p>본 보고서는 BARS(Behaviorally Anchored Rating Scales) 방법론과 멀티모달 AI 분석을 결합하여 생성되었습니다.</p>
        <p>{session.name} 비교 대시보드 | 출력일: {today}</p>
      </div>

      {/* 개인별 보고서 인쇄 모달 */}
      {memberReportData && (
        <MemberReportModal
          data={memberReportData}
          sessionName={session.name}
          onClose={() => setReportMemberId(null)}
        />
      )}
    </div>
  );
}
