"use client";

import { useMemo } from "react";
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
import { ArrowLeft, Trophy, TrendingDown, Users, AlertCircle } from "lucide-react";
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

interface GroupDashboardProps {
  session: GroupSession;
  onBack: () => void;
  onViewMember: (memberId: string) => void;
}

export default function GroupDashboard({ session, onBack, onViewMember }: GroupDashboardProps) {
  // 6명 × 4역량 레이더 데이터
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

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 space-y-6 animate-slide-in-right print:py-4 print:space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3 no-print">
        <button onClick={onBack} className="text-slate-500 hover:text-teal-600 transition-colors" aria-label="뒤로 가기">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-teal-600">{session.name} — 비교 대시보드</h2>
          <p className="text-sm text-slate-500">{session.members.length}명 역량 비교 · 디브리핑용</p>
        </div>
      </div>
      {/* 인쇄용 헤더 */}
      <div className="hidden print:block">
        <h2 className="text-xl font-bold text-slate-900">{session.name} — 비교 대시보드</h2>
        <p className="text-sm text-slate-500">{session.members.length}명 역량 비교 · 디브리핑용</p>
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
          <button
            key={m.id}
            onClick={() => onViewMember(m.id)}
            className={cn(
              "text-left rounded-xl p-4 border transition-all hover:shadow-md",
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
                {m.avgScore > 0 ? m.avgScore.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-slate-400">/9</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{m.analyzedCount}/4 역량</p>
          </button>
        ))}
      </div>

      {/* 6명 겹침 레이더 차트 */}
      <div className="bg-white border border-slate-200/40 rounded-xl p-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {m.score > 0 ? m.score.toFixed(1) : "—"}
                  </span>
                </div>
              ))}
              {/* 조 평균 행 */}
              <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-100">
                <span className="text-xs font-medium w-5 text-center text-slate-400">—</span>
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
                  {groupAvg > 0 ? groupAvg.toFixed(1) : "—"}
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
    </div>
  );
}
