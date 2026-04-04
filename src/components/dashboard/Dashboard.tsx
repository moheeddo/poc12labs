"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowUpRight, BarChart3, ChevronRight, Clock, ClipboardCheck, Film, ScanSearch, TrendingUp, UploadCloud, Users, FileText } from "lucide-react";
import type { ServiceTab } from "@/lib/types";
import { SERVICE_TABS, LEADERSHIP_COMPETENCY_DEFS } from "@/lib/constants";
import ServiceCard from "./ServiceCard";
import LiveClock from "./LiveClock";
import { cn } from "@/lib/utils";
import { loadAllSessions } from "@/lib/group-store";

interface DashboardProps {
  onNavigate: (tab: ServiceTab) => void;
}

const SHORTCUT_KEYS: Record<ServiceTab, string> = {
  simulator: "1",
  leadership: "2",
  pov: "3",
};

// 최근 활동 아이템 타입
interface RecentActivity {
  id: string;
  label: string;        // "김철수 비전제시 분석 완료"
  timestamp: number;    // epoch ms
  type: "evidence" | "group";
  icon: "analysis" | "group";
}

// 상대 시간 표시
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(ts).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  // localStorage에서 최근 활동 데이터 수집
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [lastActivityTime, setLastActivityTime] = useState<number | null>(null);

  useEffect(() => {
    try {
      const items: RecentActivity[] = [];
      let totalScore = 0;
      let scoreCount = 0;
      let latestTs = 0;

      // evidence-* 키 읽기
      const evidenceKeys = Object.keys(localStorage).filter((k) => k.startsWith("evidence-"));
      setEvidenceCount(evidenceKeys.length);

      evidenceKeys.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
          const data = JSON.parse(raw);
          const videoTitle = data.videoTitle || "영상";
          // 최상위 competencyKey 또는 evidence 배열 내 첫 번째 항목에서 추출
          const competencyKey = data.competencyKey || (data.evidence?.[0]?.competencyKey) || "";
          const compLabel = LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === competencyKey)?.label || "";
          // 타임스탬프 추출 (evidence-{videoId} 형태이므로 저장 시점을 추정)
          const ts = data.savedAt ? new Date(data.savedAt).getTime() : Date.now() - Math.random() * 3600000;
          if (ts > latestTs) latestTs = ts;

          // 점수 집계
          if (data.evidence && Array.isArray(data.evidence)) {
            data.evidence.forEach((ev: { score?: number; aiScore?: number }) => {
              const score = (ev.score && ev.score > 0) ? ev.score : (ev.aiScore || 0);
              if (score > 0) {
                totalScore += score;
                scoreCount++;
              }
            });
          }

          items.push({
            id: key,
            label: compLabel ? `${videoTitle} ${compLabel} 분석 완료` : `${videoTitle} 분석 완료`,
            timestamp: ts,
            type: "evidence",
            icon: "analysis",
          });
        } catch { /* 개별 파싱 실패 무시 */ }
      });

      // group session 읽기
      const sessions = loadAllSessions();
      setGroupCount(sessions.length);

      sessions.forEach((gs) => {
        const ts = new Date(gs.createdAt).getTime();
        if (ts > latestTs) latestTs = ts;
        items.push({
          id: gs.id,
          label: `${gs.name} 조 생성 (${gs.members.length}명)`,
          timestamp: ts,
          type: "group",
          icon: "group",
        });

        // 조별 멤버 분석 완료 활동도 추가
        gs.competencies.forEach((comp) => {
          const compLabel = LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === comp.competencyKey)?.label || "";
          Object.entries(comp.memberScores).forEach(([memberId, score]) => {
            if (score.analyzed) {
              const member = gs.members.find((m) => m.id === memberId);
              const memberName = member?.name || "멤버";
              // 분석 시점은 조 생성 이후로 추정
              const analysisTs = ts + 60000; // 조 생성 1분 후로 추정
              if (analysisTs > latestTs) latestTs = analysisTs;
              totalScore += score.overallScore;
              scoreCount++;
              items.push({
                id: `${gs.id}-${comp.competencyKey}-${memberId}`,
                label: `${memberName} ${compLabel} 분석 완료`,
                timestamp: analysisTs,
                type: "evidence",
                icon: "analysis",
              });
            }
          });
        });
      });

      // 시간순 정렬 (최신이 위)
      items.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(items.slice(0, 10)); // 최근 10건만 표시
      setAvgScore(scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : null);
      setLastActivityTime(latestTs > 0 ? latestTs : null);
    } catch {
      // localStorage 접근 실패 무시
    }
  }, []);

  // 상태 카드 값 계산
  const totalVideos = evidenceCount;
  const totalAnalysis = activities.filter((a) => a.type === "evidence").length;
  const avgScoreStr = avgScore !== null ? avgScore.toFixed(1) : "\u2014";
  const lastActivityStr = lastActivityTime ? relativeTime(lastActivityTime) : "\u2014";

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-12 animate-fade-in-up">
      {/* ═══ 히어로 섹션 ═══ */}
      <div className="mb-12 md:mb-16">
        <div className="flex items-start justify-between">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle text-xs font-mono text-khnp-emerald tracking-wider mb-4"
              style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-khnp-emerald animate-pulse" />
              통합 제어
            </div>
            <h2
              className="animate-fade-in-up text-3xl md:text-4xl font-bold gradient-text-emerald mb-3 tracking-[-0.03em] leading-tight"
              style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
            >
              통합 관제 대시보드
            </h2>
            <p
              className="animate-fade-in-up text-lg text-slate-500 max-w-lg"
              style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
            >
              영상 AI 기반 역량 평가 시스템 — 시뮬레이터·리더십·POV 통합 분석
            </p>
          </div>
          <LiveClock />
        </div>

        {/* 그라데이션 디바이더 */}
        <div
          className="animate-fade-in-up mt-6 h-px bg-gradient-to-r from-khnp-emerald/40 via-teal-500/20 to-transparent animate-gradient-pulse"
          style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
        />
      </div>

      {/* ═══ 상태 카드 그리드 ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-12 md:mb-16">
        {[
          {
            icon: <Film className="w-5 h-5" />,
            label: "등록 영상",
            value: String(totalVideos),
            unit: "건",
            accentColor: "text-coral-600",
            borderHover: "hover:border-coral-200",
            accentBorder: "border-l-coral-500",
          },
          {
            icon: <BarChart3 className="w-5 h-5" />,
            label: "완료 분석",
            value: String(totalAnalysis),
            unit: "건",
            accentColor: "text-teal-600",
            borderHover: "hover:border-teal-200",
            accentBorder: "border-l-teal-500",
          },
          {
            icon: <TrendingUp className="w-5 h-5" />,
            label: "평균 역량",
            value: avgScoreStr,
            unit: "점",
            accentColor: "text-amber-600",
            borderHover: "hover:border-amber-200",
            accentBorder: "border-l-amber-500",
            trend: avgScore !== null ? { direction: "up", label: "9점 척도" } : undefined,
          },
          {
            icon: <Clock className="w-5 h-5" />,
            label: "최근 분석",
            value: lastActivityStr,
            unit: "",
            accentColor: "text-slate-500",
            borderHover: "hover:border-slate-300",
            accentBorder: "border-l-slate-400",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              "animate-fade-in-up bg-white rounded-xl p-5 border border-slate-200 shadow-sm card-lift",
              "border-l-[3px]",
              stat.accentBorder,
              stat.borderHover,
            )}
            style={{ animationDelay: `${250 + i * 60}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <span className={stat.accentColor}>{stat.icon}</span>
              <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
              {stat.trend && (
                <span className="ml-auto flex items-center gap-0.5 text-xs font-mono text-emerald-600">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.trend.label}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums tracking-tight">{stat.value}</span>
              <span className="text-sm text-slate-400">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ 서비스 카드 ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {SERVICE_TABS.map((tab, i) => (
          <div
            key={tab.key}
            className="animate-fade-in-up"
            style={{ animationDelay: `${500 + i * 100}ms`, animationFillMode: "backwards" }}
          >
            <ServiceCard
              tabKey={tab.key}
              label={tab.label}
              description={tab.description}
              color={tab.color}
              bgColor={tab.bgColor}
              borderColor={tab.borderColor}
              videoCount={0}
              shortcutKey={SHORTCUT_KEYS[tab.key] ?? String(i + 1)}
              onClick={() => onNavigate(tab.key)}
            />
          </div>
        ))}
      </div>

      {/* ═══ 시작하기 가이드 ═══ */}
      <div className="mt-16 md:mt-20">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="animate-fade-in-up h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"
            style={{ animationDelay: "800ms", animationFillMode: "backwards" }}
          />
          <h3
            className="animate-fade-in-up text-sm font-mono text-slate-400 tracking-[0.15em] uppercase"
            style={{ animationDelay: "800ms", animationFillMode: "backwards" }}
          >
            빠른 시작
          </h3>
          <div
            className="animate-fade-in-up h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent"
            style={{ animationDelay: "800ms", animationFillMode: "backwards" }}
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-0">
          {[
            {
              step: 1,
              title: "영상 업로드",
              desc: "평가 대상 영상을 등록합니다",
              icon: <UploadCloud className="w-5 h-5" />,
              iconColor: "text-coral-400",
              hoverBorder: "hover:border-coral-500/20",
              tab: "simulator" as ServiceTab,
            },
            {
              step: 2,
              title: "AI 분석",
              desc: "멀티모달 AI가 자동으로 분석합니다",
              icon: <ScanSearch className="w-5 h-5" />,
              iconColor: "text-teal-400",
              hoverBorder: "hover:border-teal-500/20",
              tab: "leadership" as ServiceTab,
            },
            {
              step: 3,
              title: "리포트 확인",
              desc: "역량 평가 리포트를 확인합니다",
              icon: <ClipboardCheck className="w-5 h-5" />,
              iconColor: "text-amber-400",
              hoverBorder: "hover:border-amber-500/20",
              tab: "pov" as ServiceTab,
            },
          ].map((item, i) => (
            <div key={item.step} className="flex flex-col md:flex-row items-center md:flex-1">
              <button
                type="button"
                onClick={() => onNavigate(item.tab)}
                className={cn(
                  "animate-fade-in-up w-full glass glass-shine rounded-xl p-5 transition-all duration-300 cursor-pointer text-left group/step",
                  item.hoverBorder,
                  "hover:-translate-y-0.5 hover:shadow-lg",
                )}
                style={{ animationDelay: `${900 + i * 100}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 transition-colors duration-300 group-hover/step:bg-slate-100", item.iconColor)}>
                    {item.icon}
                  </div>
                  <span className="text-xs font-mono text-slate-400 tracking-wider">
                    STEP {item.step}
                  </span>
                </div>
                <h4 className="text-base text-slate-900 font-semibold mb-1 tracking-[-0.01em]">{item.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed group-hover/step:text-slate-600 transition-colors duration-300">{item.desc}</p>
              </button>

              {i < 2 && (
                <>
                  <div className="animate-fade-in-up hidden md:flex items-center justify-center px-3 text-slate-300" style={{ animationDelay: `${950 + i * 100}ms`, animationFillMode: "backwards" }}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <div className="animate-fade-in-up flex md:hidden items-center justify-center py-1 text-slate-300" style={{ animationDelay: `${950 + i * 100}ms`, animationFillMode: "backwards" }}>
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 최근 활동 ═══ */}
      <div className="mt-16">
        <h3
          className="animate-fade-in-up flex items-center gap-2.5 text-sm font-mono text-slate-400 tracking-[0.1em] uppercase mb-5"
          style={{ animationDelay: "1200ms", animationFillMode: "backwards" }}
        >
          <Clock className="w-4 h-4 text-slate-500" />
          최근 활동
        </h3>

        <div
          className="animate-fade-in-up bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm"
          style={{ animationDelay: "1250ms", animationFillMode: "backwards" }}
        >
          {/* 활동 타임라인 — localStorage 데이터 연동 */}
          {activities.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-khnp-emerald/5 to-teal-50 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-khnp-emerald/40" />
              </div>
              <p className="text-lg font-medium text-slate-700 mb-1">활동 내역이 없습니다</p>
              <p className="text-base text-slate-400">영상을 업로드하면 AI 분석 결과가 실시간으로 표시됩니다</p>
            </div>
          ) : (
            <div className="space-y-0">
              {activities.map((activity, i) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0 animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    activity.icon === "group" ? "bg-teal-50 text-teal-500" : "bg-amber-50 text-amber-500"
                  )}>
                    {activity.icon === "group"
                      ? <Users className="w-4 h-4" />
                      : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium truncate">{activity.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{relativeTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 하단 기능 힌트 */}
          <div
            className="animate-fade-in-up mt-4 flex items-center justify-center gap-3 text-sm text-slate-400"
            style={{ animationDelay: "1500ms", animationFillMode: "backwards" }}
          >
            <div className="h-px flex-1 bg-slate-100" />
            <span className="font-mono text-xs tracking-wider">영상 업로드 → AI 분석 → 리포트 자동 생성</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
