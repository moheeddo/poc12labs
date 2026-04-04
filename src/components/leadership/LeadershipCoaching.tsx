"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Users,
  TrendingUp,
  Video,
  Upload,
  FileText,
  ArrowLeft,
  ChevronRight,
  Target,
  Scale,
  GraduationCap,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import VideoUploader from "@/components/shared/VideoUploader";
import ChartTooltip from "@/components/shared/ChartTooltip";
import ScoreCard from "./ScoreCard";
import LeadershipFeedback from "./LeadershipFeedback";
import GroupManager, { GroupCreateForm } from "./GroupManager";
import GroupDashboard from "./GroupDashboard";
import { useVideoUpload } from "@/hooks/useTwelveLabs";
import {
  TWELVELABS_INDEXES,
  LEADERSHIP_COMPETENCY_DEFS,
} from "@/lib/constants";
import { loadAllSessions, saveSession } from "@/lib/group-store";
import type { GroupSession } from "@/lib/group-types";
import type { SpeakerScore, LeadershipCompetencyKey } from "@/lib/types";

// ─── 역량 아이콘 매핑 ───
const COMPETENCY_ICONS: Record<string, React.ElementType> = {
  visionPresentation: Target,
  trustBuilding: MessageCircle,
  memberDevelopment: GraduationCap,
  rationalDecision: Scale,
};

// ─── 1-3직급 역량 4개 ───
const EVALUATION_COMPETENCIES: LeadershipCompetencyKey[] = [
  "visionPresentation",
  "trustBuilding",
  "memberDevelopment",
  "rationalDecision",
];

// ─── 뷰 상태 ───
type ViewState =
  | { type: "main" }
  | {
      type: "feedback";
      videoId: string;
      videoTitle: string;
      videoUrl?: string;
      selectedCompetencies: LeadershipCompetencyKey[];
      scenarioText: string;
    }
  | { type: "history" }
  | { type: "group-create" }
  | { type: "group-manage"; sessionId: string }
  | { type: "group-dashboard"; sessionId: string }
  | { type: "group-feedback"; sessionId: string; memberId: string; memberName: string; videoId: string; videoUrl?: string; competencyKey: LeadershipCompetencyKey; scenarioText?: string };

// 성장 추이 데이터 (실제 연동 시 API에서 조회)
function generateGrowthData() {
  const competencies = LEADERSHIP_COMPETENCY_DEFS.filter((d) =>
    EVALUATION_COMPETENCIES.includes(d.key)
  );
  return ["1월", "2월", "3월", "4월", "5월"].map((month, mi) => {
    const row: Record<string, string | number> = { month };
    competencies.forEach((comp) => {
      row[comp.label] = Math.min(9, Math.floor(4.5 + mi * 0.4 + Math.random() * 2));
    });
    return row;
  });
}

