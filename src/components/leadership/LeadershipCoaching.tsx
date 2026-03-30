"use client";

import { useState, useCallback } from "react";
import { Users, TrendingUp, PlayCircle, Video, Shield, BookOpen } from "lucide-react";
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
import { useVideoSearch, useVideoUpload } from "@/hooks/useTwelveLabs";
import {
  TWELVELABS_INDEXES,
  LEVEL_COMPETENCY_MAP,
  JOB_LEVEL_LABELS,
  getCompetenciesForLevel,
  LEADERSHIP_COMPETENCY_DEFS,
} from "@/lib/constants";
import type { SpeakerScore, LeadershipCompetencyKey, JobLevel } from "@/lib/types";

// 신임부장(2직급) 평가 기준으로 현실적 데모 데이터 생성
function generateDemoSpeakers(level: JobLevel): SpeakerScore[] {
  const competencyKeys = LEVEL_COMPETENCY_MAP[level];

  // 각 참가자별 차별화된 점수 프로필 (9점 척도)
  const profiles: {
    name: string;
    scoreBase: number[];
    strengths: string[];
    improvements: string[];
  }[] = [
    {
      name: "김철수",
      scoreBase: [8, 7, 7, 8],
      strengths: ["PEST 분석을 체계적으로 활용하여 전략과제를 도출", "멤버들에게 명확하게 비전을 전달하며 동기부여 역량 탁월"],
      improvements: ["부서 간 갈등 조율 시 보다 적극적인 중재 역할 필요"],
    },
    {
      name: "이영희",
      scoreBase: [6, 8, 8, 7],
      strengths: ["그룹토의에서 상대 의견을 존중하며 합의를 이끌어내는 능력 우수", "구성원 면담 시 허용적 분위기 조성에 강점"],
      improvements: ["전략 수립 시 분석 결과와 과제 간 연계성 보강 필요"],
    },
    {
      name: "박민준",
      scoreBase: [7, 6, 7, 8],
      strengths: ["의사결정 시 리스크 분석과 대안 수립이 체계적", "실행계획의 구체성과 현실성이 뛰어남"],
      improvements: ["토론 과정에서 보다 적극적인 참여와 의견 개진 필요"],
    },
    {
      name: "정수진",
      scoreBase: [7, 7, 6, 6],
      strengths: ["비전제시 시 전략적 커뮤니케이션 역량이 우수", "공정한 기준 적용으로 구성원 신뢰 확보"],
      improvements: ["구성원 코칭 시 구체적 사례 기반 피드백 강화 필요", "의사결정 근거의 논리적 연결 보강 필요"],
    },
    {
      name: "최동현",
      scoreBase: [5, 7, 8, 7],
      strengths: ["구성원 육성에 대한 열정이 높고 멘토링 역량 탁월", "문제 상황 분석 시 객관적 데이터 활용 능력 우수"],
      improvements: ["비전제시 역량 중 전략과제의 도전성 수준 향상 필요"],
    },
    {
      name: "한지원",
      scoreBase: [7, 8, 5, 7],
      strengths: ["설득과 협의 역량이 뛰어나 토의를 효과적으로 이끔", "의사결정 시 이해관계자 의견 수렴을 체계적으로 수행"],
      improvements: ["구성원 면담 시 함께 대안을 모색하는 과정 보강 필요"],
    },
  ];

  return profiles.map((p, i) => {
    const scores: Partial<Record<LeadershipCompetencyKey, number>> = {};
    competencyKeys.forEach((key, ki) => {
      scores[key] = p.scoreBase[ki];
    });
    const total = competencyKeys.reduce((acc, key, ki) => acc + p.scoreBase[ki], 0) / competencyKeys.length;
    return {
      speakerId: `speaker-${i}`,
      speakerName: p.name,
      jobLevel: level,
      scores,
      totalScore: total,
      feedback: "",
      strengths: p.strengths,
      improvements: p.improvements,
    };
  });
}

// 데모: 성장 추이 데이터 (KHNP 표준 역량 기준)
function generateGrowthData(level: JobLevel) {
  const competencies = getCompetenciesForLevel(level);
  return ["1월", "2월", "3월", "4월", "5월"].map((month, mi) => {
    const row: Record<string, string | number> = { month };
    competencies.forEach((comp) => {
      // 점진적 성장 추세를 반영한 데모 데이터
      row[comp.label] = Math.min(9, Math.floor(4.5 + mi * 0.4 + Math.random() * 2));
    });
    return row;
  });
}

