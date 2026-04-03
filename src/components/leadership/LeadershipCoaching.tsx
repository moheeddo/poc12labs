"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Users,
  TrendingUp,
  PlayCircle,
  Video,
  Shield,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Target,
  Scale,
  GraduationCap,
  Lock,
  ClipboardCheck,
  MessageCircle,
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
import SearchBar from "@/components/shared/SearchBar";
import ScoreCard from "./ScoreCard";
import LeadershipFeedback from "./LeadershipFeedback";
import CompetencyAssessment from "./CompetencyAssessment";
import { useVideoSearch, useVideoUpload } from "@/hooks/useTwelveLabs";
import {
  TWELVELABS_INDEXES,
  JOB_LEVEL_LABELS,
  LEADERSHIP_COMPETENCY_DEFS,
  getCompetenciesForLevel,
} from "@/lib/constants";
import {
  DEPARTMENT_HEAD_ASSESSMENTS,
  ASSESSMENT_BY_KEY,
} from "@/lib/leadership-rubric-data";
import type { CompetencyAssessmentData } from "@/lib/leadership-rubric-data";
import type { SpeakerScore, JobLevel, LeadershipCompetencyKey } from "@/lib/types";

// ─── 아이콘 매핑 ───
const COMPETENCY_ICONS: Record<string, React.ElementType> = {
  Target,
  Scale,
  GraduationCap,
  Handshake: MessageCircle,
};

// ─── 뷰 상태 타입 ───
type ViewState =
  | { type: "level-select" }
  | { type: "competency-list"; level: JobLevel }
  | { type: "assessment"; level: JobLevel; data: CompetencyAssessmentData }
  | { type: "feedback"; videoId: string; videoTitle: string; videoUrl?: string }
  | { type: "overview"; level: JobLevel };

// 성장 추이 데이터 (실제 연동 시 API에서 조회)
function generateGrowthData(level: JobLevel) {
  const competencies = getCompetenciesForLevel(level);
  return ["1월", "2월", "3월", "4월", "5월"].map((month, mi) => {
    const row: Record<string, string | number> = { month };
    competencies.forEach((comp) => {
      row[comp.label] = Math.min(9, Math.floor(4.5 + mi * 0.4 + Math.random() * 2));
    });
    return row;
  });
}

// 분석 완료 영상 (실제 연동 시 API에서 조회)
const ANALYZED_VIDEOS: { videoId: string; title: string; date: string; level: JobLevel }[] = [];

// 평가항목 카드 데이터 (부장/2직급)
const ASSESSMENT_CARDS = DEPARTMENT_HEAD_ASSESSMENTS.map((a) => ({
  key: a.key,
  label: a.label,
  icon: a.icon,
  color: a.color,
  scenario: a.scenario,
  rubricCount: a.rubricItems.length,
}));