export default function LeadershipCoaching() {
  const [view, setView] = useState<ViewState>({ type: "main" });

  // 조 세션 관리
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>([]);
  useEffect(() => { setGroupSessions(loadAllSessions()); }, [view]);
  const activeGroupSession = useMemo(() => {
    if (view.type === "group-manage" || view.type === "group-dashboard" || view.type === "group-feedback") {
      return groupSessions.find((s) => s.id === view.sessionId) || null;
    }
    return null;
  }, [view, groupSessions]);

  // 업로드
  const { progress: uploadProgress, upload, uploadByUrl } = useVideoUpload();

  // 업로드 중 페이지 이탈 경고
  useEffect(() => {
    if (!uploadProgress || uploadProgress.status === "complete" || uploadProgress.status === "error") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "영상 업로드가 진행 중입니다. 페이지를 나가시겠습니까?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploadProgress]);

  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string | null>(null);

  // 상황사례 입력
  const [scenarioText, setScenarioText] = useState("");

  // 역량 선택 (복수 선택 가능)
  const [selectedCompetencies, setSelectedCompetencies] = useState<Set<LeadershipCompetencyKey>>(
    new Set()
  );

  // 히스토리 데이터
  const [speakers, setSpeakers] = useState<SpeakerScore[]>([]);
  const [growthData] = useState(() => generateGrowthData());

  // localStorage에서 저장된 evidence를 읽어 히스토리 생성
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("evidence-"));
      const allSpeakers: SpeakerScore[] = [];

      keys.forEach((key, idx) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data.evidence || !Array.isArray(data.evidence)) return;

        const competencyScores: Record<string, number[]> = {};
        const strengths: string[] = [];
        const improvements: string[] = [];

        data.evidence.forEach(
          (ev: { competencyKey: string; score: number; aiScore?: number }) => {
            const score = ev.score > 0 ? ev.score : ev.aiScore || 0;
            if (score > 0) {
              if (!competencyScores[ev.competencyKey]) competencyScores[ev.competencyKey] = [];
              competencyScores[ev.competencyKey].push(score);
            }
          }
        );

        const scoreEntries = Object.entries(competencyScores);
        if (scoreEntries.length === 0) return;

        const scores: Partial<Record<LeadershipCompetencyKey, number>> = {};
        let totalSum = 0;
        let totalCount = 0;

        scoreEntries.forEach(([k, vals]) => {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          scores[k as LeadershipCompetencyKey] = Math.round(avg * 10) / 10;
          totalSum += avg;
          totalCount++;
          if (avg >= 7)
            strengths.push(
              `${LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === k)?.label || k} 우수`
            );
          else if (avg < 5)
            improvements.push(
              `${LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === k)?.label || k} 개선 필요`
            );
        });

        allSpeakers.push({
          speakerId: `sp-${idx}`,
          speakerName: data.videoTitle || `영상 ${idx + 1}`,
          jobLevel: 2,
          scores,
          totalScore: Math.round((totalSum / totalCount) * 10) / 10,
          feedback: "",
          strengths: strengths.length > 0 ? strengths : undefined,
          improvements: improvements.length > 0 ? improvements : undefined,
        });
      });

      allSpeakers.sort((a, b) => b.totalScore - a.totalScore);
      if (allSpeakers.length > 0) setSpeakers(allSpeakers);
    } catch {
      // localStorage 접근 실패 무시
    }
  }, [view]);

  // 역량 정의 (평가 대상 4개)
  const competencyDefs = useMemo(
    () => LEADERSHIP_COMPETENCY_DEFS.filter((d) => EVALUATION_COMPETENCIES.includes(d.key)),
    []
  );

  // 핸들러
  const handleUpload = useCallback(
    async (file: File) => {
      setUploadedFileName(file.name);
      const blobUrl = URL.createObjectURL(file);
      setUploadedBlobUrl(blobUrl);
      try {
        const videoId = await upload(TWELVELABS_INDEXES.leadership, file);
        setUploadedVideoId(videoId);
      } catch {
        /* useVideoUpload 내부 처리 */
      }
    },
    [upload]
  );

  const handleUrlUpload = useCallback(
    async (url: string) => {
      const fileName = url.split("/").pop() || "영상";
      setUploadedFileName(fileName);
      try {
        const videoId = await uploadByUrl(TWELVELABS_INDEXES.leadership, url, fileName);
        setUploadedVideoId(videoId);
      } catch {
        /* useVideoUpload 내부 처리 */
      }
    },
    [uploadByUrl]
  );

  const toggleCompetency = useCallback((key: LeadershipCompetencyKey) => {
    setSelectedCompetencies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllCompetencies = useCallback(() => {
    setSelectedCompetencies(new Set(EVALUATION_COMPETENCIES));
  }, []);

  const canStartAnalysis = uploadedVideoId && selectedCompetencies.size > 0;

  const handleStartAnalysis = useCallback(() => {
    if (!uploadedVideoId) return;
    setView({
      type: "feedback",
      videoId: uploadedVideoId,
      videoTitle: uploadedFileName,
      videoUrl: uploadedBlobUrl || undefined,
      selectedCompetencies: Array.from(selectedCompetencies),
      scenarioText,
    });
  }, [uploadedVideoId, uploadedFileName, uploadedBlobUrl, selectedCompetencies, scenarioText]);

  // ═══════════════════════════════════════
  // 조 생성 뷰
  // ═══════════════════════════════════════
  if (view.type === "group-create") {
    return (
      <GroupCreateForm
        onSubmit={(session) => {
          saveSession(session);
          setView({ type: "group-manage", sessionId: session.id });
        }}
        onCancel={() => setView({ type: "main" })}
      />
    );
  }

  // ═══════════════════════════════════════
  // 조 관리 뷰 (영상 업로드 + 순차 진행)
  // ═══════════════════════════════════════
  if (view.type === "group-manage" && activeGroupSession) {
    return (
      <GroupManager
        session={activeGroupSession}
        onUpdate={(updated) => {
          saveSession(updated);
          setGroupSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        }}
        onBack={() => setView({ type: "main" })}
        onViewDashboard={() => setView({ type: "group-dashboard", sessionId: activeGroupSession.id })}
        onAnalyzeMember={(memberId, memberName, videoId, videoUrl, competencyKey, scenarioText) =>
          setView({
            type: "group-feedback",
            sessionId: activeGroupSession.id,
            memberId,
            memberName,
            videoId,
            videoUrl,
            competencyKey: (competencyKey as LeadershipCompetencyKey) || "visionPresentation",
            scenarioText,
          })
        }
      />
    );
  }

  // ═══════════════════════════════════════
  // 조 비교 대시보드
  // ═══════════════════════════════════════
  if (view.type === "group-dashboard" && activeGroupSession) {
    return (
      <GroupDashboard
        session={activeGroupSession}
        onBack={() => setView({ type: "group-manage", sessionId: activeGroupSession.id })}
        onViewMember={(memberId) => {
          // 해당 멤버의 첫 번째 분석된 영상으로 이동
          for (const comp of activeGroupSession.competencies) {
            const video = comp.memberVideos[memberId];
            if (video) {
              setView({
                type: "group-feedback",
                sessionId: activeGroupSession.id,
                memberId,
                memberName: activeGroupSession.members.find((m) => m.id === memberId)?.name || "",
                videoId: video.videoId,
                videoUrl: video.blobUrl,
                competencyKey: comp.competencyKey,
              });
              return;
            }
          }
          // 영상이 없는 멤버 클릭 시 — 조 관리 화면으로 이동 (크래시 방지)
          setView({ type: "group-manage", sessionId: activeGroupSession.id });
        }}
      />
    );
  }

  // ═══════════════════════════════════════
  // 조 멤버 피드백 뷰
  // ═══════════════════════════════════════
  if (view.type === "group-feedback") {
    return (
      <LeadershipFeedback
        videoId={view.videoId}
        videoTitle={`${view.memberName} — ${LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === view.competencyKey)?.label || ""}`}
        videoUrl={view.videoUrl}
        selectedCompetencies={[view.competencyKey]}
        scenarioText={view.scenarioText}
        onBack={() => setView({ type: "group-manage", sessionId: view.sessionId })}
      />
    );
  }

  // ═══════════════════════════════════════
  // 피드백 뷰 (개별 분석)
  // ═══════════════════════════════════════
  if (view.type === "feedback") {
    return (
      <LeadershipFeedback
        videoId={view.videoId}
        videoTitle={view.videoTitle}
        videoUrl={view.videoUrl}
        selectedCompetencies={view.selectedCompetencies}
        scenarioText={view.scenarioText}
        onBack={() => setView({ type: "main" })}
      />
    );
  }

  // ═══════════════════════════════════════
  // 히스토리 뷰
  // ═══════════════════════════════════════
  if (view.type === "history") {
    const avgScore = speakers.length
      ? (speakers.reduce((sum, s) => sum + s.totalScore, 0) / speakers.length).toFixed(1)
      : "0.0";
    const topScorer = speakers.length ? speakers[0].speakerName : "-";

    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 space-y-8 animate-slide-in-right">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView({ type: "main" })}
            className="flex items-center gap-1.5 text-base text-slate-500 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <h2 className="text-xl font-bold text-teal-600">평가 이력 & 성장 추이</h2>
        </div>

        {/* 평가 이력 스코어카드 */}
        <div>
          <h3 className="text-base font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> 평가 이력 ({speakers.length}건)
          </h3>
          <p className="text-sm text-slate-500 font-mono mb-3">
            평균 점수: {avgScore}점 (9점 만점) | 최고 점수: {topScorer}
          </p>
          {speakers.length === 0 ? (
            <div className="bg-white border border-slate-200/30 rounded-xl p-8 text-center">
              <Video className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-base text-slate-500">아직 평가 이력이 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">영상을 업로드하고 분석을 시작해보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {speakers.map((speaker, i) => (
                <div
                  key={speaker.speakerId}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                >
                  <ScoreCard speaker={speaker} rank={i + 1} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 성장 추이 차트 */}
        {speakers.length > 0 && (
          <div className="bg-white border border-slate-200/40 rounded-xl p-5">
            <h3 className="text-base font-medium text-slate-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 역량 성장 추이 (최근 5개월 · 9점 척도)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} />
                <YAxis domain={[0, 9]} ticks={[0, 3, 5, 7, 9]} tick={{ fill: "#475569", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={<ChartTooltip unit="점" />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {competencyDefs.map((comp, idx) => (
                  <Line
                    key={comp.key}
                    type="monotone"
                    dataKey={comp.label}
                    stroke={comp.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }}
                    animationBegin={100 + idx * 100}
                    animationDuration={600}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  // 메인 뷰 — 영상 업로드 + 상황사례 + 역량 선택
  // ═══════════════════════════════════════
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 space-y-8 animate-slide-in-right">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-teal-600 tracking-tight">리더십코칭 역량진단</h2>
          <p className="text-base sm:text-lg text-slate-500 mt-1.5">
            발표·토론 영상을 업로드하고 상황사례를 입력하면 AI가 역량을 분석합니다
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setView({ type: "group-create" })}
            className="flex items-center gap-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5" />
            6인 조 관리
          </button>
          {speakers.length > 0 && (
            <button
              onClick={() => setView({ type: "history" })}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors px-3 py-1.5 rounded-lg border border-slate-200/40 hover:border-teal-500/30 whitespace-nowrap"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              이력
            </button>
          )}
        </div>
      </div>

      {/* ── 기존 조 세션 목록 ── */}
      {groupSessions.length > 0 && (
        <div className="bg-white border border-teal-200/30 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">진행 중인 조</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupSessions.map((gs) => (
              <button
                key={gs.id}
                onClick={() => setView({ type: "group-manage", sessionId: gs.id })}
                className="text-left p-3 rounded-lg bg-teal-50/50 border border-teal-200/30 hover:border-teal-300 hover:shadow-sm transition-all"
              >
                <p className="text-sm font-semibold text-teal-700">{gs.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {gs.members.length}명 · {gs.members.map((m) => m.name).join(", ")}
                </p>
                <p className="text-[10px] text-teal-600 mt-1">
                  {gs.currentStep + 1}/4 역량 진행 중
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 개별 분석 영역 (기존) ── */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-slate-200/60" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">또는 개별 분석</span>
          <div className="h-px flex-1 bg-slate-200/60" />
        </div>
      </div>

      {/* ── 2단 레이아웃: 영상 업로드 | 상황사례 + 역량 선택 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 영상 업로드 */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Upload className="w-4 h-4 text-teal-600" />
            1단계: 발표·토론 영상 업로드
          </h3>

          {!uploadedVideoId ? (
            <VideoUploader
              onUpload={handleUpload}
              onUrlUpload={handleUrlUpload}
              progress={uploadProgress}
              accentColor="teal"
            />
          ) : (
            <div className="bg-white border border-teal-500/20 rounded-xl p-5 space-y-3">
              {/* 업로드된 영상 미리보기 */}
              {uploadedBlobUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200/40 bg-black">
                  <video
                    src={uploadedBlobUrl}
                    controls
                    className="w-full aspect-video bg-black"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base text-slate-900 font-medium truncate">
                    {uploadedFileName}
                  </p>
                  <p className="text-sm text-teal-600">업로드 완료 — AI 인덱싱 진행 중</p>
                </div>
                <button
                  onClick={() => {
                    setUploadedVideoId(null);
                    setUploadedFileName("");
                    setUploadedBlobUrl(null);
                  }}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  다시 업로드
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 우측: 상황사례 입력 */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            2단계: 상황사례 입력 (선택)
          </h3>
          <div className="bg-white border border-slate-200/40 rounded-xl p-5 space-y-3">
            <p className="text-sm text-slate-500">
              평가 대상 영상의 상황사례를 입력하면 더 정확한 분석이 가능합니다.
            </p>
            <textarea
              value={scenarioText}
              onChange={(e) => setScenarioText(e.target.value)}
              placeholder={`예시:\n• 신재생에너지 분야 전략 수립 TFT 발표 영상\n• 부서 간 설비 교체 일정 갈등 조율 회의\n• 회의 비효율성 문제에 대한 1:1 코칭 면담\n• 3건의 긴급사안 우선순위 결정 회의`}
              className="w-full bg-slate-50/60 border border-slate-200/40 rounded-lg px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 transition-all resize-none leading-relaxed"
              rows={6}
            />
            <p className="text-sm text-slate-400">
              * 상황사례를 입력하지 않아도 영상만으로 분석이 가능합니다
            </p>
          </div>
        </div>
      </div>

      {/* ── 3단계: 평가 역량 선택 ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-600" />
            3단계: 평가 역량 선택
          </h3>
          <button
            onClick={selectAllCompetencies}
            className="text-sm text-teal-600 hover:text-teal-500 transition-colors"
          >
            전체 선택
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {competencyDefs.map((comp, idx) => {
            const IconComp = COMPETENCY_ICONS[comp.key] || Target;
            const isSelected = selectedCompetencies.has(comp.key);

            return (
              <button
                key={comp.key}
                onClick={() => toggleCompetency(comp.key)}
                className={`animate-fade-in-up text-left rounded-xl p-5 border-2 transition-all duration-200 group ${
                  isSelected
                    ? "bg-white shadow-lg shadow-slate-200/60"
                    : "bg-white/60 border-slate-200/40 hover:border-slate-300 hover:bg-white hover:shadow-md"
                }`}
                style={{
                  animationDelay: `${idx * 80}ms`,
                  animationFillMode: "backwards",
                  borderColor: isSelected ? comp.color : undefined,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                    style={{ backgroundColor: `${comp.color}15` }}
                  >
                    <IconComp className="w-5 h-5" style={{ color: comp.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4
                        className="text-[15px] font-bold transition-colors"
                        style={{ color: isSelected ? comp.color : "#334155" }}
                      >
                        {comp.label}
                      </h4>
                      {isSelected && (
                        <CheckCircle2 className="w-4.5 h-4.5 shrink-0" style={{ color: comp.color }} />
                      )}
                      {comp.rubric && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-600/70 font-medium ml-auto">
                          BARS {comp.rubric.length}항목
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                      {comp.definition}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 분석 시작 영역 ── */}
      <div className={`rounded-2xl p-6 text-center transition-all duration-300 ${
        canStartAnalysis
          ? "bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/50"
          : "bg-slate-50/50 border border-dashed border-slate-200/60"
      }`}>
        {!canStartAnalysis && (
          <div className="mb-4">
            <div className="flex items-center justify-center gap-3 sm:gap-6 text-sm flex-wrap">
              <span className={`flex items-center gap-1.5 ${uploadedVideoId ? "text-teal-600" : "text-slate-400"}`}>
                {uploadedVideoId ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                영상 업로드
              </span>
              <span className="text-slate-300 hidden sm:inline">→</span>
              <span className={`flex items-center gap-1.5 ${selectedCompetencies.size > 0 ? "text-teal-600" : "text-slate-400"}`}>
                {selectedCompetencies.size > 0 ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                역량 선택
              </span>
              <span className="text-slate-300 hidden sm:inline">→</span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Circle className="w-4 h-4" />
                AI 분석
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleStartAnalysis}
          disabled={!canStartAnalysis}
          className={`inline-flex items-center gap-3 px-6 sm:px-10 py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold transition-all duration-300 ${
            canStartAnalysis
              ? "bg-teal-600 hover:bg-teal-500 text-white shadow-xl shadow-teal-500/20 hover:shadow-2xl hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98]"
              : "bg-slate-200/80 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Sparkles className="w-5 h-5" />
          AI 역량 분석 시작
          {selectedCompetencies.size > 0 && (
            <span className="text-sm opacity-80">({selectedCompetencies.size}개 역량)</span>
          )}
        </button>
      </div>

      {/* ── 9점 척도 안내 ── */}
      <div className="bg-white border border-slate-200/30 rounded-xl p-5">
        <h3 className="text-base font-medium text-slate-500 mb-3">9점 척도 평가 기준</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
          {[
            { range: "8-9점", label: "탁월", color: "text-teal-600", bg: "bg-teal-50" },
            { range: "7점", label: "우수", color: "text-teal-600/70", bg: "bg-teal-500/5" },
            { range: "5-6점", label: "보통", color: "text-amber-600", bg: "bg-amber-500/10" },
            { range: "3-4점", label: "미흡", color: "text-red-600/70", bg: "bg-red-500/5" },
            { range: "1-2점", label: "부족", color: "text-red-600", bg: "bg-red-500/10" },
          ].map((g) => (
            <div key={g.range} className={`${g.bg} rounded-lg p-2`}>
              <p className={`text-sm font-mono font-bold ${g.color}`}>{g.range}</p>
              <p className={`text-sm mt-0.5 ${g.color}`}>{g.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-400 mt-3">
          ※ KHNP 전직급 리더십 역량 정의 및 행동지표 기준 · 개선루브릭(BARS) 적용
        </p>
      </div>
    </div>
  );
}
