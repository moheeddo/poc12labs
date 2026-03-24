"use client";

import { useState, useCallback } from "react";
import { Users, TrendingUp } from "lucide-react";
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
import SearchBar from "@/components/shared/SearchBar";
import ScoreCard from "./ScoreCard";
import { useVideoSearch } from "@/hooks/useTwelveLabs";
import { LEADERSHIP_COMPETENCY_CONFIG } from "@/lib/constants";
import type { SpeakerScore, LeadershipCompetencyKey, UploadProgress } from "@/lib/types";

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

export default function LeadershipCoaching() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [speakers] = useState<SpeakerScore[]>(
    [...DEMO_SPEAKERS].sort((a, b) => b.totalScore - a.totalScore)
  );
  const [periodFilter, setPeriodFilter] = useState<"3개월" | "6개월" | "1년">("6개월");
  const { loading, search } = useVideoSearch();

  // 요약 통계 계산
  const avgScore = speakers.length
    ? (speakers.reduce((sum, s) => sum + s.totalScore, 0) / speakers.length).toFixed(1)
    : "0.0";
  const topScorer = speakers.length ? speakers[0].speakerName : "-";

  const handleUpload = useCallback(async (file: File) => {
    setUploadProgress({ fileName: file.name, progress: 0, status: "uploading" });
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 200));
      setUploadProgress({ fileName: file.name, progress: i, status: "uploading" });
    }
    setUploadProgress({ fileName: file.name, progress: 100, status: "complete" });
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      search("placeholder-index-id", query);
    },
    [search]
  );

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
            <ScoreCard key={speaker.speakerId} speaker={speaker} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* 역량 성장 추이 */}
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-4" role="img" aria-label="최근 5개월 역량 성장 추이 라인 차트">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> 역량 성장 추이 (최근 5개월)
          </h3>
          <div className="flex items-center gap-1.5">
            {(["3개월", "6개월", "1년"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  periodFilter === period
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    : "bg-surface-700 text-slate-400 border border-transparent hover:border-surface-600"
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
                  contentStyle={{
                    backgroundColor: "#111820",
                    border: "1px solid #243044",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px" }}
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color }}>{value}</span>
                  )}
                />
                <Line type="monotone" dataKey="의사소통" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} animationBegin={100} animationDuration={600} />
                <Line type="monotone" dataKey="논리력" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} animationBegin={200} animationDuration={600} />
                <Line type="monotone" dataKey="경청" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} animationBegin={300} animationDuration={600} />
                <Line type="monotone" dataKey="리더십" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} animationBegin={400} animationDuration={600} />
                <Line type="monotone" dataKey="협업" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} animationBegin={500} animationDuration={600} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
