"use client";

import { useState, useCallback } from "react";
import { FileText, Clock, Target } from "lucide-react";
import VideoUploader from "@/components/shared/VideoUploader";
import SearchBar from "@/components/shared/SearchBar";
import VideoPlayer from "@/components/shared/VideoPlayer";
import CompetencyRadar from "./CompetencyRadar";
import { useVideoSearch } from "@/hooks/useTwelveLabs";
import { COMPETENCY_LABELS } from "@/lib/constants";
import type { CompetencyScore, CompetencyKey, UploadProgress } from "@/lib/types";
import { formatTime, getGrade } from "@/lib/utils";

// 데모용 기본 역량 점수
const DEFAULT_SCORES: CompetencyScore[] = (Object.entries(COMPETENCY_LABELS) as [CompetencyKey, string][]).map(
  ([key, label]) => ({
    key,
    label,
    score: Math.floor(Math.random() * 30) + 60,
  })
);

export default function SimulatorEval() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [scores] = useState<CompetencyScore[]>(DEFAULT_SCORES);
  const { results, loading, search } = useVideoSearch();
  const overallScore = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
  const { grade, color } = getGrade(overallScore);

  const handleUpload = useCallback(async (file: File) => {
    setUploadProgress({ fileName: file.name, progress: 0, status: "uploading" });
    // 시뮬레이션 — 실제 구현 시 TwelveLabs 업로드 API 호출
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 200));
      setUploadProgress({ fileName: file.name, progress: i, status: "uploading" });
    }
    setUploadProgress({ fileName: file.name, progress: 100, status: "complete" });
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      // indexId는 실제 인덱스 ID로 교체 필요
      search("placeholder-index-id", query);
    },
    [search]
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6 animate-fade-in-up">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-coral-400">N-HPAI 시뮬레이터 평가</h2>
        <p className="text-sm text-slate-400 mt-1">
          원전 운전 시뮬레이터 훈련 영상 분석 및 8대 핵심역량 정량 평가
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 업로드 + 검색 + 결과 */}
        <div className="lg:col-span-2 space-y-4">
          <VideoUploader onUpload={handleUpload} progress={uploadProgress} accentColor="coral" />

          <SearchBar
            placeholder="비상냉각 조작, 제어봉 삽입 등 장면 검색..."
            onSearch={handleSearch}
            loading={loading}
            accentColor="coral"
            suggestions={["비상냉각 조작", "제어봉 삽입", "ECCS 기동", "원자로 트립"]}
          />

          <VideoPlayer />

          {/* 검색 결과 */}
          {results.length > 0 && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3">
                검색 결과 ({results.length}건)
              </h4>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-700 hover:pl-4 cursor-pointer transition-all duration-200"
                  >
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="font-mono text-xs text-coral-400">
                      {formatTime(r.start)} — {formatTime(r.end)}
                    </span>
                    <span className="text-sm text-slate-300 flex-1 truncate">{r.videoTitle}</span>
                    <span className="text-xs font-mono text-slate-500">
                      {(r.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 우측: 평가 리포트 */}
        <div className="space-y-4">
          {/* 종합 점수 */}
          <div className="bg-surface-800 border border-coral-500/30 rounded-xl p-4 text-center hover:border-coral-500/50 transition-colors duration-200">
            <p className="text-xs text-slate-500 mb-1">종합 평가</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold font-mono text-white tabular-nums">{overallScore}</span>
              <span className="text-sm text-slate-500">/ 100</span>
            </div>
            <span className={`text-lg font-bold ${color}`}>{grade}</span>
          </div>

          {/* 레이더 차트 */}
          <CompetencyRadar scores={scores} />

          {/* 역량별 상세 */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" /> 역량별 상세
            </h4>
            <div className="space-y-2">
              {scores.map((s) => (
                <div key={s.key} className="flex items-center gap-3 group py-1 -mx-2 px-2 rounded hover:bg-surface-700/50 transition-colors duration-150">
                  <span className="text-xs text-slate-400 w-16 shrink-0 group-hover:text-slate-300 transition-colors duration-200">{s.label}</span>
                  <div className="flex-1 bg-surface-700 rounded-full h-1.5 group-hover:h-2 transition-all duration-200">
                    <div
                      className="h-full rounded-full bg-coral-500 transition-all duration-500"
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-300 w-8 text-right group-hover:text-white transition-colors duration-200">{s.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 챕터링 */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 자동 챕터링
            </h4>
            <div className="space-y-2">
              {["초기 상태 확인", "비상 절차 진입", "냉각 계통 기동", "정상화 조치"].map((chapter, i) => (
                <div key={chapter} className="flex items-center gap-2 text-xs text-slate-500 py-1.5 border-b border-surface-700 last:border-0">
                  <span className="font-mono text-slate-600 w-6">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-slate-400">{chapter}</span>
                  <span className="ml-auto font-mono text-slate-600">--:--</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2">영상 업로드 시 타임스탬프가 자동 생성됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
