"use client";

import { useState, useCallback } from "react";
import { Users, TrendingUp, PlayCircle, Video } from "lucide-react";
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
import { LEADERSHIP_COMPETENCY_CONFIG, TWELVELABS_INDEXES } from "@/lib/constants";
import type { SpeakerScore, LeadershipCompetencyKey } from "@/lib/types";

// 데모 데이터: 6명 발표자
const DEMO_SPEAKERS: SpeakerScore[] = [
  "김철수", "이영희", "박민준", "정수진", "최동현", "한지원",
].map((name, i) => {
  const scores = Object.fromEntries(
    LEADERSHIP_COMPETENCY_CONFIG.map(({ key }) => [key, Math.floor(Math.random() * 4) + 5])
  ) as Record<LeadershipCompetencyKey, number>;
  const total = LEADERSHIP_COMPETENCY_CONFIG.reduce(
    (acc, { key, weight }) => acc + scores[key] * weight,
    0
  );
  return {
    speakerId: `speaker-${i}`,
    speakerName: name,
    scores,
    totalScore: total,
    feedback: `${name}님은 전반적으로 안정적인 토론 역량을 보이며, 특히 의사소통 부분에서 강점이 돋보입니다.`,
  };
});

// 데모: 성장 추이 데이터
const GROWTH_DATA = ["1월", "2월", "3월", "4월", "5월"].map((month) => ({
  month,
  의사소통: Math.floor(Math.random() * 3) + 6,
  논리력: Math.floor(Math.random() * 3) + 5,
  경청: Math.floor(Math.random() * 3) + 5,
  리더십: Math.floor(Math.random() * 3) + 5,
  협업: Math.floor(Math.random() * 3) + 6,
}));

// 데모: 분석 완료된 영상 목록
const DEMO_VIDEOS = [
  { videoId: "demo-video-001", title: "3월 리더십 토론 세션 #1", date: "2026-03-10" },
  { videoId: "demo-video-002", title: "3월 리더십 토론 세션 #2", date: "2026-03-17" },
];

export default function LeadershipCoaching() {
  // 뷰 상태: overview(기본) / feedback(리뷰 화면)
  const [view, setView] = useState<"overview" | "feedback">("overview");
  const [feedbackVideoId, setFeedbackVideoId] = useState("");
  const [feedbackVideoTitle, setFeedbackVideoTitle] = useState("");

  // 업로드 — 실제 TwelveLabs API 연동
  const { progress: uploadProgress, upload } = useVideoUpload();
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const [speakers] = useState<SpeakerScore[]>(
    [...DEMO_SPEAKERS].sort((a, b) => b.totalScore - a.totalScore)
  );
  const [periodFilter, setPeriodFilter] = useState<"3개월" | "6개월" | "1년">("6개월");
  const { loading, search } = useVideoSearch();

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
      // taskId를 videoId로 사용 (실제 구현에서는 task 완료 후 video_id 획득)
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
          6인 토론 영상 분석을 통한 개별 역량 자동 스코어링 및 피드백
        </p>
      </div>

      {/* 업로드 + 검색 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VideoUploader onUpload={handleUpload} progress={uploadProgress} accentColor="teal" />
        <SearchBar
          placeholder="반박 발언, 동의 표현, 리더십 발휘 등..."
          onSearch={handleSearch}
          loading={loading}
          accentColor="teal"
          suggestions={["반박 발언", "동의 표현", "질문 제기", "요약 발언"]}
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
                  <p className="text-xs text-slate-600 font-mono">{video.date}</p>
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
          <Users className="w-4 h-4" /> 발표자별 역량 스코어 ({speakers.length}명)
        </h3>
        <p className="text-xs text-slate-500 font-mono mb-3">
          평균 점수: {avgScore}점 | 최고 점수자: {topScorer}
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
            <TrendingUp className="w-4 h-4" /> 역량 성장 추이 (최근 5개월)
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
              <LineChart data={GROWTH_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
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
                <Line type="monotone" dataKey="의사소통" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#0a0e14" }} animationBegin={100} animationDuration={600} />
                <Line type="monotone" dataKey="논리력" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#0a0e14" }} animationBegin={200} animationDuration={600} />
                <Line type="monotone" dataKey="경청" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#0a0e14" }} animationBegin={300} animationDuration={600} />
                <Line type="monotone" dataKey="리더십" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#0a0e14" }} animationBegin={400} animationDuration={600} />
                <Line type="monotone" dataKey="협업" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#0a0e14" }} animationBegin={500} animationDuration={600} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