// 데모: 분석 완료된 영상 목록
const DEMO_VIDEOS = [
  { videoId: "demo-video-001", title: "신임부장 리더십역량 진단 세션 #1", date: "2026-03-10", level: 2 as JobLevel },
  { videoId: "demo-video-002", title: "신임부장 리더십역량 진단 세션 #2", date: "2026-03-17", level: 2 as JobLevel },
];

export default function LeadershipCoaching() {
  // 직급 선택 (기본: 2직급/신임부장)
  const [jobLevel, setJobLevel] = useState<JobLevel>(2);

  // 뷰 상태: overview(기본) / feedback(리뷰 화면)
  const [view, setView] = useState<"overview" | "feedback">("overview");
  const [feedbackVideoId, setFeedbackVideoId] = useState("");
  const [feedbackVideoTitle, setFeedbackVideoTitle] = useState("");

  // 업로드 — 실제 TwelveLabs API 연동
  const { progress: uploadProgress, upload } = useVideoUpload();
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const [speakers, setSpeakers] = useState<SpeakerScore[]>(
    () => [...generateDemoSpeakers(2)].sort((a, b) => b.totalScore - a.totalScore)
  );
  const [periodFilter, setPeriodFilter] = useState<"3개월" | "6개월" | "1년">("6개월");
  const [growthData, setGrowthData] = useState(() => generateGrowthData(2));
  const { loading, search } = useVideoSearch();

  // 직급 변경 시 데모 데이터 재생성
  const handleLevelChange = useCallback((level: JobLevel) => {
    setJobLevel(level);
    const newSpeakers = generateDemoSpeakers(level);
    setSpeakers([...newSpeakers].sort((a, b) => b.totalScore - a.totalScore));
    setGrowthData(generateGrowthData(level));
  }, []);

  // 현재 직급의 역량 정보
  const currentCompetencies = getCompetenciesForLevel(jobLevel);

  // 요약 통계
  const avgScore = speakers.length
    ? (speakers.reduce((sum, s) => sum + s.totalScore, 0) / speakers.length).toFixed(1)
    : "0.0";
  const topScorer = speakers.length ? speakers[0].speakerName : "-";

  // 실제 업로드 핸들러
  const handleUpload = useCallback(async (file: File) => {
    setUploadedFileName(file.name);
    try {
      const taskId = await upload(TWELVELABS_INDEXES.leadership, file);
      setUploadedVideoId(taskId);
    } catch {
      // 업로드 실패 시 에러는 useVideoUpload 내부에서 처리됨
    }
  }, [upload]);

  const handleSearch = useCallback(
    (query: string) => {
      search(TWELVELABS_INDEXES.leadership, query);
    },
    [search]
  );

  // 피드백 페이지로 전환
  const openFeedback = useCallback((videoId: string, title: string) => {
    setFeedbackVideoId(videoId);
    setFeedbackVideoTitle(title);
    setView("feedback");
  }, []);

  // 피드백 뷰인 경우
  if (view === "feedback" && feedbackVideoId) {
    return (
      <LeadershipFeedback
        videoId={feedbackVideoId}
        videoTitle={feedbackVideoTitle}
        onBack={() => setView("overview")}
      />
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6 animate-slide-in-right">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-teal-400">리더십코칭 역량진단</h2>
        <p className="text-sm text-slate-400 mt-1">
          KHNP 전직급 리더십 역량 정의 및 행동지표 기준 · 9점 척도 평가
        </p>
      </div>

      {/* 직급 선택 + 평가 역량 안내 */}
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-medium text-slate-300">평가 대상 직급</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {([1, 2, 3, 4] as JobLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => handleLevelChange(level)}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                jobLevel === level
                  ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm shadow-teal-500/10"
                  : "bg-surface-700 text-slate-400 border border-transparent hover:border-surface-600 hover:text-slate-300"
              }`}
            >
              {JOB_LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
        {/* 해당 직급 평가 역량 */}
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500">평가 역량 ({currentCompetencies.length}개)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {currentCompetencies.map((comp) => (
            <div key={comp.key} className="bg-surface-700/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.color }} />
                <span className="text-xs font-medium text-slate-300">{comp.label}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {comp.definition.slice(0, 50)}...
              </p>
              {comp.subElements[jobLevel] && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {comp.subElements[jobLevel]!.map((sub, si) => (
                    <span key={si} className="text-xs bg-surface-700 text-slate-500 px-1.5 py-0.5 rounded">
                      {sub.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 업로드 + 검색 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VideoUploader onUpload={handleUpload} progress={uploadProgress} accentColor="teal" />
        <SearchBar
          placeholder="비전 발표, 갈등 조율, 면담 코칭, 의사결정 등..."
          onSearch={handleSearch}
          loading={loading}
          accentColor="teal"
          suggestions={["비전 발표", "갈등 조율 장면", "코칭 면담", "의사결정 순간", "합의 도출"]}
        />
      </div>

      {/* 업로드 완료 시 리뷰 진입 버튼 */}
      {uploadedVideoId && (
        <div className="animate-fade-in-up bg-surface-800 border border-teal-500/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{uploadedFileName}</p>
            <p className="text-xs text-slate-500">업로드 완료 — AI 분석 후 구간별 피드백을 작성할 수 있습니다</p>
          </div>
          <button
            onClick={() => openFeedback(uploadedVideoId, uploadedFileName)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
          >
            <PlayCircle className="w-4 h-4" />
            영상 리뷰 & 피드백
          </button>
        </div>
      )}

      {/* 분석 완료 영상 목록 */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Video className="w-4 h-4" /> 분석 완료 영상
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DEMO_VIDEOS.map((video, i) => (
            <button
              key={video.videoId}
              onClick={() => openFeedback(video.videoId, video.title)}
              className="animate-fade-in-up bg-surface-800 border border-surface-700 rounded-xl p-4 text-left hover:border-teal-500/30 hover:bg-surface-800/80 hover:scale-[1.01] transition-all duration-200 group"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 rounded bg-surface-700 flex items-center justify-center shrink-0">
                  <PlayCircle className="w-5 h-5 text-slate-600 group-hover:text-teal-400 transition-colors duration-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate group-hover:text-teal-400 transition-colors duration-200">{video.title}</p>
                  <p className="text-xs text-slate-600 font-mono">{video.date} · {JOB_LEVEL_LABELS[video.level]}</p>
                </div>
                <span className="text-xs text-slate-600 group-hover:text-teal-400 transition-colors duration-200">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 발표자 스코어카드 */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> 참가자별 역량 평가 ({speakers.length}명)
        </h3>
        <p className="text-xs text-slate-500 font-mono mb-3">
          평균 점수: {avgScore}점 (9점 만점) | 최고 점수자: {topScorer} | 척도: KHNP 9점 척도
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 hover:border-teal-500/20 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300" role="img" aria-label="최근 5개월 역량 성장 추이 라인 차트">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> 역량 성장 추이 (최근 5개월 · 9점 척도)
          </h3>
          <div className="flex items-center gap-1.5">
            {(["3개월", "6개월", "1년"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  periodFilter === period
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm shadow-teal-500/10"
                    : "bg-surface-700 text-slate-400 border border-transparent hover:border-surface-600 hover:text-slate-300"
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
                <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis domain={[0, 9]} ticks={[0, 3, 5, 7, 9]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
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
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#0a0e14" }}
                    animationBegin={100 + idx * 100}
                    animationDuration={600}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 평가 기준 안내 */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> 9점 척도 평가 기준
        </h3>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { range: "8-9점", label: "탁월", color: "text-teal-400", bg: "bg-teal-500/10" },
            { range: "7점", label: "우수", color: "text-teal-400/70", bg: "bg-teal-500/5" },
            { range: "5-6점", label: "보통", color: "text-amber-400", bg: "bg-amber-500/10" },
            { range: "3-4점", label: "미흡", color: "text-red-400/70", bg: "bg-red-500/5" },
            { range: "1-2점", label: "부족", color: "text-red-400", bg: "bg-red-500/10" },
          ].map((g) => (
            <div key={g.range} className={`${g.bg} rounded-lg p-2`}>
              <p className={`text-xs font-mono font-bold ${g.color}`}>{g.range}</p>
              <p className={`text-xs mt-0.5 ${g.color}`}>{g.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3">
          ※ KHNP 전직급 리더십 역량 정의 및 행동지표 기준 · 신임부장 리더십역량 진단 루브릭 적용
        </p>
      </div>
    </div>
  );
}