export default function LeadershipCoaching() {
  // 뷰 상태 관리 (계층 내비게이션)
  const [view, setView] = useState<ViewState>({ type: "level-select" });

  // 업로드
  const { progress: uploadProgress, upload, uploadByUrl } = useVideoUpload();
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string | null>(null);

  // 참가자 데이터 — localStorage에서 evidence 기반 자동 복원
  const [speakers, setSpeakers] = useState<SpeakerScore[]>([]);
  const [periodFilter, setPeriodFilter] = useState<"3개월" | "6개월" | "1년">("6개월");
  const [growthData] = useState(() => generateGrowthData(2));
  const { loading, search } = useVideoSearch();

  // localStorage에서 저장된 evidence를 읽어 SpeakerScore 생성
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("evidence-"));
      const allSpeakers: SpeakerScore[] = [];

      keys.forEach((key, idx) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data.evidence || !Array.isArray(data.evidence)) return;

        // evidence에서 역량별 점수 집계
        const competencyScores: Record<string, number[]> = {};
        const strengths: string[] = [];
        const improvements: string[] = [];

        data.evidence.forEach((ev: { competencyKey: string; score: number; aiScore?: number; feedback?: string }) => {
          const score = ev.score > 0 ? ev.score : (ev.aiScore || 0);
          if (score > 0) {
            if (!competencyScores[ev.competencyKey]) competencyScores[ev.competencyKey] = [];
            competencyScores[ev.competencyKey].push(score);
          }
        });

        // 점수가 있는 경우만 SpeakerScore 생성
        const scoreEntries = Object.entries(competencyScores);
        if (scoreEntries.length === 0) return;

        const scores: Partial<Record<LeadershipCompetencyKey, number>> = {};
        let totalSum = 0;
        let totalCount = 0;

        scoreEntries.forEach(([key, vals]) => {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          scores[key as LeadershipCompetencyKey] = Math.round(avg * 10) / 10;
          totalSum += avg;
          totalCount++;

          if (avg >= 7) strengths.push(`${LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === key)?.label || key} 우수`);
          else if (avg < 5) improvements.push(`${LEADERSHIP_COMPETENCY_DEFS.find((d) => d.key === key)?.label || key} 개선 필요`);
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

      // 점수 내림차순 정렬
      allSpeakers.sort((a, b) => b.totalScore - a.totalScore);
      if (allSpeakers.length > 0) setSpeakers(allSpeakers);
    } catch {
      // localStorage 접근 실패 무시
    }
  }, [view]);

  // 현재 직급 (뷰에서 추출)
  const currentLevel: JobLevel = useMemo(() => {
    if (view.type === "competency-list" || view.type === "assessment" || view.type === "overview") return view.level;
    return 2;
  }, [view]);

  const currentCompetencies = getCompetenciesForLevel(currentLevel);

  // 요약 통계
  const avgScore = speakers.length
    ? (speakers.reduce((sum, s) => sum + s.totalScore, 0) / speakers.length).toFixed(1)
    : "0.0";
  const topScorer = speakers.length ? speakers[0].speakerName : "-";

  // 핸들러
  const handleUpload = useCallback(async (file: File) => {
    setUploadedFileName(file.name);
    // 브라우저 내 재생용 blob URL 생성
    const blobUrl = URL.createObjectURL(file);
    setUploadedBlobUrl(blobUrl);
    try {
      const videoId = await upload(TWELVELABS_INDEXES.leadership, file);
      setUploadedVideoId(videoId);
    } catch { /* useVideoUpload 내부 처리 */ }
  }, [upload]);

  const handleUrlUpload = useCallback(async (url: string) => {
    const fileName = url.split("/").pop() || "영상";
    setUploadedFileName(fileName);
    try {
      const videoId = await uploadByUrl(TWELVELABS_INDEXES.leadership, url, fileName);
      setUploadedVideoId(videoId);
    } catch { /* useVideoUpload 내부 처리 */ }
  }, [uploadByUrl]);

  const handleSearch = useCallback(
    (query: string) => { search(TWELVELABS_INDEXES.leadership, query); },
    [search]
  );

  // ═══════════════════════════════════════════
  // 피드백 뷰
  // ═══════════════════════════════════════════
  if (view.type === "feedback") {
    return (
      <LeadershipFeedback
        videoId={view.videoId}
        videoTitle={view.videoTitle}
        videoUrl={view.videoUrl}
        onBack={() => setView({ type: "level-select" })}
      />
    );
  }

  // ═══════════════════════════════════════════
  // 역량 상세 평가 뷰
  // ═══════════════════════════════════════════
  if (view.type === "assessment") {
    return (
      <CompetencyAssessment
        data={view.data}
        onBack={() => setView({ type: "competency-list", level: view.level })}
      />
    );
  }

  // ═══════════════════════════════════════════
  // 메인 레이아웃
  // ═══════════════════════════════════════════
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 space-y-8 animate-slide-in-right">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-teal-600 tracking-tight">리더십코칭 역량진단</h2>
        <p className="text-lg text-slate-500 mt-1.5">
          KHNP 전직급 리더십 역량 정의 및 행동지표 기준 · 9점 척도 평가
        </p>
      </div>

      {/* ── 브레드크럼 내비게이션 ── */}
      {(view.type === "competency-list" || view.type === "overview") && (
        <div className="flex items-center gap-2 text-base">
          <button
            onClick={() => setView({ type: "level-select" })}
            className="text-slate-500 hover:text-teal-600 transition-colors"
          >
            직급 선택
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-teal-600 font-medium">{JOB_LEVEL_LABELS[currentLevel]}</span>
          {view.type === "overview" && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-700 font-medium">종합 분석</span>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
           직급 선택 뷰
         ═══════════════════════════════════════ */}
      {view.type === "level-select" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-teal-600" />
            <h3 className="text-base font-medium text-slate-700">평가 대상 직급을 선택하세요</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([1, 2, 3, 4] as JobLevel[]).map((level) => {
              const isActive = level === 2; // 프로토타입: 2직급만 활성
              const competencies = getCompetenciesForLevel(level);
              return (
                <button
                  key={level}
                  onClick={() => isActive && setView({ type: "competency-list", level })}
                  disabled={!isActive}
                  className={`relative text-left rounded-xl p-5 border transition-all duration-200 group ${
                    isActive
                      ? "bg-white border-teal-500/30 hover:border-teal-300 hover:bg-white cursor-pointer shadow-sm hover:shadow-lg hover:shadow-teal-500/5"
                      : "bg-white/30 border-slate-200/30 cursor-not-allowed opacity-50"
                  }`}
                >
                  {!isActive && (
                    <div className="absolute top-3 right-3">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold font-mono ${
                      isActive ? "bg-teal-50 text-teal-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      {level}
                    </div>
                    <div>
                      <p className={`text-base font-semibold ${isActive ? "text-slate-900" : "text-slate-400"}`}>
                        {JOB_LEVEL_LABELS[level]}
                      </p>
                      {!isActive && <p className="text-[11px] text-slate-400">준비 중</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {competencies.map((comp) => (
                      <div key={comp.key} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? comp.color : "#475569" }} />
                        <span className={`text-sm ${isActive ? "text-slate-500" : "text-slate-400"}`}>{comp.label}</span>
                      </div>
                    ))}
                  </div>
                  {isActive && (
                    <div className="mt-4 flex items-center gap-1 text-sm text-teal-600/70 group-hover:text-teal-600 transition-colors">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      평가 시작하기
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 영상 업로드 / 검색 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <VideoUploader onUpload={handleUpload} onUrlUpload={handleUrlUpload} progress={uploadProgress} accentColor="teal" />
            <SearchBar
              placeholder="비전 발표, 갈등 조율, 면담 코칭, 의사결정 등..."
              onSearch={handleSearch}
              loading={loading}
              accentColor="teal"
              suggestions={["비전 발표", "갈등 조율 장면", "코칭 면담", "의사결정 순간", "합의 도출"]}
            />
          </div>

          {/* 업로드 완료 시 */}
          {uploadedVideoId && (
            <div className="animate-fade-in-up bg-white border border-teal-500/20 rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base text-slate-900 font-medium truncate">{uploadedFileName}</p>
                <p className="text-sm text-slate-500">업로드 완료 — AI 분석 후 구간별 피드백을 작성할 수 있습니다</p>
              </div>
              <button
                onClick={() => setView({ type: "feedback", videoId: uploadedVideoId, videoTitle: uploadedFileName, videoUrl: uploadedBlobUrl || undefined })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-base font-medium hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
              >
                <PlayCircle className="w-4 h-4" />
                영상 리뷰 & 피드백
              </button>
            </div>
          )}

          {/* 분석 완료 영상 */}
          <div>
            <h3 className="text-base font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Video className="w-4 h-4" /> 분석 완료 영상
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ANALYZED_VIDEOS.map((video, i) => (
                <button
                  key={video.videoId}
                  onClick={() => setView({ type: "feedback", videoId: video.videoId, videoTitle: video.title })}
                  className="animate-fade-in-up bg-white border border-slate-200/40 rounded-xl p-4 text-left hover:border-teal-500/20 hover:bg-white transition-all duration-200 group"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                      <PlayCircle className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-slate-900 truncate group-hover:text-teal-600 transition-colors duration-200">{video.title}</p>
                      <p className="text-sm text-slate-400 font-mono">{video.date} · {JOB_LEVEL_LABELS[video.level]}</p>
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-teal-600 transition-colors duration-200">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
           평가항목 목록 뷰 (직급 선택 후)
         ═══════════════════════════════════════ */}
      {view.type === "competency-list" && (
        <div className="space-y-6">
          {/* 뒤로 + 종합분석 */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView({ type: "level-select" })}
              className="flex items-center gap-1.5 text-base text-slate-500 hover:text-teal-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              직급 선택으로
            </button>
            <button
              onClick={() => setView({ type: "overview", level: view.level })}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors px-3 py-1.5 rounded-lg border border-slate-200/40 hover:border-teal-500/30"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              종합 분석 보기
            </button>
          </div>

          {/* 직급 정보 + 평가역량 */}
          <div className="bg-white border border-slate-200/40 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-lg font-bold font-mono text-teal-600">
                {view.level}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{JOB_LEVEL_LABELS[view.level]}</h3>
                <p className="text-sm text-slate-500">{ASSESSMENT_CARDS.length}개 평가항목 · BARS + 멀티모달 행동기반 루브릭</p>
              </div>
            </div>
          </div>

          {/* 평가항목 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ASSESSMENT_CARDS.map((card, idx) => {
              const IconComp = COMPETENCY_ICONS[card.icon] || Target;
              const assessmentData = ASSESSMENT_BY_KEY[card.key];
              return (
                <button
                  key={card.key}
                  onClick={() => assessmentData && setView({ type: "assessment", level: view.level, data: assessmentData })}
                  className="animate-fade-in-up text-left rounded-xl p-5 bg-white border border-slate-200/40 hover:border-opacity-60 transition-all duration-200 group shadow-sm hover:shadow-lg"
                  style={{
                    animationDelay: `${idx * 100}ms`,
                    animationFillMode: "backwards",
                    borderLeftWidth: "3px",
                    borderLeftColor: card.color,
                    // hover 시 border 컬러
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${card.color}15` }}>
                      <IconComp className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">{card.label}</h4>
                        <span className="text-[11px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">
                          {card.rubricCount}항목
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed mb-3">{card.scenario.activityType}</p>
                      <p className="text-sm text-slate-500/70 leading-relaxed line-clamp-2">{card.scenario.title}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0 mt-1" />
                  </div>
                  {/* 루브릭 버전 태그 */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/30">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-600/70 font-medium">BARS 역량평가</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-violet-50 text-violet-600 font-medium">멀티모달 행동기반</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 9점 척도 안내 */}
          <div className="bg-white border border-slate-200/30 rounded-xl p-5">
            <h3 className="text-base font-medium text-slate-500 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> 9점 척도 평가 기준
            </h3>
            <div className="grid grid-cols-5 gap-2 text-center">
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
              ※ KHNP 전직급 리더십 역량 정의 및 행동지표 기준 · 개선루브릭(BARS) + 멀티모달 행동기반 루브릭 적용
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
           종합 분석(overview) 뷰 — 참가자 점수, 성장추이
         ═══════════════════════════════════════ */}
      {view.type === "overview" && (
        <div className="space-y-8">
          <button
            onClick={() => setView({ type: "competency-list", level: view.level })}
            className="flex items-center gap-1.5 text-base text-slate-500 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            평가항목으로
          </button>

          {/* 발표자 스코어카드 */}
          <div>
            <h3 className="text-base font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> 참가자별 역량 평가 ({speakers.length}명)
            </h3>
            <p className="text-sm text-slate-500 font-mono mb-3">
              평균 점수: {avgScore}점 (9점 만점) | 최고 점수자: {topScorer} | 척도: KHNP 9점 척도
            </p>
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
          </div>

          {/* 역량 성장 추이 */}
          <div className="bg-white border border-slate-200/40 rounded-xl p-5 transition-all duration-300" role="img" aria-label="최근 5개월 역량 성장 추이 라인 차트">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> 역량 성장 추이 (최근 5개월 · 9점 척도)
              </h3>
              <div className="flex items-center gap-1.5">
                {(["3개월", "6개월", "1년"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setPeriodFilter(period)}
                    className={`rounded-lg px-3 py-1 text-sm font-medium transition-all duration-200 ${
                      periodFilter === period
                        ? "bg-teal-50 text-teal-600 border border-teal-500/30 shadow-sm shadow-teal-500/10"
                        : "bg-slate-100 text-slate-500 border border-transparent hover:border-slate-300 hover:text-slate-700"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[400px]">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} />
                    <YAxis domain={[0, 9]} ticks={[0, 3, 5, 7, 9]} tick={{ fill: "#475569", fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                      content={<ChartTooltip unit="점" />}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px" }}
                      formatter={(value, entry) => (
                        <span style={{ color: entry.color }}>{value}</span>
                      )}
                    />
                    {currentCompetencies.map((comp, idx) => (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
